/* Fail-closed gate: the dashboard remains hidden until Supabase confirms an active platform admin. */
(()=>{'use strict';document.documentElement.classList.add('admin-auth-pending');
const loginUrl='login.html';const client=()=>window.agendaAdminSupabase;
function deny(){location.replace(loginUrl)}
async function run(){const c=client();if(!c||window.__agendaAdminAuthInitError){deny();return}try{const {data,error}=await c.auth.getSession();if(error||!data.session?.user){deny();return}const {data:admin,error:adminError}=await c.from('platform_admins').select('role,is_active').eq('user_id',data.session.user.id).maybeSingle();if(adminError||!admin||admin.is_active!==true){await c.auth.signOut();deny();return}
 const email=data.session.user.email||'Administrador';document.querySelectorAll('.top-user strong').forEach(el=>el.textContent=email);document.querySelectorAll('.profile-text strong').forEach(el=>el.textContent=email);document.querySelectorAll('.profile-text small').forEach(el=>el.textContent=admin.role==='super_admin'?'Administrador principal':'Administrador');document.querySelectorAll('.avatar-admin').forEach(el=>el.textContent=(email.split('@')[0].split(/[._-]/).filter(Boolean).slice(0,2).map(x=>x[0]).join('')||'AD').toUpperCase());
 document.querySelectorAll('.logout-link').forEach(el=>el.addEventListener('click',async e=>{e.preventDefault();el.style.pointerEvents='none';try{await c.auth.signOut()}finally{location.replace(loginUrl)}}));document.documentElement.classList.remove('admin-auth-pending');
 }catch(_){deny()}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
})();
