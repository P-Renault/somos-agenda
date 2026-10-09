import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://p-renault.github.io",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};
const FLOW_API_URL = Deno.env.get("FLOW_API_URL");
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
  const data = Object.keys(params).sort().map(k => k + params[k]).join("");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ ok: false, error: "METHOD_NOT_ALLOWED" }, 405);
  try {
    if (!FLOW_API_URL || !FLOW_API_KEY || !FLOW_SECRET_KEY || !FLOW_CONFIRMATION_URL || !FLOW_RETURN_URL)
      return jsonResponse({ ok: false, error: "FLOW_CONFIG_MISSING" }, 500);
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY)
      return jsonResponse({ ok: false, error: "SUPABASE_CONFIG_MISSING" }, 500);

    const flowBase = FLOW_API_URL.replace(/\/+$/, "");
    if (!["https://www.flow.cl/api", "https://sandbox.flow.cl/api"].includes(flowBase))
      return jsonResponse({ ok: false, error: "FLOW_API_URL_NOT_ALLOWED" }, 500);

    const authorization = req.headers.get("Authorization") || "";
    if (!authorization.startsWith("Bearer "))
      return jsonResponse({ ok: false, error: "AUTHORIZATION_REQUIRED" }, 401);
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return jsonResponse({ ok: false, error: "INVALID_AUTHENTICATION" }, 401);
    if (!user.email) return jsonResponse({ ok: false, error: "USER_EMAIL_REQUIRED" }, 400);

    const body = await req.json().catch(() => null);
    const planCode = String(body?.plan_code || "").trim().toLowerCase();
    if (!["pro", "business"].includes(planCode))
      return jsonResponse({ ok: false, error: "INVALID_PLAN_CODE" }, 400);

    const { data: payment, error: intentError } = await userClient.rpc("create_payment_intent", {
      p_plan_code: planCode,
    });
    if (intentError) {
      console.error("create_payment_intent failed:", intentError.message);
      return jsonResponse({ ok: false, error: "PAYMENT_INTENT_ERROR" }, 400);
    }
    if (!payment?.id || !payment?.business_id)
      return jsonResponse({ ok: false, error: "PAYMENT_INTENT_NOT_CREATED" }, 500);

    const paymentId = String(payment.id);
    const businessId = String(payment.business_id);
    const amount = Number(payment.amount);
    const currency = String(payment.currency || "CLP");
    const metadata = payment.metadata && typeof payment.metadata === "object" ? payment.metadata : {};
    const targetPlanCode = String(metadata.target_plan_code || planCode).toLowerCase();
    if (!Number.isSafeInteger(amount) || amount <= 0 || currency !== "CLP" || targetPlanCode !== planCode)
      return jsonResponse({ ok: false, error: "INVALID_PAYMENT_DATA" }, 500);

    const commerceOrder = `AY-${paymentId}`;
    const params: Record<string, string> = {
      apiKey: FLOW_API_KEY,
      commerceOrder,
      subject: `Agenda YA - Plan ${targetPlanCode.toUpperCase()}`,
      amount: String(amount),
      email: user.email,
      urlConfirmation: FLOW_CONFIRMATION_URL,
      urlReturn: FLOW_RETURN_URL,
      currency,
    };
    const signature = await flowSignature(params, FLOW_SECRET_KEY);
    const form = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) form.set(key, value);
    form.set("s", signature);

    let flowResponse: Response;
    try {
      flowResponse = await fetch(`${flowBase}/payment/create`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form.toString(),
        signal: AbortSignal.timeout(20000),
      });
    } catch {
      return jsonResponse({ ok: false, error: "FLOW_REQUEST_FAILED" }, 502);
    }
    const raw = await flowResponse.text();
    let flow: Record<string, unknown>;
    try { flow = JSON.parse(raw); }
    catch { return jsonResponse({ ok: false, error: "FLOW_INVALID_RESPONSE", http_status: flowResponse.status }, 502); }
    if (!flowResponse.ok) {
      console.error("Flow rejected checkout:", { status: flowResponse.status, code: flow.code, message: flow.message });
      return jsonResponse({ ok: false, error: "FLOW_CREATE_PAYMENT_ERROR", http_status: flowResponse.status,
        flow_code: flow.code ?? null, flow_message: flow.message ?? null }, 502);
    }

    const token = String(flow.token || "");
    const flowUrl = String(flow.url || "");
    const flowOrder = flow.flowOrder == null ? "" : String(flow.flowOrder);
    if (!token || !flowUrl) return jsonResponse({ ok: false, error: "FLOW_CHECKOUT_DATA_MISSING" }, 502);
    let checkout: URL;
    try { checkout = new URL(flowUrl); }
    catch { return jsonResponse({ ok: false, error: "FLOW_CHECKOUT_URL_INVALID" }, 502); }
    if (checkout.protocol !== "https:" || !["flow.cl", "www.flow.cl", "sandbox.flow.cl"].includes(checkout.hostname))
      return jsonResponse({ ok: false, error: "FLOW_CHECKOUT_HOST_INVALID" }, 502);
    checkout.searchParams.set("token", token);

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: saved, error: saveError } = await admin.from("payments").update({
      provider_order_id: commerceOrder,
      provider_token: token,
      checkout_url: checkout.toString(),
      provider_payload: flow,
      status: "pending",
      updated_at: new Date().toISOString(),
    }).eq("id", paymentId).eq("business_id", businessId).eq("status", "pending")
      .select("id,amount,currency,status").single();

    if (saveError || !saved) {
      console.error("Could not persist Flow checkout:", saveError?.message || "NO_ROW_UPDATED");
      return jsonResponse({ ok: false, error: "PAYMENT_UPDATE_ERROR" }, 500);
    }
    if (Number(saved.amount) !== amount || saved.currency !== currency || saved.status !== "pending")
      return jsonResponse({ ok: false, error: "PAYMENT_PERSISTENCE_MISMATCH" }, 500);

    const environment = flowBase.includes("sandbox") ? "sandbox" : "production";
    console.log("Flow checkout created:", { paymentId, planCode, amount, currency, environment });
    return jsonResponse({
      ok: true, environment, payment_id: saved.id,
      subscription_id: payment.subscription_id ?? null, plan_code: targetPlanCode,
      amount, currency, commerce_order: commerceOrder, flow_order: flowOrder,
      checkout_url: checkout.toString(), status: "pending",
    });
  } catch (error) {
    console.error("flow-create-payment internal:", error instanceof Error ? error.message : "UNKNOWN");
    return jsonResponse({ ok: false, error: "INTERNAL_ERROR" }, 500);
  }
});
