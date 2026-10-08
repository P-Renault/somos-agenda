(() => {
  const cfg = window.SOMOS_CONFIG || {};
  const client = window.supabase?.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const money = v => Number(v || 0).toLocaleString('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0});
  const PENDING_KEY = 'agendaYaPendingBooking';
  const imageByCategory = {
    barberia:'assets/card_barber.jpg', peluqueria:'assets/card_barber.jpg', estetica:'assets/card_aura.jpg',
    salud:'assets/card_med.jpg', bienestar:'assets/card_med.jpg', entrenamiento:'assets/card_fit.jpg',
    educacion:'assets/card_somos.jpg', 'servicios-profesionales':'assets/card_somos.jpg',
    hogar:'assets/card_home.jpg', automotriz:'assets/card_auto.jpg', mascotas:'assets/card_pet.jpg', otros:'assets/card_somos.jpg'
  };

  let profileData = null;
  let bookingContextByDate = new Map();
  let bookingMonth = new Date(); bookingMonth.setDate(1);
  let bookingSelectedDate = null;
  let bookingSelectedService = null;
  let bookingSelectedProfessional = null;
  let bookingSelectedSlot = null;
  let bookingSession = null;

  function initials(name){ return String(name || 'AY').trim().split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase() || 'AY'; }
  function params(){ return new URLSearchParams(window.location.search); }
  function todayLocal(){ const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
  function dateKey(d){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
  function parseDateKey(v){ const [y,m,d]=String(v).split('-').map(Number); return new Date(y,m-1,d); }
  function timeToMinutes(v){ const [h,m]=String(v).slice(0,5).split(':').map(Number); return h*60+m; }
  function minutesToTime(v){ return `${String(Math.floor(v/60)).padStart(2,'0')}:${String(v%60).padStart(2,'0')}`; }
  function formatTime(v){ return String(v).slice(0,5); }
  function formatDate(v){ return parseDateKey(v).toLocaleDateString('es-CL',{weekday:'long',day:'numeric',month:'long'}); }
  function normalizePhone(v){ return String(v||'').replace(/\D/g,''); }
  function showError(message){ $('stateLoading').hidden=true; $('businessProfile').hidden=true; $('stateError').hidden=false; $('errorMessage').textContent=message||'El perfil puede no estar publicado o el enlace puede ser incorrecto.'; }
  function categoryImage(data){ return data?.profile?.cover_url || imageByCategory[data?.category?.slug] || imageByCategory.otros; }
  function mapQuery(p){ return [p.address,p.comuna,p.city].filter(Boolean).join(', '); }
  function renderMap(p){ const query=mapQuery(p); if(!query)return; const encoded=encodeURIComponent(query); $('mapFrame').src=`https://www.google.com/maps?q=${encoded}&output=embed`; $('mapWrap').hidden=false; $('mapLink').href=`https://www.google.com/maps/search/?api=1&query=${encoded}`; $('mapLink').hidden=false; }

  async function loadSimilarBusinesses(categorySlug,currentSlug){
    const section=$('similarSection'),grid=$('similarBusinesses'); if(!categorySlug||!client)return;
    const r=await client.rpc('search_public_businesses',{p_query:'',p_category_slug:categorySlug,p_city:null,p_limit:12,p_offset:0});
    if(r.error||!r.data)return; const items=Array.isArray(r.data.items)?r.data.items:[];
    const similar=items.filter(x=>x.slug&&x.slug!==currentSlug).slice(0,4); if(!similar.length)return;
    grid.innerHTML=similar.map(item=>{
      const cover=item.cover_url||imageByCategory[item.category_slug]||imageByCategory.otros;
      const logo=item.logo_url?`<img src="${esc(item.logo_url)}" alt="Logo de ${esc(item.name||'Negocio')}">`:esc(initials(item.name));
      const loc=[item.comuna,item.city].filter(Boolean).join(', ')||'Ubicación no informada';
      const count=Number(item.service_count||0), price=item.min_price!=null?money(item.min_price):'';
      return `<a class="similar-card" href="public-profile.html?slug=${encodeURIComponent(item.slug)}"><div class="similar-cover" style="background-image:url('${esc(cover)}')"><div class="similar-logo">${logo}</div></div><div class="similar-body"><span class="similar-category">${esc(item.category_name||'Servicios')}</span><h3 class="similar-name">${esc(item.name||'Negocio')}</h3><p class="similar-location">${esc(loc)}</p><div class="similar-meta"><span>${count} servicio${count===1?'':'s'}</span>${price?`<strong>Desde ${esc(price)}</strong>`:'<strong>Ver servicios</strong>'}<span class="similar-arrow">→</span></div></div></a>`;
    }).join(''); section.hidden=false;
  }

  function render(data){
    profileData=data; const b=data.business||{},p=data.profile||{},c=data.category||null,services=Array.isArray(data.services)?data.services:[],professionals=Array.isArray(data.professionals)?data.professionals:[];
    document.title=`${b.name||'Perfil'} · Agenda Ya`; $('businessName').textContent=b.name||'Negocio'; $('category').textContent=c?.name||'Servicios';
    $('location').textContent=[p.comuna,p.city].filter(Boolean).join(', ')||'Ubicación no informada'; $('description').textContent=p.description||'Este negocio aún no ha agregado una descripción pública.';
    $('address').textContent=p.address||'Dirección no publicada'; $('city').textContent=[p.comuna,p.city].filter(Boolean).join(', ');
    const logo=$('logo'); if(b.logo_url)logo.innerHTML=`<img src="${esc(b.logo_url)}" alt="Logo de ${esc(b.name)}">`; else logo.textContent=initials(b.name);
    $('cover').style.backgroundImage=`url("${encodeURI(categoryImage(data))}")`;
    renderMap(p);
    if(p.phone||b.phone||p.whatsapp){
      $('contactPanel').hidden=false; $('contactLocation').textContent=[p.comuna,p.city].filter(Boolean).join(', ')||'Contacto disponible';
      const phone=p.phone||b.phone; if(phone){ $('phone').hidden=false; $('phone').textContent=phone; $('phone').href=`tel:${normalizePhone(phone)}`; }
      if(p.whatsapp){ $('whatsapp').hidden=false; $('whatsapp').href=`https://wa.me/${normalizePhone(p.whatsapp)}`; }
    }
    $('serviceSummary').textContent=services.length?`${services.length} servicio${services.length===1?'':'s'} publicado${services.length===1?'':'s'}`:'Servicios publicados por el negocio';
    $('services').innerHTML=services.length?services.map(s=>`<article class="service-card"><div class="service-main"><h3>${esc(s.name||'Servicio')}</h3>${s.description?`<p>${esc(s.description)}</p>`:''}</div><div class="service-meta"><span>${s.duration_minutes?`${esc(s.duration_minutes)} min`:'Duración a consultar'}</span><span class="service-price">${s.price!=null?money(s.price):'Consultar'}</span></div></article>`).join(''):'<p class="empty-note">Este negocio aún no tiene servicios publicados.</p>';
    if(professionals.length){ $('professionalsPanel').hidden=false; $('professionals').innerHTML=professionals.map(pf=>{const name=[pf.first_name,pf.last_name].filter(Boolean).join(' ')||'Profesional';return `<article class="professional"><div class="professional-avatar">${esc(initials(name))}</div><div><h3>${esc(name)}</h3>${pf.bio?`<p>${esc(pf.bio)}</p>`:''}</div></article>`;}).join(''); }
    $('stateLoading').hidden=true; $('stateError').hidden=true; $('businessProfile').hidden=false;
    loadSimilarBusinesses(c?.slug,b.slug).catch(()=>{});
  }

  function bookingServices(){ return Array.isArray(profileData?.services)?profileData.services:[]; }
  function bookingProfessionals(){ return Array.isArray(profileData?.professionals)?profileData.professionals:[]; }
  function windowsForProfessional(p){
    const exceptions=p.availability||[];
    if(exceptions.length){ return {available:exceptions.filter(x=>x.status==='available').map(x=>({start_time:x.start_time,end_time:x.end_time})),blocked:exceptions.filter(x=>x.status==='blocked')}; }
    return {available:p.schedules||[],blocked:[]};
  }
  function slotIsFree(start,end,bookings){ return !(bookings||[]).some(b=>start<timeToMinutes(b.end_time)&&end>timeToMinutes(b.start_time)); }
  function slotsFor(p,s){
    if(!p||!s)return[]; const {available,blocked}=windowsForProfessional(p),duration=Number(s.duration_minutes||0),bookings=p.bookings||[],options=[];
    for(const w of available){ const ws=timeToMinutes(w.start_time),we=timeToMinutes(w.end_time); for(let start=ws;start+duration<=we;start+=15){const end=start+duration;if(!blocked.some(b=>start<timeToMinutes(b.end_time)&&end>timeToMinutes(b.start_time))&&slotIsFree(start,end,bookings))options.push({start,end});} }
    return [...new Map(options.map(x=>[x.start,x])).values()];
  }
  async function fetchBookingContext(date){
    if(bookingContextByDate.has(date))return bookingContextByDate.get(date);
    const r=await client.rpc('get_public_booking_context',{p_slug:profileData?.business?.slug,p_date:date});
    if(r.error)throw r.error; bookingContextByDate.set(date,r.data); return r.data;
  }
  function monthLabel(){ $('bookingMonthLabel').textContent=bookingMonth.toLocaleDateString('es-CL',{month:'long',year:'numeric'}); }
  async function renderBookingCalendar(){
    monthLabel(); const grid=$('bookingCalendar'); grid.innerHTML='';
    const weekdays=['L','M','X','J','V','S','D']; weekdays.forEach(d=>{const e=document.createElement('span');e.className='booking-weekday';e.textContent=d;grid.appendChild(e);});
    const first=new Date(bookingMonth.getFullYear(),bookingMonth.getMonth(),1), last=new Date(bookingMonth.getFullYear(),bookingMonth.getMonth()+1,0);
    const offset=(first.getDay()+6)%7, today=todayLocal();
    for(let i=0;i<offset;i++){const e=document.createElement('span');e.className='booking-day empty';grid.appendChild(e);}
    const days=[];
    for(let day=1;day<=last.getDate();day++){ const d=new Date(bookingMonth.getFullYear(),bookingMonth.getMonth(),day),key=dateKey(d); const e=document.createElement('button'); e.type='button';e.className='booking-day';e.textContent=day;e.dataset.date=key; if(key<today)e.disabled=true; if(key===bookingSelectedDate)e.classList.add('selected'); grid.appendChild(e); days.push({key,e}); }
    await Promise.all(days.map(async item=>{
      if(item.e.disabled)return; item.e.classList.add('loading');
      try{const ctx=await fetchBookingContext(item.key);const has=bookingServices().some(s=>(ctx.professionals||[]).some(p=>slotsFor(p,s).length));item.e.classList.toggle('available',has);item.e.disabled=!has;}catch(_){item.e.disabled=true;}finally{item.e.classList.remove('loading');}
    }));
    grid.querySelectorAll('[data-date]').forEach(btn=>btn.addEventListener('click',()=>selectBookingDate(btn.dataset.date)));
    if(!bookingSelectedDate || !days.some(x=>x.key===bookingSelectedDate&&!x.e.disabled)){
      const firstAvailable=days.find(x=>!x.e.disabled&&x.e.classList.contains('available')); if(firstAvailable) await selectBookingDate(firstAvailable.key);
      else {bookingSelectedDate=null;$('bookingDateLabel').textContent='No hay fechas disponibles en este mes.';$('bookingSlots').innerHTML='';}
    } else await renderBookingSlots();
  }
  async function selectBookingDate(date){ bookingSelectedDate=date; bookingSelectedSlot=null; $('bookingDateLabel').textContent=formatDate(date); await renderBookingCalendar(); await renderBookingSlots(); }
  async function renderBookingSlots(){
    const wrap=$('bookingSlots');wrap.innerHTML=''; $('bookingAvailability').textContent=''; if(!bookingSelectedDate||!bookingSelectedService||!bookingSelectedProfessional){$('bookingAvailability').textContent='Selecciona servicio, profesional y fecha.';return;}
    const ctx=bookingContextByDate.get(bookingSelectedDate)||await fetchBookingContext(bookingSelectedDate); const p=(ctx.professionals||[]).find(x=>x.id===bookingSelectedProfessional),s=bookingServices().find(x=>x.id===bookingSelectedService); const slots=slotsFor(p,s);
    if(!slots.length){$('bookingAvailability').textContent='No hay horarios disponibles para esta combinación.';return;}
    wrap.innerHTML=slots.map(x=>`<button type="button" class="booking-slot" data-start="${minutesToTime(x.start)}" data-end="${minutesToTime(x.end)}">${formatTime(minutesToTime(x.start))} – ${formatTime(minutesToTime(x.end))}</button>`).join('');
    wrap.querySelectorAll('.booking-slot').forEach(btn=>btn.addEventListener('click',()=>{bookingSelectedSlot={start:btn.dataset.start,end:btn.dataset.end};wrap.querySelectorAll('.booking-slot').forEach(x=>x.classList.remove('selected'));btn.classList.add('selected');}));
    $('bookingAvailability').textContent=`${slots.length} horario${slots.length===1?'':'s'} disponible${slots.length===1?'':'s'}.`;
  }
  function renderBookingServices(){
    const wrap=$('bookingServices');const items=bookingServices();
    wrap.innerHTML=items.length?items.map(s=>`<button type="button" class="booking-choice ${s.id===bookingSelectedService?'selected':''}" data-service="${s.id}"><span><strong>${esc(s.name)}</strong><small>${s.duration_minutes||0} min${s.price!=null?' · '+money(s.price):''}</small></span><b>✓</b></button>`).join(''):'<p class="booking-helper">Este negocio aún no tiene servicios disponibles.</p>';
    wrap.querySelectorAll('[data-service]').forEach(btn=>btn.addEventListener('click',async()=>{bookingSelectedService=btn.dataset.service;wrap.querySelectorAll('.booking-choice').forEach(x=>x.classList.toggle('selected',x===btn));const s=items.find(x=>x.id===bookingSelectedService);$('bookingServiceDescription').textContent=s?.description||'';await renderBookingCalendar();await renderBookingSlots();}));
  }
  function renderBookingProfessionals(){
    const wrap=$('bookingProfessionals'),items=bookingProfessionals();
    if(!bookingSelectedProfessional&&items.length)bookingSelectedProfessional=items[0].id;
    wrap.innerHTML=items.length?items.map(p=>{const name=[p.first_name,p.last_name].filter(Boolean).join(' ')||'Profesional';return `<button type="button" class="booking-choice ${p.id===bookingSelectedProfessional?'selected':''}" data-professional="${p.id}"><span><strong>${esc(name)}</strong><small>${p.bio?esc(p.bio):'Disponible según agenda'}</small></span><b>✓</b></button>`;}).join(''):'<p class="booking-helper">Este negocio aún no tiene profesionales publicados.</p>';
    wrap.querySelectorAll('[data-professional]').forEach(btn=>btn.addEventListener('click',async()=>{bookingSelectedProfessional=btn.dataset.professional;wrap.querySelectorAll('.booking-choice').forEach(x=>x.classList.toggle('selected',x===btn));await renderBookingCalendar();await renderBookingSlots();}));
  }
  async function hydrateBookingIdentity(){
    bookingSession=null; try{const s=await client.auth.getSession();bookingSession=s.data?.session||null;}catch(_){bookingSession=null;}
    const notice=$('bookingAuthNotice');notice.hidden=!!bookingSession;
    if(bookingSession){
      const user=bookingSession.user||{},r=await client.from('profiles').select('full_name,phone').eq('id',user.id).maybeSingle(),p=r.data||{};
      const name=p.full_name||user.user_metadata?.full_name||user.user_metadata?.name||'';const parts=String(name).trim().split(/\s+/).filter(Boolean);
      $('bookingFirstName').value=parts.shift()||'';$('bookingLastName').value=parts.join(' ')||'';$('bookingEmail').value=user.email||'';$('bookingPhone').value=p.phone||user.user_metadata?.phone||'';
    }
  }
  function openBooking(){
    $('bookingPanel').hidden=false;bookingContextByDate=new Map();bookingSelectedService=bookingServices()[0]?.id||null;bookingSelectedProfessional=bookingProfessionals()[0]?.id||null;bookingSelectedDate=null;bookingSelectedSlot=null;bookingMonth=parseDateKey(todayLocal());bookingMonth.setDate(1);
    renderBookingServices();renderBookingProfessionals();hydrateBookingIdentity().then(()=>renderBookingCalendar()).catch(()=>renderBookingCalendar());$('bookingPanel').scrollIntoView({behavior:'smooth',block:'start'});
  }
  function closeBooking(){ $('bookingPanel').hidden=true; }
  function draftFromForm(){return {slug:profileData?.business?.slug||params().get('slug')||'',date:bookingSelectedDate,serviceId:bookingSelectedService,professionalId:bookingSelectedProfessional,slot:bookingSelectedSlot,firstName:$('bookingFirstName').value.trim(),lastName:$('bookingLastName').value.trim(),email:$('bookingEmail').value.trim(),phone:$('bookingPhone').value.trim(),notes:$('bookingNotes').value.trim(),returnUrl:`public-profile.html?slug=${encodeURIComponent(profileData?.business?.slug||params().get('slug')||'')}`};}
  async function confirmBooking(){
    if(!bookingSelectedService||!bookingSelectedProfessional||!bookingSelectedDate||!bookingSelectedSlot){$('bookingStatus').textContent='Selecciona servicio, profesional, fecha y horario.';return;}
    const first=$('bookingFirstName').value.trim(),last=$('bookingLastName').value.trim(),email=$('bookingEmail').value.trim(),phone=$('bookingPhone').value.trim();
    if(!first||!last||(!email&&!phone)){ $('bookingStatus').textContent='Completa nombre, apellido y al menos un medio de contacto.';return; }
    if(!bookingSession){ sessionStorage.setItem(PENDING_KEY,JSON.stringify(draftFromForm()));$('bookingStatus').textContent='Necesitas iniciar sesión para confirmar la reserva. Tu selección quedará guardada.';$('bookingAuthNotice').hidden=false;$('bookingLogin').focus();return; }
    const service=bookingServices().find(x=>x.id===bookingSelectedService),start=bookingSelectedSlot.start,end=bookingSelectedSlot.end;
    const btn=$('confirmBooking');btn.disabled=true;btn.textContent='Confirmando…';$('bookingStatus').textContent='Verificando disponibilidad…';
    const r=await client.rpc('create_public_booking',{p_slug:profileData.business.slug,p_client_first_name:first,p_client_last_name:last,p_client_email:email||null,p_client_phone:phone||null,p_service_id:service.id,p_professional_id:bookingSelectedProfessional,p_booking_date:bookingSelectedDate,p_start_time:start,p_end_time:end,p_notes:$('bookingNotes').value.trim()||null});
    btn.disabled=false;btn.textContent='Confirmar reserva →';
    if(r.error){const map={AUTH_REQUIRED:'Tu sesión expiró. Inicia sesión nuevamente.',BOOKING_OVERLAP:'Ese horario acaba de ser ocupado. Elige otro horario.',OUTSIDE_SCHEDULE:'Ese horario está fuera del horario del profesional.',OUTSIDE_AVAILABILITY:'Ese horario ya no está disponible.',SERVICE_NOT_AVAILABLE:'El servicio seleccionado ya no está disponible.',PROFESSIONAL_NOT_AVAILABLE:'El profesional seleccionado ya no está disponible.',BOOKING_DURATION_INVALID:'La duración del servicio no coincide con el horario seleccionado.'};$('bookingStatus').textContent=map[r.error.message]||r.error.message;bookingContextByDate.delete(bookingSelectedDate);await renderBookingCalendar();return;}
    const x=r.data||{};$('bookingSuccess').hidden=false;$('bookingSuccessText').textContent=`${x.service_name||service.name} con ${x.professional_name||'el profesional seleccionado'}, el ${formatDate(bookingSelectedDate)} de ${formatTime(x.start_time||start)} a ${formatTime(x.end_time||end)}. Tu solicitud quedó registrada como pendiente.`;$('bookingStatus').textContent='';sessionStorage.removeItem(PENDING_KEY);bookingContextByDate.delete(bookingSelectedDate);
  }

  $('reserveButton').addEventListener('click',openBooking);
  $('closeBooking').addEventListener('click',closeBooking);
  $('bookingPrevMonth').addEventListener('click',async()=>{bookingMonth.setMonth(bookingMonth.getMonth()-1);bookingContextByDate=new Map();await renderBookingCalendar();});
  $('bookingNextMonth').addEventListener('click',async()=>{bookingMonth.setMonth(bookingMonth.getMonth()+1);bookingContextByDate=new Map();await renderBookingCalendar();});
  $('confirmBooking').addEventListener('click',confirmBooking);
  $('bookingLogin').addEventListener('click',()=>{const draft=draftFromForm();sessionStorage.setItem(PENDING_KEY,JSON.stringify(draft));location.href=`login.html?return=${encodeURIComponent(draft.returnUrl)}`;});

  async function init(){
    if(!client)return showError('No fue posible inicializar la conexión con Agenda Ya.');
    const slug=params().get('slug')?.trim();if(!slug)return showError('Este enlace no contiene el identificador público del negocio.');
    const r=await client.rpc('get_public_business_profile',{p_slug:slug});
    if(r.error||!r.data){const msg=r.error?.message||'';if(/NOT_FOUND|not found/i.test(msg))return showError('El negocio no existe o ya no está disponible públicamente.');if(/NOT_PUBLISHED|published/i.test(msg))return showError('Este negocio todavía no está publicado en el marketplace.');return showError('No pudimos cargar el perfil público en este momento.');}
    render(r.data);
  }
  init();
})();
