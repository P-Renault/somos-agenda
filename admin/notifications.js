/* Agenda YA · Motor de notificaciones administrativas · usa la Edge Function protegida */
(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let opened = false, loading = false, items = [], unread = 0, refreshTimer = null;
  const button = () => $('#notificationsBtn');

  // Responsive panel styles are installed by this module so the notification
  // popup remains proportional even if the page's main stylesheet is cached.
  function installResponsiveStyles() {
    if ($('#adminNotificationsResponsiveStyles')) return;
    const style = document.createElement('style');
    style.id = 'adminNotificationsResponsiveStyles';
    style.textContent = `
      #adminNotificationsPanel.admin-notifications-panel {
        position: fixed !important;
        z-index: 10000 !important;
        top: max(72px, calc(env(safe-area-inset-top, 0px) + 58px)) !important;
        right: 16px !important;
        left: auto !important;
        width: min(420px, calc(100vw - 32px)) !important;
        min-width: 0 !important;
        max-width: calc(100vw - 32px) !important;
        max-height: calc(100dvh - 96px - env(safe-area-inset-bottom, 0px)) !important;
        box-sizing: border-box !important;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      #adminNotificationsPanel.admin-notifications-panel[hidden] { display: none !important; }
      #adminNotificationsPanel *, #adminNotificationsPanel *::before, #adminNotificationsPanel *::after {
        box-sizing: border-box;
        min-width: 0;
      }
      #adminNotificationsPanel .admin-notifications-head {
        padding: 16px;
        border-bottom: 1px solid #e2e8f0;
        background: #fff;
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 10px;
        flex: 0 0 auto;
      }
      #adminNotificationsPanel .admin-notifications-head > div { flex: 1 1 auto; min-width: 0; }
      #adminNotificationsPanel .admin-notifications-readall {
        flex: 0 1 auto;
        max-width: 48%;
        white-space: normal;
        overflow-wrap: anywhere;
        text-align: right;
      }
      #adminNotificationsPanel .admin-notifications-list {
        background: #fff;
        flex: 1 1 auto;
        min-height: 0;
        overflow-x: hidden;
        overflow-y: auto;
        overscroll-behavior: contain;
        -webkit-overflow-scrolling: touch;
      }
      #adminNotificationsPanel .admin-notifications-foot {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 10px 14px;
        border-top: 1px solid #e2e8f0;
        background: #f8fafc;
        flex: 0 0 auto;
        flex-wrap: wrap;
      }
      #adminNotificationsPanel button {
        font: inherit; cursor: pointer; max-width: 100%;
        border: 1px solid #d7e0ec; border-radius: 9px;
        padding: 8px 10px; background: #fff; color: #183153;
      }
      #adminNotificationsPanel button:disabled { opacity: .5; cursor: not-allowed; }
      #adminNotificationsPanel .admin-notification-item {
        display: flex; align-items: flex-start; gap: 12px;
        padding: 14px 16px; border-bottom: 1px solid #edf1f6;
        background: #fff;
      }
      #adminNotificationsPanel .admin-notification-item.is-unread { background: #f3f7ff; }
      #adminNotificationsPanel .admin-notification-mark {
        width: 10px; height: 10px; border-radius: 50%; flex: 0 0 10px;
        margin-top: 5px; background: #2563eb;
      }
      #adminNotificationsPanel .admin-notification-mark.success { background: #16a34a; }
      #adminNotificationsPanel .admin-notification-mark.warning { background: #d97706; }
      #adminNotificationsPanel .admin-notification-mark.error { background: #dc2626; }
      #adminNotificationsPanel .admin-notification-mark.support { background: #7c3aed; }
      #adminNotificationsPanel .admin-notification-mark.payment { background: #0891b2; }
      #adminNotificationsPanel .admin-notification-mark.subscription { background: #9333ea; }
      #adminNotificationsPanel .admin-notification-copy > strong { display:block; line-height:1.4; color:#172b4d; }
      #adminNotificationsPanel .admin-notification-copy p { margin:5px 0; color:#52627a; line-height:1.45; }
      #adminNotificationsPanel .admin-notification-copy small { display:block; color:#78879b; font-size:11px; margin-top:5px; }
      #adminNotificationsPanel .admin-notification-actions { display:flex; flex-wrap:wrap; gap:7px; margin-top:10px; }
      #adminNotificationsPanel .admin-notification-actions button[data-notification-open] { background:#eaf2ff; border-color:#c8dcff; color:#1554b5; font-weight:600; }
      #adminNotificationsPanel .admin-notifications-empty,
      #adminNotificationsPanel .admin-notifications-state { padding:22px 16px; text-align:center; color:#52627a; }
      #adminNotificationsPanel .admin-notifications-foot span { overflow-wrap: anywhere; }
      #adminNotificationsPanel .admin-notification-copy { flex: 1 1 auto; min-width: 0; overflow-wrap: anywhere; }
      #adminNotificationsPanel .admin-notification-copy p { overflow-wrap: anywhere; word-break: normal; }
      @media (max-width: 600px) {
        #adminNotificationsPanel.admin-notifications-panel {
          top: max(64px, calc(env(safe-area-inset-top, 0px) + 54px)) !important;
          right: 8px !important;
          left: 8px !important;
          width: auto !important;
          min-width: 0 !important;
          max-width: none !important;
          max-height: calc(100dvh - 88px - env(safe-area-inset-bottom, 0px)) !important;
          border-radius: 15px !important;
        }
        #adminNotificationsPanel .admin-notifications-head { padding: 13px !important; gap: 8px; }
        #adminNotificationsPanel .admin-notifications-foot button { flex: 1 1 120px; }
        #adminNotificationsPanel .admin-notification-actions button { flex: 1 1 auto; }
        #adminNotificationsPanel .admin-notifications-head strong { font-size: 15px; }
        #adminNotificationsPanel .admin-notifications-head small { font-size: 11px; line-height: 1.4; }
        #adminNotificationsPanel .admin-notifications-readall { max-width: 45%; font-size: 10px; line-height: 1.35; }
        #adminNotificationsPanel .admin-notification-item { padding: 12px 13px !important; gap: 10px; }
        #adminNotificationsPanel .admin-notification-copy > strong { font-size: 12px; line-height: 1.4; }
        #adminNotificationsPanel .admin-notification-copy p { font-size: 12px; line-height: 1.45; }
        #adminNotificationsPanel .admin-notifications-foot { padding: 8px 12px !important; }
        #adminNotificationsPanel .admin-notifications-foot span { font-size: 9px; }
      }
      @media (max-width: 360px) {
        #adminNotificationsPanel .admin-notifications-head { flex-wrap: wrap; }
        #adminNotificationsPanel .admin-notifications-readall { max-width: 100%; }
      }
    `;
    document.head.append(style);
  }

  async function call(action, extra = {}) {
    const sb = window.agendaAdminSupabase;
    if (!sb) throw new Error('Cliente Supabase no inicializado.');
    const { data: { session }, error } = await sb.auth.getSession();
    if (error || !session?.access_token) throw new Error('La sesión administrativa venció. Inicia sesión nuevamente.');
    const cfg = window.SOMOS_CONFIG || {};
    const base = String(cfg.SUPABASE_URL || '').replace(/\/$/, '');
    if (!base || !cfg.SUPABASE_ANON_KEY) throw new Error('Falta la configuración de Supabase.');
    const response = await fetch(`${base}/functions/v1/admin-platform`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}`, apikey: cfg.SUPABASE_ANON_KEY },
      body: JSON.stringify({ action, ...extra })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.error) throw new Error(result.error || `Error HTTP ${response.status}`);
    return result;
  }

  function ensurePanel() {
    installResponsiveStyles();
    let panel = $('#adminNotificationsPanel');
    if (panel) return panel;
    panel = document.createElement('section');
    panel.id = 'adminNotificationsPanel';
    panel.className = 'admin-notifications-panel';
    panel.hidden = true;
    panel.setAttribute('aria-label', 'Notificaciones administrativas');
    panel.innerHTML = `<div class="admin-notifications-head"><div><strong>Notificaciones</strong><small id="adminNotificationsSummary">Eventos de la plataforma</small></div><button type="button" class="admin-notifications-readall" data-notification-readall>Marcar todas leídas</button></div><div class="admin-notifications-list" id="adminNotificationsList"><div class="admin-notifications-state">Cargando notificaciones…</div></div><div class="admin-notifications-foot"><button type="button" data-notification-refresh>Actualizar</button><span>Agenda YA · Centro administrativo</span></div>`;
    document.body.append(panel);
    return panel;
  }

  function updateBadge() {
    const btn = button(); if (!btn) return;
    let badge = $('.notification-count', btn);
    if (!badge) { badge = document.createElement('i'); badge.className = 'notification-count'; btn.append(badge); }
    badge.textContent = unread > 99 ? '99+' : String(unread);
    badge.hidden = unread < 1;
    btn.setAttribute('aria-label', unread ? `Notificaciones, ${unread} sin leer` : 'Notificaciones');
    btn.setAttribute('aria-expanded', String(opened));
  }

  function render() {
    const panel = ensurePanel(), list = $('#adminNotificationsList', panel);
    $('#adminNotificationsSummary', panel).textContent = `${unread} sin leer · ${items.length} recientes`;
    const readAll = $('[data-notification-readall]', panel); readAll.disabled = unread === 0;
    if (!items.length) {
      list.innerHTML = `<div class="admin-notifications-empty"><span aria-hidden="true">♧</span><strong>Todo al día</strong><p>No hay notificaciones registradas todavía.</p></div>`;
      return;
    }
    list.innerHTML = items.map(n => {
      const type = ['success','warning','error','support','payment','subscription'].includes(n.type) ? n.type : 'info';
      const date = n.created_at ? new Date(n.created_at) : null;
      const dateLabel = date && !Number.isNaN(date.getTime()) ? new Intl.DateTimeFormat('es-CL',{dateStyle:'medium',timeStyle:'short'}).format(date) : '';
      return `<article class="admin-notification-item ${n.is_read ? 'is-read' : 'is-unread'}" data-notification-id="${esc(n.id)}"><span class="admin-notification-mark ${type}" aria-hidden="true"></span><div class="admin-notification-copy"><strong>${esc(n.title)}</strong><p>${esc(n.message)}</p><small>${esc(dateLabel)}</small><div class="admin-notification-actions">${n.target_module ? `<button type="button" data-notification-open="${esc(n.target_module)}" data-notification-id="${esc(n.id)}" data-notification-target-id="${esc(n.target_id || '')}">Ver módulo</button>` : ''}${n.is_read ? '<span>Leída</span>' : `<button type="button" data-notification-read="${esc(n.id)}">Marcar leída</button>`}</div></div></article>`;
    }).join('');
  }

  async function load(showErrors = false) {
    if (loading) return;
    loading = true;
    const panel = ensurePanel();
    if (!items.length) $('#adminNotificationsList', panel).innerHTML = '<div class="admin-notifications-state">Consultando Supabase…</div>';
    try {
      const result = await call('notifications_list', { limit: 30 });
      items = result.rows || []; unread = Number(result.unread || 0); render(); updateBadge();
    } catch (error) {
      $('#adminNotificationsList', panel).innerHTML = `<div class="admin-notifications-state is-error">${esc(error.message)}<button type="button" data-notification-refresh>Reintentar</button></div>`;
      if (showErrors) window.alert(`No se pudieron cargar las notificaciones: ${error.message}`);
    } finally { loading = false; }
  }

  async function markRead(id) {
    await call('notifications_mark_read', { id });
    const item = items.find(n => String(n.id) === String(id));
    if (item && !item.is_read) { item.is_read = true; unread = Math.max(0, unread - 1); }
    render(); updateBadge();
  }

  async function markAllRead() {
    if (!unread) return;
    await call('notifications_mark_all_read');
    items.forEach(n => n.is_read = true); unread = 0; render(); updateBadge();
  }

  function setOpen(value) {
    opened = value;
    const panel = ensurePanel(); panel.hidden = !opened;
    updateBadge();
    if (opened) load();
  }

  document.addEventListener('click', async event => {
    const btn = event.target.closest('#notificationsBtn');
    if (btn) {
      event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
      setOpen(!opened); return;
    }
    const panel = $('#adminNotificationsPanel');
    if (!panel || panel.hidden) return;
    if (event.target.closest('[data-notification-refresh]')) { event.preventDefault(); await load(true); return; }
    if (event.target.closest('[data-notification-readall]')) {
      try { await markAllRead(); } catch (e) { window.alert(e.message); }
      return;
    }
    const read = event.target.closest('[data-notification-read]');
    if (read) { read.disabled = true; try { await markRead(read.dataset.notificationRead); } catch (e) { window.alert(e.message); } return; }
    const open = event.target.closest('[data-notification-open]');
    if (open) {
      const module = String(open.dataset.notificationOpen || '').trim();
      const targetId = String(open.dataset.notificationTargetId || '').trim();
      const notificationId = String(open.dataset.notificationId || '').trim();
      try { await markRead(notificationId); } catch (_) {}
      setOpen(false);
      // Preserve the event target for modules that support deep-link selection.
      const destination = { module, targetId, notificationId, at: Date.now() };
      try { sessionStorage.setItem('agendaAdminNotificationTarget', JSON.stringify(destination)); } catch (_) {}
      if (module) location.hash = module;
      window.dispatchEvent(new CustomEvent('admin:notification:navigate', { detail: destination }));
      return;
    }
    if (!event.target.closest('#adminNotificationsPanel')) setOpen(false);
  }, true);

  document.addEventListener('keydown', event => { if (event.key === 'Escape' && opened) setOpen(false); });
  window.addEventListener('hashchange', () => { if (opened) setOpen(false); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) load(); });
  window.addEventListener('load', () => { load(); refreshTimer = window.setInterval(() => { if (!document.hidden) load(); }, 60000); }, { once: true });
  window.addEventListener('beforeunload', () => { if (refreshTimer) clearInterval(refreshTimer); });
})();
