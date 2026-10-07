(() => {
  const cfg = window.SOMOS_CONFIG || {};
  const client = window.supabase?.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const money = (v) => Number(v || 0).toLocaleString('es-CL', { style:'currency', currency:'CLP', maximumFractionDigits:0 });
  const slug = new URLSearchParams(location.search).get('slug');
  const dayNames = {1:'Lunes',2:'Martes',3:'Miércoles',4:'Jueves',5:'Viernes',6:'Sábado',7:'Domingo'};

  function setBookingLinks(businessSlug) {
    const href = `public-booking.html?slug=${encodeURIComponent(businessSlug)}`;
    ['book','bookTop'].forEach(id => { const el = $(id); if (el) el.href = href; });
  }

  function renderBusinessLogo(business, profile, x) {
    const logo = $('businessLogo');
    const wrap = $('businessLogoWrap');
    const logoUrl = business?.logo_url || profile?.logo_url || x?.logo_url || '';
    if (!logoUrl) {
      logo.removeAttribute('src');
      logo.hidden = true;
      wrap.hidden = true;
      return;
    }
    logo.alt = `Logo de ${business?.name || 'negocio'}`;
    logo.onload = () => {
      logo.hidden = false;
      wrap.hidden = false;
    };
    logo.onerror = () => {
      logo.removeAttribute('src');
      logo.hidden = true;
      wrap.hidden = true;
    };
    logo.src = logoUrl;
    // Evita mostrar el icono roto mientras la imagen carga.
    logo.hidden = true;
    wrap.hidden = true;
  }

  function renderServices(items) {
    $('serviceCount').textContent = items.length ? `${items.length} ${items.length === 1 ? 'servicio' : 'servicios'}` : '';
    $('services').innerHTML = items.length ? items.map(s => `
      <article class="service-card">
        <div class="service-card-top"><div class="service-icon">✦</div><span class="service-duration">${esc(s.duration_minutes)} min</span></div>
        <h3>${esc(s.name)}</h3>
        ${s.description ? `<p>${esc(s.description)}</p>` : '<p>Servicio disponible para reserva online.</p>'}
        <div class="service-card-bottom"><strong>${money(s.price)}</strong><a href="public-booking.html?slug=${encodeURIComponent(slug)}" class="service-book">Agendar</a></div>
      </article>`).join('') : '<div class="profile-empty">Este negocio todavía no tiene servicios publicados.</div>';
  }

  function renderProfessionals(items) {
    $('professionals').innerHTML = items.length ? items.map(p => `
      <article class="professional-card"><div class="professional-avatar">${esc(`${(p.first_name || 'A')[0]}${(p.last_name || '')[0] || ''}`.toUpperCase())}</div><div><strong>${esc(`${p.first_name} ${p.last_name}`)}</strong><p>${esc(p.bio || 'Profesional disponible para reservas.')}</p></div></article>`).join('') : '<div class="profile-empty">No hay profesionales publicados.</div>';
  }

  function renderSchedules(items) {
    const grouped = {};
    items.forEach(s => (grouped[s.day_of_week] ||= []).push(s));
    $('schedules').innerHTML = Object.keys(grouped).sort((a,b) => a-b).map(d => `
      <div class="schedule-row"><strong>${dayNames[d] || d}</strong><span>${grouped[d].map(s => `${String(s.start_time).slice(0,5)}–${String(s.end_time).slice(0,5)}`).join(' · ')}</span></div>`).join('') || '<div class="profile-empty">Consulta los horarios disponibles al reservar.</div>';
  }

  async function init() {
    if (!client) { $('status').textContent = 'No fue posible conectar con Agenda Ya.'; return; }
    if (!slug) { $('status').textContent = 'Perfil no especificado.'; return; }
    const r = await client.rpc('get_public_business_profile', { p_slug: slug });
    if (r.error) {
      $('status').textContent = r.error.message === 'BUSINESS_NOT_FOUND' ? 'Negocio no encontrado.' : r.error.message === 'PUBLIC_PROFILE_NOT_PUBLISHED' ? 'Este perfil todavía no está publicado.' : 'No fue posible cargar este perfil.';
      return;
    }
    const x = r.data || {};
    const business = x.business || {};
    const profile = x.profile || {};
    $('name').textContent = business.name || 'Negocio';
    $('category').textContent = x.category?.name || 'Servicio';
    renderBusinessLogo(business, profile, x);
    $('description').textContent = profile.description || 'Conoce los servicios y agenda tu atención directamente.';
    const loc = [profile.address, profile.comuna, profile.city].filter(Boolean).join(' · ');
    if (loc) { $('location').textContent = loc; $('locationRow').hidden = false; }
    renderServices(x.services || []);
    renderProfessionals(x.professionals || []);
    renderSchedules(x.schedules || []);
    setBookingLinks(business.slug || slug);
    $('status').hidden = true;
    $('profile').hidden = false;
    document.title = `${business.name || 'Negocio'} · Agenda Ya`;
  }
  init().catch(() => { $('status').textContent = 'No fue posible cargar el perfil público.'; });
})();
