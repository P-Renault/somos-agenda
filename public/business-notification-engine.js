/* Agenda YA · B13.2.3 · Motor completo de notificaciones negocio
   Base: business-notification-engine.js B13.2.2 de Backup-5.0-producción.
   Mantiene los RPC existentes de reservas y añade los RPC dedicados a cambio de plan. */
(() => {
  'use strict';
  const state = { client:null, open:false, rows:[], unread:0, timer:null, booted:false };
  const $ = (s,r=document) => r.querySelector(s);
  function esc(v){return String(v ?? '').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
  function fmtDate(d){if(!d)return '';try{return new Intl.DateTimeFormat('es-CL',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(d));}catch(_){return String(d);}}
  function label(n){const x=String(n||'').toLowerCase();return ({pending:'Pendiente',confirmed:'Confirmada',completed:'Completada',cancelled:'Cancelada',rejected:'Rechazada'})[x]||x||'Actualizada';}
  function titleFor(r){return r.title || r.service_name || (r.type==='plan_changed'?'Cambio de plan':r.type?.endsWith('_welcome')?'Bienvenida':'Reserva');}
  function messageFor(r){if(r.type==='plan_changed'||r.type?.endsWith('_welcome'))return r.message||'¡Bienvenido a Agenda Ya!';return !r.previous_status?`Nueva reserva de ${r.client_name||'cliente'}.`:`Reserva de ${r.client_name||'cliente'}: ${label(r.previous_status)} → ${label(r.new_status)}.`;}
  function dateFor(r){return r.created_at || r.booking_date || null;}
  function ensureStyles(){
    if($('#ayB13BusinessNotifStyles'))return;
    const s=document.createElement('style');s.id='ayB13BusinessNotifStyles';
    s.textContent=`
      .ay-notification-trigger{position:relative!important;display:inline-flex!important;align-items:center;justify-content:center}
      .ay-notification-trigger svg{width:22px;height:22px;display:block}
      .ay-b13-notif-wrap{position:relative;display:inline-flex}.ay-b13-notif-btn{position:relative}
      .ay-b13-notif-badge{position:absolute;top:-2px;right:-2px;min-width:17px;height:17px;padding:0 4px;border-radius:99px;background:#e53935;color:#fff;font:700 10px/17px Arial;text-align:center;box-shadow:0 0 0 2px #fff;z-index:2}
      .ay-b13-notif-panel{position:fixed;z-index:100000;top:78px;right:18px;width:min(390px,calc(100vw - 28px));max-height:min(620px,calc(100vh - 105px));background:#fff;border:1px solid #dfe7f2;border-radius:20px;box-shadow:0 18px 55px rgba(20,43,76,.18);overflow:hidden;display:flex;flex-direction:column}
      .ay-b13-notif-panel[hidden]{display:none!important}.ay-b13-notif-head{padding:17px 18px 13px;border-bottom:1px solid #e8edf4;display:flex;align-items:center;justify-content:space-between;gap:12px}
      .ay-b13-notif-head strong{font-size:18px;color:#152f55}.ay-b13-notif-head small{display:block;color:#7b8798;margin-top:3px;font-size:12px}
      .ay-b13-notif-close{border:0!important;background:#f3f6fa!important;border-radius:10px!important;width:34px!important;height:34px!important;font-size:21px!important;cursor:pointer!important;color:#243b5d!important;padding:0!important}
      .ay-b13-notif-list{overflow:auto;padding:8px}.ay-b13-notif-item{padding:13px 12px;border-radius:14px;margin:3px 0;background:#fff;border:1px solid transparent}
      .ay-b13-notif-item.is-unread{background:#f5f9ff;border-color:#dceaff}.ay-b13-notif-item strong{display:block;color:#18345b;font-size:14px}
      .ay-b13-notif-item p{margin:5px 0;color:#68778b;font-size:13px;line-height:1.4}.ay-b13-notif-item small{color:#98a3b2;font-size:11px}
      .ay-b13-notif-item[data-type="plan_changed"]{border-left:3px solid #1672e8}.ay-b13-notif-empty{padding:38px 18px;text-align:center;color:#7c899a;font-size:14px}
      @media(max-width:700px){.ay-b13-notif-panel{top:74px;right:10px;width:calc(100vw - 20px);max-height:calc(100vh - 92px);border-radius:18px}.ay-notification-trigger{width:40px!important;height:40px!important;min-width:40px!important;flex:0 0 40px}.ay-notification-trigger svg{width:21px;height:21px}.ay-b13-notif-badge{top:0;right:0}}
    `;document.head.appendChild(s);
  }
  function getButton(){return $('#ayBusinessNotificationsBtn') || $('.ay-header-actions .ay-icon-btn[title="Notificaciones"]');}
  function mount(){
    ensureStyles();const btn=getButton();if(!btn)return false;
    btn.id='ayBusinessNotificationsBtn';btn.classList.add('ay-b13-notif-btn','ay-notification-trigger');btn.setAttribute('aria-haspopup','dialog');btn.setAttribute('aria-expanded',state.open?'true':'false');
    if(!btn.dataset.b13NotifBound){btn.dataset.b13NotifBound='1';btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();toggle();});
      const wrap=document.createElement('span');wrap.className='ay-b13-notif-wrap';btn.parentNode.insertBefore(wrap,btn);wrap.appendChild(btn);
      const badge=document.createElement('span');badge.className='ay-b13-notif-badge';badge.hidden=true;wrap.appendChild(badge);}
    return true;
  }
  function render(){
    let panel=$('#ayB13BusinessNotifPanel');
    if(!panel){panel=document.createElement('section');panel.id='ayB13BusinessNotifPanel';panel.className='ay-b13-notif-panel';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Notificaciones');document.body.appendChild(panel);}
    panel.innerHTML=`<div class="ay-b13-notif-head"><div><strong>Notificaciones</strong><small>${state.unread?`${state.unread} sin leer`:'Todo al día'}</small></div><button class="ay-b13-notif-close" type="button" aria-label="Cerrar notificaciones">×</button></div><div class="ay-b13-notif-list">${state.rows.length?state.rows.map(r=>`<article data-type="${esc(r.type||'booking')}" class="ay-b13-notif-item ${r.read_at?'':'is-unread'}"><strong>${esc(titleFor(r))}</strong><p>${esc(messageFor(r))}</p><small>${esc(fmtDate(dateFor(r)))}</small></article>`).join(''):'<div class="ay-b13-notif-empty">No hay notificaciones todavía.</div>'}</div>`;
    panel.hidden=!state.open;
    const closeBtn=$('.ay-b13-notif-close',panel);if(closeBtn&&!closeBtn.dataset.bound){closeBtn.dataset.bound='1';closeBtn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();close();});}
    const badge=$('.ay-b13-notif-badge');if(badge){badge.textContent=state.unread>99?'99+':String(state.unread);badge.hidden=state.unread<1;}
    const btn=getButton();if(btn)btn.setAttribute('aria-expanded',state.open?'true':'false');
  }
  function toggle(){state.open=!state.open;render();if(state.open)markRead();}
  function close(){state.open=false;const p=$('#ayB13BusinessNotifPanel');if(p)p.hidden=true;const b=getButton();if(b)b.setAttribute('aria-expanded','false');}
  async function load(){
    if(!state.client)return;
    const [bookingResult,planResult,welcomeResult]=await Promise.all([
      state.client.rpc('get_business_notifications',{p_limit:50}),
      state.client.rpc('get_business_plan_notifications',{p_limit:50}),
      state.client.rpc('get_welcome_notifications',{p_limit:50})
    ]);
    if(bookingResult.error){console.error('Agenda YA business notifications:',bookingResult.error);return;}
    if(planResult.error)console.error('Agenda YA plan notifications:',planResult.error);
    const bookings=(Array.isArray(bookingResult.data)?bookingResult.data:[]).map(r=>({...r,type:r.type||'booking',title:r.title||r.service_name||'Reserva'}));
    const plans=!planResult.error&&Array.isArray(planResult.data)?planResult.data:[];
    const welcomes=!welcomeResult.error&&Array.isArray(welcomeResult.data)?welcomeResult.data:[];
    state.rows=[...bookings,...plans,...welcomes].sort((a,b)=>new Date(dateFor(b)||0)-new Date(dateFor(a)||0)).slice(0,50);
    state.unread=state.rows.filter(x=>!x.read_at).length;render();
  }
  async function markRead(){
    if(!state.client||state.unread<1)return;
    const hasPlanUnread=state.rows.some(x=>x.type==='plan_changed'&&!x.read_at);
    const calls=[state.client.rpc('mark_business_notifications_read')];
    if(state.rows.some(x=>x.type?.endsWith('_welcome')&&!x.read_at))calls.push(state.client.rpc('mark_welcome_notifications_read'));
    if(hasPlanUnread)calls.push(state.client.rpc('mark_business_plan_notifications_read'));
    const results=await Promise.all(calls);
    results.forEach((r,i)=>{if(r.error)console.error(i?'Agenda YA mark plan notifications:':'Agenda YA mark business notifications:',r.error);});
    await load();
  }
  function bindGlobalClose(){
    document.addEventListener('click',e=>{const p=$('#ayB13BusinessNotifPanel'),b=getButton();if(!state.open||!p)return;if(p.contains(e.target)||b?.contains(e.target))return;close();});
    document.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
  }
  function boot(){
    if(state.booted)return;state.booted=true;ensureStyles();
    const retry=()=>{if(!mount()){state.booted=false;setTimeout(boot,300);return;}bindGlobalClose();
      const wait=()=>{const c=window.AgendaYaAuth?.getClient?.();if(c){state.client=c;load();state.timer=setInterval(load,30000);}else setTimeout(wait,300);};wait();};
    retry();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
