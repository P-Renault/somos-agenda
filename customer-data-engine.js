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
    const jobs = await Promise.allSettled([
      client.rpc('get_customer_notifications', { p_limit: 50 }).then(r => ({ source: 'booking', ...r })),
      client.rpc('get_agenda_notifications', { p_limit: 100 }).then(r => ({ source: 'agenda', ...r })),
      client.rpc('get_welcome_notifications', { p_limit: 50 }).then(r => ({ source: 'welcome', ...r }))
    ]);
    const rows = [];
    for (const job of jobs) {
      if (job.status !== 'fulfilled' || job.value?.error) continue;
      const { source, data } = job.value;
      for (const n of Array.isArray(data) ? data : []) {
        if (source === 'booking') {
          rows.push({
            id:n.id, booking_id:n.booking_id, target_module:'bookings', target_id:n.booking_id,
            event_type:'booking_status', source, title: status(n.new_status) === 'confirmed' ? 'Reserva confirmada'
              : status(n.new_status) === 'completed' ? 'Reserva completada'
              : ['cancelled','rejected'].includes(status(n.new_status)) ? 'Reserva cancelada'
              : status(n.new_status) === 'no_show' ? 'Reserva marcada como no asistida' : 'Estado de reserva actualizado',
            text:`${n.service_name || 'Servicio'} · ${n.business_name || 'Negocio'}`,
            status:status(n.new_status), previous_status:status(n.previous_status), date:n.booking_date,
            time:time(n.start_time), read_at:n.read_at, created_at:n.created_at
          });
        } else {
          const metadata=n.metadata||n.data||{};
          rows.push({ ...n, source, metadata, booking_id:n.booking_id||metadata.booking_id||null,
            event_type:metadata.event_type||n.notification_type||source,
            target_module:metadata.target_module||null, target_id:metadata.target_id||null,
            title:n.title||'Notificación de Agenda Ya', text:n.message||n.text||'Tienes una actualización en Agenda Ya.',
            date:metadata.booking_date||n.booking_date||null, time:time(metadata.start_time||n.start_time),
            read_at:n.read_at||null, created_at:n.created_at });
        }
      }
    }
    const seen=new Set();
    return rows.filter(n=>{
      const m=n.metadata||{};
      const type=String(n.notification_type||n.type||n.event_type||'').toLowerCase();
      const key=(n.source==='welcome'||type.includes('welcome'))
        ? `welcome:${String(n.title||'').trim().toLowerCase()}`
        : (m.idempotency_key||n.idempotency_key||`${n.event_type||n.source}:${n.booking_id||m.booking_id||''}:${n.review_id||m.review_id||''}:${n.title||''}:${n.created_at||''}`);
      if(seen.has(key))return false;seen.add(key);return true;
    }).sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0)).slice(0,100);
  }

  async function markNotificationsRead() {
    const results = await Promise.allSettled([
      client.rpc('mark_customer_notifications_read'),
      client.rpc('mark_agenda_notifications_read'),
      client.rpc('mark_welcome_notifications_read')
    ]);
    const failed = results.find(x => x.status === 'rejected' || x.value?.error);
    if (failed && results.every(x => x.status === 'rejected' || x.value?.error)) throw (failed.reason || failed.value.error);
    return results.reduce((n,x)=>n+(x.status==='fulfilled'&&!x.value.error?Number(x.value.data||0):0),0);
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
    window.__AgendaYaCustomerNotificationRows = notifications || [];
    if (!notifications.length) {
      list.innerHTML = '<div class="cp-empty">No hay actividad reciente de reservas.</div>';
      if (badge) badge.hidden = true;
      return;
    }
    list.innerHTML = notifications.map((n, index) =>
      `<article class="cp-notification-item cp-notification-clickable" data-notification-index="${index}" role="button" tabindex="0">
        <span class="cp-notification-dot ${esc(n.status)}"></span>
        <div>
          <strong>${esc(n.title)}</strong>
          <p>${esc(n.text)}</p>
          <small>${esc(n.date ? dateLabel(n.date) : (n.created_at ? new Date(n.created_at).toLocaleDateString('es-CL') : ''))}${n.time ? ' · '+esc(n.time) : ''}</small>
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