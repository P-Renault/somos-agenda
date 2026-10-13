/* Agenda Ya: motor de bienvenida integrado en la única campana del explorador. */
(()=>{'use strict';
 const cfg=window.SOMOS_CONFIG||{};
 if(!window.supabase?.createClient||!cfg.SUPABASE_URL||!cfg.SUPABASE_ANON_KEY)return;
 const db=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let rows=[],open=false,button,panel,indicator;
 function paint(){
   if(!button||!panel)return;
   const unread=rows.filter(r=>!r.read_at).length;
   if(indicator){indicator.hidden=unread===0;indicator.setAttribute('aria-label',unread?`${unread} notificaciones nuevas`:'Sin notificaciones nuevas');}
   button.setAttribute('aria-expanded',String(open));
   panel.hidden=!open;
   panel.innerHTML=`<header><strong>Notificaciones</strong><button type="button" id="ayWelcomeClose" aria-label="Cerrar">×</button></header>${rows.length?rows.map(r=>`<article class="${r.read_at?'':'unread'}"><b>${esc(r.title)}</b><p>${esc(r.message)}</p></article>`).join(''):'<p>No hay notificaciones de bienvenida.</p>'}<footer><a href="customer-profile.html?view=profile&notifications=1">Ver todas las notificaciones</a></footer>`;
   panel.querySelector('#ayWelcomeClose').onclick=()=>{open=false;paint()};
 }
 async function load(){const {data,error}=await db.rpc('get_welcome_notifications',{p_limit:50});if(!error){rows=Array.isArray(data)?data:[];paint()}else console.error('Agenda Ya welcome notifications',error.message)}
 async function toggle(){open=!open;paint();if(open&&rows.some(r=>!r.read_at)){const {error}=await db.rpc('mark_welcome_notifications_read');if(!error)await load()}}
 async function init(){
   const {data}=await db.auth.getUser();if(!data?.user)return;
   button=document.querySelector('#marketNotification');if(!button)return;
   indicator=button.querySelector('b');
   const style=document.createElement('style');style.textContent=`.market-notification .market-bell-emoji{font-size:23px;line-height:1;color:#f3b900}.market-notification b[hidden]{display:none}.ay-welcome-panel{position:fixed;right:12px;top:80px;width:min(360px,calc(100vw - 24px));max-height:70vh;overflow:auto;background:white;border:1px solid #d9e5f6;border-radius:16px;box-shadow:0 12px 40px #19314a33;z-index:100000;padding:12px;color:#18345b}.ay-welcome-panel[hidden]{display:none}.ay-welcome-panel header{display:flex;justify-content:space-between;align-items:center}.ay-welcome-panel header button{border:0;background:transparent;font-size:24px;cursor:pointer}.ay-welcome-panel article{padding:12px 6px;border-bottom:1px solid #e6edf5}.ay-welcome-panel article.unread{background:#f3f8ff}.ay-welcome-panel p{font-size:13px;line-height:1.5}.ay-welcome-panel footer{padding:12px 4px}.ay-welcome-panel footer a{color:#0874e8;font-weight:700;text-decoration:none}`;document.head.appendChild(style);
   panel=document.createElement('section');panel.className='ay-welcome-panel';panel.hidden=true;panel.setAttribute('aria-label','Notificaciones');document.body.appendChild(panel);
   button.addEventListener('click',toggle);document.addEventListener('keydown',e=>{if(e.key==='Escape'){open=false;paint()}});
   await load();setInterval(load,30000);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
