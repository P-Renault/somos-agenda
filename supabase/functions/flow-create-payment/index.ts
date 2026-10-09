
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://p-renault.github.io",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get(
  "SUPABASE_SERVICE_ROLE_KEY",
);

// TEMPORAL: retirar inmediatamente después de validar el pago.
const TEMP_TEST_USER_ID =
  "919c5f9f-c3d6-42b3-a6f6-d93446137415";
const TEMP_TEST_AMOUNT_CLP = 300;

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders,
  });
}

async function flowSignature(
  params: Record<string, string>,
  secret: string,
) {
  const data = Object.keys(params)
    .sort()
    .map((key) => key + params[key])
    .join("");

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
    new TextEncoder().encode(data),
  );

  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    if (req.method !== "POST") {
      return jsonResponse(
        { ok: false, error: "METHOD_NOT_ALLOWED" },
        405,
      );
    }

    if (
      !FLOW_API_KEY ||
      !FLOW_SECRET_KEY ||
      !FLOW_CONFIRMATION_URL ||
      !FLOW_RETURN_URL
    ) {
      return jsonResponse(
        { ok: false, error: "FLOW_CONFIG_MISSING" },
        500,
      );
    }

    if (
      !SUPABASE_URL ||
      !SUPABASE_ANON_KEY ||
      !SUPABASE_SERVICE_ROLE_KEY
    ) {
      return jsonResponse(
        { ok: false, error: "SUPABASE_CONFIG_MISSING" },
        500,
      );
    }

    const authorization = req.headers.get("Authorization") || "";

    if (!authorization.startsWith("Bearer ")) {
      return jsonResponse(
        { ok: false, error: "AUTHORIZATION_REQUIRED" },
        401,
      );
    }

    const userClient = createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      {
        global: {
          headers: { Authorization: authorization },
        },
      },
    );

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return jsonResponse(
        { ok: false, error: "INVALID_AUTHENTICATION" },
        401,
      );
    }

    const body = await req.json().catch(() => null);
    const planCode = String(body?.plan_code || "")
      .trim()
      .toLowerCase();

    if (!planCode) {
      return jsonResponse(
        { ok: false, error: "PLAN_CODE_REQUIRED" },
        400,
      );
    }

    // Solo la cuenta autorizada puede usar el precio temporal.
    const isTemporaryTestPayment =
      user.id === TEMP_TEST_USER_ID &&
      planCode === "pro";

    const { data: payment, error: paymentError } =
      await userClient.rpc("create_payment_intent", {
        p_plan_code: planCode,
      });

    if (paymentError) {
      return jsonResponse(
        {
          ok: false,
          error: "PAYMENT_INTENT_ERROR",
          detail: paymentError.message,
        },
        400,
      );
    }

    if (!payment) {
      return jsonResponse(
        { ok: false, error: "PAYMENT_INTENT_NOT_CREATED" },
        500,
      );
    }

    const paymentId = String(payment.id);

    // 7 caracteres + UUID de 36 = 43; dentro del límite de Flow.
    const commerceOrder = `AGENDA-${paymentId}`;

    let amount = Math.round(Number(payment.amount));
    const currency = String(payment.currency || "CLP");
    const metadata = payment.metadata || {};
    const targetPlanCode = String(
      metadata?.target_plan_code || planCode,
    );
    const subject = `Agenda YA - Plan ${targetPlanCode.toUpperCase()}`;
    const email = user.email || "";

    if (!email) {
      return jsonResponse(
        { ok: false, error: "USER_EMAIL_REQUIRED" },
        400,
      );
    }

    const serviceClient = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
    );

    // Persistir y verificar los $300 antes de firmar la solicitud.
    // No se cambia public.plans ni se acepta un importe desde el cliente.
    if (isTemporaryTestPayment) {
      const { data: testPayment, error: testAmountError } =
        await serviceClient
          .from("payments")
          .update({
            amount: TEMP_TEST_AMOUNT_CLP,
            currency: "CLP",
            metadata: {
              ...metadata,
              flow_test_mode: "temporary_owner_pro_300_clp",
              flow_test_user_id: TEMP_TEST_USER_ID,
            },
            updated_at: new Date().toISOString(),
          })
          .eq("id", paymentId)
          .eq("business_id", payment.business_id)
          .eq("status", "pending")
          .select("id, amount, currency")
          .single();

      if (
        testAmountError ||
        !testPayment ||
        Number(testPayment.amount) !== TEMP_TEST_AMOUNT_CLP ||
        testPayment.currency !== "CLP"
      ) {
        console.error(
          "Temporary test amount update failed:",
          testAmountError,
        );

        return jsonResponse(
          { ok: false, error: "TEST_AMOUNT_VERIFICATION_FAILED" },
          500,
        );
      }

      amount = Number(testPayment.amount);
    }

    const flowParams: Record<string, string> = {
      apiKey: FLOW_API_KEY,
      commerceOrder,
      subject,
      amount: String(amount),
      email,
      urlConfirmation: FLOW_CONFIRMATION_URL,
      urlReturn: FLOW_RETURN_URL,
      currency,
    };

    const signature = await flowSignature(
      flowParams,
      FLOW_SECRET_KEY,
    );

    const form = new URLSearchParams();
    for (const [key, value] of Object.entries(flowParams)) {
      form.set(key, value);
    }
    form.set("s", signature);

    const flowResponse = await fetch(
      `${FLOW_API_URL}/payment/create`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form.toString(),
      },
    );

    const flowText = await flowResponse.text();

    let flowData: Record<string, unknown>;
    try {
      flowData = JSON.parse(flowText);
    } catch {
      return jsonResponse(
        {
          ok: false,
          error: "FLOW_INVALID_RESPONSE",
          http_status: flowResponse.status,
        },
        502,
      );
    }

    if (!flowResponse.ok) {
      console.error("Flow create payment failed:", flowData);

      return jsonResponse(
        {
          ok: false,
          error: "FLOW_CREATE_PAYMENT_ERROR",
          http_status: flowResponse.status,
          flow: flowData,
        },
        502,
      );
    }

    const flowToken = String(flowData.token || "");
    const flowUrl = String(flowData.url || "");
    const flowOrder =
      flowData.flowOrder != null
        ? String(flowData.flowOrder)
        : "";

    if (!flowToken || !flowUrl) {
      return jsonResponse(
        { ok: false, error: "FLOW_CHECKOUT_DATA_MISSING" },
        502,
      );
    }

    const checkoutUrl = new URL(flowUrl);
    checkoutUrl.searchParams.set("token", flowToken);

    const { data: updatedPayment, error: updateError } =
      await serviceClient
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
        .eq("business_id", payment.business_id)
        .select("id, amount, currency, status")
        .single();

    if (updateError || !updatedPayment) {
      console.error("Payment checkout update failed:", updateError);

      return jsonResponse(
        { ok: false, error: "PAYMENT_UPDATE_ERROR" },
        500,
      );
    }

    // Verificación final antes de devolver el checkout.
    if (
      Number(updatedPayment.amount) !== amount ||
      updatedPayment.currency !== currency ||
      updatedPayment.status !== "pending"
    ) {
      return jsonResponse(
        { ok: false, error: "PAYMENT_AMOUNT_MISMATCH" },
        500,
      );
    }

    return jsonResponse({
      ok: true,
      environment: FLOW_API_URL.includes("sandbox")
        ? "sandbox"
        : "production",
      payment_id: updatedPayment.id,
      subscription_id: payment.subscription_id,
      plan_code: targetPlanCode,
      amount,
      currency,
      commerce_order: commerceOrder,
      flow_order: flowOrder,
      checkout_url: checkoutUrl.toString(),
      status: "pending",
      temporary_test: isTemporaryTestPayment,
    });
  } catch (error) {
    console.error("Flow create payment internal error:", error);

    return jsonResponse(
      {
        ok: false,
        error: error instanceof Error
          ? error.message
          : "UNKNOWN_ERROR",
      },
      500,
    );
  }
});
