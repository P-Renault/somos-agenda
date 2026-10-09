/* Agenda YA · Flow return handler B5.0
   Include this script in dashboard.html after Supabase and the membership/billing engines.
   The browser return URL is informational only; payment status must be confirmed by the signed server webhook. */
(() => {
  'use strict';
  const params = new URLSearchParams(window.location.search);
  if (params.get('flow_return') !== '1') return;
  const cleanUrl = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('flow_return');
    url.searchParams.delete('token');
    window.history.replaceState({}, document.title, url.pathname + url.search + url.hash);
  };
  const showStatus = (message) => {
    let node = document.getElementById('ayFlowReturnStatus');
    if (!node) {
      node = document.createElement('div');
      node.id = 'ayFlowReturnStatus';
      node.setAttribute('role', 'status');
      node.setAttribute('aria-live', 'polite');
      Object.assign(node.style, {position:'fixed',zIndex:'100600',left:'16px',right:'16px',bottom:'18px',maxWidth:'620px',margin:'0 auto',padding:'14px 16px',border:'1px solid #c9dcf6',borderRadius:'14px',background:'#fff',color:'#19375f',boxShadow:'0 12px 38px rgba(15,40,80,.18)',font:'600 13px/1.45 system-ui,sans-serif'});
      document.body.appendChild(node);
    }
    node.textContent = message;
  };
  showStatus('Estamos verificando el estado de tu pago. La activación depende de la confirmación segura de Flow.');
  const refresh = async () => {
    try {
      const c = window.AgendaYaMembershipEngine;
      if (c && typeof c.load === 'function') await c.load();
      window.dispatchEvent(new CustomEvent('agenda-ya:flow-return', {detail:{source:'flow-return'}}));
      showStatus('Retorno recibido. Si el pago fue aprobado, tu membresía se actualizará cuando llegue la confirmación de Flow.');
    } catch (_) {
      showStatus('Retorno recibido. Actualiza la vista de membresía en unos instantes para consultar el estado confirmado.');
    } finally {
      cleanUrl();
      window.setTimeout(() => { const el = document.getElementById('ayFlowReturnStatus'); if (el) el.remove(); }, 10000);
    }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', refresh, {once:true}); else refresh();
})();
