const {createClient}=supabase;
const cfg=window.SOMOS_CONFIG||{};
const client=createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY);
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
async function categories(){
 const r=await client.from('business_categories').select('slug,name').eq('active',true).order('name');
 if(r.data)$('category').innerHTML='<option value="">Todas las categorías</option>'+r.data.map(c=>`<option value="${c.slug}">${c.name}</option>`).join('');
}
async function search(){
 $('resultStatus').textContent='Buscando...';
 const r=await client.rpc('search_public_businesses',{p_query:$('query').value,p_category_slug:$('category').value,p_city:$('city').value,p_limit:24,p_offset:0});
 if(r.error){$('resultStatus').textContent=r.error.message;return}
 const items=r.data?.items||[];
 $('resultStatus').textContent=`${r.data?.total||0} resultado(s)`;
 $('results').innerHTML=items.length?items.map(x=>`<article class="result card"><div><p class="eyebrow">${esc(x.category_name||'Servicio')}</p><h2>${esc(x.name)}</h2><p>${esc(x.description||'')}</p><p class="meta">${esc([x.comuna,x.city].filter(Boolean).join(' · '))}</p><p class="meta">${x.service_count} servicio(s) · ${x.professional_count} profesional(es)</p></div><a class="button" href="public-profile.html?slug=${encodeURIComponent(x.slug)}">Ver perfil</a></article>`).join(''):'<div class="card"><h2>No encontramos resultados.</h2><p>Prueba con otra categoría, ciudad o término.</p></div>';
}
$('searchForm').onsubmit=e=>{e.preventDefault();search()};
categories().then(search);
