/**
 * Agenda YA — Flow browser return handler.
 * Flow may POST form-encoded `token` to urlReturn. GitHub Pages cannot process
 * that POST, so this Edge Function consumes it and responds with a 303 redirect.
 * Payment activation remains server-verified by flow-webhook / SQL RPC only.
 */
const DASHBOARD_URL = "https://p-renault.github.io/somos-agenda/dashboard.html";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

function redirectToDashboard(result = "pending"): Response {
  const target = new URL(DASHBOARD_URL);
  target.searchParams.set("flow_return", "1");
  target.searchParams.set("flow_result", result);
  return new Response(null, {
    status: 303,
    headers: {
      "Location": target.toString(),
      "Cache-Control": "no-store, max-age=0",
      "Referrer-Policy": "no-referrer",
    },
  });
}

async function readToken(req: Request): Promise<string> {
  const type = (req.headers.get("content-type") || "").toLowerCase();
  if (type.includes("application/x-www-form-urlencoded") || type.includes("multipart/form-data")) {
    const form = await req.formData().catch(() => null);
    return String(form?.get("token") || "").trim();
  }
  if (type.includes("application/json")) {
    const body = await req.json().catch(() => null);
    return String(body?.token || "").trim();
  }
  const raw = await req.text().catch(() => "");
  return String(new URLSearchParams(raw).get("token") || "").trim();
}

Deno.serve(async (req: Request) => {
  // Some browser/navigation retries may arrive as GET; always recover to the app.
  if (req.method === "GET" || req.method === "HEAD") return redirectToDashboard("pending");
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: { Allow: "GET, HEAD, POST" } });

  const token = await readToken(req);
  if (!token || token.length > 500) return redirectToDashboard("pending");
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return redirectToDashboard("pending");

  // Process the return token through the same server-side verifier as the webhook.
  // The webhook independently verifies token/status/amount/order with Flow.
  try {
    const webhook = `${SUPABASE_URL.replace(/\/+$/, "")}/functions/v1/flow-webhook`;
    const response = await fetch(webhook, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: new URLSearchParams({ token }).toString(),
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) console.error("flow-return: webhook processing deferred", response.status);
  } catch (error) {
    console.error("flow-return: webhook request failed", error instanceof Error ? error.message : "UNKNOWN");
  }
  return redirectToDashboard("pending");
});
