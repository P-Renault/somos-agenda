(() => {
  'use strict';
  const cfg = window.SOMOS_CONFIG || {};
  const supabase = window.supabase;
  if (!supabase?.createClient || !cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) return;

  const client = supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const phoneDigits = v => String(v || '').replace(/\D/g, '');
  const norm = v => String(v || '').trim().toLowerCase();
  const today = () => new Date().toISOString().slice(0,10);
  const time = v => String(v || '').slice(0,5);
  const status = v => String(v || '').toLowerCase();
  const labels = {pending:'Pendiente',confirmed:'Confirmada',completed:'Completada',cancelled:'Cancelada',rejected:'Rechazada',no_show:'No asistió'};

  let context = { user:null, profile:null, clientIds:[], reservations:[], ratings:[], reputation:null, notifications:[] };

  function dateObj(v) { const [y,m,d] = String(v||'').slice(0,10).split('-').map(Number); return y&&m&&d ? new Date(y,m-1,d) : null; }
  function dateLabel(v) { const d=dateObj(v); return d ? d.toLocaleDateString('es-CL',{weekday:'long',day:'numeric',month:'long',year:'numeric'}) : 'Fecha no informada'; }
  function activeUpcoming(r) { return ['pending','confirmed'].includes(status(r.status)) && String(r.booking_date||'') >= today(); }

  async function resolveClientIds(user, profile) {
    const ids = new Set();
    const email = norm(user?.email);
    const phone = phoneDigits(profile?.phone);
    if (email) {
      const r = await client.from('clients').select('id').eq('active', true).ilike('email', email).limit(100);
      if (!r.error) (r.data||[]).forEach(x => ids.add(x.id));
    }
    if (phone) {
      const candidates = [phone, `+56 9 ${phone}`, `+569${phone}`, `569${phone}`];
      for (const value of candidates) {
        const r = await client.from('clients').select('id').eq('active', true).eq('phone', value).limit(50);
        if (!r.error) (r.data||[]).forEach(x => ids.add(x.id));
      }
      if (!ids.size) {
        const r = await client.from('clients').select('id,phone').eq('active', true).limit(500);
        if (!r.error) (r.data||[]).forEach(x => { if (phoneDigits(x.phone) === phone) ids.add(x.id); });
      }
    }
    return [...ids];
  }

  async function fetchReservations(user, profile) {
    const clientIds = await resolveClientIds(user, profile);
    context.clientIds = clientIds;
    if (!clientIds.length) return [];
    const r = await client.from('bookings').select(
      'id,business_id,client_id,service_id,professional_id,booking_date,start_time,end_time,status,notes,created_at,updated_at,businesses(name,slug),services(name),professionals(first_name,last_name)'
    ).in('client_id', clientIds).order('booking_date', {ascending:false}).order('start_time',{ascending:false}).limit(250);
    if (r.error) throw r.error;
    return r.data || [];
  }

  function summarizeReservations(rows) {
    const upcoming = rows.filter(activeUpcoming);
    const history = rows.filter(r => !upcoming.includes(r));
    const counts = { upcoming: upcoming.length, pending: upcoming.filter(r=>status(r.status)==='pending').length, confirmed: upcoming.filter(r=>status(r.status)==='confirmed').length, history: history.length, completed: history.filter(r=>status(r.status)==='completed').length, cancelled: history.filter(r=>status(r.status)==='cancelled').length, rejected: history.filter(r=>status(r.status)==='rejected').length, no_show: history.filter(r=>status(r.status)==='no_show').length };
    return {upcoming, history, counts};
  }

  async function fetchRatingsAndReputation() {
    // El backend de reputación se habilita en una fase posterior. El motor acepta una tabla configurable
    // sin inventar un nombre/esquema obligatorio en esta iteración.
    if (!cfg.REPUTATION_ENABLED || !cfg.REPUTATION_TABLE || !context.clientIds.length) return {ratings:[], reputation:null};
    const table = String(cfg.REPUTATION_TABLE);
    const r = await client.from(table).select('*').eq('client_id', context.clientIds[0]).order('created_at',{ascending:false}).limit(250);
    if (r.error) return {ratings:[], reputation:null, error:r.error};
    const rows = r.data || [];
    const ratings = rows.filter(x => x.business_id || x.target_business_id || x.target_type === 'business');
    const received = rows.filter(x => x.client_id === context.clientIds[0] && (x.target_client_id || x.target_type === 'client'));
    const values = received.map(x => Number(x.rating ?? x.score)).filter(Number.isFinite);
    const avg = values.length ? values.reduce((a,b)=>a+b,0)/values.length : null;
    return {ratings, reputation:{score:avg,count:values.length,received}};
  }

  function buildNotifications(rows) {
    const sorted = [...rows].sort((a,b)=>String(b.updated_at||b.created_at||'').localeCompare(String(a.updated_at||a.created_at||''))).slice(0,8);
    return sorted.map(r => {
      const s=status(r.status), business=r.businesses?.name||'Negocio', service=r.services?.name||'Servicio';
      let title='Reserva actualizada', text=`${service} · ${business}`;
      if(s==='pending') title='Reserva solicitada';
      if(s==='confirmed') title='Reserva confirmada';
      if(s==='completed') title='Reserva completada';
      if(['cancelled','rejected'].includes(s)) title='Reserva cancelada';
      return {id:r.id,title,text,status:s,date:r.booking_date,time:time(r.start_time)};
    });
  }

  function renderKpis(summary) {
    const c=summary.counts;
    const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=String(v);};
    set('cpKpiUpcoming',c.upcoming);set('cpKpiPending',c.pending);set('cpKpiConfirmed',c.confirmed);set('cpKpiHistory',c.history);
  }

  function renderNotifications(notifications) {
    const list=document.getElementById('cpNotifications');
    const badge=document.getElementById('cpNotificationBadge');
    if(!list)return;
    if(!notifications.length){list.innerHTML='<div class="cp-empty">No hay actividad reciente de reservas.</div>';if(badge)badge.hidden=true;return;}
    list.innerHTML=notifications.map(n=>`<article class="cp-notification-item"><span class="cp-notification-dot ${esc(n.status)}"></span><div><strong>${esc(n.title)}</strong><p>${esc(n.text)}</p><small>${esc(dateLabel(n.date))} · ${esc(n.time)}</small></div></article>`).join('');
    if(badge){badge.textContent=String(Math.min(notifications.length,9));badge.hidden=false;}
  }

  async function refresh(user, profile) {
    const rows = await fetchReservations(user, profile);
    context.reservations = rows;
    const summary = summarizeReservations(rows);
    context.notifications = buildNotifications(rows);
    const rep = await fetchRatingsAndReputation();
    context.ratings=rep.ratings;context.reputation=rep.reputation;
    return { ...context, summary };
  }

  window.AgendaYaCustomerData = { client, context, refresh, fetchReservations, fetchRatingsAndReputation, summarizeReservations, resolveClientIds, statusLabels:labels };
})();
