(() => {
  const cfg = window.SOMOS_CONFIG || {};
  const client = window.supabase?.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const initials = name => String(name||'AY').trim().split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'AY';
  const statusLabel = s => ({pending:'Pendiente',confirmed:'Confirmada',completed:'Completada',cancelled:'Cancelada',rejected:'Rechazada',no_show:'No asistió'})[String(s||'').toLowerCase()]||'Estado';
  const statusClass = s => ['pending','confirmed','completed','cancelled','rejected','no_show'].includes(String(s||'').toLowerCase())?String(s).toLowerCase():'unknown';
  const timeLabel = v => String(v||'').slice(0,5);
  const phoneDigits = v => String(v||'').replace(/\D/g,'');
  let user=null, profile={}, reservations=[], currentView='profile', dataEngine=null;

  function dateObj(v){const [y,m,d]=String(v||'').slice(0,10).split('-').map(Number);return y&&m&&d?new Date(y,m-1,d):null;}
  function dateLabel(v){const d=dateObj(v);if(!d)return {day:'—',month:'',full:'Fecha no informada'};return {day:String(d.getDate()).padStart(2,'0'),month:d.toLocaleDateString('es-CL',{month:'short'}).replace('.',''),full:d.toLocaleDateString('es-CL',{weekday:'long',day:'numeric',month:'long',year:'numeric'})};}
  function setAvatar(el,url,name){if(!el)return;el.textContent=initials(name);if(url){el.style.backgroundImage=`url("${String(url).replace(/"/g,'%22')}")`;el.classList.add('has-image');}else{el.style.backgroundImage='';el.classList.remove('has-image');}}
  function openSidebar(){ $('cpSidebar').classList.add('is-open'); $('cpBackdrop').hidden=false; }
  function closeOverlays(){ $('cpSidebar').classList.remove('is-open'); if(!$('cpNotificationPanel').hidden){$('cpNotificationPanel').hidden=true;} $('cpBackdrop').hidden=true; }

  async function requireSession(){
    if(!client){location.href='index.html';return null;}
    const r=await client.auth.getSession();
    user=r.data?.session?.user||null;
    if(!user){location.href='index.html';return null;}
    return user;
  }

  async function loadProfile(){
    const r=await client.from('profiles').select('profile_type,full_name,phone,address,age,city,comuna,avatar_url').eq('id',user.id).maybeSingle();
    if(r.error)throw r.error;
    profile=r.data||{};
    if(profile.profile_type && profile.profile_type!=='customer'){location.href='dashboard.html';return false;}
    const display=profile.full_name||user.user_metadata?.full_name||user.user_metadata?.name||user.email||'Cliente';
    $('cpProfileName').textContent=display;$('cpProfileEmail').textContent=user.email||'';$('cpName').value=profile.full_name||'';$('cpEmail').value=user.email||'';$('cpPhone').value=phoneDigits(profile.phone).replace(/^56?9?/,'').slice(-8);$('cpAge').value=profile.age||'';$('cpCity').value=profile.city||'';$('cpComuna').value=profile.comuna||'';$('cpAddress').value=profile.address||'';
    setAvatar($('cpHeaderAvatar'),profile.avatar_url,display);setAvatar($('cpLargeAvatar'),profile.avatar_url,display);return true;
  }

  async function findClientIds(){
    const ids=new Set(),email=(user.email||'').trim().toLowerCase(),phone=phoneDigits(profile.phone);
    if(email){const r=await client.from('clients').select('id').eq('active',true).ilike('email',email).limit(100);if(!r.error)(r.data||[]).forEach(x=>ids.add(x.id));}
    if(phone){const r=await client.from('clients').select('id,phone').eq('active',true).limit(200);if(!r.error)(r.data||[]).forEach(x=>{if(phoneDigits(x.phone)===phone)ids.add(x.id);});}
    return [...ids];
  }

  async function loadReservations(){
    if(dataEngine){
      const result=await dataEngine.refresh(user,profile);
      reservations=result.reservations||[];
      renderReservations(result.summary);
      renderRatings(result.ratings||[]);
      loadReputationFromEngine(result.reputation);
      renderNotifications(result.notifications||[]);
      return;
    }
    const ids=await findClientIds();if(!ids.length){reservations=[];renderReservations();renderRatings();return;}
    const r=await client.from('bookings').select('id,business_id,client_id,service_id,professional_id,booking_date,start_time,end_time,status,notes,created_at,businesses(name,slug),services(name),professionals(first_name,last_name)').in('client_id',ids).order('booking_date',{ascending:false}).order('start_time',{ascending:false}).limit(100);
    if(r.error)throw r.error;reservations=r.data||[];renderReservations();renderRatings();
  }

  function reservationCard(row){
    const d=dateLabel(row.booking_date),service=row.services?.name||'Servicio',business=row.businesses?.name||'Negocio',slug=row.businesses?.slug||'',pro=[row.professionals?.first_name,row.professionals?.last_name].filter(Boolean).join(' '),href=slug?`public-profile.html?slug=${encodeURIComponent(slug)}`:'explorer.html';
    return `<article class="cp-reservation-card"><div class="cp-date-box"><strong>${esc(d.day)}</strong><small>${esc(d.month)}</small></div><div><h3>${esc(service)}</h3><div class="cp-business">${esc(business)}</div><div class="cp-meta"><span>▣ ${esc(d.full)}</span><span>◷ ${esc(timeLabel(row.start_time))}–${esc(timeLabel(row.end_time))}</span>${pro?`<span>♙ ${esc(pro)}</span>`:''}</div><div class="cp-res-actions"><a class="cp-text-link" href="${esc(href)}">Ver negocio →</a></div></div><div class="cp-status-wrap"><span class="cp-status ${statusClass(row.status)}">${esc(statusLabel(row.status))}</span></div></article>`;
  }

  function renderReservations(summary){
    const today=new Date().toISOString().slice(0,10),upcoming=summary?.upcoming||reservations.filter(x=>['pending','confirmed'].includes(String(x.status||'').toLowerCase())&&String(x.booking_date||'')>=today),history=summary?.history||reservations.filter(x=>!upcoming.includes(x));
    const c=summary?.counts||{};
    [['cpKpiUpcoming',c.upcoming],['cpKpiPending',c.pending],['cpKpiConfirmed',c.confirmed],['cpKpiHistory',c.history]].forEach(([id,v])=>{const el=$(id);if(el)el.textContent=String(v??0);});
    $('cpUpcomingList').innerHTML=upcoming.length?upcoming.map(reservationCard).join(''):`<div class="cp-empty"><strong>No tienes próximas reservas.</strong><br>Busca un servicio y agenda tu próxima hora.</div>`;
    $('cpHistoryList').innerHTML=history.length?history.map(reservationCard).join(''):`<div class="cp-empty"><strong>No hay reservas en tu historial.</strong><br>Las reservas completadas o canceladas aparecerán aquí.</div>`;
  }

  function renderNotifications(items){
    const list=$('cpNotifications'),badge=$('cpNotificationBadge');if(!list)return;
    if(!items.length){list.innerHTML='<div class="cp-empty">No hay actividad reciente de reservas.</div>';if(badge)badge.hidden=true;return;}
    list.innerHTML=items.map(n=>`<article class="cp-notification-item"><span class="cp-notification-dot ${esc(n.status)}"></span><div><strong>${esc(n.title)}</strong><p>${esc(n.text)}</p><small>${esc(dateLabel(n.date).full)} · ${esc(n.time)}</small></div></article>`).join('');
    if(badge){badge.textContent=String(Math.min(items.length,9));badge.hidden=false;}
  }

  function loadReputationFromEngine(rep){
    if(!rep){loadReputation();return;}
    const score=Number(rep.score);
    $('cpScore').textContent=Number.isFinite(score)?score.toFixed(1):'—';
    $('cpScoreCount').textContent=rep.count?`${rep.count} valoración${rep.count===1?'':'es'} recibida${rep.count===1?'':'s'}`:'Sin valoraciones todavía';
    $('cpReceivedReviews').innerHTML=rep.received?.length?rep.received.map(x=>`<article class="cp-review-item"><strong>${esc(x.business_name||x.business?.name||'Valoración recibida')}</strong><p>★ ${esc(x.rating??x.score??'—')} ${x.comment?`· ${esc(x.comment)}`:''}</p></article>`).join(''):'<div class="cp-empty">Aún no tienes valoraciones recibidas.</div>';
  }

  async function renderRatings(engineRatings){
    const completed=reservations.filter(x=>String(x.status||'').toLowerCase()==='completed');
    if(!completed.length){$('cpRatingsList').innerHTML='<div class="cp-empty"><strong>Aún no tienes reservas completadas para valorar.</strong><br>Cuando completes una reserva, podrás valorar al negocio desde este módulo.</div>';return;}
    $('cpRatingsList').innerHTML=completed.map(row=>{const d=dateLabel(row.booking_date),business=row.businesses?.name||'Negocio',service=row.services?.name||'Servicio';return `<article class="cp-rating-card"><div><h3>${esc(business)}</h3><p>${esc(service)} · ${esc(d.full)}</p></div><div><div class="cp-rating-stars" aria-label="Pendiente de valoración">★★★★★</div><button class="cp-rating-action" type="button" data-rating-booking="${esc(row.id)}">Valorar</button></div></article>`;}).join('');
    const stored=Array.isArray(engineRatings)?engineRatings:[];
    document.querySelectorAll('[data-rating-booking]').forEach(btn=>{const id=btn.dataset.ratingBooking;const existing=stored.find(x=>x.booking_id===id);if(existing){btn.textContent='Ver valoración';btn.disabled=false;btn.addEventListener('click',()=>alert(`Valoración registrada: ${existing.rating??existing.score??'—'}/5`));}else{btn.addEventListener('click',()=>alert('La reserva está habilitada para valorar. El formulario de valoración se conectará al modelo de reputación bilateral en su siguiente despliegue.'));}});
  }

  async function loadReputation(){
    // No existe una tabla de valoraciones/reputación definida en el modelo funcional entregado; mantenemos la vista sin fabricar datos.
    $('cpScore').textContent='—';$('cpScoreCount').textContent='Sin valoraciones todavía';$('cpReceivedReviews').innerHTML='<div class="cp-empty">Las valoraciones recibidas aparecerán aquí cuando se habilite el modelo de reputación bilateral.</div>';
  }

  async function saveProfile(){
    const status=$('cpProfileStatus');status.textContent='Guardando…';
    try{
      const name=$('cpName').value.trim(),phone=phoneDigits($('cpPhone').value),ageRaw=$('cpAge').value,city=$('cpCity').value.trim(),comuna=$('cpComuna').value.trim(),address=$('cpAddress').value.trim();
      if(!name||!city||!comuna||!address)throw new Error('Completa nombre, ciudad, comuna y dirección.');
      const age=ageRaw?Number(ageRaw):null;if(age!==null&&(age<13||age>120))throw new Error('Ingresa una edad válida.');
      const payload={id:user.id,profile_type:'customer',full_name:name,phone:phone?`+56 9 ${phone}`:null,age,city,comuna,address,updated_at:new Date().toISOString()};
      const r=await client.from('profiles').upsert(payload,{onConflict:'id'});if(r.error)throw r.error;
      profile={...profile,...payload};status.textContent='Perfil actualizado correctamente.';await loadProfile();setTimeout(()=>status.textContent='',1400);
    }catch(e){status.textContent=e.message||'No fue posible guardar el perfil.';}
  }

  async function uploadAvatar(file){
    if(!file)return;const status=$('cpProfileStatus');status.textContent='Subiendo foto…';
    try{
      const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')||'jpg';const path=`${user.id}/avatar-${Date.now()}.${ext}`;
      const up=await client.storage.from('profile-media').upload(path,file,{upsert:true,contentType:file.type||'image/jpeg'});if(up.error)throw up.error;
      const pub=client.storage.from('profile-media').getPublicUrl(path);const url=pub.data?.publicUrl;if(!url)throw new Error('No se pudo obtener la URL de la fotografía.');
      const r=await client.from('profiles').update({avatar_url:url,updated_at:new Date().toISOString()}).eq('id',user.id);if(r.error)throw r.error;
      profile.avatar_url=url;const display=profile.full_name||user.email||'Cliente';setAvatar($('cpHeaderAvatar'),url,display);setAvatar($('cpLargeAvatar'),url,display);status.textContent='Foto de perfil actualizada.';setTimeout(()=>status.textContent='',1400);
    }catch(e){status.textContent=e.message||'No fue posible subir la foto.';}
  }

  function activate(view){
    if(view==='explore'){location.href='explorer.html';return;}
    currentView=view||'profile';document.querySelectorAll('[data-view-panel]').forEach(p=>p.classList.toggle('is-active',p.dataset.viewPanel===currentView));document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('is-active',b.dataset.view===currentView));closeOverlays();
    if(currentView==='reservations')loadReservations().catch(()=>{});if(currentView==='ratings')loadReservations().catch(()=>{});if(currentView==='reputation')loadReputation();
  }

  async function openNotifications(){closeOverlays();if(dataEngine){try{const result=await dataEngine.refresh(user,profile);renderNotifications(result.notifications||[]);}catch(_){}}$('cpNotificationPanel').hidden=false;$('cpBackdrop').hidden=false;}
  async function logout(){const b=$('cpLogout');b.disabled=true;b.textContent='Saliendo…';try{await client.auth.signOut();}catch(_){}location.href='index.html';}

  async function init(){
    const u=await requireSession();if(!u)return;
    dataEngine=window.AgendaYaCustomerData||null;
    const ok=await loadProfile();if(!ok)return;
    $('cpApp').hidden=false;
    document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>activate(b.dataset.view)));
    $('cpMenuBtn').addEventListener('click',openSidebar);$('cpBackdrop').addEventListener('click',closeOverlays);$('cpAccountBtn').addEventListener('click',()=>activate('profile'));$('cpLogout').addEventListener('click',logout);$('cpNotificationBtn').addEventListener('click',openNotifications);$('cpNotificationClose').addEventListener('click',closeOverlays);$('cpSaveProfile').addEventListener('click',saveProfile);$('cpAvatarFile').addEventListener('change',e=>uploadAvatar(e.target.files?.[0]));
    document.querySelectorAll('[data-res-tab]').forEach(tab=>tab.addEventListener('click',()=>{document.querySelectorAll('[data-res-tab]').forEach(x=>x.classList.toggle('is-active',x===tab));const upcoming=tab.dataset.resTab==='upcoming';$('cpUpcomingList').hidden=!upcoming;$('cpHistoryList').hidden=upcoming;}));
    $('cpPhone').addEventListener('input',e=>e.target.value=e.target.value.replace(/\D/g,'').slice(0,8));
    const params=new URLSearchParams(location.search);activate(params.get('view')||'profile');if(params.get('notifications')==='1')setTimeout(openNotifications,80);
  }
  init().catch(e=>{console.error(e);location.href='index.html';});
})();
