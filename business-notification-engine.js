/* Agenda YA · B13.2 · Notificaciones del negocio
   Fix B13.2.1: campana de header + cierre robusto del popup.
   UI additive: no altera dashboard modules or booking logic. */
(() => {
  'use strict';
  const state = { client:null, open:false, rows:[], unread:0, timer:null };

  function esc(v){ return String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
  function fmtDate(d){ if(!d) return ''; try{return new Intl.DateTimeFormat('es-CL',{day:'numeric',month:'short'}).format(new Date(d+'T12:00:00'));}catch(_){return d;} }
  function label(n){
    const x=String(n||'').toLowerCase();
    return x==='pending'?'Pendiente':x==='confirmed'?'Confirmada':x==='completed'?'Completada':x==='cancelled'?'Cancelada':x==='rejected'?'Rechazada':x||'Actualizada';
  }
  function textFor(r){
    if(!r.previous_status) return `Nueva reserva de ${r.client_name || 'cliente'}.`;
    return `Reserva de ${r.client_name || 'cliente'}: ${label(r.previous_status)} → ${label(r.new_status)}.`;
  }

  function ensureStyles(){
    if(document.getElementById('ayB13BusinessNotifStyles')) return;
    const s=document.createElement('style'); s.id='ayB13BusinessNotifStyles';
    s.textContent=`
      .ay-b13-notif-wrap{position:relative;display:inline-flex;align-items:center;justify-content:center}
      .ay-b13-notif-btn{position:relative;display:inline-flex;align-items:center;justify-content:center}
      .ay-notification-trigger{position:relative;display:inline-flex;align-items:center;justify-content:center}
      .ay-notification-trigger svg{width:21px;height:21px;display:block}
      .ay-b13-notif-badge{position:absolute;top:2px;right:2px;min-width:17px;height:17px;padding:0 4px;border-radius:99px;background:#e53935;color:#fff;font:700 10px/17px Arial;text-align:center;box-shadow:0 0 0 2px #fff;pointer-events:none}
      .ay-b13-notif-panel{position:fixed;z-index:9999;top:78px;right:18px;width:min(390px,calc(100vw - 28px));max-height:min(620px,calc(100vh - 105px));background:#fff;border:1px solid #dfe7f2;border-radius:20px;box-shadow:0 18px 55px rgba(20,43,76,.18);overflow:hidden;display:flex;flex-direction:column}
      .ay-b13-notif-panel[hidden]{display:none!important}
      .ay-b13-notif-head{padding:17px 18px 13px;border-bottom:1px solid #e8edf4;display:flex;align-items:center;justify-content:space-between;gap:12px}
      .ay-b13-notif-head strong{font-size:18px;color:#152f55}.ay-b13-notif-head small{display:block;color:#7b8798;margin-top:3px;font-size:12px}
      .ay-b13-notif-close{border:0;background:#f3f6fa;border-radius:10px;width:34px;height:34px;font-size:21px;cursor:pointer;color:#243b5d;display:inline-flex;align-items:center;justify-content:center;position:relative;z-index:20;pointer-events:auto;touch-action:manipulation;flex:0 0 auto}
      .ay-b13-notif-list{overflow:auto;padding:8px}
      .ay-b13-notif-item{padding:13px 12px;border-radius:14px;margin:3px 0;background:#fff;border:1px solid transparent}
      .ay-b13-notif-item.is-unread{background:#f5f9ff;border-color:#dceaff}
      .ay-b13-notif-item strong{display:block;color:#18345b;font-size:14px;line-height:1.35}.ay-b13-notif-item p{margin:5px 0;color:#68778b;font-size:13px;line-height:1.4}.ay-b13-notif-item small{color:#98a3b2;font-size:11px}
      .ay-b13-notif-empty{padding:38px 18px;text-align:center;color:#7c899a;font-size:14px}
      @media(max-width:640px){.ay-b13-notif-panel{top:74px;right:10px;width:calc(100vw - 20px);border-radius:18px}.ay-b13-notif-badge{top:2px;right:2px}}
    `;
    document.head.appendChild(s);
  }

  function findTrigger(){
    return document.getElementById('ayBusinessNotificationsBtn')
      || document.querySelector('.ay-header-actions .ay-notification-trigger')
      || document.querySelector('.ay-header-actions .ay-icon-btn[title="Notificaciones"]');
  }

  function createTriggerIfMissing(){
    let btn=findTrigger();
    if(btn) return btn;
    const actions=document.querySelector('.ay-header-actions');
    const account=document.getElementById('ayAccountBtn');
    if(!actions) return null;
    btn=document.createElement('button');
    btn.className='ay-icon-btn ay-notification-trigger';
    btn.id='ayBusinessNotificationsBtn';
    btn.type='button';
    btn.title='Notificaciones';
    btn.setAttribute('aria-label','Abrir notificaciones');
    btn.setAttribute('aria-haspopup','dialog');
    btn.setAttribute('aria-expanded','false');
    btn.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    actions.insertBefore(btn, account || actions.firstElementChild);
    return btn;
  }

  function mount(){
    const btn=createTriggerIfMissing();
    if(!btn || btn.dataset.b13Notif==='1') return !!btn;
    btn.dataset.b13Notif='1'; btn.classList.add('ay-b13-notif-btn');
    const wrap=document.createElement('span'); wrap.className='ay-b13-notif-wrap';
    btn.parentNode.insertBefore(wrap,btn); wrap.appendChild(btn);
    const badge=document.createElement('span'); badge.className='ay-b13-notif-badge'; badge.hidden=true; wrap.appendChild(badge);
    btn.addEventListener('click', async e=>{e.preventDefault();e.stopPropagation();await toggle();});
    ensureStyles(); return true;
  }

  function render(){
    let panel=document.getElementById('ayB13BusinessNotifPanel');
    if(!panel){
      panel=document.createElement('section'); panel.id='ayB13BusinessNotifPanel'; panel.className='ay-b13-notif-panel'; panel.hidden=true;
      panel.setAttribute('role','dialog'); panel.setAttribute('aria-label','Notificaciones');
      document.body.appendChild(panel);
    }
    panel.innerHTML=`<div class="ay-b13-notif-head"><div><strong>Notificaciones</strong><small>${state.unread ? `${state.unread} sin leer` : 'Todo al día'}</small></div><button class="ay-b13-notif-close" id="ayB13NotifClose" type="button" aria-label="Cerrar notificaciones">×</button></div><div class="ay-b13-notif-list">${state.rows.length?state.rows.map(r=>`<article class="ay-b13-notif-item ${r.read_at?'':'is-unread'}"><strong>${esc(r.service_name||'Reserva')}</strong><p>${esc(textFor(r))}</p><small>${fmtDate(r.booking_date)}${r.start_time?' · '+String(r.start_time).slice(0,5):''}</small></article>`).join(''):`<div class="ay-b13-notif-empty">No hay notificaciones todavía.</div>`}</div>`;
    const trigger=findTrigger();
    if(trigger) trigger.setAttribute('aria-expanded',state.open?'true':'false');
    const badge=document.querySelector('.ay-b13-notif-badge'); if(badge){badge.textContent=state.unread>99?'99+':String(state.unread); badge.hidden=state.unread<1;}
    panel.hidden=!state.open;
  }

  async function toggle(){
    if(!document.getElementById('ayB13BusinessNotifPanel')) render();
    state.open=!state.open;
    render();
    if(state.open) await markRead();
  }

  function close(){
    state.open=false;
    const p=document.getElementById('ayB13BusinessNotifPanel');
    if(p) p.hidden=true;
    const trigger=findTrigger();
    if(trigger) trigger.setAttribute('aria-expanded','false');
  }

  document.addEventListener('click', e=>{
    const closeBtn=e.target.closest?.('#ayB13NotifClose');
    if(closeBtn){e.preventDefault();e.stopPropagation();close();return;}
    if(state.open){
      const panel=document.getElementById('ayB13BusinessNotifPanel');
      const trigger=findTrigger();
      if(panel && !panel.contains(e.target) && !trigger?.contains(e.target)) close();
    }
  }, true);
  document.addEventListener('keydown', e=>{if(e.key==='Escape' && state.open){e.preventDefault();close();}});

  async function load(){
    if(!state.client) return;
    const {data,error}=await state.client.rpc('get_business_notifications',{p_limit:50});
    if(error){console.error('Agenda YA business notifications:',error);return;}
    state.rows=Array.isArray(data)?data:[]; state.unread=state.rows.filter(x=>!x.read_at).length;
    render();
  }
  async function markRead(){
    if(!state.client || state.unread<1) return;
    const {error}=await state.client.rpc('mark_business_notifications_read');
    if(error){console.error('Agenda YA mark business notifications:',error);return;}
    state.rows=state.rows.map(x=>({...x,read_at:x.read_at||new Date().toISOString()})); state.unread=0; render();
  }
  function boot(){
    ensureStyles();
    if(!mount()){setTimeout(boot,300);return;}
    const wait=()=>{
      const c=window.AgendaYaAuth?.getClient?.();
      if(c){state.client=c;load();state.timer=setInterval(load,30000);}else setTimeout(wait,300);
    }; wait();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
})();
