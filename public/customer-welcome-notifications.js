/* Agenda YA 5.0 · Indicador único de notificaciones del explorador cliente.
   Reutiliza #marketNotification creado por explorer.js; no inserta botones adicionales.
   Al pulsarlo, explorer.js abre el centro completo del perfil cliente. */
(()=>{'use strict';
 const cfg=window.SOMOS_CONFIG||{};
 if(!window.supabase?.createClient||!cfg.SUPABASE_URL||!cfg.SUPABASE_ANON_KEY)return;
 const db=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 let button=null,indicator=null,timer=null;
 const style=document.createElement('style');
 style.textContent=`.market-notification{position:relative}.market-notification .market-bell-emoji{display:block;font-size:23px;line-height:1;color:#f3b900}.market-notification b{position:absolute;right:4px;top:4px;width:9px;height:9px;border-radius:50%;background:#e53935;border:1px solid #fff}.market-notification b[hidden]{display:none!important}@media(max-width:700px){.market-notification .market-bell-emoji{font-size:22px}}`;
 document.head.appendChild(style);
 async function hasUnread(){
   const {data:userData}=await db.auth.getUser();
   if(!userData?.user)return false;
   const calls=await Promise.allSettled([
     db.rpc('get_welcome_notifications',{p_limit:50}),
     db.rpc('get_customer_notifications',{p_limit:100}),
     db.rpc('get_app_notifications',{p_limit:50})
   ]);
   return calls.some(result=>{
     if(result.status!=='fulfilled'||result.value?.error)return false;
     const rows=Array.isArray(result.value?.data)?result.value.data:[];
     return rows.some(row=>!row.read_at && !row.is_read);
   });
 }
 async function refresh(){
   button=document.querySelector('#marketNotification');
   if(!button)return;
   indicator=button.querySelector('#marketNotificationIndicator')||button.querySelector('b');
   if(!indicator)return;
   try{const unread=await hasUnread();indicator.hidden=!unread;button.setAttribute('aria-label',unread?'Tienes notificaciones nuevas':'Abrir notificaciones');}
   catch(error){console.warn('Agenda YA: no se pudo actualizar el indicador de notificaciones',error?.message||error);}
 }
 function init(){
   // explorer.js puede renderizar el encabezado después de DOMContentLoaded.
   refresh();
   const host=document.querySelector('#marketAccount');
   if(host){new MutationObserver(()=>refresh()).observe(host,{childList:true,subtree:true});}
   timer=setInterval(refresh,30000);
   document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
