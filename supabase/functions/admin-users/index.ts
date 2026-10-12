// Agenda YA Admin Users v1.3
// Deploy as Supabase Edge Function: admin-users
// Requires SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY secrets.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });

const text = (v: unknown, max = 160) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authHeader = req.headers.get("Authorization");
  if (!url || !anonKey || !serviceKey) return json({ error: "SERVER_CONFIG_MISSING" }, 500);
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "AUTH_REQUIRED" }, 401);

  const callerClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const service = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await callerClient.auth.getUser();
  if (userError || !userData.user) return json({ error: "INVALID_SESSION" }, 401);

  const { data: admin, error: adminError } = await service
    .from("platform_admins")
    .select("role,is_active")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (adminError) return json({ error: "ADMIN_AUTH_CHECK_FAILED" }, 500);
  if (!admin || admin.is_active !== true || !["super_admin", "admin"].includes(admin.role)) {
    return json({ error: "ADMIN_REQUIRED" }, 403);
  }

  let input: Record<string, unknown>;
  try { input = await req.json(); } catch { return json({ error: "INVALID_JSON" }, 400); }
  const action = text(input.action, 40);

  async function getProfileRows(ids: string[]) {
    if (!ids.length) return [];
    const { data, error } = await service
      .from("profiles")
      .select("id,full_name,avatar_url,phone,profile_type,city,comuna,created_at,updated_at")
      .in("id", ids);
    if (error) throw error;
    return data || [];
  }

  async function getMemberships(ids: string[]) {
    if (!ids.length) return [];
    const { data, error } = await service
      .from("business_members")
      .select("user_id,role,active,business_id,businesses(id,name,slug,active)")
      .in("user_id", ids);
    if (error) throw error;
    return data || [];
  }

  try {
    if (action === "list") {
      const page = Math.max(1, Math.min(100000, Number(input.page) || 1));
      const perPage = Math.max(5, Math.min(50, Number(input.perPage) || 10));
      const q = text(input.query, 120).toLocaleLowerCase("es-CL");
      const typeFilter = text(input.profileType, 30);
      const statusFilter = text(input.status, 30);

      // Admin Auth API has no server-side search. Fetch pages in batches and filter
      // server-side here, never in the browser, so search/pagination are consistent.
      const authUsers: any[] = [];
      let authPage = 1;
      const batchSize = 500;
      while (true) {
        const { data: batch, error: listError } = await service.auth.admin.listUsers({
          page: authPage,
          perPage: batchSize,
        });
        if (listError) return json({ error: "USERS_LIST_FAILED", message: listError.message }, 500);
        const part = batch.users || [];
        authUsers.push(...part);
        if (part.length < batchSize) break;
        authPage += 1;
        if (authPage > 200) return json({ error: "USER_SCAN_LIMIT", message: "Hay demasiados usuarios para esta consulta; requiere búsqueda indexada." }, 413);
      }

      const ids = authUsers.map((u) => u.id);
      const [profiles, memberships] = await Promise.all([getProfileRows(ids), getMemberships(ids)]);
      const profileMap = new Map(profiles.map((p) => [p.id, p]));
      const memberMap = new Map<string, any[]>();
      for (const m of memberships) {
        const arr = memberMap.get(m.user_id) || [];
        arr.push(m);
        memberMap.set(m.user_id, arr);
      }
      let rows = authUsers.map((u) => {
        const p = profileMap.get(u.id) || {};
        const ms = memberMap.get(u.id) || [];
        const bannedUntil = u.banned_until || null;
        const banned = !!bannedUntil && new Date(bannedUntil).getTime() > Date.now();
        const emailConfirmed = !!u.email_confirmed_at;
        const status = banned ? "suspended" : (emailConfirmed ? "active" : "pending");
        const profileType = p.profile_type || (ms.some((m) => m.active) ? "business" : "customer");
        return {
          id: u.id,
          email: u.email || "",
          full_name: p.full_name || u.user_metadata?.full_name || u.user_metadata?.name || "",
          avatar_url: p.avatar_url || u.user_metadata?.avatar_url || null,
          phone: p.phone || "",
          profile_type: profileType,
          city: p.city || "",
          comuna: p.comuna || "",
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at || null,
          email_confirmed_at: u.email_confirmed_at || null,
          status,
          banned_until: bannedUntil,
          businesses: ms.filter((m) => m.active && m.businesses).map((m) => ({
            id: m.businesses.id, name: m.businesses.name, slug: m.businesses.slug,
            role: m.role, active: m.businesses.active,
          })),
          business_count: ms.filter((m) => m.active).length,
        };
      });
      const totalUsers = rows.length;
      const activeUsers = rows.filter((u) => u.status === "active").length;
      const pendingUsers = rows.filter((u) => u.status === "pending").length;
      const suspendedUsers = rows.filter((u) => u.status === "suspended").length;
      const businessUsers = rows.filter((u) => u.business_count > 0).length;
      if (q) rows = rows.filter((u) => [u.email, u.full_name, u.phone, u.city, u.comuna].some((v) => String(v || "").toLocaleLowerCase("es-CL").includes(q)));
      if (typeFilter) rows = rows.filter((u) => u.profile_type === typeFilter);
      if (statusFilter) rows = rows.filter((u) => u.status === statusFilter);
      const totalFiltered = rows.length;
      const pageCount = Math.max(1, Math.ceil(totalFiltered / perPage));
      const pageRows = rows.slice((page - 1) * perPage, page * perPage);
      return json({
        users: pageRows,
        page,
        perPage,
        totalFiltered,
        pageCount,
        totalUsers,
        activeUsers,
        pendingUsers,
        suspendedUsers,
        businessUsers,
      });
    }

    if (action === "detail") {
      const id = text(input.userId, 80);
      if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "INVALID_USER_ID" }, 400);
      const { data: result, error } = await service.auth.admin.getUserById(id);
      if (error || !result.user) return json({ error: "USER_NOT_FOUND" }, 404);
      const u = result.user;
      const [profiles, memberships] = await Promise.all([getProfileRows([id]), getMemberships([id])]);
      const p = profiles[0] || {};
      const ms = memberships.filter((m) => m.active);
      return json({ user: {
        id: u.id, email: u.email || "", full_name: p.full_name || u.user_metadata?.full_name || "",
        avatar_url: p.avatar_url || u.user_metadata?.avatar_url || null, phone: p.phone || "",
        profile_type: p.profile_type || (ms.length ? "business" : "customer"),
        city: p.city || "", comuna: p.comuna || "", created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at || null, email_confirmed_at: u.email_confirmed_at || null,
        status: u.banned_until && new Date(u.banned_until).getTime() > Date.now() ? "suspended" : (u.email_confirmed_at ? "active" : "pending"),
        businesses: ms.map((m) => ({ id: m.businesses?.id, name: m.businesses?.name, slug: m.businesses?.slug, role: m.role })),
      }});
    }

    if (action === "update_profile") {
      const id = text(input.userId, 80);
      if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "INVALID_USER_ID" }, 400);
      if (id === userData.user.id && admin.role !== "super_admin") return json({ error: "NOT_ALLOWED" }, 403);
      const fullName = text(input.full_name, 120);
      const phone = text(input.phone, 40);
      const city = text(input.city, 100);
      const comuna = text(input.comuna, 100);
      const { data: target, error: targetError } = await service.auth.admin.getUserById(id);
      if (targetError || !target.user) return json({ error: "USER_NOT_FOUND" }, 404);
      const { error: profileError } = await service.from("profiles").upsert({
        id, full_name: fullName || null, phone: phone || null, city: city || null, comuna: comuna || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });
      if (profileError) return json({ error: "PROFILE_UPDATE_FAILED", message: profileError.message }, 500);
      const { error: metadataError } = await service.auth.admin.updateUserById(id, {
        user_metadata: { ...(target.user.user_metadata || {}), full_name: fullName },
      });
      if (metadataError) return json({ error: "USER_METADATA_UPDATE_FAILED", message: metadataError.message }, 500);
      await service.from("audit_logs").insert({
        actor_user_id: userData.user.id, action: "admin.user.profile_updated",
        entity_type: "user", entity_id: id,
        metadata: { fields: ["full_name", "phone", "city", "comuna"] },
      });
      return json({ ok: true });
    }

    if (action === "set_status") {
      const id = text(input.userId, 80);
      const status = text(input.status, 20);
      if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "INVALID_USER_ID" }, 400);
      if (id === userData.user.id) return json({ error: "CANNOT_CHANGE_OWN_STATUS" }, 400);
      if (!["active", "suspended"].includes(status)) return json({ error: "INVALID_STATUS" }, 400);
      const { data: target, error: targetError } = await service.auth.admin.getUserById(id);
      if (targetError || !target.user) return json({ error: "USER_NOT_FOUND" }, 404);
      const { data: targetAdmin, error: targetAdminError } = await service
        .from("platform_admins").select("role,is_active").eq("user_id", id).maybeSingle();
      if (targetAdminError) return json({ error: "TARGET_ADMIN_CHECK_FAILED" }, 500);
      if (targetAdmin?.is_active && admin.role !== "super_admin") return json({ error: "ONLY_SUPER_ADMIN_CAN_CHANGE_ADMIN" }, 403);
      if (targetAdmin?.role === "super_admin") return json({ error: "SUPER_ADMIN_PROTECTED" }, 403);
      const { error: updateError } = await service.auth.admin.updateUserById(id, {
        ban_duration: status === "suspended" ? "876000h" : "none",
      });
      if (updateError) return json({ error: "STATUS_UPDATE_FAILED", message: updateError.message }, 500);
      await service.from("audit_logs").insert({
        actor_user_id: userData.user.id, action: status === "suspended" ? "admin.user.suspended" : "admin.user.reactivated",
        entity_type: "user", entity_id: id, metadata: { status },
      });
      return json({ ok: true, status });
    }

    return json({ error: "UNKNOWN_ACTION" }, 400);
  } catch (e) {
    console.error("admin-users error", e);
    return json({ error: "INTERNAL_ERROR", message: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
