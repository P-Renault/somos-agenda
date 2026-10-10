import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const FLOW_API_URL = Deno.env.get("FLOW_API_URL");
const FLOW_API_KEY = Deno.env.get("FLOW_API_KEY");
const FLOW_SECRET_KEY = Deno.env.get("FLOW_SECRET_KEY");

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get(
  "SUPABASE_SERVICE_ROLE_KEY",
);

function respond(
  body: Record<string, unknown>,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

async function signFlowParams(
  params: Record<string, string>,
  secret: string,
): Promise<string> {
  const data = Object.keys(params)
    .sort()
    .map((key) => key + params[key])
    .join("");

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    new TextEncoder().encode(data),
  );

  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Extrae el token de Flow admitiendo:
 * - Parámetro token en la URL.
 * - Cuerpo JSON.
 * - Formulario URL-encoded.
 * - Formulario sin Content-Type.
 * - Token como texto plano.
 *
 * No registra ni expone el token en los logs.
 */
async function readToken(req: Request): Promise<string> {
  const queryToken = new URL(req.url).searchParams.get("token");

  if (queryToken?.trim()) {
    return queryToken.trim();
  }

  const contentType = (
    req.headers.get("content-type") || ""
  ).toLowerCase();

  const raw = await req.text();

  if (!raw.trim()) {
    return "";
  }

  // JSON explícito o cuerpo que aparenta ser JSON.
  if (
    contentType.includes("application/json") ||
    raw.trim().startsWith("{")
  ) {
    try {
      const body = JSON.parse(raw);
      const token = body && typeof body === "object"
        ? body.token
        : "";

      if (
        typeof token === "string" ||
        typeof token === "number"
      ) {
        return String(token).trim();
      }
    } catch {
      // Continuar con la interpretación de formulario o texto.
    }
  }

  // Formulario incluso si falta el encabezado Content-Type.
  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    /(?:^|&)token=/.test(raw.trim())
  ) {
    const formToken = new URLSearchParams(
      raw.trim(),
    ).get("token");

    if (formToken?.trim()) {
      return formToken.trim();
    }
  }

  // Último recurso: cuerpo con el token en texto plano.
  return raw.trim();
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return respond(
      { ok: false, error: "METHOD_NOT_ALLOWED" },
      405,
    );
  }

  try {
    if (
      !FLOW_API_URL ||
      !FLOW_API_KEY ||
      !FLOW_SECRET_KEY ||
      !SUPABASE_URL ||
      !SUPABASE_SERVICE_ROLE_KEY
    ) {
      console.error("Webhook configuration is incomplete.");

      return respond(
        { ok: false, error: "CONFIG_MISSING" },
        500,
      );
    }

    const flowBase = FLOW_API_URL.replace(/\/+$/, "");

    if (
      flowBase !== "https://www.flow.cl/api" &&
      flowBase !== "https://sandbox.flow.cl/api"
    ) {
      return respond(
        { ok: false, error: "FLOW_API_URL_NOT_ALLOWED" },
        500,
      );
    }

    const token = await readToken(req);

    if (!token || token.length > 500) {
      return respond(
        { ok: false, error: "FLOW_TOKEN_REQUIRED" },
        400,
      );
    }

    // Consultar el estado de la transacción en Flow.
    const statusParams: Record<string, string> = {
      apiKey: FLOW_API_KEY,
      token,
    };

    const signature = await signFlowParams(
      statusParams,
      FLOW_SECRET_KEY,
    );

    const statusUrl = new URL(
      `${flowBase}/payment/getStatus`,
    );

    statusUrl.searchParams.set(
      "apiKey",
      FLOW_API_KEY,
    );

    statusUrl.searchParams.set(
      "token",
      token,
    );

    statusUrl.searchParams.set(
      "s",
      signature,
    );

    const flowResponse = await fetch(
      statusUrl.toString(),
      {
        method: "GET",
        signal: AbortSignal.timeout(20000),
      },
    );

    const rawFlowResponse = await flowResponse.text();

    let flowData: Record<string, unknown>;

    try {
      flowData = JSON.parse(rawFlowResponse);
    } catch {
      console.error(
        "Flow getStatus returned invalid JSON.",
      );

      return respond(
        { ok: false, error: "FLOW_INVALID_RESPONSE" },
        502,
      );
    }

    if (!flowResponse.ok) {
      const flowCode =
        typeof flowData.code === "string" ||
        typeof flowData.code === "number"
          ? flowData.code
          : null;

      const flowMessage =
        typeof flowData.message === "string"
          ? flowData.message.slice(0, 300)
          : null;

      console.error(
        "Flow getStatus request failed:",
        {
          httpStatus: flowResponse.status,
          flowCode,
          flowMessage,
        },
      );

      return respond(
        {
          ok: false,
          error: "FLOW_STATUS_REQUEST_FAILED",
          flow_http_status: flowResponse.status,
          flow_code: flowCode,
          flow_message: flowMessage,
        },
        502,
      );
    }

    // Validar los datos devueltos por Flow.
    const commerceOrder = String(
      flowData.commerceOrder || "",
    );

    const flowStatus = Number(flowData.status);
    const amount = Number(flowData.amount);
    const currency = String(flowData.currency || "");

    if (
      !commerceOrder ||
      !Number.isInteger(flowStatus) ||
      ![1, 2, 3, 4].includes(flowStatus) ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      currency !== "CLP"
    ) {
      console.error(
        "Flow transaction data failed validation.",
      );

      return respond(
        { ok: false, error: "FLOW_DATA_INVALID" },
        400,
      );
    }

    // Cliente administrativo de Supabase.
    const adminClient = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );

    // Localizar el pago usando el token recibido.
    const {
      data: payment,
      error: paymentError,
    } = await adminClient
      .from("payments")
      .select(
        "id, business_id, subscription_id, provider, provider_token, provider_order_id, amount, currency, status, target_plan_id",
      )
      .eq("provider", "flow")
      .eq("provider_token", token)
      .maybeSingle();

    if (paymentError) {
      console.error(
        "Payment lookup failed:",
        paymentError.message,
      );

      return respond(
        { ok: false, error: "PAYMENT_LOOKUP_FAILED" },
        500,
      );
    }

    if (!payment) {
      console.error(
        "No payment matches the Flow token.",
      );

      return respond(
        { ok: false, error: "PAYMENT_NOT_FOUND" },
        404,
      );
    }

    // Verificar que la transacción coincida con el pago registrado.
    if (
      payment.provider_order_id !== commerceOrder ||
      Number(payment.amount) !== amount ||
      payment.currency !== currency
    ) {
      console.error(
        "Flow transaction does not match stored payment.",
        {
          paymentId: payment.id,
          commerceOrder,
        },
      );

      return respond(
        { ok: false, error: "PAYMENT_MISMATCH" },
        409,
      );
    }

    // Procesar el pago mediante la función SQL existente.
    const {
      data: result,
      error: rpcError,
    } = await adminClient.rpc(
      "process_flow_payment_webhook",
      {
        p_provider_token: token,
        p_flow_status: flowStatus,
        p_payload: flowData,
      },
    );

    if (rpcError) {
      console.error(
        "Payment webhook RPC failed:",
        rpcError.message,
      );

      return respond(
        {
          ok: false,
          error: "PAYMENT_PROCESSING_FAILED",
        },
        500,
      );
    }

    console.log(
      "Flow webhook processed:",
      {
        paymentId: payment.id,
        flowStatus,
        result,
      },
    );

    return respond({
      ok: true,
      received: true,
      payment_id: payment.id,
      payment_status:
        result?.payment_status ?? payment.status,
    });
  } catch (error) {
    console.error(
      "flow-webhook internal error:",
      error instanceof Error
        ? error.message
        : "UNKNOWN",
    );

    return respond(
      { ok: false, error: "INTERNAL_ERROR" },
      500,
    );
  }
});
