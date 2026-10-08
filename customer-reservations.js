(() => {
  const cfg = window.SOMOS_CONFIG || {};
  const client = window.supabase?.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const initials = name => String(name || 'AY').trim().split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase() || 'AY';
  const statusClass = s => ['pending','confirmed','completed','cancelled','rejected','no_show'].includes(String(s||'').toLowerCase()) ? String(s).toLowerCase() : 'unknown';
  const statusLabel = s => ({pending:'Pendiente',confirmed:'Confirmada',completed:'Completada',cancelled:'Cancelada',rejected:'Rechazada',no_show:'No asistió'})[String(s||'').toLowerCase()] || 'Estado';
  const pad = n => String(n).padStart(2,'0');
  function dateObj(value){ const [y,m,d]=String(value||'').slice(0,10).split('-').map(Number); return y&&m&&d?new Date(y,m-1,d):null; }
  function dateLabel(value){ const d=dateObj(value); if(!d)return {day:'—',month:'',full:'Fecha no informada'}; return {day:pad(d.getDate()),month:d.toLocaleDateString('es-CL',{month:'short'}).replace('.',''),full:d.toLocaleDateString('es-CL',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}; }
  function timeLabel(v){ return String(v||'').slice(0,5); }
  function normalizePhone(v){return String(v||'').replace(/\D/g,'');}

  async function requireSession(){
    if(!client){location.href='index.html';return null;}
    const r=await client.auth.getSession();
    const session=r.data?.session;
    if(!session?.user){location.href='index.html';return null;}
    return session;
  }

  async function load(){
    const session=await requireSession(); if(!session)return;
    const user=session.user;
    const pr=await client.from('profiles').select('full_name,avatar_url,phone,profile_type').eq('id',user.id).maybeSingle();
    if(pr.error){showError('No pudimos cargar tu perfil.');return;}
    const profile=pr.data||{};
    if(profile.profile_type && profile.profile_type!=='customer'){
      location.href='login.html';return;
    }
    const display=profile.full_name||user.user_metadata?.full_name||user.user_metadata?.name||user.email||'Cliente';
    $('customerGreeting').textContent=`Hola, ${display.split(' ')[0]}. Aquí encontrarás tus próximas horas y tu historial.`;
    $('customerAvatar').textContent=initials(display);
    if(profile.avatar_url){$('customerAvatar').classList.add('has-image');$('customerAvatar').style.backgroundImage=`url("${String(profile.avatar_url).replace(/"/g,'%22')}")`;}

    const email=(user.email||'').trim().toLowerCase();
    const phone=normalizePhone(profile.phone||user.user_metadata?.phone);
    let clients=[];
    const seen=new Set();
    if(email){const r=await client.from('clients').select('id').eq('active',true).ilike('email',email).limit(100); if(!r.error)(r.data||[]).forEach(c=>{if(!seen.has(c.id)){seen.add(c.id);clients.push(c.id)}})}
    if(phone){const r=await client.from('clients').select('id').eq('active',true).limit(100); if(!r.error)(r.data||[]).forEach(c=>{if(normalizePhone(c.phone)===phone&&!seen.has(c.id)){seen.add(c.id);clients.push(c.id)}})}
    if(!clients.length){renderEmpty($('upcomingList'),'Aún no tienes reservas registradas.','Encuentra un servicio y agenda tu primera hora en Agenda Ya.');renderEmpty($('historyList'),'Sin historial todavía.','Tus reservas completadas o canceladas aparecerán aquí.');return;}

    const r=await client.from('bookings').select('id,business_id,client_id,service_id,professional_id,booking_date,start_time,end_time,status,notes,created_at,businesses(name,slug),services(name),professionals(first_name,last_name)').in('client_id',clients).order('booking_date',{ascending:false}).order('start_time',{ascending:false}).limit(100);
    if(r.error){showError('No pudimos cargar tus reservas.');return;}
    const rows=r.data||[];
    const todayKey=new Date().toISOString().slice(0,10);
    const active=rows.filter(x=>['pending','confirmed'].includes(String(x.status||'').toLowerCase()) && String(x.booking_date||'')>=todayKey);
    const history=rows.filter(x=>!active.includes(x));
    renderList($('upcomingList'),active,'upcoming');
    renderList($('historyList'),history,'history');
  }

  function renderEmpty(el,title,text){el.innerHTML=`<div class="empty-card"><strong>${esc(title)}</strong><p>${esc(text)}</p><a class="business-link" href="explorer.html">Explorar negocios →</a></div>`;}
  function showError(text){renderEmpty($('upcomingList'),text,'Intenta nuevamente.');renderEmpty($('historyList'),'No pudimos cargar el historial.','');}

  function renderList(el,rows,kind){
    if(!rows.length){renderEmpty(el,kind==='upcoming'?'No tienes próximas reservas.':'No hay reservas en tu historial.',kind==='upcoming'?'Puedes buscar un nuevo servicio y agendarlo ahora.':'Cuando completes una reserva aparecerá aquí.');return;}
    el.innerHTML=rows.map(row=>card(row)).join('');
  }

  function card(row){
    const d=dateLabel(row.booking_date), service=row.services?.name||'Servicio', business=row.businesses?.name||'Negocio', slug=row.businesses?.slug||'', pro=[row.professionals?.first_name,row.professionals?.last_name].filter(Boolean).join(' ');
    const href=slug?`public-profile.html?slug=${encodeURIComponent(slug)}`:'explorer.html';
    return `<article class="reservation-card">
      <div class="reservation-date"><span class="day">${esc(d.day)}</span><span class="month">${esc(d.month)}</span></div>
      <div class="reservation-main"><h3>${esc(service)}</h3><div class="business">${esc(business)}</div><div class="meta"><span>▣ ${esc(d.full)}</span><span>◷ ${esc(timeLabel(row.start_time))}–${esc(timeLabel(row.end_time))}</span>${pro?`<span>♙ ${esc(pro)}</span>`:''}</div><div class="card-actions"><a class="business-link" href="${esc(href)}">Ver negocio →</a></div></div>
      <div class="reservation-status"><span class="status ${statusClass(row.status)}">${esc(statusLabel(row.status))}</span></div>
    </article>`;
  }

  $('customerLogout').addEventListener('click',async()=>{const b=$('customerLogout');b.disabled=true;b.textContent='Saliendo…';try{await client.auth.signOut()}catch(_){}location.href='index.html';});
  load().catch(()=>showError('No pudimos cargar tus reservas.'));
})();
