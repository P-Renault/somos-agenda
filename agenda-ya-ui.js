/* AGENDA YA · FRAMEWORK VISUAL CORRECTO V1.4
   Capa visual del dashboard. NO toca autenticación, Supabase ni CRUD.
*/
(function(){
  'use strict';
  const $=s=>document.querySelector(s);
  const nav=[
    ['dashboardView','Dashboard'],['servicesSection','Servicios'],['professionalsSection','Profesionales'],
    ['schedulesSection','Horarios'],['availabilitySection','Disponibilidad'],['clientsSection','Clientes'],
    ['bookingsSection','Reservas'],['calendarSection','Calendario']
  ];
  let ready=false;
  function visible(e){return !!e&&!e.classList.contains('hidden')}
  function setActive(id){document.querySelectorAll('[data-ay-nav]').forEach(x=>x.classList.toggle('is-active',x.dataset.ayNav===id));}
  function activate(id,scroll=true){
    const dash=$('#dashboardView'); if(!visible(dash))return;
    const core=$('#ayDashboardCore'); const sections=nav.slice(1).map(x=>$('#'+x[0])).filter(Boolean);
    if(id==='dashboardView'){
      if(core)core.hidden=false; sections.forEach(s=>s.hidden=true);
      if(scroll)window.scrollTo({top:0,behavior:'smooth'});
    }else{
      if(core)core.hidden=true; sections.forEach(s=>s.hidden=s.id!==id);
      const a=$('#'+id); if(a&&scroll)a.scrollIntoView({behavior:'smooth',block:'start'});
    }
    setActive(id); document.body.classList.remove('ay-menu-open');
  }
  function makeNav(){
    const n=document.createElement('nav'); n.className='ay-topnav';
    nav.forEach(([id,label])=>{const b=document.createElement('button');b.type='button';b.dataset.ayNav=id;b.textContent=label;b.onclick=()=>activate(id);n.appendChild(b)});
    return n;
  }
  function build(){
    const dash=$('#dashboardView'); if(!visible(dash)||ready)return; ready=true;
    const top=dash.querySelector('.topbar'), hero=dash.querySelector('.hero'), grid=dash.querySelector('.grid');
    if(hero&&grid&&!$('#ayDashboardCore')){
      const core=document.createElement('div');core.id='ayDashboardCore';core.className='ay-dashboard-core';
      hero.parentNode.insertBefore(core,hero);core.append(hero,grid);
    }
    if(top){
      top.classList.add('ay-topbar');
      const logout=$('#logoutBtn');
      top.innerHTML='';
      const brand=document.createElement('div');brand.className='ay-brand';
      brand.innerHTML='<button class="ay-menu-btn" type="button" aria-label="Menú">☰</button><img src="agenda-ya-logo-header.jpg" class="ay-logo-img" alt="Agenda Ya">';
      top.append(brand,makeNav());
      const account=document.createElement('div');account.className='ay-account';account.innerHTML='<span class="ay-avatar">PR</span><span class="ay-account-copy"><strong>Mi negocio</strong><small>Cuenta</small></span>';
      if(logout){logout.classList.add('ay-logout');account.append(logout)}top.append(account);
      const menu=document.createElement('aside');menu.className='ay-mobile-menu';menu.innerHTML='<div class="ay-mobile-menu-head"><strong>Agenda Ya</strong><button type="button" data-close>×</button></div>';
      nav.forEach(([id,label])=>{const b=document.createElement('button');b.type='button';b.dataset.ayNav=id;b.textContent=label;b.onclick=()=>activate(id);menu.append(b)});
      top.parentNode.insertBefore(menu,top.nextSibling);brand.querySelector('.ay-menu-btn').onclick=()=>document.body.classList.toggle('ay-menu-open');menu.querySelector('[data-close]').onclick=()=>document.body.classList.remove('ay-menu-open');
    }
    const side=document.createElement('aside');side.className='ay-sidebar';side.innerHTML='<div class="ay-sidebar-title">GESTIÓN</div>';
    const icons=['⌂','✂','♙','◷','▣','♧','▤','▦'];
    nav.forEach(([id,label],i)=>{const b=document.createElement('button');b.type='button';b.dataset.ayNav=id;b.innerHTML='<span>'+icons[i]+'</span>'+label;b.onclick=()=>activate(id);side.append(b)});
    const workspace=document.createElement('div');workspace.className='ay-workspace';
    while(dash.firstChild)workspace.appendChild(dash.firstChild);
    dash.append(side,workspace);
    const rail=document.createElement('nav');rail.className='ay-mobile-rail';
    nav.slice(0,5).forEach(([id,label],i)=>{const b=document.createElement('button');b.type='button';b.dataset.ayNav=id;b.innerHTML='<span>'+icons[i]+'</span><small>'+label+'</small>';b.onclick=()=>activate(id);rail.append(b)});
    dash.append(rail);
    decorateDashboard(); activate('dashboardView',false);
  }
  function decorateDashboard(){
    const core=$('#ayDashboardCore'); if(!core)return;
    const hero=core.querySelector('.hero');
    if(hero&&!hero.querySelector('.ay-hero-actions')){
      const actions=document.createElement('div');actions.className='ay-hero-actions';
      actions.innerHTML='<button type="button" class="ay-primary" data-go="bookingsSection">+ Nueva reserva</button><button type="button" class="ay-secondary" data-go="calendarSection">▦ Ver calendario</button>';
      actions.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>activate(b.dataset.go));hero.append(actions);
    }
    if(!core.querySelector('.ay-dashboard-panels')){
      const panels=document.createElement('div');panels.className='ay-dashboard-panels';
      panels.innerHTML='<article class="ay-panel"><div class="ay-panel-head"><strong>Próximas reservas</strong><button type="button" data-go="bookingsSection">Ver todas →</button></div><div id="ayUpcoming">Carga tus reservas para verlas aquí.</div></article><article class="ay-panel"><div class="ay-panel-head"><strong>Calendario de hoy</strong><button type="button" data-go="calendarSection">Abrir →</button></div><div id="ayToday">Consulta el calendario para ver tu agenda.</div></article>';
      panels.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>activate(b.dataset.go));core.append(panels);
      const links=document.createElement('div');links.className='ay-quick-grid';
      [['servicesSection','Gestiona tus servicios'],['professionalsSection','Administra profesionales'],['schedulesSection','Configura horarios'],['availabilitySection','Revisa disponibilidad']].forEach(([id,t])=>{const a=document.createElement('button');a.type='button';a.innerHTML='<strong>'+t+'</strong><small>Ir a →</small>';a.onclick=()=>activate(id);links.append(a)});
      core.append(links);
    }
    syncDashboard();
  }
  function syncDashboard(){
    const core=$('#ayDashboardCore');if(!core)return;
    const cards=core.querySelectorAll('.grid .card');
    const counts=[['Reservas hoy',document.querySelectorAll('#bookingsList .module-card').length],['Clientes',document.querySelectorAll('#clientsList .module-card').length],['Servicios',document.querySelectorAll('#servicesList .module-card').length],['Profesionales',document.querySelectorAll('#professionalsList .module-card').length]];
    if(cards.length>=3){cards.forEach((c,i)=>{if(counts[i]){c.querySelector('.metric-label').textContent=counts[i][0];c.querySelector('strong').textContent=counts[i][1];c.querySelector('p').textContent=i===0?'Reservas registradas':i===1?'Clientes registrados':'Activos'}})}
    const up=$('#ayUpcoming'), list=document.querySelectorAll('#bookingsList .module-card'); if(up&&list.length){up.innerHTML=Array.from(list).slice(0,4).map(c=>{const h=c.cloneNode(true);h.querySelectorAll('button').forEach(x=>x.remove());return '<div class="ay-booking-row">'+h.innerHTML+'</div>'}).join('')}
  }
  const obs=new MutationObserver(()=>{if(visible($('#dashboardView'))){build();syncDashboard()}});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{obs.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});build()});else{obs.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});build()}
  window.AgendaYaUI={activate,build,syncDashboard};
})();
