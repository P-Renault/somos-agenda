/* Agenda YA - indicador de bienvenida integrado en la campana única del header cliente. */
(()=>{'use strict';
 const cfg=window.SOMOS_CONFIG||{};if(!window.supabase?.createClient||!cfg.SUPABASE_URL||!cfg.SUPABASE_ANON_KEY)return;
 const db=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 let button,badge;
 function paint(rows){if(!button)return;const unread=rows.filter(r=>!r.read_at).length;button.classList.toggle('has-new-notification',unread>0);button.setAttribute('aria-label',unread?`Notificaciones, ${unread} sin leer`:'Notificaciones');if(badge){badge.hidden=unread===0;badge.title=unread?`${unread} notificaciones sin leer`:'';}}
 async function load(){if(!button)return;try{const {data,error}=await db.rpc('get_welcome_notifications',{p_limit:50});if(!error)paint(Array.isArray(data)?data:[]);else console.warn('Agenda YA welcome notifications',error.message);}catch(e){console.warn('Agenda YA welcome notifications',e?.message||e);}}
 async function init(){const {data}=await db.auth.getUser();if(!data?.user)return;button=document.querySelector('#marketNotification');if(!button)return;badge=button.querySelector('b');if(badge)badge.hidden=true;await load();setInterval(load,30000);}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
