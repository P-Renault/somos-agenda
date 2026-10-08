(() => {
  const cfg = window.SOMOS_CONFIG || {};
  const client = window.supabase?.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
    auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
  });
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const initials = name => String(name || 'AY').trim().split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase() || 'AY';
  const statusClass = s => ['pending','confirmed','completed','cancelled','rejected','no_show'].includes(String(s||'').toLowerCase()) ? String(s).toLowerCase() : 'unknown';
  const statusLabel = s => ({pending:'Pendiente',confirmed:'Confirmada',completed:'Completada',cancelled:'Cancelada',rejected:'Rechazada',no_show:'No asistió'})[String(s||'').toLowerCase()] || 'Estado';
  const pad = n => String(n).padStart(2,'0');
  function dateObj(v){const [y,m,d]=String(v||'').slice(0,10).split('-').map(Number);return y&&m&&d?new Date(y,m-1,d):null;}
  function dateLabel(v){const d=dateObj(v);if(!d)return {day:'—',month:'',full:'Fecha no informada'};return {day:pad(d.getDate()),month:d.toLocaleDateString('es-CL',{month:'short'}).replace('.',''),full:d.toLocaleDateString('es-CL',{weekday:'long',day:'numeric',month:'long',year:'numeric'})};}
  function timeLabel(v){return String(v||'').slice(0,5);}

  async function requireSession(){
    if(!client){location.href='index.html';return null;}
    const r=await client.auth.getSession();
    if(!r.data?.session?.user){location.href='index.html';return null;}
    return r.data.session;
  }

  function renderEmpty(el,title,text){
    el.innerHTML=`<div class="empty-card"><strong>${esc(title)}</strong><p>${esc(text)}</p><a class="business-link" href="explorer.html">Explorar negocios →</a></div>`;
  }
  function showError(text){
    renderEmpty($('upcomingList'),text,'Intenta nuevamente.');
    renderEmpty($('historyList'),'No pudimos cargar el historial.','');
  }

  function card(row){
    const d=dateLabel(row.booking_date);
    const service=row.services?.name||row.service_name||'Servicio';
    const business=row.businesses?.name||row.business_name||'Negocio';
    const slug=row.businesses?.slug||row.business_slug||'';
    const pro=[row.professionals?.first_name,row.professionals?.last_name].filter(Boolean).join(' ');
    const href=slug?`public-profile.html?slug=${encodeURIComponent(slug)}`:'explorer.html';
    return `<article class="reservation-card">
      <div class="reservation-date"><span class="day">${esc(d.day)}</span><span class="month">${esc(d.month)}</span></div>
      <div class="reservation-main"><h3>${esc(service)}</h3><div class="business">${esc(business)}</div>
      <div class="meta"><span>▣ ${esc(d.full)}</span><span>◷ ${esc(timeLabel(row.start_time))}–${esc(timeLabel(row.end_time))}</span>${pro?`<span>♙ ${esc(pro)}</span>`:''}</div>
      <div class="card-actions"><a class="business-link" href="${esc(href)}">Ver negocio →</a></div></div>
      <div class="reservation-status"><span class="status ${statusClass(row.status)}">${esc(statusLabel(row.status))}</span></div>
    </article>`;
  }

  function renderList(el,rows,kind){
    if(!rows.length){
      renderEmpty(el,kind==='upcoming'?'No tienes próximas reservas.':'No hay reservas en tu historial.',
        kind==='upcoming'?'Puedes buscar un nuevo servicio y agendarlo ahora.':'Cuando completes una reserva aparecerá aquí.');
      return;
    }
    el.innerHTML=rows.map(card).join('');
  }

  async function load(){
    const session=await requireSession(); if(!session)return;
    const user=session.user;
    const pr=await client.from('profiles').select('full_name,avatar_url,profile_type').eq('id',user.id).maybeSingle();
    if(pr.error){showError('No pudimos cargar tu perfil.');return;}
    const profile=pr.data||{};
    if(profile.profile_type && profile.profile_type!=='customer'){location.href='login.html';return;}
    const display=profile.full_name||user.user_metadata?.full_name||user.user_metadata?.name||user.email||'Cliente';
    $('customerGreeting').textContent=`Hola, ${display.split(' ')[0]}. Aquí encontrarás tus próximas horas y tu historial.`;
    $('customerAvatar').textContent=initials(display);
    if(profile.avatar_url){$('customerAvatar').classList.add('has-image');$('customerAvatar').style.backgroundImage=`url("${String(profile.avatar_url).replace(/"/g,'%22')}")`;}

    const r=await client.rpc('get_customer_reservations');
    if(r.error){showError('No pudimos cargar tus reservas desde el motor seguro de Agenda Ya.');return;}
    const rows=(r.data||[]).map(x=>({
      ...x,
      businesses:x.business_name?{name:x.business_name,slug:x.business_slug}:null,
      services:x.service_name?{name:x.service_name}:null,
      professionals:(x.professional_first_name||x.professional_last_name)?{first_name:x.professional_first_name||'',last_name:x.professional_last_name||''}:null
    }));
    const todayKey=new Date().toISOString().slice(0,10);
    const active=rows.filter(x=>['pending','confirmed'].includes(String(x.status||'').toLowerCase()) && String(x.booking_date||'')>=todayKey);
    const history=rows.filter(x=>!active.includes(x));
    renderList($('upcomingList'),active,'upcoming');
    renderList($('historyList'),history,'history');
  }

  $('customerLogout')?.addEventListener('click',async()=>{
    const b=$('customerLogout');if(b){b.disabled=true;b.textContent='Saliendo…';}
    try{await client.auth.signOut();}catch(_){}
    location.href='index.html';
  });
  load().catch(()=>showError('No pudimos cargar tus reservas.'));
})();