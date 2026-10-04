const {createClient}=supabase;
const cfg=window.SOMOS_CONFIG||{};
const client=createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY);
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const slug=new URLSearchParams(location.search).get('slug');
const dayNames={1:'Lunes',2:'Martes',3:'Miércoles',4:'Jueves',5:'Viernes',6:'Sábado',7:'Domingo'};
function money(v){return Number(v||0).toLocaleString('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0})}
async function init(){
 if(!slug){$('status').textContent='Perfil no especificado.';return}
 const r=await client.rpc('get_public_business_profile',{p_slug:slug});
 if(r.error){$('status').textContent=r.error.message==='BUSINESS_NOT_FOUND'?'Negocio no encontrado.':'Este perfil no está publicado.';return}
 const x=r.data;
 $('status').classList.add('hidden'); $('profile').classList.remove('hidden');
 $('name').textContent=x.business.name;
 $('category').textContent=x.category?.name||'Servicio';
 $('description').textContent=x.profile.description||'Información del negocio.';
 const loc=[x.profile.address,x.profile.comuna,x.profile.city].filter(Boolean).join(' · ');
 $('location').textContent=loc||'';
 $('services').innerHTML=x.services.length?x.services.map(s=>`<article class="item"><strong>${esc(s.name)}</strong><span>${esc(s.duration_minutes)} min · ${money(s.price)}</span>${s.description?`<p>${esc(s.description)}</p>`:''}</article>`).join(''):'<p>No hay servicios publicados.</p>';
 $('professionals').innerHTML=x.professionals.length?x.professionals.map(p=>`<article class="item"><strong>${esc(p.first_name+' '+p.last_name)}</strong>${p.bio?`<p>${esc(p.bio)}</p>`:''}</article>`).join(''):'<p>No hay profesionales publicados.</p>';
 const grouped={}; for(const s of x.schedules){(grouped[s.day_of_week]??=[]).push(s)}
 $('schedules').innerHTML=Object.keys(grouped).sort((a,b)=>a-b).map(d=>`<article class="item"><strong>${dayNames[d]}</strong><span>${grouped[d].map(s=>`${String(s.start_time).slice(0,5)}–${String(s.end_time).slice(0,5)}`).join(' · ')}</span></article>`).join('')||'<p>Consulta disponibilidad al reservar.</p>';
 $('book').href=`public-booking.html?slug=${encodeURIComponent(x.business.slug)}`;
}
init();
