/* Agenda YA · Motor de notificaciones administrativas · usa la Edge Function protegida */
(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let opened = false, loading = false, items = [], unread = 0, refreshTimer = null;
  const button = () => $('#notificationsBtn');

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
      return `<article class="admin-notification-item ${n.is_read ? 'is-read' : 'is-unread'}" data-notification-id="${esc(n.id)}"><span class="admin-notification-mark ${type}" aria-hidden="true"></span><div class="admin-notification-copy"><strong>${esc(n.title)}</strong><p>${esc(n.message)}</p><small>${esc(dateLabel)}</small><div class="admin-notification-actions">${n.target_module ? `<button type="button" data-notification-open="${esc(n.target_module)}" data-notification-id="${esc(n.id)}">Ver módulo</button>` : ''}${n.is_read ? '<span>Leída</span>' : `<button type="button" data-notification-read="${esc(n.id)}">Marcar leída</button>`}</div></div></article>`;
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
      try { await markRead(open.dataset.notificationId); } catch (_) {}
      setOpen(false); location.hash = open.dataset.notificationOpen; return;
    }
    if (!event.target.closest('#adminNotificationsPanel')) setOpen(false);
  }, true);

  document.addEventListener('keydown', event => { if (event.key === 'Escape' && opened) setOpen(false); });
  window.addEventListener('hashchange', () => { if (opened) setOpen(false); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) load(); });
  window.addEventListener('load', () => { load(); refreshTimer = window.setInterval(() => { if (!document.hidden) load(); }, 60000); }, { once: true });
  window.addEventListener('beforeunload', () => { if (refreshTimer) clearInterval(refreshTimer); });
})();
