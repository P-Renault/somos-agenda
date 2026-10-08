import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://p-renault.github.io",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const FLOW_API_URL =
  Deno.env.get("FLOW_API_URL") || "https://sandbox.flow.cl/api";
const FLOW_API_KEY = Deno.env.get("FLOW_API_KEY");
const FLOW_SECRET_KEY = Deno.env.get("FLOW_SECRET_KEY");
const FLOW_CONFIRMATION_URL = Deno.env.get("FLOW_CONFIRMATION_URL");
const FLOW_RETURN_URL = Deno.env.get("FLOW_RETURN_URL");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

async function flowSignature(params: Record<string, string>, secret: string) {
  const data = Object.keys(params).sort().map((k) => k + params[k]).join("");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(data),
  );
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return jsonResponse({ ok: false, error: "METHOD_NOT_ALLOWED" }, 405);
    }

    if (!FLOW_API_KEY) return jsonResponse({ ok: false, error: "FLOW_API_KEY_MISSING" }, 500);
    if (!FLOW_SECRET_KEY) return jsonResponse({ ok: false, error: "FLOW_SECRET_KEY_MISSING" }, 500);
    if (!FLOW_CONFIRMATION_URL) return jsonResponse({ ok: false, error: "FLOW_CONFIRMATION_URL_MISSING" }, 500);
    if (!FLOW_RETURN_URL) return jsonResponse({ ok: false, error: "FLOW_RETURN_URL_MISSING" }, 500);
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      return jsonResponse({ ok: false, error: "SUPABASE_CONFIG_MISSING" }, 500);
    }

    const authorization = req.headers.get("Authorization") || "";
    if (!authorization.startsWith("Bearer ")) {
      return jsonResponse({ ok: false, error: "AUTHORIZATION_REQUIRED" }, 401);
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authorization } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return jsonResponse({ ok: false, error: "INVALID_AUTHENTICATION" }, 401);
    }

    const body = await req.json().catch(() => null);
    const planCode = String(body?.plan_code || "").trim().toLowerCase();
    if (!planCode) return jsonResponse({ ok: false, error: "PLAN_CODE_REQUIRED" }, 400);

    const { data: payment, error: paymentError } = await userClient.rpc(
      "create_payment_intent",
      { p_plan_code: planCode },
    );

    if (paymentError) {
      return jsonResponse({ ok: false, error: paymentError.message }, 400);
    }
    if (!payment) return jsonResponse({ ok: false, error: "PAYMENT_INTENT_NOT_CREATED" }, 500);

    const paymentId = String(payment.id);
    const commerceOrder = `AGENDA-YA-${paymentId}`;
    const amount = Math.round(Number(payment.amount));
    const currency = String(payment.currency || "CLP");
    const metadata = payment.metadata || {};
    const targetPlanCode = String(metadata?.target_plan_code || planCode);
    const subject = `Agenda YA - Plan ${targetPlanCode.toUpperCase()}`;
    const email = user.email || "";

    if (!email) return jsonResponse({ ok: false, error: "USER_EMAIL_REQUIRED" }, 400);

    const flowParams: Record<string, string> = {
      apiKey: FLOW_API_KEY,
      commerceOrder: commerceOrder,
      subject,
      amount: String(amount),
      email,
      urlConfirmation: FLOW_CONFIRMATION_URL,
      urlReturn: FLOW_RETURN_URL,
      currency,
    };

    const signature = await flowSignature(flowParams, FLOW_SECRET_KEY);
    const form = new URLSearchParams();
    for (const [k, v] of Object.entries(flowParams)) form.set(k, v);
    form.set("s", signature);

    const flowResponse = await fetch(`${FLOW_API_URL}/payment/create`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });

    const flowText = await flowResponse.text();
    let flowData: Record<string, unknown>;
    try {
      flowData = JSON.parse(flowText);
    } catch {
      return jsonResponse({
        ok: false,
        error: "FLOW_INVALID_RESPONSE",
        http_status: flowResponse.status,
        response: flowText,
      }, 502);
    }

    if (!flowResponse.ok) {
      return jsonResponse({
        ok: false,
        error: "FLOW_CREATE_PAYMENT_ERROR",
        http_status: flowResponse.status,
        flow: flowData,
      }, 502);
    }

    const flowToken = String(flowData.token || "");
    const flowUrl = String(flowData.url || "");
    const flowOrder = flowData.flowOrder != null ? String(flowData.flowOrder) : "";

    if (!flowToken || !flowUrl) {
      return jsonResponse({
        ok: false,
        error: "FLOW_CHECKOUT_DATA_MISSING",
        flow: flowData,
      }, 502);
    }

    const checkoutUrl = new URL(flowUrl);
    checkoutUrl.searchParams.set("token", flowToken);

    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: updatedPayment, error: updateError } = await serviceClient
      .from("payments")
      .update({
        provider_order_id: commerceOrder,
        provider_token: flowToken,
        checkout_url: checkoutUrl.toString(),
        provider_payload: flowData,
        status: "pending",
        updated_at: new Date().toISOString(),
      })
      .eq("id", paymentId)
      .select()
      .single();

    if (updateError) {
      return jsonResponse({
        ok: false,
        error: "PAYMENT_UPDATE_ERROR",
        detail: updateError.message,
      }, 500);
    }

    return jsonResponse({
      ok: true,
      environment: FLOW_API_URL.includes("sandbox") ? "sandbox" : "production",
      payment_id: updatedPayment?.id || paymentId,
      subscription_id: payment.subscription_id,
      plan_code: targetPlanCode,
      amount,
      currency,
      commerce_order: commerceOrder,
      flow_order: flowOrder,
      token: flowToken,
      checkout_url: checkoutUrl.toString(),
      status: "pending",
    });
  } catch (error) {
    return jsonResponse({
      ok: false,
      error: error instanceof Error ? error.message : "UNKNOWN_ERROR",
    }, 500);
  }
});
