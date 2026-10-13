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

  function setupMarketplaceNotifications(button){
    if(!button || !client || document.getElementById('marketNotificationsPanel')) return;
    const dot=button.querySelector('.market-notification-dot');
    const panel=document.createElement('section');
    panel.id='marketNotificationsPanel'; panel.className='market-notifications-panel'; panel.hidden=true;
    panel.setAttribute('role','dialog'); panel.setAttribute('aria-label','Notificaciones');
    panel.innerHTML='<header class="market-notifications-head"><h2>Notificaciones</h2><button type="button" class="market-notifications-close" aria-label="Cerrar">×</button></header><div class="market-notifications-list"><div class="market-notifications-empty">Cargando notificaciones…</div></div>';
    document.body.appendChild(panel);
    const list=panel.querySelector('.market-notifications-list');
    let rows=[], loading=false, loadedOnce=false, isOpen=false;
    const fmtDate=v=>{if(!v)return '';const d=new Date(v);return Number.isNaN(d.getTime())?'':new Intl.DateTimeFormat('es-CL',{dateStyle:'medium',timeStyle:'short'}).format(d)};
    const statusLabel=v=>({pending:'Pendiente',confirmed:'Confirmada',cancelled:'Cancelada',completed:'Completada',rejected:'Rechazada',rescheduled:'Modificada'}[String(v||'').toLowerCase()]||String(v||'Actualizada'));
    function render(){
      const unread=rows.some(r=>!r.read_at); if(dot)dot.hidden=!unread;
      button.classList.toggle('has-unread',unread);button.setAttribute('aria-expanded',String(isOpen));
      panel.hidden=!isOpen;
      if(!rows.length){list.innerHTML='<div class="market-notifications-empty">No tienes notificaciones disponibles.</div>';return;}
      list.innerHTML=rows.map((r,i)=>`<button type="button" class="market-notification-row ${r.read_at?'':'unread'}" data-notification-index="${i}"><strong>${esc(r.title||'Notificación de Agenda Ya')}</strong><p>${esc(r.message||'Tienes una actualización en Agenda Ya.')}</p><small>${esc(fmtDate(r.created_at))}${r.booking_date?` · ${esc(r.booking_date)}${r.start_time?' · '+esc(String(r.start_time).slice(0,5)):''}`:''}</small></button>`).join('');
      list.querySelectorAll('[data-notification-index]').forEach(el=>el.addEventListener('click',()=>openAssociatedEvent(rows[Number(el.dataset.notificationIndex)])));
    }
    function openAssociatedEvent(r){
      if(r.booking_id){window.location.href=`customer-profile.html?view=reservations&booking_id=${encodeURIComponent(r.booking_id)}`;return;}
      if(r.destination){const d=String(r.destination);if(d.startsWith('/')&&!d.startsWith('//')){window.location.href=d;return;}}
      if(/valoraci|reseñ|reputaci/i.test(`${r.title||''} ${r.message||''}`)){window.location.href='customer-profile.html?view=ratings';return;}
      if(/bienvenid|explora|servicios/i.test(`${r.title||''} ${r.message||''}`)){isOpen=false;render();return;}
      window.location.href='customer-profile.html?view=profile';
    }
    async function loadNotifications(){
      if(loading)return;loading=true;
      if(!loadedOnce)list.innerHTML='<div class="market-notifications-empty">Cargando notificaciones…</div>';
      const tasks=[
        client.rpc('get_customer_notifications',{p_limit:50}).then(x=>({kind:'booking',...x})).catch(error=>({kind:'booking',error})),
        client.rpc('get_welcome_notifications',{p_limit:50}).then(x=>({kind:'welcome',...x})).catch(error=>({kind:'welcome',error})),
        client.rpc('get_app_notifications',{p_limit:100}).then(x=>({kind:'app',...x})).catch(error=>({kind:'app',error}))
      ];
      const results=await Promise.all(tasks); const next=[];let success=0;
      for(const res of results){
        if(res.error){console.warn('Agenda Ya Explorer notifications ('+res.kind+'):',res.error.message||res.error);continue;}
        success++;
        for(const n of (Array.isArray(res.data)?res.data:[])){
          if(res.kind==='booking'){
            const status=n.new_status?`Reserva ${n.previous_status?`de ${statusLabel(n.previous_status)} a `:''}${statusLabel(n.new_status).toLowerCase()}.`:'Tu reserva tiene una actualización.';
            next.push({id:n.id,booking_id:n.booking_id,title:n.service_name||'Actualización de reserva',message:n.new_status?`Estado de reserva actualizado: ${status}`:'Tu reserva fue actualizada.',created_at:n.created_at,read_at:n.read_at,booking_date:n.booking_date,start_time:n.start_time,source:'booking'});
          }else if(res.kind==='welcome'){
            next.push({...n,title:n.title||'¡Bienvenido a Agenda Ya!',message:n.message||'Descubre los servicios disponibles en Agenda Ya.',source:'welcome'});
          }else{
            next.push({...n,source:'app',title:n.title||'Notificación de Agenda Ya',message:n.message||'Tienes una actualización en Agenda Ya.'});
          }
        }
      }
      const unique=new Map();next.forEach(n=>unique.set(`${n.source}:${n.id||n.booking_id||n.created_at}:${n.title}`,n));
      rows=[...unique.values()].sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0)).slice(0,100);
      loadedOnce=true;loading=false;
      if(!success){list.innerHTML='<div class="market-notifications-error">No se pudieron cargar las notificaciones. Comprueba tu conexión e inténtalo nuevamente.</div>';if(dot)dot.hidden=false;return;}
      render();
    }
    async function toggle(){isOpen=!isOpen;render();if(isOpen){await loadNotifications();if(rows.some(r=>!r.read_at)){const pending=rows.filter(r=>!r.read_at);const jobs=[];if(pending.some(r=>r.source==='booking'))jobs.push(client.rpc('mark_customer_notifications_read'));if(pending.some(r=>r.source==='welcome'))jobs.push(client.rpc('mark_welcome_notifications_read'));if(pending.some(r=>r.source==='app'))jobs.push(client.rpc('mark_app_notifications_read',{p_notification_id:null}));if(jobs.length){await Promise.all(jobs.map(p=>p.catch(()=>null)));await loadNotifications();}}}}
    button.addEventListener('click',toggle);
    panel.querySelector('.market-notifications-close').addEventListener('click',()=>{isOpen=false;render()});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&isOpen){isOpen=false;render()}});
    document.addEventListener('click',e=>{if(isOpen&&!panel.contains(e.target)&&!button.contains(e.target)){isOpen=false;render()}});
    loadNotifications().catch(e=>console.warn('Agenda Ya Explorer notifications:',e));
    setInterval(()=>loadNotifications().catch(e=>console.warn('Agenda Ya Explorer notifications:',e)),30000);
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
      account.innerHTML = `<button class="market-notification" id="marketNotification" type="button" aria-label="Notificaciones"><span aria-hidden="true">🔔</span><b class="market-notification-dot" aria-hidden="true" hidden></b></button><a class="account-button signed" href="customer-profile.html?view=profile" aria-label="Mi perfil">${avatar}</a><button class="market-logout" id="marketLogout" type="button">Salir</button>`;
      setupMarketplaceNotifications($('marketNotification'));
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
