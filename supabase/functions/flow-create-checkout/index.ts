// Agenda YA · D1 / B18 · Flow Checkout
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: cors });
}

async function hmacSha256(secret: string, value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(signature)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function sign(params: Record<string, string | number>) {
  return Object.keys(params)
    .sort()
    .map((key) => `${key}${params[key]}`)
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "AUTH_REQUIRED" }, 401);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const FLOW_API_KEY = Deno.env.get("FLOW_API_KEY")!;
    const FLOW_SECRET_KEY = Deno.env.get("FLOW_SECRET_KEY")!;
    const FLOW_API_URL = Deno.env.get("FLOW_API_URL") || "https://sandbox.flow.cl/api";
    const FLOW_CONFIRMATION_URL =
      Deno.env.get("FLOW_CONFIRMATION_URL") ||
      `${SUPABASE_URL}/functions/v1/flow-webhook`;
    const FLOW_RETURN_URL =
      Deno.env.get("FLOW_RETURN_URL") ||
      "https://p-renault.github.io/somos-agenda/dashboard.html?flow_return=1";

    if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY || !FLOW_API_KEY || !FLOW_SECRET_KEY) {
      return json({ error: "FLOW_SERVER_NOT_CONFIGURED" }, 500);
    }

    const token = authHeader.replace(/^Bearer\s+/i, "");
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return json({ error: "AUTH_INVALID" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const body = await req.json().catch(() => ({}));
    const planCode = String(body?.planCode || "").trim().toLowerCase();

    if (!planCode || planCode === "free") {
      return json({ error: "PAID_PLAN_REQUIRED" }, 400);
    }

    const { data: memberships, error: membershipError } = await admin
      .from("business_members")
      .select("business_id,role")
      .eq("user_id", userData.user.id)
      .eq("active", true)
      .in("role", ["owner", "admin"])
      .order("created_at", { ascending: true })
      .limit(1);

    if (membershipError || !memberships?.length) {
      return json({ error: "BUSINESS_ADMIN_REQUIRED" }, 403);
    }

    const businessId = memberships[0].business_id;

    const { data: plan, error: planError } = await admin
      .from("plans")
      .select("id,code,name,description,price_monthly,currency,is_active")
      .eq("code", planCode)
      .eq("is_active", true)
      .maybeSingle();

    if (planError || !plan) return json({ error: "PLAN_NOT_FOUND" }, 404);

    const amount = Number(plan.price_monthly || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      return json({ error: "PLAN_NOT_PAYABLE" }, 400);
    }

    const { data: subscription, error: subscriptionError } = await admin
      .from("subscriptions")
      .select("id,business_id,plan_id,status")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subscriptionError || !subscription) {
      return json({ error: "MEMBERSHIP_NOT_INITIALIZED" }, 409);
    }

    const commerceOrder =
      `AY-${businessId.slice(0, 8)}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

    const params: Record<string, string | number> = {
      apiKey: FLOW_API_KEY,
      commerceOrder,
      subject: `Agenda YA · Plan ${plan.name}`,
      currency: "CLP",
      amount,
      email: userData.user.email || "",
      urlConfirmation: FLOW_CONFIRMATION_URL,
      urlReturn: FLOW_RETURN_URL,
      optional: JSON.stringify({
        business_id: businessId,
        subscription_id: subscription.id,
        plan_id: plan.id,
        plan_code: plan.code,
      }),
    };

    const signature = await hmacSha256(FLOW_SECRET_KEY, sign(params));
    const form = new URLSearchParams();
    for (const [key, value] of Object.entries({ ...params, s: signature })) {
      form.set(key, String(value));
    }

    const response = await fetch(`${FLOW_API_URL}/payment/create`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });

    const flow = await response.json().catch(() => null);
    if (!response.ok || !flow?.url || !flow?.token || !flow?.flowOrder) {
      return json({
        error: "FLOW_CREATE_FAILED",
        flow_status: response.status,
        detail: flow,
      }, 502);
    }

    const checkoutUrl = `${flow.url}?token=${encodeURIComponent(flow.token)}`;

    const { data: payment, error: paymentError } = await admin
      .from("payments")
      .insert({
        business_id: businessId,
        subscription_id: subscription.id,
        provider: "flow",
        provider_payment_id: String(flow.flowOrder),
        provider_order_id: commerceOrder,
        provider_token: String(flow.token),
        checkout_url: checkoutUrl,
        target_plan_id: plan.id,
        amount,
        currency: "CLP",
        status: "pending",
      })
      .select("id,provider_order_id,provider_payment_id,provider_token,checkout_url,status,amount,currency")
      .single();

    if (paymentError) {
      return json({
        error: "PAYMENT_RECORD_FAILED",
        detail: paymentError.message,
      }, 500);
    }

    return json({
      ok: true,
      payment,
      plan: { code: plan.code, name: plan.name, amount },
      checkoutUrl,
    });
  } catch (error) {
    return json({
      error: "FLOW_CHECKOUT_INTERNAL_ERROR",
      detail: error instanceof Error ? error.message : String(error),
    }, 500);
  }
});
