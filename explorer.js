(() => {
  const cfg = window.SOMOS_CONFIG || {};
  const client = window.supabase?.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const money = v => Number(v || 0).toLocaleString('es-CL', {style:'currency',currency:'CLP',maximumFractionDigits:0});
  const imageByCategory = {
    barberia:['assets/category-covers/barberia-01.jpg','assets/category-covers/barberia-02.jpg','assets/category-covers/barberia-03.jpg','assets/category-covers/barberia-04.jpg','assets/category-covers/barberia-05.jpg','assets/category-covers/barberia-06.jpg','assets/category-covers/barberia-07.jpg','assets/category-covers/barberia-08.jpg'],
    peluqueria:['assets/category-covers/peluqueria-01.jpg','assets/category-covers/peluqueria-02.jpg','assets/category-covers/peluqueria-03.jpg','assets/category-covers/peluqueria-04.jpg','assets/category-covers/peluqueria-05.jpg','assets/category-covers/peluqueria-06.jpg','assets/category-covers/peluqueria-07.jpg','assets/category-covers/peluqueria-08.jpg'],
    estetica:['assets/category-covers/estetica-01.jpg','assets/category-covers/estetica-02.jpg','assets/category-covers/estetica-03.jpg','assets/category-covers/estetica-04.jpg','assets/category-covers/estetica-05.jpg','assets/category-covers/estetica-06.jpg','assets/category-covers/estetica-07.jpg','assets/category-covers/estetica-08.jpg'],
    salud:['assets/category-covers/salud-01.jpg','assets/category-covers/salud-02.jpg','assets/category-covers/salud-03.jpg','assets/category-covers/salud-04.jpg','assets/category-covers/salud-05.jpg','assets/category-covers/salud-06.jpg','assets/category-covers/salud-07.jpg','assets/category-covers/salud-08.jpg'],
    bienestar:['assets/category-covers/bienestar-01.jpg','assets/category-covers/bienestar-02.jpg','assets/category-covers/bienestar-03.jpg','assets/category-covers/bienestar-04.jpg','assets/category-covers/bienestar-05.jpg','assets/category-covers/bienestar-06.jpg','assets/category-covers/bienestar-07.jpg','assets/category-covers/bienestar-08.jpg'],
    entrenamiento:['assets/category-covers/entrenamiento-01.jpg','assets/category-covers/entrenamiento-02.jpg','assets/category-covers/entrenamiento-03.jpg','assets/category-covers/entrenamiento-04.jpg','assets/category-covers/entrenamiento-05.jpg','assets/category-covers/entrenamiento-06.jpg','assets/category-covers/entrenamiento-07.jpg','assets/category-covers/entrenamiento-08.jpg'],
    educacion:['assets/category-covers/educacion-01.jpg','assets/category-covers/educacion-02.jpg','assets/category-covers/educacion-03.jpg','assets/category-covers/educacion-04.jpg','assets/category-covers/educacion-05.jpg','assets/category-covers/educacion-06.jpg','assets/category-covers/educacion-07.jpg','assets/category-covers/educacion-08.jpg'],
    'servicios-profesionales':['assets/category-covers/servicios-profesionales-01.jpg','assets/category-covers/servicios-profesionales-02.jpg','assets/category-covers/servicios-profesionales-03.jpg','assets/category-covers/servicios-profesionales-04.jpg','assets/category-covers/servicios-profesionales-05.jpg','assets/category-covers/servicios-profesionales-06.jpg','assets/category-covers/servicios-profesionales-07.jpg','assets/category-covers/servicios-profesionales-08.jpg'],
    hogar:['assets/category-covers/hogar-01.jpg','assets/category-covers/hogar-02.jpg','assets/category-covers/hogar-03.jpg','assets/category-covers/hogar-04.jpg','assets/category-covers/hogar-05.jpg','assets/category-covers/hogar-06.jpg','assets/category-covers/hogar-07.jpg','assets/category-covers/hogar-08.jpg'],
    automotriz:['assets/category-covers/automotriz-01.jpg','assets/category-covers/automotriz-02.jpg','assets/category-covers/automotriz-03.jpg','assets/category-covers/automotriz-04.jpg','assets/category-covers/automotriz-05.jpg','assets/category-covers/automotriz-06.jpg','assets/category-covers/automotriz-07.jpg','assets/category-covers/automotriz-08.jpg'],
    mascotas:['assets/category-covers/mascotas-01.jpg','assets/category-covers/mascotas-02.jpg','assets/category-covers/mascotas-03.jpg','assets/category-covers/mascotas-04.jpg','assets/category-covers/mascotas-05.jpg','assets/category-covers/mascotas-06.jpg','assets/category-covers/mascotas-07.jpg','assets/category-covers/mascotas-08.jpg'],
    otros:['assets/category-covers/otros-01.jpg','assets/category-covers/otros-02.jpg','assets/category-covers/otros-03.jpg','assets/category-covers/otros-04.jpg','assets/category-covers/otros-05.jpg','assets/category-covers/otros-06.jpg','assets/category-covers/otros-07.jpg','assets/category-covers/otros-08.jpg']
  };
  function stableCategoryImage(slug, key='') {
    const pool = imageByCategory[slug] || imageByCategory.otros;
    const text = String(key || slug || 'agenda-ya');
    let hash = 0; for (let i=0; i<text.length; i++) hash = ((hash * 31) + text.charCodeAt(i)) >>> 0;
    return pool[hash % pool.length];
  }
  const iconByCategory = {barberia:'✂',peluqueria:'✂',estetica:'✿',salud:'♥',bienestar:'✧',entrenamiento:'♜',educacion:'▣','servicios-profesionales':'▣',hogar:'⌂',automotriz:'●',mascotas:'●',otros:'•'};
  let categoriesData = [];

  function categoryImage(item){
    return item.cover_url || stableCategoryImage(item.category_slug, item.slug);
  }
  function initials(name){
    return String(name || 'AY').trim().split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase() || 'AY';
  }
  function logoMarkup(item){
    const url = item.logo_url || '';
    return url
      ? `<span class="business-avatar has-image"><img src="${esc(url)}" alt="" loading="lazy"></span>`
      : `<span class="business-avatar"><span>${esc(initials(item.name))}</span></span>`;
  }
  function ratingMarkup(item){
    return `<div class="card-rating"><span class="star">★</span><strong>${item.rating ? esc(item.rating) : 'Nuevo'}</strong>${item.review_count ? `<span>(${esc(item.review_count)})</span>` : ''}</div>`;
  }
  function card(item){
    const duration = Number(item.min_duration_minutes || 0);
    const price = item.min_price != null ? money(item.min_price) : 'Consultar';
    const loc = [item.comuna,item.city].filter(Boolean).join(', ') || 'Ubicación no informada';
    const category = item.category_name || 'Servicios';
    const href = `public-profile.html?slug=${encodeURIComponent(item.slug)}`;
    return `<article class="business-card" tabindex="0" data-href="${esc(href)}" aria-label="Ver perfil de ${esc(item.name)}">
      <div class="business-cover">
        <img src="${esc(categoryImage(item))}" alt="" loading="lazy">
        <button class="favorite-button" type="button" aria-label="Agregar ${esc(item.name)} a favoritos">♡</button>
      </div>
      <div class="business-card-body">
        ${logoMarkup(item)}
        <div class="business-main">
          <h2>${esc(item.name)}</h2>
          ${ratingMarkup(item)}
          <div class="business-location"><span>⌖</span>${esc(loc)}</div>
          <span class="category-pill">${esc(category)}</span>
        </div>
      </div>
      <div class="business-meta">
        <span><b class="meta-icon">◷</b>${duration ? `${duration} min` : 'Ver horarios'}</span>
        <span><b class="meta-icon">＄</b>${price === 'Consultar' ? price : `Desde ${price}`}</span>
        <span class="card-arrow" aria-hidden="true">→</span>
      </div>
    </article>`;
  }

  let marketNotificationRows=[];
  let marketNotificationPanel=null;
  function ensureMarketNotificationPanel(){
    if(marketNotificationPanel)return marketNotificationPanel;
    marketNotificationPanel=document.createElement('section');
    marketNotificationPanel.className='market-notifications-panel';
    marketNotificationPanel.id='marketNotificationsPanel';
    marketNotificationPanel.hidden=true;
    marketNotificationPanel.setAttribute('role','dialog');
    marketNotificationPanel.setAttribute('aria-label','Notificaciones');
    marketNotificationPanel.innerHTML='<div class="market-notifications-head"><div><small>AGENDA YA</small><h2>Notificaciones</h2></div><button type="button" id="marketNotificationsClose" aria-label="Cerrar notificaciones">×</button></div><div class="market-notifications-list" id="marketNotificationsList"><div class="market-notification-empty">Cargando notificaciones…</div></div>';
    document.body.appendChild(marketNotificationPanel);
    marketNotificationPanel.querySelector('#marketNotificationsClose').addEventListener('click',closeMarketNotifications);
    document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMarketNotifications();});
    document.addEventListener('click',e=>{if(marketNotificationPanel&&!marketNotificationPanel.hidden&&!e.target.closest('#marketNotificationsPanel')&&!e.target.closest('#marketNotification'))closeMarketNotifications();});
    return marketNotificationPanel;
  }
  function closeMarketNotifications(){if(marketNotificationPanel)marketNotificationPanel.hidden=true;const b=$('marketNotification');if(b)b.setAttribute('aria-expanded','false');}
  function formatNotificationDate(value){if(!value)return '';const d=new Date(value);return Number.isNaN(d.getTime())?'':new Intl.DateTimeFormat('es-CL',{dateStyle:'medium',timeStyle:'short'}).format(d);}
  function normalizeMarketNotification(n,source){
    const booking=source==='booking-status';
    let title=n.title||'Actualización de Agenda Ya';
    let message=n.message||n.text||'Tienes una actualización en Agenda Ya.';
    if(booking){
      const st=String(n.status||n.new_status||'').toLowerCase();
      title=st==='confirmed'?'Reserva confirmada':st==='completed'?'Reserva completada':['cancelled','rejected'].includes(st)?'Reserva cancelada':st==='no_show'?'Reserva marcada como no asistida':'Estado de reserva actualizado';
      message=n.text||n.message||'Tu reserva tiene una actualización.';
    }
    return {...n,source,title,message,booking_id:n.booking_id||n.metadata?.booking_id||null,destination:n.destination||n.metadata?.destination||null,created_at:n.created_at||null,read_at:n.read_at||null};
  }
  async function fetchMarketNotifications(){
    if(!client)return [];
    const sources=[
      ['welcome',client.rpc('get_welcome_notifications',{p_limit:50})],
      ['app',client.rpc('get_app_notifications',{p_limit:50})]
    ];
    const results=await Promise.all(sources.map(async([source,promise])=>({source,...await promise.catch(error=>({data:null,error}))})));
    const rows=[];
    for(const r of results){if(!r.error&&Array.isArray(r.data))rows.push(...r.data.map(n=>normalizeMarketNotification(n,r.source)));}
    try{
      const engine=window.AgendaYaCustomerData;
      if(engine?.fetchNotifications){const bookingRows=await engine.fetchNotifications();if(Array.isArray(bookingRows))rows.push(...bookingRows.map(n=>normalizeMarketNotification(n,'booking-status')));}
      else {const r=await client.rpc('get_customer_notifications',{p_limit:50});if(!r.error&&Array.isArray(r.data))rows.push(...r.data.map(n=>normalizeMarketNotification(n,'booking-status')));}
    }catch(e){console.warn('Agenda YA: no se pudieron cargar notificaciones de reservas.',e?.message||e);}
    const unique=new Map();
    rows.forEach(n=>unique.set(`${n.source}:${n.id||`${n.title}:${n.created_at}`}`,n));
    return [...unique.values()].sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0)).slice(0,100);
  }
  async function refreshMarketNotificationState(){
    const button=$('marketNotification');const dot=$('marketNotificationDot');if(!button||!client)return;
    try{
      const session=await client.auth.getSession();if(!session.data?.session?.user){if(dot)dot.hidden=true;return;}
      marketNotificationRows=await fetchMarketNotifications();
      const unread=marketNotificationRows.some(n=>!n.read_at);
      if(dot)dot.hidden=!unread;
      button.classList.toggle('has-unread',unread);
      button.setAttribute('aria-label',unread?'Notificaciones nuevas':'Notificaciones');
      if(marketNotificationPanel&&!marketNotificationPanel.hidden)renderMarketNotifications();
    }catch(e){console.warn('Agenda YA: no se pudo actualizar el indicador de notificaciones.',e?.message||e);}
  }
  function renderMarketNotifications(){
    const list=marketNotificationPanel?.querySelector('#marketNotificationsList');if(!list)return;
    if(!marketNotificationRows.length){list.innerHTML='<div class="market-notification-empty">No tienes notificaciones.</div>';return;}
    list.innerHTML=marketNotificationRows.map((n,i)=>{
      const action=n.booking_id?`<button class="market-notification-action" type="button" data-notification-action="booking" data-booking-id="${esc(n.booking_id)}">Ver reserva</button>`:n.destination?`<button class="market-notification-action" type="button" data-notification-action="destination" data-destination="${esc(n.destination)}">Abrir</button>`:'';
      return `<article class="market-notification-item ${n.read_at?'':'unread'}"><strong>${esc(n.title)}</strong><p>${esc(n.message)}</p><time>${esc(formatNotificationDate(n.created_at))}</time>${action}</article>`;
    }).join('');
    list.querySelectorAll('[data-notification-action]').forEach(btn=>btn.addEventListener('click',()=>{
      const type=btn.dataset.notificationAction;
      if(type==='booking'){const id=btn.dataset.bookingId;window.location.href=`customer-profile.html?view=reservations&booking_id=${encodeURIComponent(id)}`;return;}
      if(type==='destination'){const destination=btn.dataset.destination||'';if(destination.startsWith('/')&&!destination.startsWith('//'))window.location.href=destination;}
    }));
  }
  async function markMarketNotificationsRead(){
    const calls=[client.rpc('mark_welcome_notifications_read'),client.rpc('mark_customer_notifications_read')];
    await Promise.all(calls.map(p=>p.catch(()=>null)));
  }
  async function toggleMarketNotifications(){
    const panel=ensureMarketNotificationPanel();
    if(!panel.hidden){closeMarketNotifications();return;}
    panel.hidden=false;const b=$('marketNotification');if(b)b.setAttribute('aria-expanded','true');
    panel.querySelector('#marketNotificationsList').innerHTML='<div class="market-notification-empty">Cargando notificaciones…</div>';
    marketNotificationRows=await fetchMarketNotifications();renderMarketNotifications();
    if(marketNotificationRows.some(n=>!n.read_at)){
      await markMarketNotificationsRead();
      // Actualizar el estado leído solo después de abrir la tarjeta, sin cerrar el panel.
      marketNotificationRows=await fetchMarketNotifications();renderMarketNotifications();
      const unread=marketNotificationRows.some(n=>!n.read_at);const dot=$('marketNotificationDot');if(dot)dot.hidden=!unread;if(b)b.classList.toggle('has-unread',unread);
    }
  }

  async function sessionRole(){
    const account = $('marketAccount');
    if (!client) return;
    const session = await client.auth.getSession();
    const user = session.data.session?.user;
    if (!user) return;
    const p = await client.from('profiles').select('full_name,avatar_url,profile_type').eq('id',user.id).maybeSingle();
    const profile = p.data || {};
    const display = profile.full_name || user.user_metadata?.full_name || user.user_metadata?.name || user.email || 'Mi perfil';
    const avatar = profile.avatar_url ? `<span class="account-avatar has-image" style="background-image:url('${encodeURI(profile.avatar_url)}')"></span>` : `<span class="account-avatar">${esc(initials(display))}</span>`;
    if(profile.profile_type === 'customer'){
      account.innerHTML = `<button class="market-notification" id="marketNotification" type="button" aria-label="Notificaciones" aria-haspopup="dialog" aria-expanded="false" title="Notificaciones"><span class="market-notification-emoji" aria-hidden="true">🔔</span><b id="marketNotificationDot" aria-hidden="true" hidden></b></button><a class="account-button signed" href="customer-profile.html?view=profile" aria-label="Mi perfil">${avatar}</a><button class="market-logout" id="marketLogout" type="button">Salir</button>`;
      $('marketNotification').addEventListener('click', toggleMarketNotifications);
      refreshMarketNotificationState();
      if(!window.__ayMarketNotificationTimer)window.__ayMarketNotificationTimer=setInterval(refreshMarketNotificationState,30000);
      $('marketLogout').addEventListener('click', async ()=>{
        const btn=$('marketLogout'); btn.disabled=true; btn.textContent='Saliendo…';
        try{ await client.auth.signOut(); }catch(_){}
        window.location.href='index.html';
      });
      return;
    }
    account.innerHTML = `<a class="publish-link" href="index.html">Publica tu negocio</a><a class="account-button signed" href="customer-profile.html?view=profile" aria-label="Mi perfil">${avatar}</a>`;
  }

  async function loadCategories(){
    if (!client) return;
    const r = await client.from('business_categories').select('slug,name').eq('active',true).order('name');
    if (r.error) return;
    categoriesData = r.data || [];
    $('category').innerHTML = '<option value="">Todas las categorías</option>' + categoriesData.map(c=>`<option value="${esc(c.slug)}">${esc(c.name)}</option>`).join('');
    $('categoryRail').innerHTML = `<button class="category-chip active" data-category=""><span>⊞</span>Todas</button>` + categoriesData.map(c=>`<button class="category-chip" data-category="${esc(c.slug)}"><span>${esc(iconByCategory[c.slug] || '•')}</span>${esc(c.name)}</button>`).join('');
    $('categoryRail').querySelectorAll('.category-chip').forEach(btn=>btn.addEventListener('click',()=>{
      $('category').value = btn.dataset.category || '';
      $('categoryRail').querySelectorAll('.category-chip').forEach(x=>x.classList.toggle('active',x===btn));
      search();
    }));
  }

  function setLoading(text='Buscando negocios...'){ $('resultStatus').textContent=text; $('results').innerHTML='<div class="loading-card"><span class="loading-dot"></span><span>Cargando negocios disponibles...</span></div>'; }
  function updateClear(){ $('clearFilters').hidden = !($('query').value.trim() || $('city').value.trim() || $('category').value); }

  async function search(){
    if (!client){ $('resultStatus').textContent='No fue posible conectar con Agenda Ya.'; return; }
    setLoading(); updateClear();
    const r = await client.rpc('search_public_businesses',{p_query:$('query').value.trim(),p_category_slug:$('category').value,p_city:$('city').value.trim(),p_limit:24,p_offset:0});
    if (r.error){ $('resultStatus').textContent='No fue posible cargar los negocios.'; $('results').innerHTML='<div class="empty-card"><h2>Algo salió mal.</h2><p>Intenta nuevamente en unos segundos.</p></div>'; return; }
    const items = r.data?.items || [];
    $('resultStatus').textContent = items.length ? `${r.data?.total || items.length} negocios disponibles` : 'No encontramos negocios con esos filtros.';
    $('results').innerHTML = items.length ? items.map(card).join('') : `<div class="empty-card"><div class="empty-icon">⌕</div><h2>No encontramos resultados.</h2><p>Prueba con otra categoría, ciudad o servicio.</p></div>`;
    document.querySelectorAll('.business-card').forEach(el=>{
      const go=()=>{ window.location.href=el.dataset.href; };
      el.addEventListener('click',e=>{ if(e.target.closest('.favorite-button')) return; go(); });
      el.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){e.preventDefault();go();} });
    });
    document.querySelectorAll('.favorite-button').forEach(btn=>btn.addEventListener('click',e=>{e.stopPropagation();btn.classList.toggle('active');btn.textContent=btn.classList.contains('active')?'♥':'♡';}));
  }

  $('searchForm').addEventListener('submit',e=>{e.preventDefault();search();});
  $('clearFilters').addEventListener('click',()=>{ $('query').value=''; $('city').value=''; $('category').value=''; $('categoryRail').querySelectorAll('.category-chip').forEach((x,i)=>x.classList.toggle('active',i===0)); search(); });
  $('category').addEventListener('change',()=>{ const v=$('category').value; $('categoryRail').querySelectorAll('.category-chip').forEach(x=>x.classList.toggle('active',(x.dataset.category||'')===v)); search(); });
  Promise.all([sessionRole(),loadCategories()]).then(search);
})();
