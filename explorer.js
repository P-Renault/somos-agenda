(() => {
  const cfg = window.SOMOS_CONFIG || {};
  const client = window.supabase?.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const money = v => Number(v || 0).toLocaleString('es-CL', {style:'currency',currency:'CLP',maximumFractionDigits:0});
  const imageByCategory = {
    barberia:'assets/card_barber.jpg', peluqueria:'assets/card_barber.jpg', estetica:'assets/card_aura.jpg',
    salud:'assets/card_med.jpg', bienestar:'assets/card_med.jpg', entrenamiento:'assets/card_fit.jpg',
    educacion:'assets/card_somos.jpg', 'servicios-profesionales':'assets/card_somos.jpg', hogar:'assets/card_home.jpg',
    automotriz:'assets/card_auto.jpg', mascotas:'assets/card_pet.jpg', otros:'assets/card_somos.jpg'
  };
  const iconByCategory = {barberia:'✂',peluqueria:'✂',estetica:'✿',salud:'♥',bienestar:'✧',entrenamiento:'♜',educacion:'▣','servicios-profesionales':'▣',hogar:'⌂',automotriz:'●',mascotas:'●',otros:'•'};
  let categoriesData = [];

  function categoryImage(item){
    return item.cover_url || imageByCategory[item.category_slug] || 'assets/card_somos.jpg';
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
      account.innerHTML = `<button class="market-notification" id="marketNotification" type="button" aria-label="Notificaciones"><span>♢</span><b aria-hidden="true"></b></button><a class="account-button signed" href="customer-profile.html?view=profile" aria-label="Mi perfil">${avatar}</a><button class="market-logout" id="marketLogout" type="button">Salir</button>`;
      $('marketNotification').addEventListener('click', ()=>{ window.location.href='customer-profile.html?view=profile&notifications=1'; });
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
