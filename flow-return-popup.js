/* Agenda YA · Flow Return Popup B5.3.0
 * Uses the authenticated billing history as the source of truth.
 * URL query parameters are not treated as evidence of payment.
 */
(() => {
  'use strict';
  const params = new URLSearchParams(location.search);
  if (params.get('flow_return') !== '1' || window.AgendaYaFlowReturnPopup) return;

  const style = document.createElement('style');
  style.textContent = `
  #ayFlowResultBackdrop{position:fixed;inset:0;z-index:100000;background:rgba(15,23,42,.64);display:flex;align-items:center;justify-content:center;padding:18px}
  #ayFlowResultModal{box-sizing:border-box;width:min(100%,440px);background:#fff;color:#172033;border-radius:20px;padding:26px 22px 22px;box-shadow:0 22px 70px rgba(0,0,0,.28);font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;text-align:center}
  #ayFlowResultIcon{width:58px;height:58px;border-radius:50%;display:grid;place-items:center;margin:0 auto 14px;font-size:30px;font-weight:800;background:#eef2ff;color:#3546a5}
  #ayFlowResultTitle{font-size:23px;line-height:1.25;margin:0 0 10px;font-weight:750}
  #ayFlowResultMessage{font-size:15px;line-height:1.55;color:#5b6474;margin:0 0 18px;overflow-wrap:anywhere}
  #ayFlowResultActions{display:flex;flex-direction:column;align-items:center;gap:10px;width:100%}
  .ayFlowResultBtn{border:0;border-radius:11px;padding:14px 20px;font-size:15px;font-weight:700;cursor:pointer;min-height:48px;width:100%;max-width:300px}
  #ayFlowResultClose{background:#293d7c;color:#fff}
  #ayFlowResultRetry{background:#fff;color:#293d7c;border:1px solid #cbd5e1}
  #ayFlowResultMeta{font-size:12px;line-height:1.4;color:#7a8392;margin-top:14px}
  `;
  document.head.appendChild(style);

  const overlay = document.createElement('div');
  overlay.id = 'ayFlowResultBackdrop';
  overlay.innerHTML = `<section id="ayFlowResultModal" role="dialog" aria-modal="true" aria-labelledby="ayFlowResultTitle">
    <div id="ayFlowResultIcon" aria-hidden="true">…</div>
    <h2 id="ayFlowResultTitle">Verificando tu pago</h2>
    <p id="ayFlowResultMessage">Estamos consultando el estado registrado en la cuenta. El retorno del navegador no confirma por sí solo un pago.</p>
    <div id="ayFlowResultActions"><button type="button" class="ayFlowResultBtn" id="ayFlowResultClose">Volver al dashboard</button></div>
    <div id="ayFlowResultMeta">No cierres esta ventana si el estado sigue pendiente.</div></section>`;
  document.body.appendChild(overlay);
  const $ = id => document.getElementById(id);
  const success = new Set(['paid','approved','completed','succeeded','success']);
  const failed = new Set(['rejected','failed','cancelled','canceled','declined','refused']);
  let busy = false, attempts = 0, poller = null, terminal = false;

  function render(state,title,message,icon,meta) {
    $('ayFlowResultTitle').textContent = title;
    $('ayFlowResultMessage').textContent = message;
    $('ayFlowResultIcon').textContent = icon;
    $('ayFlowResultMeta').textContent = meta || '';
    const palette = state === 'approved' ? ['#e6f7ec','#187747']
      : state === 'rejected' ? ['#fff0f0','#b42318']
      : state === 'unknown' ? ['#fff7ed','#9a3412']
      : ['#eef2ff','#3546a5'];
    $('ayFlowResultIcon').style.background = palette[0];
    $('ayFlowResultIcon').style.color = palette[1];

    const actions = $('ayFlowResultActions');
    actions.replaceChildren();
    if (state === 'rejected') {
      const retry = document.createElement('button');
      retry.type = 'button'; retry.className = 'ayFlowResultBtn'; retry.id = 'ayFlowResultRetry';
      retry.textContent = 'Reintentar pago';
      retry.addEventListener('click', async () => {
        retry.disabled = true; retry.textContent = 'Preparando pago…';
        try {
          const engine = window.AgendaYaBillingEngine;
          if (engine?.createCheckout) await engine.createCheckout();
          else {
            const u = new URL(location.href);
            u.searchParams.delete('flow_return');
            location.assign(u.pathname + u.search + u.hash);
          }
        } catch (_) {
          retry.disabled = false; retry.textContent = 'Reintentar pago';
          $('ayFlowResultMeta').textContent = 'No fue posible iniciar otro intento. Vuelve al dashboard y prueba desde Facturación.';
        }
      });
      actions.appendChild(retry);
    }
    const close = document.createElement('button');
    close.type = 'button'; close.className = 'ayFlowResultBtn'; close.id = 'ayFlowResultClose';
    close.textContent = 'Volver al dashboard';
    close.addEventListener('click', () => {
      const url = new URL(location.href);
      url.searchParams.delete('flow_return');
      url.searchParams.delete('flow_result');
      url.searchParams.delete('token');
      location.replace(url.pathname + url.search + url.hash);
    });
    actions.appendChild(close);
  }

  async function check() {
    if (busy || terminal) return;
    busy = true; attempts++;
    try {
      const engine = window.AgendaYaBillingEngine;
      if (!engine?.load || !engine?.get) throw new Error('El motor de facturación aún no está disponible.');
      const billing = await engine.load() || engine.get();
      const payments = Array.isArray(billing?.payments) ? billing.payments.slice() : [];
      payments.sort((a,b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      const payment = payments[0];

      if (!payment) {
        render('unknown','No encontramos el pago','No hay un pago visible en el historial de esta cuenta. No podemos afirmar que la transacción esté aprobada.','!','Consulta ' + attempts + '.');
        return;
      }

      const status = String(payment.status || '').toLowerCase();
      const amount = Number(payment.amount);
      const money = Number.isFinite(amount) ? ' Importe registrado: $' + amount.toLocaleString('es-CL') + ' CLP.' : '';
      if (success.has(status)) {
        terminal = true;
        render('approved','¡Tu pago fue aceptado!','El servidor registra el pago como aprobado.' + money,'✓','Estado del servidor: ' + status + '.');
        await window.AgendaYaMembershipEngine?.load?.();
        await window.AgendaYaSubscriptionLifecycleEngine?.load?.();
      } else if (failed.has(status)) {
        terminal = true;
        render('rejected','Pago rechazado','Flow o el servidor registró que este intento no fue aprobado.' + money + ' Puedes reintentar o volver al dashboard.','×','Estado del servidor: ' + status + '.');
      } else {
        render('pending','Pago pendiente de confirmación','Todavía no hay una aprobación ni un rechazo definitivo.' + money + ' Estamos comprobando el estado automáticamente.','…','Estado del servidor: ' + (status || 'sin estado') + '.');
      }
    } catch (err) {
      render('unknown','No pudimos verificar el pago','No fue posible consultar el estado de facturación. No interpretaremos el retorno como aprobación. Vuelve al dashboard e inténtalo más tarde.','!','No se pudo confirmar el estado del servidor.');
      console.warn('[Agenda YA] Flow return popup:', err?.message || err);
    } finally {
      busy = false;
    }
  }

  window.AgendaYaFlowReturnPopup = { check };
  const start = () => {
    void check();
    poller = setInterval(() => {
      if (terminal || attempts >= 12) { clearInterval(poller); return; }
      void check();
    }, 5000);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();
