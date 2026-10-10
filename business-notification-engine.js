/* Agenda YA · B13.2.2 + B6 · Extensión compatible del motor actual */
(() => {
  'use strict';
  const state = { client:null, open:false, rows:[], unread:0, timer:null, booted:false };
  const $ = (s,r=document) => r.querySelector(s);
  function esc(v){return String(v ?? '').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
  function fmtDate(d){if(!d)return '';try{return new Intl.DateTimeFormat('es-CL',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(d));}catch(_){return String(d);}}
  function label(n){const x=String(n||'').toLowerCase();return ({pending:'Pendiente',confirmed:'Confirmada',completed:'Completada',cancelled:'Cancelada',rejected:'Rechazada',no_show:'No asistió'})[x]||x||'Actualizada';}
  function ensureStyles(){
    if($('#ayB13BusinessNotifStyles'))return;
    const s=document.createElement('style');s.id='ayB13BusinessNotifStyles';s.textContent=`
    .ay-notification-trigger{position:relative!important;display:inline-flex!important;align-items:center;justify-content:center}
    .ay-notification-trigger svg{width:22px;height:22px;display:block}.ay-b13-notif-wrap{position:relative;display:inline-flex}
    .ay-b13-notif-badge{position:absolute;top:-2px;right:-2px;min-width:17px;height:17px;padding:0 4px;border-radius:99px;background:#e53935;color:#fff;font:700 10px/17px Arial;text-align:center;box-shadow:0 0 0 2px #fff;z-index:2}
    .ay-b13-notif-panel{position:fixed;z-index:100000;top:78px;right:18px;width:min(390px,calc(100vw - 28px));max-height:min(620px,calc(100vh - 105px));background:#fff;border:1px solid #dfe7f2;border-radius:20px;box-shadow:0 18px 55px #142b4c2e;overflow:hidden;display:flex;flex-direction:column}
    .ay-b13-notif-panel[hidden]{display:none!important}.ay-b13-notif-head{padding:17px 18px 13px;border-bottom:1px solid #e8edf4;display:flex;align-items:center;justify-content:space-between;gap:12px}
    .ay-b13-notif-head strong{font-size:18px;color:#152f55}.ay-b13-notif-head small{display:block;color:#7b8798;margin-top:3px;font-size:12px}
    .ay-b13-notif-close{border:0;background:#f3f6fa;border-radius:10px;width:34px;height:34px;font-size:21px;cursor:pointer;color:#243b5d}
    .ay-b13-notif-list{overflow:auto;padding:8px}.ay-b13-notif-item{padding:13px 12px;border-radius:14px;margin:3px 0;background:#fff;border:1px solid transparent}
    .ay-b13-notif-item.is-unread{background:#f5f9ff;border-color:#dceaff}.ay-b13-notif-item strong{display:block;color:#18345b;font-size:14px;line-height:1.35}
    .ay-b13-notif-item p{margin:5px 0;color:#68778b;font-size:13px;line-height:1.4}.ay-b13-notif-item small{color:#98a3b2;font-size:11px}
    .ay-b13-notif-empty{padding:38px 18px;text-align:center;color:#7c899a;font-size:14px}
    @media(max-width:700px){.ay-b13-notif-panel{top:74px;right:10px;width:calc(100vw - 20px);max-height:calc(100vh - 92px);border-radius:18px}.ay-notification-trigger{width:40px!important;height:40px!important;min-width:40px!important;flex:0 0 40px}.ay-notification-trigger svg{width:21px;height:21px}}
    `;document.head.appendChild(s);
  }
  function getButton(){return $('#ayBusinessNotificationsBtn')||$('.ay-header-actions .ay-icon-btn[title="Notificaciones"]');}
  function mount(){
    ensureStyles();const btn=getButton();if(!btn)return false;
    btn.id='ayBusinessNotificationsBtn';btn.classList.add('ay-notification-trigger');btn.setAttribute('aria-haspopup','dialog');
    if(!btn.dataset.b13NotifBound){btn.dataset.b13NotifBound='1';btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();toggle();});
      const wrap=document.createElement('span');wrap.className='ay-b13-notif-wrap';btn.parentNode.insertBefore(wrap,btn);wrap.appendChild(btn);
      const badge=document.createElement('span');badge.className='ay-b13-notif-badge';badge.hidden=true;wrap.appendChild(badge);}
    return true;
  }
  function normalize(r,kind){
    if(kind==='reservation')return {id:'reservation:'+r.id,kind,title:r.service_name||'Reserva actualizada',message:!r.previous_status?`Nueva reserva de ${r.client_name||'cliente'}.`:`Reserva de ${r.client_name||'cliente'}: ${label(r.previous_status)} → ${label(r.new_status)}.`,created_at:r.created_at||r.booking_date,read_at:r.read_at,detail:r.booking_date&&`${r.booking_date}${r.start_time?' · '+String(r.start_time).slice(0,5):''}`};
    return {id:kind+':'+r.id,kind,title:r.title||'Notificación',message:r.message||'',created_at:r.created_at,read_at:r.read_at,detail:r.payment_status?('Estado: '+label(r.payment_status)):''};
  }
  function render(){
    let p=$('#ayB13BusinessNotifPanel');if(!p){p=document.createElement('section');p.id='ayB13BusinessNotifPanel';p.className='ay-b13-notif-panel';p.hidden=true;p.setAttribute('role','dialog');p.setAttribute('aria-label','Notificaciones');document.body.appendChild(p);}
    p.innerHTML=`<div class="ay-b13-notif-head"><div><strong>Notificaciones</strong><small>${state.unread?`${state.unread} sin leer`:'Todo al día'}</small></div><button class="ay-b13-notif-close" type="button" aria-label="Cerrar notificaciones">×</button></div><div class="ay-b13-notif-list">${state.rows.length?state.rows.map(r=>`<article class="ay-b13-notif-item ${r.read_at?'':'is-unread'}"><strong>${esc(r.title)}</strong><p>${esc(r.message)}</p><small>${esc(fmtDate(r.created_at))}${r.detail?' · '+esc(r.detail):''}</small></article>`).join(''):'<div class="ay-b13-notif-empty">No hay notificaciones todavía.</div>'}</div>`;
    p.hidden=!state.open;$('.ay-b13-notif-close',p)?.addEventListener('click',close);
    const badge=$('.ay-b13-notif-badge');if(badge){badge.textContent=state.unread>99?'99+':String(state.unread);badge.hidden=state.unread<1;}
    getButton()?.setAttribute('aria-expanded',state.open?'true':'false');
  }
  function toggle(){state.open=!state.open;render();if(state.open)markRead();}
  function close(){state.open=false;const p=$('#ayB13BusinessNotifPanel');if(p)p.hidden=true;getButton()?.setAttribute('aria-expanded','false');}
  async function load(){
    if(!state.client)return;
    const jobs=[
      ['reservation',state.client.rpc('get_business_notifications',{p_limit:50})],
      ['plan',state.client.rpc('get_business_plan_notifications',{p_limit:50})],
      ['welcome',state.client.rpc('get_welcome_notifications',{p_limit:50})],
      ['payment',state.client.rpc('get_business_payment_notifications',{p_limit:50})]
    ];
    const results=await Promise.all(jobs.map(async([kind,promise])=>({kind,...await promise})));
    const rows=[];for(const x of results){if(x.error){console.warn('Agenda YA notifications source:',x.kind,x.error.message);continue;}if(Array.isArray(x.data))rows.push(...x.data.map(r=>normalize(r,x.kind)));}
    const seen=new Set();state.rows=rows.filter(r=>{if(seen.has(r.id))return false;seen.add(r.id);return true;}).sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0)).slice(0,100);
    state.unread=state.rows.filter(r=>!r.read_at).length;render();
  }
  async function markRead(){
    if(!state.client||state.unread<1)return;
    const jobs=['mark_business_notifications_read','mark_welcome_notifications_read','mark_business_plan_notifications_read','mark_business_payment_notifications_read'];
    const results=await Promise.all(jobs.map(name=>state.client.rpc(name)));
    results.forEach((x,i)=>{if(x.error&&!/does not exist|Could not find the function/i.test(x.error.message||''))console.warn('Agenda YA mark read:',jobs[i],x.error.message);});
    state.rows=state.rows.map(r=>({...r,read_at:r.read_at||new Date().toISOString()}));state.unread=0;render();
  }
  function boot(){if(state.booted)return;state.booted=true;const retry=()=>{if(!mount()){state.booted=false;setTimeout(boot,300);return;}const wait=()=>{const c=window.AgendaYaAuth?.getClient?.();if(c){state.client=c;load();state.timer=setInterval(load,30000);}else setTimeout(wait,300);};wait();document.addEventListener('click',e=>{const p=$('#ayB13BusinessNotifPanel'),b=getButton();if(state.open&&p&&!p.contains(e.target)&&!b?.contains(e.target))close();});document.addEventListener('keydown',e=>{if(e.key==='Escape')close();});};retry();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
