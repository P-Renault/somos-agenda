(() => {
  'use strict';
  const cfg = window.SOMOS_CONFIG || {};
  const supabase = window.supabase;
  if (!supabase?.createClient || !cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) return;

  const client = supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const time = v => String(v || '').slice(0, 5);
  const status = v => String(v || '').toLowerCase();
  const labels = {
    pending:'Pendiente', confirmed:'Confirmada', completed:'Completada',
    cancelled:'Cancelada', rejected:'Rechazada', no_show:'No asistió'
  };

  let context = {
    user:null, profile:null, clientIds:[], reservations:[],
    ratings:[], reputation:null, notifications:[]
  };

  function dateObj(v) {
    const [y,m,d] = String(v || '').slice(0,10).split('-').map(Number);
    return y && m && d ? new Date(y,m-1,d) : null;
  }
  function dateLabel(v) {
    const d = dateObj(v);
    return d ? d.toLocaleDateString('es-CL',{weekday:'long',day:'numeric',month:'long',year:'numeric'}) : 'Fecha no informada';
  }
  function activeUpcoming(r) {
    return ['pending','confirmed'].includes(status(r.status))
      && String(r.booking_date || '') >= new Date().toISOString().slice(0,10);
  }

  function normalizeReservation(row) {
    return {
      id: row.id,
      business_id: row.business_id,
      client_id: row.client_id,
      service_id: row.service_id,
      professional_id: row.professional_id,
      booking_date: row.booking_date,
      start_time: row.start_time,
      end_time: row.end_time,
      status: row.status,
      notes: row.notes,
      created_at: row.created_at,
      updated_at: row.updated_at,
      businesses: row.business_name ? { name: row.business_name, slug: row.business_slug } : null,
      services: row.service_name ? { name: row.service_name } : null,
      professionals: (row.professional_first_name || row.professional_last_name)
        ? { first_name: row.professional_first_name || '', last_name: row.professional_last_name || '' }
        : null
    };
  }

  async function resolveClientIds() {
    const r = await client.rpc('get_customer_client_ids');
    if (r.error) throw r.error;
    return [...new Set((r.data || []).map(x => x.client_id).filter(Boolean))];
  }

  async function fetchReservations() {
    const ids = await resolveClientIds();
    context.clientIds = ids;
    if (!ids.length) return [];
    const r = await client.rpc('get_customer_reservations');
    if (r.error) throw r.error;
    return (r.data || []).map(normalizeReservation);
  }

  function summarizeReservations(rows) {
    const upcoming = rows.filter(activeUpcoming);
    const history = rows.filter(r => !upcoming.includes(r));
    const counts = {
      upcoming: upcoming.length,
      pending: upcoming.filter(r => status(r.status) === 'pending').length,
      confirmed: upcoming.filter(r => status(r.status) === 'confirmed').length,
      history: history.length,
      completed: history.filter(r => status(r.status) === 'completed').length,
      cancelled: history.filter(r => status(r.status) === 'cancelled').length,
      rejected: history.filter(r => status(r.status) === 'rejected').length,
      no_show: history.filter(r => status(r.status) === 'no_show').length
    };
    return { upcoming, history, counts };
  }

  async function fetchNotifications() {
    const r = await client.rpc('get_customer_notifications', { p_limit: 50 });
    if (r.error) throw r.error;
    return (r.data || []).map(n => ({
      id:n.id,
      booking_id:n.booking_id,
      title: status(n.new_status) === 'confirmed' ? 'Reserva confirmada'
        : status(n.new_status) === 'completed' ? 'Reserva completada'
        : ['cancelled','rejected'].includes(status(n.new_status)) ? 'Reserva cancelada'
        : status(n.new_status) === 'no_show' ? 'Reserva marcada como no asistida'
        : 'Estado de reserva actualizado',
      text:`${n.service_name || 'Servicio'} · ${n.business_name || 'Negocio'}`,
      status:status(n.new_status),
      previous_status:status(n.previous_status),
      date:n.booking_date,
      time:time(n.start_time),
      read_at:n.read_at,
      created_at:n.created_at
    }));
  }

  async function markNotificationsRead() {
    const r = await client.rpc('mark_customer_notifications_read');
    if (r.error) throw r.error;
    return Number(r.data || 0);
  }

  async function fetchRatingsAndReputation() {
    const r = await client.rpc('get_customer_reviews');
    if (r.error) throw r.error;
    const rows = r.data || [];
    const ratings = rows.filter(x => x.target_type === 'business');
    const received = rows.filter(x => x.target_type === 'client');
    const values = received.map(x => Number(x.rating)).filter(Number.isFinite);
    const avg = values.length ? values.reduce((a,b) => a+b,0) / values.length : null;
    return {
      ratings,
      reputation: { score:avg, count:values.length, received }
    };
  }

  function renderNotifications(notifications) {
    const list = document.getElementById('cpNotifications');
    const badge = document.getElementById('cpNotificationBadge');
    if (!list) return;
    if (!notifications.length) {
      list.innerHTML = '<div class="cp-empty">No hay actividad reciente de reservas.</div>';
      if (badge) badge.hidden = true;
      return;
    }
    list.innerHTML = notifications.map(n =>
      `<article class="cp-notification-item">
        <span class="cp-notification-dot ${esc(n.status)}"></span>
        <div>
          <strong>${esc(n.title)}</strong>
          <p>${esc(n.text)}</p>
          <small>${esc(dateLabel(n.date))} · ${esc(n.time)}</small>
        </div>
      </article>`
    ).join('');
    if (badge) {
      const unread = notifications.filter(n => !n.read_at).length;
      badge.textContent = String(Math.min(unread, 9));
      badge.hidden = unread === 0;
    }
  }

  async function refresh(user, profile) {
    context.user = user || context.user;
    context.profile = profile || context.profile;
    const rows = await fetchReservations();
    context.reservations = rows;
    const summary = summarizeReservations(rows);
    context.notifications = await fetchNotifications();
    const rep = await fetchRatingsAndReputation();
    context.ratings = rep.ratings;
    context.reputation = rep.reputation;
    return { ...context, summary };
  }

  window.AgendaYaCustomerData = {
    client,
    context,
    refresh,
    fetchReservations,
    fetchNotifications,
    markNotificationsRead,
    fetchRatingsAndReputation,
    summarizeReservations,
    resolveClientIds,
    renderNotifications,
    statusLabels:labels
  };
})();