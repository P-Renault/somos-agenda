/* Agenda YA · Billing Engine B5.0 · single Flow checkout route */
(() => {
  'use strict';
  if (window.AgendaYaBillingEngine) return;
  const cfg = window.SOMOS_CONFIG || {};
  let client = null, billing = null, busy = false;
  const $ = (s, r = document) => r.querySelector(s);
  function c() {
    if (!client && window.supabase && cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY)
      client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY,
        { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
    return client;
  }
  function renderPayments() {
    const root = $('#ayBillingView');
    if (!root || !billing) return;
    const badge = root.querySelector('.ay-module-badge');
    if (badge) badge.textContent = 'Motor activo';
    const buttons = [...root.querySelectorAll('.ay-settings-menu-list button')];
    const payments = billing.payments || [];
    if (buttons[0]) {
      const a = buttons[0].querySelector('strong'), b = buttons[0].querySelector('small');
      if (a) a.textContent = 'Gestionar pago';
      if (b) b.textContent = payments.some(p => p.status === 'pending') ? 'Hay un pago pendiente registrado.' : 'Checkout y estado de pago.';
    }
    if (buttons[1]) {
      const a = buttons[1].querySelector('strong'), b = buttons[1].querySelector('small');
      if (a) a.textContent = 'Historial de pagos';
      if (b) b.textContent = payments.length ? `${payments.length} movimiento(s) registrado(s).` : 'Sin pagos registrados todavía.';
    }
    if (buttons[2]) {
      const cancel = Boolean(billing.subscription?.cancel_at_period_end);
      const a = buttons[2].querySelector('strong'), b = buttons[2].querySelector('small');
      if (a) a.textContent = cancel ? 'Reactivar renovación' : 'Gestionar renovación';
      if (b) b.textContent = cancel ? 'La cancelación está programada al término del período.' : 'Cancelación y reactivación.';
    }
  }
  async function load() {
    const x = c(); if (!x) return null;
    const r = await x.rpc('get_business_billing');
    if (r.error) { console.warn('Agenda YA Billing:', r.error.message); return null; }
    billing = r.data || null; renderPayments(); return billing;
  }
  async function paymentAction() {
    const x = c(); if (!x || busy) return;
    busy = true;
    try {
      const r = await x.from('plans').select('code,name,price_monthly').eq('is_active', true).order('price_monthly');
      if (r.error) throw new Error('No fue posible cargar los planes.');
      const paid = (r.data || []).filter(p => Number(p.price_monthly) > 0);
      if (!paid.length) throw new Error('No hay planes pagados configurados.');
      const current = billing?.subscription?.plan_code;
      const plan = paid.find(p => p.code !== current) || paid[0];
      const checkout = await x.functions.invoke('flow-create-payment', { body: { plan_code: plan.code } });
      if (checkout.error) throw new Error(checkout.data?.error || 'No fue posible iniciar el checkout.');
      const data = checkout.data || {};
      if (!data.checkout_url) throw new Error('Flow no entregó una URL de checkout.');
      if (data.environment !== 'production') throw new Error('El checkout no está en producción. No se abrirá el pago.');
      if (Number(data.amount) !== Number(plan.price_monthly)) throw new Error('El importe no coincide con el precio del plan.');
      const url = new URL(data.checkout_url);
      if (url.protocol !== 'https:' || !['flow.cl', 'www.flow.cl'].includes(url.hostname))
        throw new Error('La URL de checkout no pertenece a Flow.');
      window.location.assign(url.toString());
    } catch (e) {
      alert(e instanceof Error ? e.message : 'No fue posible iniciar el pago.');
      busy = false;
    }
  }
  function historyAction() {
    const rows = billing?.payments || [];
    const body = rows.length ? rows.slice(0, 10).map(p =>
      `${new Date(p.created_at).toLocaleDateString('es-CL')} · ${p.status} · $${Number(p.amount || 0).toLocaleString('es-CL')}`
    ).join('\n') : 'No hay pagos registrados.';
    alert(`Historial de pagos\n\n${body}`);
  }
  async function renewalAction() {
    const x = c(); if (!x) return;
    if (billing?.subscription?.cancel_at_period_end) {
      const r = await x.rpc('reactivate_business_subscription');
      if (r.error) return alert(r.error.message || 'No fue posible reactivar.');
    } else {
      const r = await x.rpc('cancel_business_subscription', { p_immediate: false });
      if (r.error) return alert(r.error.message || 'No fue posible gestionar la renovación.');
    }
    await load();
    window.AgendaYaSubscriptionLifecycleEngine?.load?.();
    window.AgendaYaMembershipEngine?.load?.();
  }
  function bind() {
    document.addEventListener('click', e => {
      const b = e.target.closest?.('#ayBillingView .ay-settings-menu-list button');
      if (!b) return;
      const i = [...b.parentElement.children].indexOf(b);
      if (i === 0) void paymentAction(); else if (i === 1) historyAction(); else if (i === 2) void renewalAction();
    });
    window.addEventListener('agendaYa:view-change', e => { if (e.detail?.view === 'settings') setTimeout(() => void load(), 60); });
    if (window.AgendaYaUI?.getCurrentView?.() === 'settings') void load();
    const qs = new URLSearchParams(window.location.search);
    if (qs.get('flow_return') === '1') {
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++; await load(); await window.AgendaYaMembershipEngine?.load?.();
        await window.AgendaYaSubscriptionLifecycleEngine?.load?.();
        if (attempts >= 6) clearInterval(poll);
      }, 5000);
    }
  }
  bind();
  window.AgendaYaBillingEngine = { version: '5.0.0', load, get: () => billing, createCheckout: paymentAction };
})();
