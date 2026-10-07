const {createClient}=supabase;
const cfg=window.SOMOS_CONFIG||{};
const client=createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY);
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
let user=null,role=null,business=null;
function initials(name,email=''){const a=String(name||'').trim().split(/\s+/).filter(Boolean);return (a.length?a.slice(0,2).map(x=>x[0]).join(''):email.slice(0,2)).toUpperCase()||'AY'}
function phone(v){return String(v||'').replace(/^\+56\s*9\s*/,'').replace(/\D/g,'').replace(/^9(?=\d{8}$)/,'').slice(0,8)}
async function load(){
 const s=await client.auth.getSession(); user=s.data.session?.user;
 if(!user){location.href='index.html';return}
 const p=await client.from('profiles').select('profile_type,full_name,phone,address,age,city,comuna,avatar_url').eq('id',user.id).maybeSingle();
 role=p.data?.profile_type||null;
 if(!role){location.href='index.html';return}
 if(role==='business'){
   const m=await client.from('business_members').select('business_id,active').eq('user_id',user.id).eq('active',true).limit(1).maybeSingle();
   if(m.data?.business_id){const b=await client.from('businesses').select('id,name,business_type,phone,address,city,comuna,logo_url').eq('id',m.data.business_id).maybeSingle();business=b.data||null;}
 }
 render(p.data||{});
}
function render(p){
 const name=role==='business'?(business?.name||p.full_name||user.email):(p.full_name||user.email);
 $('profileIntro').textContent=role==='business'?'Administra la información de tu negocio y tu cuenta.':'Administra tu información para reservar de forma más rápida.';
 $('profileAvatar').textContent=initials(name,user.email);const image=role==='business'?(business?.logo_url||p.avatar_url):p.avatar_url;if(image){$('profileAvatar').style.backgroundImage=`url(${encodeURI(image)})`;$('profileAvatar').classList.add('has-image')}
  if(role==='business'){
  $('profileFields').innerHTML=`<div class="profile-fields"><label>Nombre del negocio<input id="name" value="${esc(business?.name||'')}" maxlength="120"></label><label>Tipo de servicio<input id="type" value="${esc(business?.business_type||'')}" maxlength="100"></label><div class="profile-grid"><label>Teléfono<input id="phone" inputmode="numeric" maxlength="8" value="${phone(business?.phone||p.phone)}"></label><label>Ciudad<input id="city" value="${esc(business?.city||p.city||'')}" maxlength="80"></label><label>Comuna<input id="comuna" value="${esc(business?.comuna||p.comuna||'')}" maxlength="80"></label><label>Dirección<input id="address" value="${esc(business?.address||p.address||'')}" maxlength="160"></label></div></div><p class="profile-note">Tu plan, límites y suscripción se gestionarán posteriormente desde Configuración. Esta versión no fija precios ni restricciones comerciales.</p>`;
 }else{
  $('profileFields').innerHTML=`<div class="profile-fields"><label>Nombre<input id="name" value="${esc(p.full_name||user.user_metadata?.full_name||'')}" maxlength="120"></label><div class="profile-grid"><label>Teléfono<input id="phone" inputmode="numeric" maxlength="8" value="${phone(p.phone)}"></label><label>Edad<input id="age" type="number" min="13" max="120" value="${p.age||''}"></label><label>Ciudad<input id="city" value="${esc(p.city||'')}" maxlength="80"></label><label>Comuna<input id="comuna" value="${esc(p.comuna||'')}" maxlength="80"></label><label>Dirección<input id="address" value="${esc(p.address||'')}" maxlength="160"></label></div></div><p class="profile-note">Como cliente, tu navegación principal es el marketplace. No se muestra “Mi negocio” porque esta cuenta está configurada como cliente.</p>`;
 }
 document.querySelectorAll('input[inputmode="numeric"]').forEach(i=>i.addEventListener('input',()=>i.value=i.value.replace(/\D/g,'').slice(0,8)));
}
$('saveProfile').onclick=async()=>{
 $('profileStatus').textContent='Guardando…';
 try{
  const fullPhone=$('phone').value?`+56 9 ${$('phone').value}`:null;
  if(role==='business'){
   const name=$('name').value.trim(),type=$('type').value.trim(),city=$('city').value.trim(),comuna=$('comuna').value.trim(),address=$('address').value.trim();
   if(!name||!type||!city||!comuna||!address)throw Error('Completa todos los campos principales.');
   if(!business?.id)throw Error('No se encontró el negocio.');
   const b=await client.from('businesses').update({name,business_type:type,phone:fullPhone,city,comuna,address,updated_at:new Date().toISOString()}).eq('id',business.id);if(b.error)throw b.error;
   const p=await client.from('profiles').upsert({id:user.id,profile_type:'business',full_name:name,phone:fullPhone,city,comuna,address,updated_at:new Date().toISOString()},{onConflict:'id'});if(p.error)throw p.error;
  }else{
   const name=$('name').value.trim(),city=$('city').value.trim(),comuna=$('comuna').value.trim(),address=$('address').value.trim(),age=$('age').value?Number($('age').value):null;
   if(!name||!city||!comuna||!address)throw Error('Completa todos los campos principales.');
   const p=await client.from('profiles').upsert({id:user.id,profile_type:'customer',full_name:name,phone:fullPhone,age,city,comuna,address,updated_at:new Date().toISOString()},{onConflict:'id'});if(p.error)throw p.error;
  }
  $('profileStatus').textContent='Perfil actualizado correctamente.';await load();
 }catch(e){$('profileStatus').textContent=e.message||'No fue posible guardar el perfil.'}
};
$('profileHeaderLogout').onclick=async()=>{await client.auth.signOut();location.href='index.html'};
load().catch(e=>{ $('profileStatus').textContent=e.message||'No fue posible cargar el perfil.'; });
