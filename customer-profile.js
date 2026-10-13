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
  let user=null, profile={}, reservations=[], currentView='profile';

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

  async function loadCustomerEngine(){
    const e=window.AgendaYaCustomerData;
    if(!e?.refresh) throw new Error('Motor de datos del cliente no disponible.');
    const ctx=await e.refresh(user,profile);
    reservations=ctx.reservations||[];
    renderReservations();
    renderRatings();
    renderReputation(ctx.reputation||{score:null,count:0,received:[]});
    return ctx;
  }

  function reservationReview(row){
    const data=window.AgendaYaCustomerData?.context?.ratings||[];
    return data.find(x=>x.booking_id===row.id)||null;
  }

  async function loadReservations(){
    try{ await loadCustomerEngine(); }
    catch(e){
      console.error('Agenda YA reservas cliente:',e);
      reservations=[];
      $('cpUpcomingList').innerHTML='<div class="cp-empty"><strong>No fue posible cargar tus reservas.</strong><br>Intenta nuevamente en unos segundos.</div>';
      $('cpHistoryList').innerHTML='';
      $('cpRatingsList').innerHTML='<div class="cp-empty">No fue posible cargar las valoraciones.</div>';
    }
  }

  function reservationCard(row){
    const d=dateLabel(row.booking_date),service=row.services?.name||'Servicio',business=row.businesses?.name||'Negocio',slug=row.businesses?.slug||'',pro=[row.professionals?.first_name,row.professionals?.last_name].filter(Boolean).join(' '),href=slug?`public-profile.html?slug=${encodeURIComponent(slug)}`:'explorer.html';
    return `<article class="cp-reservation-card" data-reservation-id="${esc(row.id)}"><div class="cp-date-box"><strong>${esc(d.day)}</strong><small>${esc(d.month)}</small></div><div><h3>${esc(service)}</h3><div class="cp-business">${esc(business)}</div><div class="cp-meta"><span>▣ ${esc(d.full)}</span><span>◷ ${esc(timeLabel(row.start_time))}–${esc(timeLabel(row.end_time))}</span>${pro?`<span>♙ ${esc(pro)}</span>`:''}</div><div class="cp-res-actions"><a class="cp-text-link" href="${esc(href)}">Ver negocio →</a></div></div><div class="cp-status-wrap"><span class="cp-status ${statusClass(row.status)}">${esc(statusLabel(row.status))}</span></div></article>`;
  }

  function renderReservations(){
    const today=new Date().toISOString().slice(0,10);
    const upcoming=reservations.filter(x=>['pending','confirmed'].includes(String(x.status||'').toLowerCase())&&String(x.booking_date||'')>=today);
    const history=reservations.filter(x=>!upcoming.includes(x));
    const put=(id,value)=>{const el=$(id);if(el)el.textContent=String(value);};
    put('cpKpiUpcoming',upcoming.length);
    put('cpKpiPending',upcoming.filter(x=>String(x.status||'').toLowerCase()==='pending').length);
    put('cpKpiConfirmed',upcoming.filter(x=>String(x.status||'').toLowerCase()==='confirmed').length);
    put('cpKpiHistory',history.length);
    $('cpUpcomingList').innerHTML=upcoming.length?upcoming.map(reservationCard).join(''):`<div class="cp-empty"><strong>No tienes próximas reservas.</strong><br>Busca un servicio y agenda tu próxima hora.</div>`;
    $('cpHistoryList').innerHTML=history.length?history.map(reservationCard).join(''):`<div class="cp-empty"><strong>No hay reservas en tu historial.</strong><br>Las reservas completadas o canceladas aparecerán aquí.</div>`;
  }

  function renderRatings(){
    const completed=reservations.filter(x=>String(x.status||'').toLowerCase()==='completed');
    const ratings=window.AgendaYaCustomerData?.context?.ratings||[];
    if(!completed.length){$('cpRatingsList').innerHTML='<div class="cp-empty"><strong>Aún no tienes reservas completadas para valorar.</strong><br>Cuando completes una reserva, podrás valorar al negocio desde este módulo.</div>';return;}
    $('cpRatingsList').innerHTML=completed.map(row=>{
      const d=dateLabel(row.booking_date),business=row.businesses?.name||'Negocio',service=row.services?.name||'Servicio',review=ratings.find(x=>x.booking_id===row.id);
      return `<article class="cp-rating-card"><div><h3>${esc(business)}</h3><p>${esc(service)} · ${esc(d.full)}</p></div><div><div class="cp-rating-stars" aria-label="${review?`Valorado ${review.rating} de 5`:'Pendiente de valoración'}">${review?'★'.repeat(Number(review.rating))+'☆'.repeat(5-Number(review.rating)):'★★★★★'}</div><button class="cp-rating-action" type="button" data-rating-booking="${esc(row.id)}">${review?'Ver valoración':'Valorar'}</button></div></article>`;
    }).join('');
  }

  function renderReputation(rep){
    const score=Number(rep?.score),count=Number(rep?.count||0),received=rep?.received||[];
    $('cpScore').textContent=count&&Number.isFinite(score)?score.toFixed(1):'—';
    $('cpScoreCount').textContent=count===1?'1 valoración':`${count} valoraciones`;
    $('cpReceivedReviews').innerHTML=received.length?received.map(r=>`<article class="cp-review-item"><div><strong>${esc(r.business_name||'Negocio')}</strong><div class="cp-rating-stars">${'★'.repeat(Number(r.rating))+'☆'.repeat(5-Number(r.rating))}</div></div><p>${r.comment?esc(r.comment):'Sin comentario.'}</p><small>${esc(dateLabel(r.created_at||'' ).full||'')}</small></article>`).join(''):'<div class="cp-empty">Aún no tienes valoraciones recibidas. Completa reservas para construir tu reputación.</div>';
  }

  async function loadReputation(){
    try{
      const e=window.AgendaYaCustomerData;
      const rep=e?.context?.reputation || (await e.fetchRatingsAndReputation()).reputation;
      renderReputation(rep||{score:null,count:0,received:[]});
    }catch(err){
      console.error('Agenda YA reputación cliente:',err);
      $('cpScore').textContent='—';$('cpScoreCount').textContent='No disponible';$('cpReceivedReviews').innerHTML='<div class="cp-empty">No fue posible cargar tu reputación.</div>';
    }
  }

  window.AgendaYaCustomerProfile={
    refreshReputationUI:()=>{
      renderRatings();
      renderReputation(window.AgendaYaCustomerData?.context?.reputation||{score:null,count:0,received:[]});
    }
  };

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
    if(['reservations','ratings','reputation'].includes(currentView))loadCustomerEngine().catch(()=>{});
  }

  async function loadCustomerNotifications(){
    const box=$('cpNotifications');if(!box||!client||!user)return;
    const engine=window.AgendaYaCustomerData;
    let sorted=[];
    if(engine?.fetchNotifications){
      try{
        const rows=await engine.fetchNotifications();
        const unique=new Map();
        for(const n of (Array.isArray(rows)?rows:[])){
          const meta=n.metadata||n.data||{};
          const source=n.source||'general';
          const key=source==='welcome'
            ? `welcome:${n.type||n.notification_type||n.title||'welcome'}`
            : `${source}:${n.id||meta.review_id||meta.booking_id||n.booking_id||`${n.title}:${n.created_at}`}`;
          if(!unique.has(key))unique.set(key,{...n,metadata:meta,booking_id:n.booking_id||meta.booking_id||n.data?.booking_id||null,message:n.message||n.text||'Tienes una actualización en Agenda YA.'});
        }
        sorted=[...unique.values()].sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0)).slice(0,100);
      }catch(e){console.warn('Agenda YA customer notifications:',e?.message||e);}
    }
    box.innerHTML=sorted.length?sorted.map((n,i)=>`<article class="cp-review-item cp-notification-clickable" data-notification-index="${i}" style="padding:12px 4px;border-bottom:1px solid #e8edf4;cursor:pointer" role="button" tabindex="0"><strong>${esc(n.title||'Agenda YA')}</strong><p>${esc(n.message||n.text||'Tienes una actualización en Agenda YA.')}</p><small>${esc(n.created_at?new Intl.DateTimeFormat('es-CL',{dateStyle:'full',timeStyle:'short'}).format(new Date(n.created_at)):'')}</small></article>`).join(''):'<div class="cp-empty">No tienes notificaciones nuevas.</div>';
    window.__AgendaYaCustomerNotificationRows=sorted;
    const badge=$('cpNotificationBadge'),unread=sorted.filter(n=>!n.read_at).length;
    if(badge){badge.textContent=String(Math.min(unread,99));badge.hidden=unread===0;}
  }

  async function openNotifications(){
    closeOverlays();$('cpNotificationPanel').hidden=false;$('cpBackdrop').hidden=false;
    await loadCustomerNotifications();
    const engine=window.AgendaYaCustomerData;
    if(engine?.markNotificationsRead){
      try{await engine.markNotificationsRead();await loadCustomerNotifications();}
      catch(e){console.warn('Agenda YA: no se pudieron marcar como leídas las notificaciones.',e?.message||e);}
    }else{
      await Promise.allSettled([client.rpc('mark_agenda_notifications_read'),client.rpc('mark_welcome_notifications_read'),client.rpc('mark_customer_notifications_read')]);
      await loadCustomerNotifications();
    }
  }
  async function logout(){const b=$('cpLogout');b.disabled=true;b.textContent='Saliendo…';try{await client.auth.signOut();}catch(_){}location.href='index.html';}

  async function init(){
    if(!document.getElementById('cpNotificationTargetStyle')){const st=document.createElement('style');st.id='cpNotificationTargetStyle';st.textContent='.cp-notification-target{outline:3px solid #1672e8!important;outline-offset:3px;transition:outline-color .25s} .cp-notification-clickable{cursor:pointer}';document.head.appendChild(st);}
    const u=await requireSession();if(!u)return;
    const ok=await loadProfile();if(!ok)return;
    $('cpApp').hidden=false;
    await loadCustomerNotifications();
    setInterval(()=>loadCustomerNotifications().catch(e=>console.warn('Agenda YA notifications:',e)),30000);
    document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>activate(b.dataset.view)));
    $('cpMenuBtn').addEventListener('click',openSidebar);$('cpBackdrop').addEventListener('click',closeOverlays);$('cpAccountBtn').addEventListener('click',()=>activate('profile'));$('cpLogout').addEventListener('click',logout);$('cpNotificationBtn').addEventListener('click',openNotifications);$('cpNotificationClose').addEventListener('click',closeOverlays);
    const notificationBox=$('cpNotifications');
    const openNotificationEvent=async item=>{
      if(!item)return;
      closeOverlays();
      const bookingId=item.booking_id||item.metadata?.booking_id||item.data?.booking_id||item.metadata?.reservation_id||item.data?.reservation_id||null;
      const meta=item.metadata||item.data||{};
      const type=String(meta.event_type||item.notification_type||item.type||item.kind||item.source||'').toLowerCase();
      const eventText=[type,item.title,item.message,meta.target_type].filter(Boolean).join(' ').toLowerCase();
      const isReputation=/review|rating|reputation|valoraci|reseñ|resen|calific/.test(eventText);
      const isReceived=/received|client|customer_reputation|reputation_received|valoracion_recibida|valoración recibida/.test(eventText)||meta.target_type==='client';
      if(/profile_incomplete/.test(type)){activate('profile');return;}
      if(/business_profile_view|subscription_renewal|support_ticket/.test(type)){activate('profile');return;}
      if(/appointment_reminder|reservation_rescheduled/.test(type)&&bookingId){activate('reservations');try{await loadCustomerEngine();}catch(_){}setTimeout(()=>{const card=document.querySelector(`[data-reservation-id="${CSS.escape(String(bookingId))}"]`);if(card){card.scrollIntoView({behavior:'smooth',block:'center'});card.classList.add('cp-notification-target');}},120);return;}
      if(isReputation){
        if(isReceived){
          activate('reputation');
          if(bookingId){try{await loadCustomerEngine();}catch(_){}setTimeout(()=>{const target=document.querySelector(`[data-review-booking="${CSS.escape(String(bookingId))}"]`);if(target){target.scrollIntoView({behavior:'smooth',block:'center'});target.classList.add('cp-notification-target');setTimeout(()=>target.classList.remove('cp-notification-target'),2600);}},120);}
          return;
        }
        activate('ratings');
        if(bookingId){
          try{await loadCustomerEngine();}catch(_){}
          let tries=0;
          const openRating=()=>{
            const target=document.querySelector(`[data-rating-booking="${CSS.escape(String(bookingId))}"]`);
            if(target){target.scrollIntoView({behavior:'smooth',block:'center'});target.click();target.closest('.cp-rating-card')?.classList.add('cp-notification-target');return;}
            if(++tries<12)setTimeout(openRating,180);
          };
          setTimeout(openRating,100);
        }
        return;
      }
      if(bookingId){activate('reservations');try{await loadCustomerEngine();}catch(_){}setTimeout(()=>{const card=document.querySelector(`[data-reservation-id="${CSS.escape(String(bookingId))}"]`);if(card){card.scrollIntoView({behavior:'smooth',block:'center'});card.classList.add('cp-notification-target');setTimeout(()=>card.classList.remove('cp-notification-target'),2600);}},120);return;}
      const dest=item.destination||meta.destination;
      if(dest&&typeof dest==='string'&&!/^(javascript:|https?:\/\/)/i.test(dest)){location.href=dest;return;}
      if(/plan|payment|subscription|membres|pago|suscrip/.test(eventText)){activate('profile');return;}
      activate('profile');
    };
    notificationBox?.addEventListener('click',e=>{const row=e.target.closest('[data-notification-index]');if(row)openNotificationEvent(window.__AgendaYaCustomerNotificationRows?.[Number(row.dataset.notificationIndex)]);});
    notificationBox?.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-notification-index]')){e.preventDefault();openNotificationEvent(window.__AgendaYaCustomerNotificationRows?.[Number(e.target.dataset.notificationIndex)]);}});
    $('cpSaveProfile').addEventListener('click',saveProfile);$('cpAvatarFile').addEventListener('change',e=>uploadAvatar(e.target.files?.[0]));
    document.querySelectorAll('[data-res-tab]').forEach(tab=>tab.addEventListener('click',()=>{document.querySelectorAll('[data-res-tab]').forEach(x=>x.classList.toggle('is-active',x===tab));const upcoming=tab.dataset.resTab==='upcoming';$('cpUpcomingList').hidden=!upcoming;$('cpHistoryList').hidden=upcoming;}));
    $('cpPhone').addEventListener('input',e=>e.target.value=e.target.value.replace(/\D/g,'').slice(0,8));
    const params=new URLSearchParams(location.search);activate(params.get('view')||'profile');
    const linkedBookingId=params.get('booking_id');
    if(linkedBookingId){setTimeout(async()=>{
      try{await loadCustomerEngine();}catch(_){}
      const view=params.get('view')||'profile';
      if(view==='ratings'){
        const rating=document.querySelector(`[data-rating-booking="${CSS.escape(String(linkedBookingId))}"]`);
        if(rating){rating.scrollIntoView({behavior:'smooth',block:'center'});rating.click();}
      }else if(view==='reputation'){
        const review=document.querySelector(`[data-review-booking="${CSS.escape(String(linkedBookingId))}"]`);
        if(review){review.scrollIntoView({behavior:'smooth',block:'center'});review.classList.add('cp-notification-target');setTimeout(()=>review.classList.remove('cp-notification-target'),2600);}
      }else{
        const card=document.querySelector(`[data-reservation-id="${CSS.escape(String(linkedBookingId))}"]`);
        if(card){card.scrollIntoView({behavior:'smooth',block:'center'});card.classList.add('cp-notification-target');setTimeout(()=>card.classList.remove('cp-notification-target'),2600);}
      }
    },160);}
    if(params.get('notifications')==='1')setTimeout(openNotifications,80);
  }
  init().catch(e=>{console.error(e);location.href='index.html';});
})();
