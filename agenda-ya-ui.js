
/* AGENDA YA UI FRAMEWORK v1.0 — integration controller */
(() => {
  const modules = [
    ["dashboard","⌂","Dashboard","dashboardView"],
    ["services","✂","Servicios","servicesSection"],
    ["professionals","♙","Profesionales","professionalsSection"],
    ["schedules","◷","Horarios","schedulesSection"],
    ["availability","▣","Disponibilidad","availabilitySection"],
    ["clients","♧","Clientes","clientsSection"],
    ["bookings","▤","Reservas","bookingsSection"],
    ["calendar","▦","Calendario","calendarSection"]
  ];

  const dashboard = document.getElementById("dashboardView");
  if (!dashboard) return;

  function makeHeader(){
    if (document.querySelector(".ay-shell-header")) return;
    const header=document.createElement("header");
    header.className="ay-shell-header";
    header.innerHTML=`
      <button class="ay-mobile-menu" id="ayMobileMenu" aria-label="Abrir menú">☰</button>
      <a href="#" class="ay-logo-link" aria-label="Agenda Ya">
        <img class="ay-logo" src="agenda-ya-logo.svg" alt="Agenda Ya">
      </a>
      <nav class="ay-header-nav" aria-label="Navegación Agenda Ya">
        ${modules.map(([id,icon,label])=>`<button class="ay-nav-item" data-ay-view="${id}"><span class="ay-nav-icon">${icon}</span><span>${label}</span></button>`).join("")}
      </nav>
      <div class="ay-header-actions">
        <button class="ay-header-action" aria-label="Notificaciones">♢</button>
        <button class="ay-account" id="ayAccount">
          <span class="ay-avatar">PR</span><span><strong>Mi negocio</strong><small>Cuenta</small></span><span>⌄</span>
        </button>
      </div>`;
    dashboard.prepend(header);
    document.getElementById("ayMobileMenu")?.addEventListener("click",()=>document.querySelector(".ay-sidebar")?.classList.toggle("is-open"));
  }

  function makeLayout(){
    const header=dashboard.querySelector(".ay-shell-header");
    const content=document.createElement("div");
    content.className="ay-layout";
    const sidebar=document.createElement("aside");
    sidebar.className="ay-sidebar";
    sidebar.innerHTML=`<div class="ay-sidebar-label">GESTIÓN</div><div class="ay-sidebar-list"></div><div class="ay-sidebar-bottom"><button class="ay-side-item" data-ay-view="public-profile">⌂ <span>Perfil público</span></button><button class="ay-side-item" data-ay-view="settings">⚙ <span>Configuración</span></button></div>`;
    const list=sidebar.querySelector(".ay-sidebar-list");
    modules.forEach(([id,icon,label])=>{
      const b=document.createElement("button"); b.className="ay-side-item"; b.dataset.ayView=id; b.innerHTML=`<span>${icon}</span><span>${label}</span>`; list.appendChild(b);
    });
    const children=[...dashboard.children].filter(x=>x!==header);
    const core=document.createElement("div");
    core.className="ay-dashboard-core";
    children.filter(x=>!x.classList.contains("agenda-section")).forEach(x=>core.appendChild(x));
    children.filter(x=>x.classList.contains("agenda-section")).forEach(x=>content.appendChild(x));
    content.prepend(core);
    content.classList.add("ay-content");
    dashboard.innerHTML="";
    dashboard.append(header, content);
    const layout=document.createElement("div"); layout.className="ay-layout"; layout.append(sidebar,content);
    dashboard.appendChild(layout);
    const rail=document.createElement("nav"); rail.className="ay-mobile-rail"; rail.innerHTML=`
      <button data-ay-view="dashboard">⌂<small>Inicio</small></button>
      <button data-ay-view="services">✂<small>Servicios</small></button>
      <button data-ay-view="bookings">▤<small>Reservas</small></button>
      <button data-ay-view="calendar">▦<small>Calendario</small></button>
      <button data-ay-view="settings">•••<small>Más</small></button>`;
    dashboard.appendChild(rail);
  }

  function setupSections(){
    modules.forEach(([id,,label,sectionId])=>{
      const el=document.getElementById(sectionId);
      if(el){ el.classList.add("ay-module-view"); el.dataset.ayModule=id; }
    });
  }

  function activate(id){
    if(id==="public-profile"){
      window.location.href="public-profile-admin.html";
      return;
    }
    if(id==="settings"){
      window.dispatchEvent(new CustomEvent("agendaYa:settings"));
      return;
    }
    const target=id==="dashboard"?document.querySelector(".ay-dashboard-core"):document.getElementById(
      modules.find(x=>x[0]===id)?.[3]
    );
    if(!target) return;
    const moduleSections=modules.slice(1).map(x=>document.getElementById(x[3])).filter(Boolean);
    const core=document.querySelector(".ay-dashboard-core");
    if(id==="dashboard"){
      core?.classList.remove("ay-ui-hidden");
      moduleSections.forEach(s=>s.classList.remove("ay-ui-hidden"));
      window.scrollTo({top:0,behavior:"smooth"});
    }else{
      core?.classList.add("ay-ui-hidden");
      moduleSections.forEach(s=>s.classList.toggle("ay-ui-hidden",s!==target));
      target.classList.remove("ay-ui-hidden");
      target.scrollIntoView({behavior:"smooth",block:"start"});
    }
    document.querySelectorAll("[data-ay-view]").forEach(x=>x.classList.toggle("is-active",x.dataset.ayView===id));
    document.querySelector(".ay-sidebar")?.classList.remove("is-open");
    window.dispatchEvent(new CustomEvent("agendaYa:view-change",{detail:{view:id}}));
  }

  function bind(){
    document.addEventListener("click",e=>{
      const item=e.target.closest("[data-ay-view]");
      if(!item) return;
      e.preventDefault(); activate(item.dataset.ayView);
    });
    document.querySelector(".ay-logo-link")?.addEventListener("click",e=>{e.preventDefault();activate("dashboard")});
  }

  function init(){
    if(document.querySelector(".ay-shell-header")) return;
    makeHeader(); makeLayout(); setupSections(); bind(); activate("dashboard");
    window.AgendaYaUI=window.AgendaYaUI||{};
    Object.assign(window.AgendaYaUI,{version:"1.0.0",activate});
  }

  const observer=new MutationObserver(()=>{
    if(!document.getElementById("dashboardView")) return;
    if(!document.getElementById("dashboardView").classList.contains("hidden")) init();
  });
  observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:["class"]});
  if(!dashboard.classList.contains("hidden")) init();
})();
