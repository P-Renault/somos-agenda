/* Agenda YA Admin Users Module v1.3 — real data through the protected admin-users Edge Function. */
(()=>{'use strict';
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=v=>v?new Date(v).toLocaleString('es-CL',{dateStyle:'medium',timeStyle:'short'}):'Nunca';
const statusLabel=s=>s==='active'?'Activo':s==='pending'?'Pendiente de confirmar':'Suspendido';
const statusClass=s=>s==='active'?'green':s==='pending'?'orange':'red';
let page=1,perPage=10,query='',profileType='',statusFilter='',selected=null,users=[],loading=false;
async function call(action,extra={}) {
 const c=window.agendaAdminSupabase;
 if(!c) throw new Error(window.__agendaAdminAuthInitError||'Cliente Supabase no disponible.');
 const {data,error}=await c.functions.invoke('admin-users',{body:{action,page,perPage,query,profileType,status:statusFilter,...extra}});
 if(error) {
   let detail=error.message||'Error invocando admin-users';
   try { if(error.context?.json) { const j=await error.context.json(); detail=j.message||j.error||detail; } } catch {}
   throw new Error(detail+' · Verifica que la Edge Function admin-users esté desplegada.');
 }
 if(data?.error) throw new Error(data.message||data.error);
 return data;
}
function toast(msg){const region=$('#toastRegion');if(!region){alert(msg);return}const n=document.createElement('div');n.className='toast';n.textContent=msg;region.appendChild(n);setTimeout(()=>n.remove(),3800)}
function setBanner(connected,msg='Datos reales de Supabase · Módulo Usuarios'){
 const b=$('.demo-banner');if(!b)return;
 b.classList.toggle('users-live-banner',connected);
 b.innerHTML=`<span class="demo-dot"></span><strong>${esc(msg)}</strong><span>${connected?'Usuarios conectados mediante Edge Function protegida.':'Conectando con el motor administrativo…'}</span>`;
}
function heading(){
 return `<div class="page-heading"><div class="heading-title"><span class="heading-icon">♟</span><div><h1>Usuarios</h1><p>Gestión de cuentas registradas en Agenda YA</p></div></div><div class="heading-actions"><button class="btn btn-secondary" id="usersExport">⇩ Exportar CSV</button><button class="btn btn-secondary" id="usersRefresh">↻ Actualizar</button></div></div>`;
}
function render(){
 const content=$('#pageContent');if(!content)return;
 content.innerHTML=`
 ${heading()}
 <div class="users-kpi-grid" aria-label="Indicadores de usuarios">
  <article class="users-kpi users-kpi-blue"><div class="users-kpi-top"><span class="users-kpi-icon">♟</span><span class="users-kpi-tag">SUPABASE</span></div><span class="users-kpi-label">Total de usuarios</span><strong id="usersTotal">—</strong><small>Usuarios registrados en Auth</small><div class="users-kpi-track"><i id="usersTotalBar"></i></div></article>
  <article class="users-kpi users-kpi-green"><div class="users-kpi-top"><span class="users-kpi-icon">✓</span><span class="users-kpi-tag">CONFIRMADOS</span></div><span class="users-kpi-label">Usuarios activos</span><strong id="usersActive">—</strong><small id="usersActiveMeta">Cuentas activas según Supabase</small><div class="users-kpi-track"><i id="usersActiveBar"></i></div></article>
  <article class="users-kpi users-kpi-purple"><div class="users-kpi-top"><span class="users-kpi-icon">▣</span><span class="users-kpi-tag">MEMBRESÍAS</span></div><span class="users-kpi-label">Usuarios de negocios</span><strong id="usersBusiness">—</strong><small id="usersBusinessMeta">Usuarios únicos con membresía</small><div class="users-kpi-track"><i id="usersBusinessBar"></i></div></article>
  <article class="users-kpi users-kpi-amber"><div class="users-kpi-top"><span class="users-kpi-icon">☷</span><span class="users-kpi-tag">VISTA ACTUAL</span></div><span class="users-kpi-label">Resultados consultados</span><strong id="usersPageCount">—</strong><small id="usersPageMeta">En la página actual</small><div class="users-kpi-track"><i id="usersPageBar"></i></div></article>
 </div>
 <div class="panel users-controls">
  <div class="users-search"><span>⌕</span><input id="usersQuery" value="${esc(query)}" placeholder="Buscar nombre, correo, teléfono o ciudad…" aria-label="Buscar usuarios"></div>
  <select id="usersType" aria-label="Tipo de perfil"><option value="">Todos los perfiles</option><option value="customer">Clientes</option><option value="business">Usuarios de negocios</option></select>
  <select id="usersStatus" aria-label="Estado"><option value="">Todos los estados</option><option value="active">Activos</option><option value="pending">Pendientes</option><option value="suspended">Suspendidos</option></select>
  <select id="usersPerPage" aria-label="Filas por página"><option value="10">10 por página</option><option value="20">20 por página</option><option value="50">50 por página</option></select>
 </div>
 <div class="users-layout">
  <div class="panel users-table-panel">
   <div class="panel-heading"><div><h2>Listado de usuarios</h2><small id="usersSummary">Cargando datos reales…</small></div><span class="live-chip">SUPABASE</span></div>
   <div class="users-table-wrap"><table class="users-table"><thead><tr><th>Usuario</th><th>Tipo</th><th>Negocios</th><th>Estado</th><th>Registro</th><th>Último acceso</th><th>Acciones</th></tr></thead><tbody id="usersRows"><tr><td colspan="7" class="users-empty">Consultando Supabase…</td></tr></tbody></table></div>
   <div class="users-pagination"><span id="usersPageLabel">Página 1</span><div><button class="btn btn-secondary" id="usersPrev">← Anterior</button><button class="btn btn-secondary" id="usersNext">Siguiente →</button></div></div>
  </div>
  <aside class="panel users-detail" id="usersDetail"><div class="users-empty">Selecciona un usuario para ver su perfil y sus negocios.</div></aside>
 </div>`;
 bind();load();
}
function bind(){
 $('#usersRefresh').onclick=()=>load();
 $('#usersQuery').addEventListener('keydown',e=>{if(e.key==='Enter'){query=e.target.value.trim();page=1;load()}});
 $('#usersQuery').addEventListener('change',e=>{query=e.target.value.trim();page=1;load()});
 $('#usersType').value=profileType;$('#usersStatus').value=statusFilter;$('#usersPerPage').value=String(perPage);
 $('#usersType').onchange=e=>{profileType=e.target.value;page=1;load()};
 $('#usersStatus').onchange=e=>{statusFilter=e.target.value;page=1;load()};
 $('#usersPerPage').onchange=e=>{perPage=Number(e.target.value)||10;page=1;load()};
 $('#usersPrev').onclick=()=>{if(page>1){page--;load()}};
 $('#usersNext').onclick=()=>{if(users.length===perPage){page++;load()}};
 $('#usersExport').onclick=exportCsv;
}
async function load(){
 if(loading)return;loading=true;setBanner(false);
 const tbody=$('#usersRows');if(tbody)tbody.innerHTML='<tr><td colspan="7" class="users-empty">Cargando usuarios…</td></tr>';
 try{
  const d=await call('list');
  users=d.users||[];
  $('#usersTotal').textContent=Number(d.totalUsers||0).toLocaleString('es-CL');
  $('#usersBusiness').textContent=Number(d.businessUsers||0).toLocaleString('es-CL');
  $('#usersActive').textContent=Number(d.activeUsers||0).toLocaleString('es-CL');
  $('#usersPageCount').textContent=users.length.toLocaleString('es-CL');
  const total=Number(d.totalUsers||0),active=Number(d.activeUsers||0),business=Number(d.businessUsers||0);
  const pct=(n,base)=>base>0?Math.max(0,Math.min(100,n/base*100)):0;
  $('#usersTotalBar').style.width=(total?100:0)+'%';
  $('#usersActiveBar').style.width=pct(active,total)+'%';
  $('#usersBusinessBar').style.width=pct(business,total)+'%';
  $('#usersPageBar').style.width=pct(users.length,perPage)+'%';
  $('#usersActiveMeta').textContent=`${pct(active,total).toLocaleString('es-CL',{maximumFractionDigits:1})}% del total`;
  $('#usersBusinessMeta').textContent=`${pct(business,total).toLocaleString('es-CL',{maximumFractionDigits:1})}% del total`;
  $('#usersPageMeta').textContent=`Página ${page} · ${perPage} por página`;
  $('#usersSummary').textContent=`Mostrando ${users.length} de ${Number(d.totalFiltered||0).toLocaleString('es-CL')} usuarios filtrados.`;
  $('#usersPageLabel').textContent=`Página ${page} de ${Number(d.pageCount||1)}`;
  $('#usersPrev').disabled=page<=1;$('#usersNext').disabled=page>=Number(d.pageCount||1);
  if(!users.length){tbody.innerHTML='<tr><td colspan="7" class="users-empty">No se encontraron usuarios en esta página con esos filtros.</td></tr>'}
  else tbody.innerHTML=users.map(u=>`<tr data-user-id="${esc(u.id)}" class="${selected?.id===u.id?'selected':''}">
   <td><div class="user-cell"><div class="user-avatar">${u.avatar_url?`<img src="${esc(u.avatar_url)}" alt="">`:esc((u.full_name||u.email||'U').trim().slice(0,1).toUpperCase())}</div><div><strong>${esc(u.full_name||'Sin nombre')}</strong><small>${esc(u.email)}</small></div></div></td>
   <td><span class="type-chip">${u.profile_type==='business'?'Negocio':'Cliente'}</span></td>
   <td>${Number(u.business_count||0)}</td><td><span class="status-chip ${statusClass(u.status)}">${statusLabel(u.status)}</span></td>
   <td>${esc(date(u.created_at))}</td><td>${esc(date(u.last_sign_in_at))}</td>
   <td><div class="user-row-actions"><button class="btn btn-small btn-secondary" data-user-action="detail" data-id="${esc(u.id)}">Ver</button><button class="btn btn-small btn-secondary" data-user-action="edit" data-id="${esc(u.id)}">Editar</button><button class="btn btn-small ${u.status==='suspended'?'btn-primary':'btn-danger'}" data-user-action="status" data-id="${esc(u.id)}" data-status="${u.status==='suspended'?'active':'suspended'}">${u.status==='suspended'?'Reactivar':'Suspender'}</button></div></td>
  </tr>`).join('');
  setBanner(true);
  tbody.querySelectorAll('tr[data-user-id]').forEach(tr=>tr.addEventListener('click',e=>{if(e.target.closest('button'))return;const u=users.find(x=>x.id===tr.dataset.userId);if(u)showDetail(u)}));
  tbody.querySelectorAll('[data-user-action]').forEach(b=>b.addEventListener('click',async e=>{e.stopPropagation();const u=users.find(x=>x.id===b.dataset.id);if(!u)return;const act=b.dataset.userAction;if(act==='detail')showDetail(u);if(act==='edit')editUser(u);if(act==='status')changeStatus(u,b.dataset.status)}));
  if(selected){const fresh=users.find(u=>u.id===selected.id);if(fresh)showDetail(fresh)}
 }catch(e){
  setBanner(false,'No se pudo conectar el módulo Usuarios');
  tbody.innerHTML=`<tr><td colspan="7" class="users-empty users-error">${esc(e.message)}<br><small>Confirma que desplegaste supabase/functions/admin-users y que el secreto de servicio está configurado solo en Supabase.</small></td></tr>`;
  $('#usersSummary').textContent='Error de integración';
  $('#usersActive').textContent='—';$('#usersBusiness').textContent='—';$('#usersPageCount').textContent='—';$('#usersTotal').textContent='—';
 }finally{loading=false}
}
function showDetail(u){
 selected=u;
 const detail=$('#usersDetail');if(!detail)return;
 detail.innerHTML=`<div class="users-detail-head"><div class="user-avatar user-avatar-large">${u.avatar_url?`<img src="${esc(u.avatar_url)}" alt="">`:esc((u.full_name||u.email||'U').trim().slice(0,1).toUpperCase())}</div><div><h2>${esc(u.full_name||'Sin nombre')}</h2><p>${esc(u.email)}</p><span class="status-chip ${statusClass(u.status)}">${statusLabel(u.status)}</span></div></div>
 <div class="users-detail-actions"><button class="btn btn-primary" data-detail-action="edit">✎ Editar perfil</button><button class="btn btn-secondary" data-detail-action="csv">⇩ Exportar ficha</button></div>
 <h3>Información de cuenta</h3><dl class="users-dl">
 <dt>UUID</dt><dd><code>${esc(u.id)}</code></dd><dt>Tipo de perfil</dt><dd>${u.profile_type==='business'?'Usuario de negocio':'Cliente'}</dd><dt>Teléfono</dt><dd>${esc(u.phone||'No informado')}</dd><dt>Ciudad</dt><dd>${esc([u.comuna,u.city].filter(Boolean).join(', ')||'No informada')}</dd><dt>Correo confirmado</dt><dd>${u.email_confirmed_at?'Sí':'No'}</dd><dt>Fecha de registro</dt><dd>${esc(date(u.created_at))}</dd><dt>Último acceso</dt><dd>${esc(date(u.last_sign_in_at))}</dd></dl>
 <h3>Negocios asociados (${(u.businesses||[]).length})</h3>
 ${(u.businesses||[]).length?`<div class="user-business-list">${u.businesses.map(b=>`<div><strong>${esc(b.name||'Negocio')}</strong><small>${esc(b.role||'miembro')} · ${b.active===false?'Inactivo':'Activo'}</small>${b.slug?`<a href="../negocio/${encodeURIComponent(b.slug)}" target="_blank" rel="noopener">Abrir perfil ↗</a>`:''}</div>`).join('')}</div>`:'<p class="users-muted">No hay negocios activos asociados en la página consultada.</p>'}
 <p class="users-muted">Las acciones administrativas se registran en audit_logs cuando la tabla lo permite.</p>`;
 detail.querySelector('[data-detail-action="edit"]').onclick=()=>editUser(u);
 detail.querySelector('[data-detail-action="csv"]').onclick=()=>downloadCsv([u],`agenda-ya-usuario-${u.id.slice(0,8)}.csv`);
}
async function editUser(u){
 const full_name=prompt('Nombre completo:',u.full_name||'');if(full_name===null)return;
 const phone=prompt('Teléfono:',u.phone||'');if(phone===null)return;
 const city=prompt('Ciudad:',u.city||'');if(city===null)return;
 const comuna=prompt('Comuna:',u.comuna||'');if(comuna===null)return;
 try{await call('update_profile',{userId:u.id,full_name,phone,city,comuna});toast('Perfil actualizado.');await load()}catch(e){toast('No se pudo actualizar: '+e.message)}
}
async function changeStatus(u,status){
 if(status==='suspended'&&!confirm(`¿Suspender la cuenta ${u.email}? El usuario no podrá iniciar sesión mientras esté suspendido.`))return;
 if(status==='active'&&!confirm(`¿Reactivar la cuenta ${u.email}?`))return;
 try{await call('set_status',{userId:u.id,status});toast(status==='active'?'Cuenta reactivada.':'Cuenta suspendida.');await load()}catch(e){toast('No se pudo cambiar el estado: '+e.message)}
}
function downloadCsv(rows,name){
 const cols=['id','email','full_name','profile_type','phone','city','comuna','status','created_at','last_sign_in_at','business_count'];
 const quote=v=>`"${String(v??'').replace(/"/g,'""')}"`;
 const csv=[cols.join(','),...rows.map(u=>cols.map(k=>quote(k==='business_count'?(u.business_count??(u.businesses||[]).length):u[k])).join(','))].join('\r\n');
 const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
}
function exportCsv(){if(!users.length){toast('No hay usuarios para exportar en esta página.');return}downloadCsv(users,`agenda-ya-usuarios-pagina-${page}.csv`)}
window.addEventListener('hashchange',()=>{if(location.hash==='#users')render()});
if(location.hash==='#users')render();
})();
