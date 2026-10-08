(() => {
  const cfg = window.SOMOS_CONFIG || {};
  const client = window.supabase?.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const money = v => Number(v || 0).toLocaleString('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0});

  // B12: la misma lógica de cabeceras que utiliza el Marketplace.
  // cover_url sigue teniendo prioridad si existe; si no, se resuelve por categoría.
  const imageByCategory = {
    barberia:'assets/card_barber.jpg',
    peluqueria:'assets/card_barber.jpg',
    estetica:'assets/card_aura.jpg',
    salud:'assets/card_med.jpg',
    bienestar:'assets/card_med.jpg',
    entrenamiento:'assets/card_fit.jpg',
    educacion:'assets/card_somos.jpg',
    'servicios-profesionales':'assets/card_somos.jpg',
    hogar:'assets/card_home.jpg',
    automotriz:'assets/card_auto.jpg',
    mascotas:'assets/card_pet.jpg',
    otros:'assets/card_somos.jpg'
  };

  function initials(name){
    return String(name || 'AY').trim().split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase() || 'AY';
  }
  function params(){ return new URLSearchParams(window.location.search); }
  function showError(message){
    $('stateLoading').hidden = true;
    $('businessProfile').hidden = true;
    $('stateError').hidden = false;
    $('errorMessage').textContent = message || 'El perfil puede no estar publicado o el enlace puede ser incorrecto.';
  }
  function categoryImage(data){
    return data?.profile?.cover_url || imageByCategory[data?.category?.slug] || imageByCategory.otros;
  }
  function mapQuery(p){
    return [p.address,p.comuna,p.city].filter(Boolean).join(', ');
  }
  function renderMap(p){
    const query = mapQuery(p);
    if(!query) return;
    const encoded = encodeURIComponent(query);
    $('mapFrame').src = `https://www.google.com/maps?q=${encoded}&output=embed`;
    $('mapWrap').hidden = false;
    $('mapLink').href = `https://www.google.com/maps/search/?api=1&query=${encoded}`;
    $('mapLink').hidden = false;
  }

  function render(data){
    const b = data.business || {};
    const p = data.profile || {};
    const c = data.category || null;
    const services = Array.isArray(data.services) ? data.services : [];
    const professionals = Array.isArray(data.professionals) ? data.professionals : [];

    document.title = `${b.name || 'Perfil'} · Agenda Ya`;
    $('businessName').textContent = b.name || 'Negocio';
    $('category').textContent = c?.name || 'Servicios';
    $('location').textContent = [p.comuna,p.city].filter(Boolean).join(', ') || 'Ubicación no informada';
    $('description').textContent = p.description || 'Este negocio aún no ha agregado una descripción pública.';
    $('address').textContent = p.address || 'Dirección no publicada';
    $('city').textContent = [p.comuna,p.city].filter(Boolean).join(', ');

    const logo = $('logo');
    if (b.logo_url) logo.innerHTML = `<img src="${esc(b.logo_url)}" alt="Logo de ${esc(b.name)}">`;
    else logo.textContent = initials(b.name);

    const cover = $('cover');
    const coverUrl = categoryImage(data);
    if (coverUrl) {
      cover.classList.add('has-image');
      cover.style.backgroundImage = `url("${encodeURI(coverUrl)}")`;
    }

    renderMap(p);

    if (p.phone || b.phone || p.whatsapp) {
      $('contactPanel').hidden = false;
      const phone = p.phone || b.phone;
      if (phone) {
        $('phone').hidden = false;
        $('phone').textContent = `☎ ${phone}`;
        $('phone').href = `tel:${String(phone).replace(/[^+\d]/g,'')}`;
      }
      if (p.whatsapp) {
        $('whatsapp').hidden = false;
        $('whatsapp').href = `https://wa.me/${String(p.whatsapp).replace(/\D/g,'')}`;
      }
    }

    $('serviceSummary').textContent = services.length
      ? `${services.length} servicio${services.length === 1 ? '' : 's'} publicado${services.length === 1 ? '' : 's'}`
      : 'Servicios publicados por el negocio';
    $('services').innerHTML = services.length
      ? services.map(s => `<article class="service-card">
          <div class="service-main">
            <h3>${esc(s.name || 'Servicio')}</h3>
            ${s.description ? `<p>${esc(s.description)}</p>` : ''}
          </div>
          <div class="service-meta">
            <span>${s.duration_minutes ? `${esc(s.duration_minutes)} min` : 'Duración a consultar'}</span>
            <span class="service-price">${s.price != null ? money(s.price) : 'Consultar'}</span>
          </div>
        </article>`).join('')
      : '<p class="empty-note">Este negocio aún no tiene servicios publicados.</p>';

    if (professionals.length) {
      $('professionalsPanel').hidden = false;
      $('professionals').innerHTML = professionals.map(pf => {
        const name = [pf.first_name,pf.last_name].filter(Boolean).join(' ') || 'Profesional';
        return `<article class="professional">
          <div class="professional-avatar">${esc(initials(name))}</div>
          <div><h3>${esc(name)}</h3>${pf.bio ? `<p>${esc(pf.bio)}</p>` : ''}</div>
        </article>`;
      }).join('');
    }

    $('reserveButton').addEventListener('click',()=>{
      $('services').scrollIntoView({behavior:'smooth',block:'start'});
    },{once:true});

    $('stateLoading').hidden = true;
    $('stateError').hidden = true;
    $('businessProfile').hidden = false;
  }

  async function init(){
    if (!client) return showError('No fue posible inicializar la conexión con Agenda Ya.');
    const slug = params().get('slug')?.trim();
    if (!slug) return showError('Este enlace no contiene el identificador público del negocio.');

    const r = await client.rpc('get_public_business_profile',{p_slug:slug});
    if (r.error || !r.data) {
      const msg = r.error?.message || '';
      if (/NOT_FOUND|not found/i.test(msg)) return showError('El negocio no existe o ya no está disponible públicamente.');
      if (/NOT_PUBLISHED|published/i.test(msg)) return showError('Este negocio todavía no está publicado en el marketplace.');
      return showError('No pudimos cargar el perfil público en este momento.');
    }
    render(r.data);
  }
  init();
})();
