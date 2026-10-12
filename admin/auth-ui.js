(()=>{'use strict';
const $=id=>document.getElementById(id);let busy=false;
const client=()=>window.agendaAdminSupabase;
function message(text,kind=''){const el=$('authMessage');if(!el)return;el.textContent=text||'';el.className='auth-message'+(kind?' '+kind:'');}
function setBusy(v){busy=v;$('authSubmit').disabled=v;$('authSubmit').textContent=v?'Procesando…':'Iniciar sesión →';}
async function requireAdmin(user){
 const c=client();if(!c)throw new Error(window.__agendaAdminAuthInitError||'Supabase Auth no está disponible.');
 const {data,error}=await c.from('platform_admins').select('role,is_active').eq('user_id',user.id).maybeSingle();
 if(error){if(error.code==='42P01'||/platform_admins/i.test(error.message||''))throw new Error('Falta instalar la migración de seguridad del panel (platform_admins).');throw new Error('No se pudo verificar el permiso administrativo. Revisa la migración y las políticas RLS.');}
 return !!data&&data.is_active===true;
}
async function routeIfAdmin(user){const ok=await requireAdmin(user);if(ok){location.replace('index.html');return true;}return false;}
$('togglePassword').addEventListener('click',()=>{$('authPassword').type=$('authPassword').type==='password'?'text':'password'});
$('forgotPassword').addEventListener('click',async()=>{
 const c=client(),email=$('authEmail').value.trim();
 if(!c){message(window.__agendaAdminAuthInitError||'No se pudo inicializar Supabase.','error');return}
 if(!email){message('Escribe tu correo electrónico y vuelve a seleccionar recuperación.','error');$('authEmail').focus();return}
 setBusy(true);
 try{const redirectTo=new URL('login.html',location.href).href;const {error}=await c.auth.resetPasswordForEmail(email,{redirectTo});if(error)throw error;message('Si el correo corresponde a una cuenta registrada, recibirás instrucciones para recuperar el acceso.','success');}
 catch(e){message(e.message||'No se pudo solicitar la recuperación.','error')}finally{setBusy(false)}
});
$('authForm').addEventListener('submit',async e=>{
 e.preventDefault();if(busy)return;
 const c=client(),email=$('authEmail').value.trim().toLowerCase(),password=$('authPassword').value;
 if(!c){message(window.__agendaAdminAuthInitError||'No se pudo inicializar Supabase.','error');return}
 if(!email||!password){message('Completa el correo y la contraseña.','error');return}
 setBusy(true);
 try{
   const {data,error}=await c.auth.signInWithPassword({email,password});if(error)throw error;if(!data.user)throw new Error('No se pudo verificar la sesión.');
   let allowed=false;try{allowed=await requireAdmin(data.user)}catch(err){await c.auth.signOut();throw err}
   if(!allowed){await c.auth.signOut();throw new Error('La cuenta no está autorizada para administrar Agenda YA.');}
   location.replace('index.html');
 }catch(e){message((e&&e.message)||'No se pudo completar la operación.','error')}finally{setBusy(false)}
});
(async()=>{
 document.documentElement.classList.remove('admin-auth-pending');const c=client();
 if(!c){message(window.__agendaAdminAuthInitError||'No se pudo inicializar Supabase.','error');return}
 try{const {data,error}=await c.auth.getSession();if(error)throw error;if(data.session?.user){const allowed=await routeIfAdmin(data.session.user);if(!allowed)await c.auth.signOut();}}
 catch(e){message(e.message||'No se pudo verificar la sesión actual.','error')}
})();
})();
