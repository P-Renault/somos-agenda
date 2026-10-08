/* Agenda YA · B12.7 · Pending booking resume bridge
   Keeps the reservation context across login/profile onboarding without
   changing the authentication engine. */
(() => {
  const KEY = 'agendaYaPendingBooking';
  const TTL = 2 * 60 * 60 * 1000;
  const read = () => {
    try {
      const raw = sessionStorage.getItem(KEY) || localStorage.getItem(KEY);
      if (!raw) return null;
      const d = JSON.parse(raw);
      if (!d?.savedAt || Date.now() - Number(d.savedAt) > TTL || !d.slug) return null;
      return d;
    } catch (_) { return null; }
  };
  const resume = () => {
    const d = read();
    if (!d) return false;
    const u = new URL('public-profile.html', location.href);
    u.searchParams.set('slug', d.slug);
    u.searchParams.set('resume', '1');
    location.replace(u.href);
    return true;
  };

  function watchCustomerSave() {
    const status = document.getElementById('ayCustomerStatus');
    if (!status) return false;
    const observer = new MutationObserver(() => {
      const text = (status.textContent || '').toLowerCase();
      if (text.includes('perfil cliente guardado')) {
        setTimeout(resume, 50);
      }
    });
    observer.observe(status, {childList:true, characterData:true, subtree:true});
    return true;
  }

  function boot() {
    watchCustomerSave();
    // Existing authenticated customer: auth.js may route to explorer.
    // If a pending booking exists, take control as soon as the app settles.
    const d = read();
    if (d) {
      const start = Date.now();
      const timer = setInterval(() => {
        if (location.pathname.endsWith('/public-profile.html')) { clearInterval(timer); return; }
        const profile = document.getElementById('ayProfileView');
        const app = document.getElementById('ayApp');
        const visible = (profile && !profile.hidden) || (app && !app.hidden);
        if (visible && Date.now() - start > 700) {
          // Do not interrupt the customer onboarding form; the observer above
          // handles its successful save. For an already completed profile,
          // resuming is safe here.
          const customerForm = document.getElementById('ayCustomerProfileForm');
          if (!customerForm || customerForm.hidden) resume();
        }
        if (Date.now() - start > 15000) clearInterval(timer);
      }, 250);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
