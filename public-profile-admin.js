const {createClient}=supabase;
const cfg=window.SOMOS_CONFIG||{};
const client=createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY);
const $=id=>document.getElementById(id);
let user=null,business=null;
function msg(t){$('status').textContent=t||''}
async function init(){
  const {data}=await client.auth.getSession();
  user=data.session?.user;
  if(!user){msg('Debes iniciar sesión en Agenda Ya.');return}
  const {data:members,error}=await client.from('business_members').select('business_id,role').eq('user_id',user.id).order('role');
  if(error||!members?.length){msg(error?.message||'No tienes un negocio asociado.');return}
  const admin=members.find(x=>['owner','admin'].includes(x.role));
  if(!admin){msg('Se requiere rol propietario o administrador.');return}
  const b=await client.from('businesses').select('*').eq('id',admin.business_id).maybeSingle();
  if(b.error||!b.data){msg(b.error?.message||'Negocio no encontrado.');return}
  business=b.data;
  $('displayName').value=business.name||'';
  $('phone').value=business.phone||'';
  $('previewLink').href=`public-profile.html?slug=${encodeURIComponent(business.slug)}`;
  const cats=await client.from('business_categories').select('id,name').eq('active',true).order('name');
  if(cats.error){msg(cats.error.message);return}
  $('categoryId').innerHTML='<option value="">Selecciona una categoría</option>'+cats.data.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
  const p=await client.from('business_public_profiles').select('*').eq('business_id',business.id).maybeSingle();
  if(p.data){
    for(const [id,key] of [['displayName','display_name'],['description','description'],['address','address'],['comuna','comuna'],['city','city'],['phone','phone'],['whatsapp','whatsapp']])$(id).value=p.data[key]||'';
    $('categoryId').value=p.data.category_id||'';
    $('publicEnabled').checked=!!p.data.public_enabled;
  }
}
$('profileForm').onsubmit=async e=>{
 e.preventDefault(); if(!business)return;
 msg('Guardando...');
 const p={
  p_business_id:business.id,p_display_name:$('displayName').value,p_description:$('description').value,
  p_category_id:$('categoryId').value||null,p_address:$('address').value,p_comuna:$('comuna').value,
  p_city:$('city').value,p_phone:$('phone').value,p_whatsapp:$('whatsapp').value,p_public_enabled:$('publicEnabled').checked
 };
 const r=await client.rpc('upsert_public_profile',p);
 if(r.error){msg(r.error.message);return}
 msg('Perfil público guardado correctamente.');
 $('previewLink').href=`public-profile.html?slug=${encodeURIComponent(business.slug)}`;
};
init();
