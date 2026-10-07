const {createClient}=supabase;
const cfg=window.SOMOS_CONFIG||{};
const client=createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY);
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

async function sessionRole(){
  const session=await client.auth.getSession();
  const user=session.data.session?.user;
  const account=$('marketAccount');
  if(!user){account.innerHTML='<a href="index.html">Iniciar sesión</a>';return;}
  const p=await client.from('profiles').select('profile_type,full_name,avatar_url').eq('id',user.id).maybeSingle();
  const role=p.data?.profile_type;
  if(role==='customer'){
    const label=esc(p.data?.full_name||'Mi perfil');
    account.innerHTML=`<a class="market-profile-link" href="profile.html">${label}</a>`;
  }else if(role==='business'){
    account.innerHTML='<a class="market-profile-link" href="index.html">Mi negocio</a>';
  }else{
    account.innerHTML='<a href="index.html">Completar perfil</a>';
  }
}
async function categories(){
 const r=await client.from('business_categories').select('slug,name').eq('active',true).order('name');
 if(r.data)$('category').innerHTML='<option value="">Todas las categorías</option>'+r.data.map(c=>`<option value="${esc(c.slug)}">${esc(c.name)}</option>`).join('');
}
async function search(){
 $('resultStatus').textContent='Buscando...';
 const r=await client.rpc('search_public_businesses',{p_query:$('query').value,p_category_slug:$('category').value,p_city:$('city').value,p_limit:24,p_offset:0});
 if(r.error){$('resultStatus').textContent=r.error.message;return}
 const items=r.data?.items||[];
 $('resultStatus').textContent=`${r.data?.total||0} resultado(s)`;
 $('results').innerHTML=items.length?items.map(x=>`<article class="result card"><div class="result-copy"><p class="eyebrow">${esc(x.category_name||'Servicio')}</p><h2>${esc(x.name)}</h2><p>${esc(x.description||'')}</p><p class="meta">${esc([x.comuna,x.city].filter(Boolean).join(' · '))}</p><p class="meta">${x.service_count} servicio(s) · ${x.professional_count} profesional(es)</p></div><a class="button" href="public-profile.html?slug=${encodeURIComponent(x.slug)}">Ver perfil</a></article>`).join(''):'<div class="card empty-result"><h2>No encontramos resultados.</h2><p>Prueba con otra categoría, ciudad o término.</p></div>';
}
$('searchForm').onsubmit=e=>{e.preventDefault();search()};
Promise.all([sessionRole(),categories()]).then(search);
