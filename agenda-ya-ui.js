/* AGENDA YA · UI INTEGRATION V1.1
   Capa visual/adaptativa. No reemplaza auth, Supabase ni la lógica CRUD de app.js. */
(function(){
  'use strict';
  const $ = s => document.querySelector(s);
  const nav = [
    ['dashboardView','Dashboard'],
    ['servicesSection','Servicios'],
    ['professionalsSection','Profesionales'],
    ['schedulesSection','Horarios'],
    ['availabilitySection','Disponibilidad'],
    ['clientsSection','Clientes'],
    ['bookingsSection','Reservas'],
    ['calendarSection','Calendario']
  ];
  let initialized = false;

  function isVisible(el){ return !!el && !el.classList.contains('hidden'); }

  function setActive(target){
    document.querySelectorAll('[data-ay-nav]').forEach(el => {
      el.classList.toggle('is-active', el.dataset.ayNav === target);
    });
  }

  function activate(target, scroll){
    const dashboard = $('#dashboardView');
    if(!dashboard || !isVisible(dashboard)) return;
    const core = $('#ayDashboardCore');
    const sections = nav.slice(1).map(([id]) => $('#'+id)).filter(Boolean);

    if(target === 'dashboardView'){
      if(core) core.hidden = false;
      sections.forEach(s => { s.hidden = true; s.classList.remove('ay-module-active'); });
      if(scroll) window.scrollTo({top:0, behavior:'smooth'});
    } else {
      if(core) core.hidden = true;
      sections.forEach(s => { s.hidden = s.id !== target; s.classList.toggle('ay-module-active', s.id === target); });
      const active = $('#'+target);
      if(scroll && active) active.scrollIntoView({behavior:'smooth', block:'start'});
    }
    setActive(target);
    document.body.classList.remove('ay-menu-open');
    window.dispatchEvent(new CustomEvent('agendaYa:view-change',{detail:{view:target}}));
  }

  function addButtonNav(container, mobile){
    nav.forEach(([id,label]) => {
      const b = document.createElement('button');
      b.type='button';
      b.dataset.ayNav=id;
      b.setAttribute('aria-label',label);
      if(mobile){
        const icon = ['⌂','✂','♙','◷','▣','♧','▤','▦'][nav.findIndex(x=>x[0]===id)];
        b.innerHTML = '<span class="ay-rail-icon">'+icon+'</span><small>'+label+'</small>';
      } else {
        b.textContent=label;
      }
      b.onclick=()=>activate(id,true);
      container.appendChild(b);
    });
  }

  function build(){
    const dashboard = $('#dashboardView');
    if(!dashboard || !isVisible(dashboard) || initialized) return;
    initialized=true;

    const originalTopbar = dashboard.querySelector('.topbar');
    const hero = dashboard.querySelector('.hero');
    const grid = dashboard.querySelector('.grid');

    // Preserve the existing dashboard DOM/data bindings; only reorganize layout.
    if(hero && grid && !$('#ayDashboardCore')){
      const core=document.createElement('div');
      core.id='ayDashboardCore';
      core.className='ay-dashboard-core';
      hero.parentNode.insertBefore(core,hero);
      core.append(hero,grid);
    }

    // Header
    let topbar = originalTopbar;
    if(topbar){
      topbar.classList.add('ay-topbar');
      const logout = $('#logoutBtn');
      topbar.innerHTML='';

      const brand=document.createElement('div');
      brand.className='ay-brand';
      brand.innerHTML='<button class="ay-menu-btn" type="button" aria-label="Abrir menú">☰</button>'+
        '<img src="agenda-ya-logo-header.jpg" alt="Agenda Ya · Encuentra. Elige. Agenda." class="ay-logo-img">';
      topbar.appendChild(brand);

      const desktopNav=document.createElement('nav');
      desktopNav.className='ay-topnav';
      addButtonNav(desktopNav,false);
      topbar.appendChild(desktopNav);

      const account=document.createElement('div');
      account.className='ay-account';
      account.innerHTML='<span class="ay-avatar">PR</span><span class="ay-account-copy"><strong>Mi negocio</strong><small>Cuenta</small></span>';
      if(logout){ logout.classList.add('ay-logout'); account.appendChild(logout); }
      topbar.appendChild(account);

      const mobileMenu=document.createElement('aside');
      mobileMenu.className='ay-mobile-menu';
      mobileMenu.innerHTML='<div class="ay-mobile-menu-head"><strong>Agenda Ya</strong><button type="button" data-ay-close aria-label="Cerrar menú">×</button></div>';
      addButtonNav(mobileMenu,true);
      topbar.parentNode.insertBefore(mobileMenu,topbar.nextSibling);
      const menuButton=topbar.querySelector('.ay-menu-btn');
      menuButton.onclick=()=>document.body.classList.toggle('ay-menu-open');
      mobileMenu.querySelector('[data-ay-close]').onclick=()=>document.body.classList.remove('ay-menu-open');
    }

    // Desktop sidebar + content workspace.
    const sidebar=document.createElement('aside');
    sidebar.className='ay-sidebar';
    sidebar.innerHTML='<div class="ay-sidebar-title">GESTIÓN</div>';
    addButtonNav(sidebar,false);

    const workspace=document.createElement('div');
    workspace.className='ay-workspace';

    // Move every dashboard child except the header/mobile menu into workspace.
    Array.from(dashboard.children).forEach(child=>{
      if(child!==topbar && !child.classList.contains('ay-mobile-menu')) workspace.appendChild(child);
    });

    dashboard.appendChild(sidebar);
    dashboard.appendChild(workspace);

    const rail=document.createElement('nav');
    rail.className='ay-mobile-rail';
    nav.slice(0,5).forEach(([id,label],i)=>{
      const b=document.createElement('button');
      b.type='button'; b.dataset.ayNav=id; b.setAttribute('aria-label',label);
      b.innerHTML='<span class="ay-rail-icon">'+['⌂','✂','♙','◷','▣'][i]+'</span><small>'+label+'</small>';
      b.onclick=()=>activate(id,true);
      rail.appendChild(b);
    });
    dashboard.appendChild(rail);

    // Dashboard is the landing state. Actual module sections are not duplicated here.
    activate('dashboardView',false);
  }

  function watch(){
    if(isVisible($('#dashboardView'))) build();
  }

  window.AgendaYaUI={activate,build};
  const observer=new MutationObserver(watch);
  observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:['class']});
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',watch); else watch();
})();
