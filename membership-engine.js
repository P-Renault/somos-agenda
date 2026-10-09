/* Agenda Ya · B13 Membership Engine v1.2 · Production Flow Integration */
(() => {
  'use strict';
  if (window.AgendaYaMembershipEngine) return;

  const cfg = window.SOMOS_CONFIG || {};
  let client = null;
  let loaded = false;
  let currentMembership = null;
  let isCheckoutStarting = false;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
  const money = v => Number(v || 0).toLocaleString('es-CL', {
    style: 'currency', currency: 'CLP', maximumFractionDigits: 0
  });

  function ensureStyles() {
    if (document.getElementById('ayB13B17EngineStyles')) return;
    const st = document.createElement('style');
    st.id = 'ayB13B17EngineStyles';
    st.textContent = `
      .ay-b13-plan-modal{position:fixed;inset:0;z-index:100500;display:grid;place-items:center;padding:18px;background:rgba(13,35,70,.42);backdrop-filter:blur(4px)}
      .ay-b13-plan-dialog{width:min(920px,100%);max-height:min(760px,calc(100vh - 36px));overflow:auto;background:#fff;border:1px solid #dfe8f3;border-radius:24px;box-shadow:0 30px 90px rgba(13,38,78,.24);padding:22px}
      .ay-b13-plan-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:16px}
      .ay-b13-plan-head h3{margin:4px 0 0;font-size:23px;color:#172f55}
      .ay-b13-plan-close{width:38px;height:38px;border:0;border-radius:12px;background:#f3f7fc;color:#53657e;font-size:24px;cursor:pointer}
      .ay-b13-plan-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
      .ay-b13-plan-card{border:1px solid #e4ebf3;border-radius:18px;padding:16px;background:#fbfdff}
      .ay-b13-plan-card.is-current{border-color:#80b4ef;background:#f0f7ff}
      .ay-b13-plan-card>span{display:block;color:#0b63e5;font-size:11px;font-weight:900;letter-spacing:.08em}
      .ay-b13-plan-card>strong{display:block;margin:7px 0;font-size:23px;color:#172f55}
      .ay-b13-plan-card>strong small{font-size:11px;color:#718096}
      .ay-b13-plan-card p{min-height:42px;margin:0 0 8px;color:#6f7e93;font-size:12px;line-height:1.45}
      .ay-b13-plan-card>small{display:block;color:#0b63e5;font-size:11px;font-weight:800;min-height:17px}
      .ay-b13-plan-card button{width:100%;margin-top:12px;min-height:42px;border:0;border-radius:12px;background:#0b63e5;color:#fff;font-weight:850;cursor:pointer}
      .ay-b13-plan-card button:disabled{opacity:.6;cursor:wait}
      .ay-b13-plan-status{margin:14px 0 0;color:#6f7e93;font-size:12px}
      @media(max-width:700px){.ay-b13-plan-grid{grid-template-columns:1fr}.ay-b13-plan-dialog{padding:17px;border-radius:20px}.ay-b13-plan-card p{min-height:0}}
    `;
    document.head.appendChild(st);
  }
  ensureStyles();

  function getClient() {
    if (!client && cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase) {
      client = window.supabase.createClient(
        cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY,
        { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
      );
    }
    return client;
  }

  function updateMembership(row) {
    const root = $('#ayMembershipView');
    if (!root || !row) return;
    const stats = root.querySelectorAll('.ay-settings-stat-grid>div');
    if (stats[0]) {
      const strong = stats[0].querySelector('strong');
      const span = stats[0].querySelector('span');
      if (strong) strong.textContent = row.plan_name || '—';
      if (span) span.textContent = money(row.price_monthly) + ' / mes';
    }
    if (stats[1]) {
      const strong = stats[1].querySelector('strong');
      const span = stats[1].querySelector('span');
      if (strong) strong.textContent = ({
        trialing: 'Trial', active: 'Activo', past_due: 'Pago pendiente',
        suspended: 'Suspendido', cancelled: 'Cancelado', expired: 'Expirado'
      }[row.status] || row.status || '—');
      if (span) span.textContent = row.cancel_at_period_end
        ? 'Cancelación al término del período' : 'Estado validado por backend';
    }
    if (stats[2]) {
      const strong = stats[2].querySelector('strong');
      const span = stats[2].querySelector('span');
      if (strong) strong.textContent = row.days_remaining == null ? '—' : `${row.days_remaining} días`;
      if (span) span.textContent = row.current_period_end
        ? 'Próxima renovación según período' : 'Vigencia según membresía';
    }
    const badge = root.querySelector('.ay-module-badge');
    if (badge) badge.textContent = 'Motor activo';
    const hero = $('.ay-settings-engine-badge');
    if (hero) hero.textContent = 'Membership Engine · Activo';
    document.querySelectorAll('.ay-settings-contract-grid span').forEach(x => {
      if (x.textContent.trim() === 'Membership Engine') x.textContent = 'Membership Engine · Activo';
    });
    const title = $('.ay-settings-contract h3');
    if (title) title.textContent = 'Motores B13–B20 activos';
    const description = $('.ay-settings-contract p');
    if (description) description.textContent =
      'Membership, entitlements, límites, billing, ciclo de vida y checkout Flow están conectados al backend.';
  }

  async function load() {
    const c = getClient();
    if (!c) return null;
    const result = await c.rpc('get_business_membership');
    if (result.error) {
      console.warn('Agenda YA Membership:', result.error.message);
      return null;
    }
    const row = Array.isArray(result.data) ? result.data[0] : result.data;
    if (row) {
      currentMembership = row;
      updateMembership(row);
      loaded = true;
    }
    return row || null;
  }

  function closeModal() {
    document.getElementById('ayB13PlanModal')?.remove();
  }

  async function openPlanModal() {
    const c = getClient();
    if (!c) {
      alert('No se pudo inicializar la conexión con Agenda YA.');
      return;
    }
    closeModal();
    const current = await load();
    const result = await c.from('plans')
      .select('code,name,description,price_monthly,currency,trial_days')
      .eq('is_active', true)
      .order('price_monthly');
    if (result.error) {
      alert('No fue posible cargar los planes.');
      return;
    }

    const plans = result.data || [];
    const el = document.createElement('section');
    el.id = 'ayB13PlanModal';
    el.className = 'ay-b13-plan-modal';
    el.innerHTML = `<div class="ay-b13-plan-dialog" role="dialog" aria-modal="true" aria-label="Planes Agenda YA">
      <div class="ay-b13-plan-head"><div><span class="ay-settings-label">MEMBRESÍA</span><h3>Plan de Agenda Ya</h3></div><button type="button" class="ay-b13-plan-close" aria-label="Cerrar">×</button></div>
      <div class="ay-b13-plan-grid">${plans.map(p => `<article class="ay-b13-plan-card ${current?.plan_code === p.code ? 'is-current' : ''}">
        <span>${esc(p.name)}</span><strong>${money(p.price_monthly)}${Number(p.price_monthly) > 0 ? '<small>/mes</small>' : ''}</strong>
        <p>${esc(p.description || '')}</p>${p.trial_days ? `<small>${p.trial_days} días de prueba</small>` : ''}
        <button type="button" data-plan-code="${esc(p.code)}">${current?.plan_code === p.code ? 'Plan actual' : p.code === 'free' ? 'Solicitar FREE' : 'Iniciar pago'}</button>
      </article>`).join('')}</div>
      <p class="ay-b13-plan-status" id="ayB13PlanStatus">El estado de pago se confirma en el servidor.</p>
    </div>`;
    document.body.appendChild(el);

    el.addEventListener('click', async e => {
      if (e.target === el || e.target.closest('.ay-b13-plan-close')) {
        closeModal();
        return;
      }
      const button = e.target.closest('[data-plan-code]');
      if (!button || isCheckoutStarting) return;
      const code = button.dataset.planCode;
      if (code === current?.plan_code) return;

      const status = $('#ayB13PlanStatus', el);
      button.disabled = true;

      if (code === 'free') {
        status.textContent = 'Procesando plan FREE…';
        const freeResult = await c.rpc('downgrade_business_to_free');
        if (freeResult.error) {
          status.textContent = freeResult.error.message || 'No fue posible activar el plan FREE.';
          button.disabled = false;
          return;
        }
        status.textContent = 'Plan FREE activado por backend.';
        await load();
        return;
      }

      isCheckoutStarting = true;
      status.textContent = 'Creando checkout seguro…';
      try {
        const checkoutResult = await c.functions.invoke('flow-create-payment', {
          body: { plan_code: code }
        });

        if (checkoutResult.error) {
          const detail = checkoutResult.data?.error;
          throw new Error(detail || 'No fue posible crear el checkout. Revisa los registros de la función.');
        }

        const data = checkoutResult.data || {};
        if (!data.checkout_url) throw new Error('Flow no entregó una URL de checkout.');

        // Fail closed: never send the customer to an unverified environment.
        if (data.environment !== 'production') {
          throw new Error('El checkout no está en producción. No se abrirá el pago.');
        }

        const expectedPlan = plans.find(p => p.code === code);
        const expectedAmount = Number(expectedPlan?.price_monthly);
        if (!Number.isFinite(expectedAmount) || Number(data.amount) !== expectedAmount) {
          throw new Error('El importe no coincide con el precio comercial del plan. No se abrirá el pago.');
        }

        const url = new URL(data.checkout_url);
        if (url.protocol !== 'https:' || !['flow.cl', 'www.flow.cl'].includes(url.hostname)) {
          throw new Error('La URL de checkout no pertenece al dominio de Flow.');
        }

        status.textContent = 'Checkout creado. Redirigiendo a Flow…';
        window.location.assign(url.toString());
      } catch (error) {
        status.textContent = error instanceof Error ? error.message : 'No fue posible iniciar el pago.';
        button.disabled = false;
        isCheckoutStarting = false;
      }
    });
  }

  function bind() {
    window.addEventListener('agendaYa:view-change', e => {
      if (e.detail?.view === 'settings') setTimeout(() => void load(), 0);
    });
    document.addEventListener('click', e => {
      const button = e.target.closest?.('[data-ay-action="membership-engine-placeholder"]');
      if (button) {
        e.preventDefault();
        void openPlanModal();
      }
    });
    if (window.AgendaYaUI?.getCurrentView?.() === 'settings') void load();
  }

  bind();
  window.AgendaYaMembershipEngine = {
    version: '1.2.0-production',
    load,
    openPlanModal,
    getCurrent: () => loaded
  };
})();
