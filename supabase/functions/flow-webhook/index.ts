import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const FLOW_API_URL = Deno.env.get("FLOW_API_URL");
const FLOW_API_KEY = Deno.env.get("FLOW_API_KEY");
const FLOW_SECRET_KEY = Deno.env.get("FLOW_SECRET_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

function respond(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

async function signFlowParams(params: Record<string, string>, secret: string): Promise<string> {
  const data = Object.keys(params).sort().map((key) => key + params[key]).join("");
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function readToken(req: Request): Promise<string> {
  const contentType = (req.headers.get("content-type") || "").toLowerCase();
  if (contentType.includes("application/json")) {
    const body = await req.json().catch(() => null);
    return String(body?.token || "").trim();
  }
  const raw = await req.text();
  if (contentType.includes("application/x-www-form-urlencoded")) {
    return String(new URLSearchParams(raw).get("token") || "").trim();
  }
  return raw.trim();
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return respond({ ok: false, error: "METHOD_NOT_ALLOWED" }, 405);
  }

  try {
    if (!FLOW_API_URL || !FLOW_API_KEY || !FLOW_SECRET_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("flow-webhook: required server configuration is missing");
      return respond({ ok: false, error: "CONFIG_MISSING" }, 500);
    }

    const flowBase = FLOW_API_URL.replace(/\/+$/, "");
    if (flowBase !== "https://www.flow.cl/api" && flowBase !== "https://sandbox.flow.cl/api") {
      return respond({ ok: false, error: "FLOW_API_URL_NOT_ALLOWED" }, 500);
    }

    const token = await readToken(req);
    if (!token || token.length > 500) {
      return respond({ ok: false, error: "FLOW_TOKEN_REQUIRED" }, 400);
    }

    // La notificación de Flow solo aporta el token. El estado confiable se consulta servidor a servidor.
    const signature = await signFlowParams({ apiKey: FLOW_API_KEY, token }, FLOW_SECRET_KEY);
    const statusUrl = new URL(`${flowBase}/payment/getStatus`);
    statusUrl.searchParams.set("apiKey", FLOW_API_KEY);
    statusUrl.searchParams.set("token", token);
    statusUrl.searchParams.set("s", signature);

    const flowResponse = await fetch(statusUrl.toString(), {
      method: "GET",
      signal: AbortSignal.timeout(20000),
    });
    const raw = await flowResponse.text();
    let flowData: Record<string, unknown>;
    try {
      flowData = JSON.parse(raw);
    } catch {
      console.error("flow-webhook: invalid JSON from Flow", flowResponse.status);
      return respond({ ok: false, error: "FLOW_INVALID_RESPONSE" }, 502);
    }
    if (!flowResponse.ok) {
      console.error("flow-webhook: Flow status request failed", flowResponse.status);
      return respond({ ok: false, error: "FLOW_STATUS_REQUEST_FAILED" }, 502);
    }

    const commerceOrder = String(flowData.commerceOrder || "");
    const flowStatus = Number(flowData.status);
    const amount = Number(flowData.amount);
    const currency = String(flowData.currency || "");

    if (!commerceOrder || !Number.isInteger(flowStatus) || ![1, 2, 3, 4].includes(flowStatus)
      || !Number.isSafeInteger(amount) || amount <= 0 || currency !== "CLP") {
      console.error("flow-webhook: Flow transaction data failed validation");
      return respond({ ok: false, error: "FLOW_DATA_INVALID" }, 400);
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: payment, error: lookupError } = await admin
      .from("payments")
      .select("id,business_id,subscription_id,provider,provider_token,provider_order_id,amount,currency,status,target_plan_id")
      .eq("provider", "flow")
      .eq("provider_token", token)
      .maybeSingle();

    if (lookupError) {
      console.error("flow-webhook: payment lookup failed", lookupError.message);
      return respond({ ok: false, error: "PAYMENT_LOOKUP_FAILED" }, 500);
    }
    if (!payment) return respond({ ok: false, error: "PAYMENT_NOT_FOUND" }, 404);

    if (payment.provider_order_id !== commerceOrder
      || Number(payment.amount) !== amount
      || payment.currency !== currency
      || !payment.subscription_id
      || !payment.target_plan_id) {
      console.error("flow-webhook: transaction mismatch", { paymentId: payment.id, commerceOrder });
      return respond({ ok: false, error: "PAYMENT_MISMATCH" }, 409);
    }

    // No se confía en parámetros del navegador ni en la notificación sola.
    // La función SQL solo puede invocarse con service_role (permisos ya verificados).
    const { data: result, error: rpcError } = await admin.rpc("process_flow_payment_webhook", {
      p_provider_token: token,
      p_flow_status: flowStatus,
      p_payload: flowData,
    });

    if (rpcError) {
      console.error("flow-webhook: payment processing failed", rpcError.message);
      return respond({ ok: false, error: "PAYMENT_PROCESSING_FAILED" }, 500);
    }

    console.log("flow-webhook processed", {
      paymentId: payment.id,
      flowStatus,
      paymentStatus: result?.payment_status ?? null,
      subscriptionUpdated: result?.subscription_updated ?? null,
    });

    return respond({
      ok: true,
      received: true,
      payment_id: payment.id,
      payment_status: result?.payment_status ?? payment.status,
      subscription_updated: result?.subscription_updated ?? false,
    });
  } catch (error) {
    console.error("flow-webhook internal error", error instanceof Error ? error.message : "UNKNOWN");
    return respond({ ok: false, error: "INTERNAL_ERROR" }, 500);
  }
});
