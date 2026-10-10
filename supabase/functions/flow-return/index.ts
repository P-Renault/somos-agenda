
/**
 * Agenda YA — Flow browser return handler.
 * Receives Flow's browser return, asks flow-webhook to verify/process the token,
 * then redirects to dashboard. UI result is based on server billing state, not
 * on a browser-supplied status. Subscription activation remains in the SQL RPC.
 */
const DASHBOARD_URL = "https://p-renault.github.io/somos-agenda/dashboard.html";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

function redirectToDashboard(): Response {
  const target = new URL(DASHBOARD_URL);
  target.searchParams.set("flow_return", "1");
  return new Response(null, {
    status: 303,
    headers: {
      Location: target.toString(),
      "Cache-Control": "no-store, max-age=0",
      "Referrer-Policy": "no-referrer",
    },
  });
}

async function readToken(req: Request): Promise<string> {
  const urlToken = new URL(req.url).searchParams.get("token");
  if (urlToken?.trim()) return urlToken.trim();

  const contentType = (req.headers.get("content-type") || "").toLowerCase();
  const raw = await req.text().catch(() => "");
  if (!raw.trim()) return "";

  if (contentType.includes("application/json") || raw.trim().startsWith("{")) {
    try {
      const body = JSON.parse(raw);
      if (typeof body?.token === "string" || typeof body?.token === "number") {
        return String(body.token).trim();
      }
    } catch { /* Continue with form parsing. */ }
  }

  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data") ||
    /(?:^|&)token=/.test(raw.trim())
  ) {
    const token = new URLSearchParams(raw.trim()).get("token");
    if (token?.trim()) return token.trim();
  }

  return raw.trim();
}

Deno.serve(async (req: Request) => {
  // Flow commonly returns the browser with GET and the token in the query string.
  // HEAD cannot carry a useful payment result, so it only redirects.
  if (req.method === "HEAD") return redirectToDashboard();
  if (req.method !== "GET" && req.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: { Allow: "GET, HEAD, POST" },
    });
  }

  const token = await readToken(req);
  if (!token || token.length > 500) {
    console.error("flow-return: missing or invalid token format");
    return redirectToDashboard();
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("flow-return: required server configuration missing");
    return redirectToDashboard();
  }

  try {
    const endpoint = `${SUPABASE_URL.replace(/\/+$/, "")}/functions/v1/flow-webhook`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: new URLSearchParams({ token }).toString(),
      signal: AbortSignal.timeout(25000),
    });

    // Capture only a bounded, non-secret response to make future diagnostics useful.
    const body = (await response.text().catch(() => "")).slice(0, 1000);
    if (!response.ok) {
      console.error("flow-return: webhook returned non-2xx", {
        httpStatus: response.status,
        responseBody: body,
      });
    } else {
      console.log("flow-return: webhook verification request accepted", {
        httpStatus: response.status,
      });
    }
  } catch (error) {
    console.error(
      "flow-return: webhook request failed",
      error instanceof Error ? error.message : "UNKNOWN",
    );
  }

  return redirectToDashboard();
});
