// Agenda YA · D1 / B19 · Flow Webhook
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

function response(status = 200, body = "OK") {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return response(405, "METHOD_NOT_ALLOWED");

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const FLOW_API_KEY = Deno.env.get("FLOW_API_KEY")!;
    const FLOW_SECRET_KEY = Deno.env.get("FLOW_SECRET_KEY")!;
    const FLOW_API_URL = Deno.env.get("FLOW_API_URL") || "https://sandbox.flow.cl/api";

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !FLOW_API_KEY || !FLOW_SECRET_KEY) {
      return response(500, "FLOW_SERVER_NOT_CONFIGURED");
    }

    const raw = await req.text();
    const form = new URLSearchParams(raw);
    const token = form.get("token")?.trim();

    if (!token) return response(400, "TOKEN_REQUIRED");

    // Flow envía el token mediante POST. El estado definitivo se consulta
    // server-to-server usando payment/getStatus; el navegador nunca decide el pago.
    const statusParams: Record<string, string> = {
      apiKey: FLOW_API_KEY,
      token,
    };
    const signature = await hmacSha256(FLOW_SECRET_KEY, sign(statusParams));

    const query = new URLSearchParams({
      apiKey: FLOW_API_KEY,
      token,
      s: signature,
    });

    const flowResponse = await fetch(
      `${FLOW_API_URL}/payment/getStatus?${query.toString()}`,
      { method: "GET" },
    );

    const flowStatus = await flowResponse.json().catch(() => null);
    if (!flowResponse.ok || !flowStatus) {
      return response(502, "FLOW_STATUS_QUERY_FAILED");
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data, error } = await admin.rpc("process_flow_payment_webhook", {
      p_provider_token: token,
      p_flow_status: Number(flowStatus.status),
      p_payload: flowStatus,
    });

    if (error) {
      console.error("Agenda YA B19:", error);
      if (String(error.message || "").includes("FLOW_PAYMENT_NOT_FOUND")) {
        return response(404, "PAYMENT_NOT_FOUND");
      }
      return response(500, "PAYMENT_PROCESSING_FAILED");
    }

    console.log("Agenda YA B19 processed:", JSON.stringify(data));
    return response(200, "OK");
  } catch (error) {
    console.error("Agenda YA B19 internal:", error);
    return response(500, "INTERNAL_ERROR");
  }
});
