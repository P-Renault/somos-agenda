/* Agenda YA · B12.7 · Dashboard live data
   Replaces the dashboard's placeholder examples with the authenticated
   business's real bookings and KPIs. Operational modules remain untouched. */
(() => {
  const cfg = window.SOMOS_CONFIG || {};
  let client = null, lastBusinessId = null, busy = false;
  const $ = (s,root=document) => root.querySelector(s);
  const $$ = (s,root=document) => [...root.querySelectorAll(s)];
  const esc = v => String(v ?? '').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const statusLabel={pending:'Pendiente',confirmed:'Confirmada',cancelled:'Cancelada',completed:'Completada',no_show:'No asistió',rejected:'Rechazada'};
  const time=v=>String(v||'').slice(0,5);
  const dateKey=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const todayLabel=d=>d.toLocaleDateString('es-CL',{weekday:'short',day:'numeric',month:'short',year:'numeric'}).replace(/\./g,'');

  function activeBookings(rows){return (rows||[]).filter(b=>!['cancelled','rejected','no_show'].includes(String(b.status||'').toLowerCase()));}

  async function getBusiness(){
    if(!client) client=window.supabase?.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:true}});
    if(!client) return null;
    const s=await client.auth.getSession(); const user=s.data?.session?.user;
    if(!user) return null;
    const m=await client.from('business_members').select('business_id,active').eq('user_id',user.id).eq('active',true).limit(1).maybeSingle();
    if(m.error||!m.data?.business_id) return null;
    return m.data.business_id;
  }

  async function refresh(){
    if(busy) return; const app=document.getElementById('ayApp'); if(!app||app.hidden) return;
    busy=true;
    try{
      const bid=await getBusiness(); if(!bid){busy=false;return;}
      lastBusinessId=bid;
      const rows=await client.from('bookings')
        .select('id,client_id,service_id,professional_id,booking_date,start_time,end_time,status,notes,clients(first_name,last_name),services(name),professionals(first_name,last_name)')
        .eq('business_id',bid)
        .order('booking_date',{ascending:true})
        .order('start_time',{ascending:true});
      if(rows.error) throw rows.error;
      const all=rows.data||[], active=activeBookings(all), today=dateKey(new Date());
      const upcoming=active.filter(b=>b.booking_date>today || (b.booking_date===today && time(b.end_time)>=time(new Date().toTimeString()))).slice(0,6);
      renderBookings(upcoming);
      renderToday(active.filter(b=>b.booking_date===today));
      await renderKpis(bid,active);
    }catch(e){console.warn('Agenda Ya dashboard live:',e);}
    finally{busy=false;}
  }

  function clientName(b){return b.clients?[b.clients.first_name,b.clients.last_name].filter(Boolean).join(' '):'Cliente';}
  function serviceName(b){return b.services?.name||'Servicio';}
  function profName(b){return b.professionals?[b.professionals.first_name,b.professionals.last_name].filter(Boolean).join(' '):'Profesional';}
  function renderBookings(items){
    const wrap=$('#view-dashboard .ay-list'); if(!wrap) return;
    wrap.innerHTML=items.length?items.map(b=>`<div class="ay-list-row ${b.status==='pending'?'is-pending':''}"><b>${esc(time(b.start_time))}</b><span class="ay-dot"></span><div><strong>${esc(serviceName(b))}</strong><small>${esc(clientName(b))} · con ${esc(profName(b))}</small></div><mark>${esc(statusLabel[b.status]||b.status||'Pendiente')}</mark></div>`).join(''):`<div class="ay-list-row"><div><strong>No hay próximas reservas</strong><small>Las nuevas reservas aparecerán aquí automáticamente.</small></div></div>`;
  }
  function renderToday(items){
    const wrap=$('#view-dashboard .ay-timeline'), label=$('#view-dashboard .ay-card:nth-of-type(2) .ay-muted');
    if(label) label.textContent=todayLabel(new Date());
    if(!wrap) return;
    wrap.innerHTML=items.length?items.slice(0,8).map(b=>`<div class="${b.status==='pending'?'pending':''}"><b>${esc(time(b.start_time))}</b><span>${esc(serviceName(b))} · ${esc(clientName(b))}</span></div>`).join(''):`<div><b>—</b><span>Sin reservas para hoy</span></div>`;
  }
  async function renderKpis(bid,active){
    const kpis=$$('#view-dashboard .ay-kpi-grid .ay-kpi strong'); if(kpis.length<4) return;
    const [clients,services,professionals]=await Promise.all([
      client.from('clients').select('id',{count:'exact',head:true}).eq('business_id',bid).eq('active',true),
      client.from('services').select('id',{count:'exact',head:true}).eq('business_id',bid).eq('active',true),
      client.from('professionals').select('id',{count:'exact',head:true}).eq('business_id',bid).eq('active',true)
    ]);
    kpis[0].textContent=active.filter(b=>b.booking_date===dateKey(new Date())).length;
    if(kpis[1])kpis[1].textContent=clients.count??0;
    if(kpis[2])kpis[2].textContent=services.count??0;
    if(kpis[3])kpis[3].textContent=professionals.count??0;
  }

  function boot(){
    const app=document.getElementById('ayApp'); if(!app)return;
    const observer=new MutationObserver(()=>{if(!app.hidden)refresh();}); observer.observe(app,{attributes:true,attributeFilter:['hidden']});
    window.addEventListener('agendaYa:view-change',e=>{if(e.detail?.view==='dashboard')refresh();});
    setInterval(()=>{if(!app.hidden)refresh();},30000);
    setTimeout(()=>{if(!app.hidden)refresh();},800);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
