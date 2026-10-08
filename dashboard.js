/* Agenda YA · Dashboard bootstrap
   Authenticated business dashboard.
   - Validates the Supabase session and business membership.
   - Loads the real business identity.
   - Loads real dashboard counts and today's bookings.
   - Contains no demo/test business data.
*/
(() => {
  const cfg = window.SOMOS_CONFIG || {};
  const $ = (id) => document.getElementById(id);
  let client = null;
  let user = null;
  let business = null;
  let role = null;

  const todayISO = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const formatToday = () => new Intl.DateTimeFormat("es-CL", {
    weekday: "short", day: "numeric", month: "short", year: "numeric"
  }).format(new Date());

  function showApp() {
    const app = $("ayApp");
    if (app) app.hidden = false;
  }

  function setText(id, value) {
    const el = $(id);
    if (el) el.textContent = value;
  }

  function showDashboardError(message) {
    console.error("Agenda YA dashboard:", message);
    const existing = document.getElementById("ayDashboardStatus");
    if (existing) {
      existing.textContent = message;
      existing.dataset.kind = "error";
      return;
    }
    const hero = document.querySelector(".ay-hero");
    if (hero) {
      const p = document.createElement("p");
      p.id = "ayDashboardStatus";
      p.dataset.kind = "error";
      p.textContent = message;
      hero.appendChild(p);
    }
  }

  async function createClient() {
    if (!window.supabase?.createClient) {
      throw new Error("Supabase no está disponible.");
    }
    if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) {
      throw new Error("La configuración de Supabase no está disponible.");
    }
    return window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  }

  async function resolveBusiness() {
    const session = await client.auth.getSession();
    if (session.error) throw session.error;
    user = session.data.session?.user || null;

    if (!user) {
      window.location.replace(new URL("login.html", window.location.href).href);
      return false;
    }

    const profile = await client.from("profiles")
      .select("profile_type,full_name,phone,address,age,city,comuna,avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    if (profile.error) throw profile.error;

    if (profile.data?.profile_type !== "business") {
      window.location.replace(
        new URL(profile.data?.profile_type === "customer" ? "explorer.html" : "profile.html", window.location.href).href
      );
      return false;
    }

    const member = await client.from("business_members")
      .select("business_id,active,role")
      .eq("user_id", user.id)
      .eq("active", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (member.error) throw member.error;

    if (!member.data?.business_id) {
      window.location.replace(new URL("profile.html", window.location.href).href);
      return false;
    }

    role = member.data.role || "owner";

    const b = await client.from("businesses")
      .select("id,name,slug,active,created_by,phone,address,city,comuna,business_type,logo_url")
      .eq("id", member.data.business_id)
      .maybeSingle();

    if (b.error) throw b.error;
    if (!b.data?.id) throw new Error("No se encontró el negocio asociado a tu cuenta.");

    business = b.data;
    return true;
  }

  function paintBusinessIdentity() {
    const name = business?.name || "Mi negocio";
    const type = business?.business_type || "Centro de gestión";

    setText("ayBusinessWelcome", `Hola, ${name}`);
    setText("ayAccountBusinessName", name);
    setText("ayAccountRole", role ? `Perfil ${role}` : "Cuenta");
    setText("aySidebarBusinessName", name);
    setText("aySidebarBusinessType", type);

    const avatar = document.querySelector(".ay-avatar");
    if (avatar) {
      const initials = name.trim().split(/\s+/).slice(0, 2).map(x => x[0]).join("").toUpperCase() || "AY";
      avatar.textContent = initials;
    }
  }

  async function exactCount(table, filterColumn = "business_id") {
    const q = client.from(table).select("id", { count: "exact", head: true }).eq(filterColumn, business.id);
    const r = await q;
    if (r.error) throw r.error;
    return Number(r.count || 0);
  }

  async function loadCounts() {
    const [bookings, clients, services, professionals] = await Promise.all([
      exactCount("bookings"),
      exactCount("clients"),
      exactCount("services"),
      exactCount("professionals")
    ]);

    // Bookings KPI is today's count, not the all-time total.
    const today = todayISO();
    const todayBookings = await client.from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business.id)
      .eq("booking_date", today);

    if (todayBookings.error) throw todayBookings.error;

    setText("ayKpiBookings", String(todayBookings.count || 0));
    setText("ayKpiBookingsMeta", bookings === 0 ? "Sin reservas aún" : `${bookings} en total`);
    setText("ayKpiClients", String(clients));
    setText("ayKpiServices", String(services));
    setText("ayKpiProfessionals", String(professionals));
  }

  function renderNoBookings(message = "No hay reservas para mostrar.") {
    const list = $("ayUpcomingBookings");
    if (list) list.innerHTML = `<div class="ay-list-row"><div><strong>${message}</strong><small>Las reservas reales aparecerán aquí cuando existan.</small></div></div>`;
    const timeline = $("ayTodayTimeline");
    if (timeline) timeline.innerHTML = `<div><span>${message}</span></div>`;
  }

  async function loadTodayBookings() {
    const today = todayISO();
    setText("ayTodayLabel", formatToday());

    const select = "id,client_id,service_id,professional_id,booking_date,start_time,end_time,status,clients(first_name,last_name),services(name),professionals(first_name,last_name)";
    const [todayResult, upcomingResult] = await Promise.all([
      client.from("bookings").select(select).eq("business_id", business.id).eq("booking_date", today).order("start_time", { ascending: true }).limit(12),
      client.from("bookings").select(select).eq("business_id", business.id).gte("booking_date", today).order("booking_date", { ascending: true }).order("start_time", { ascending: true }).limit(12)
    ]);
    if (todayResult.error) throw todayResult.error;
    if (upcomingResult.error) throw upcomingResult.error;

    const todayRows = todayResult.data || [];
    const upcomingRows = (upcomingResult.data || []).filter(b => !["cancelled", "rejected", "no_show"].includes(String(b.status || "").toLowerCase()));
    const labelStatus = {pending:"Pendiente",confirmed:"Confirmada",cancelled:"Cancelada",completed:"Completada",no_show:"No asistió",rejected:"Rechazada"};

    const list = $("ayUpcomingBookings");
    if (list) {
      list.innerHTML = upcomingRows.slice(0, 6).map(b => {
        const clientName = b.clients ? `${b.clients.first_name || ""} ${b.clients.last_name || ""}`.trim() : "Cliente";
        const serviceName = b.services?.name || "Reserva";
        const professionalName = b.professionals ? `${b.professionals.first_name || ""} ${b.professionals.last_name || ""}`.trim() : "";
        const time = String(b.start_time || "").slice(0, 5);
        const date = b.booking_date && b.booking_date !== today ? new Intl.DateTimeFormat("es-CL", {day:"2-digit",month:"2-digit"}).format(new Date(`${b.booking_date}T12:00:00`)) : "Hoy";
        const status = labelStatus[b.status] || b.status || "Registrada";
        return `<div class="ay-list-row"><b>${escapeHtml(time)}</b><span class="ay-dot"></span><div><strong>${escapeHtml(serviceName)}</strong><small>${escapeHtml(date)} · ${escapeHtml(clientName)}${professionalName ? ` · con ${escapeHtml(professionalName)}` : ""}</small></div><mark>${escapeHtml(status)}</mark></div>`;
      }).join("") || `<div class="ay-list-row"><div><strong>No hay próximas reservas</strong><small>Las nuevas reservas aparecerán aquí automáticamente.</small></div></div>`;
    }

    const timeline = $("ayTodayTimeline");
    if (timeline) {
      timeline.innerHTML = todayRows.map(b => {
        const serviceName = b.services?.name || "Reserva";
        const clientName = b.clients ? `${b.clients.first_name || ""} ${b.clients.last_name || ""}`.trim() : "Cliente";
        const time = String(b.start_time || "").slice(0, 5);
        const pending = b.status === "pending" ? " class=\"pending\"" : "";
        return `<div${pending}><b>${escapeHtml(time)}</b><span>${escapeHtml(serviceName)} · ${escapeHtml(clientName)}</span></div>`;
      }).join("") || `<div><span>No hay reservas para hoy.</span></div>`;
    }
  }

  function escapeHtml(v) {
    return String(v ?? "").replace(/[&<>"']/g, m => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[m]));
  }

  async function boot() {
    client = await createClient();

    const ok = await resolveBusiness();
    if (!ok) return;

    showApp();
    paintBusinessIdentity();

    // Dashboard remains usable even if a non-critical metric query fails.
    try {
      await loadCounts();
      await loadTodayBookings();
    } catch (err) {
      console.error("Agenda YA dashboard data:", err);
      showDashboardError("El dashboard está cargado, pero algunos datos aún no están disponibles.");
      renderNoBookings("No se pudieron cargar las reservas todavía.");
    }

    window.AgendaYaAuth = {
      version: "1.1.0-dashboard-bridge",
      getClient: () => client,
      getUser: () => user,
      getBusiness: () => business,
      getRole: () => role
    };
  }

  boot().catch(err => {
    console.error("Agenda YA dashboard:", err);
    const message = err?.message || "No fue posible cargar el Dashboard.";
    showDashboardError(message);
    // Do not silently bounce an authenticated user back to Login for a data/RLS error.
    // Authentication failures are handled explicitly in resolveBusiness().
  });
})();
