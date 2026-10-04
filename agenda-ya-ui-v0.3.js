
/* AGENDA YA · UI FOUNDATION + DASHBOARD V0.3
   This layer is intentionally additive. It does not alter Supabase,
   booking rules, module CRUD, or existing section IDs.
*/
(() => {
  "use strict";

  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];

  const sections = [
    ["dashboardView","⌂","Dashboard"],
    ["servicesSection","✂","Servicios"],
    ["professionalsSection","♙","Profesionales"],
    ["schedulesSection","◷","Horarios"],
    ["availabilitySection","▣","Disponibilidad"],
    ["clientsSection","♧","Clientes"],
    ["bookingsSection","▤","Reservas"],
    ["calendarSection","▦","Calendario"]
  ];

  const publicItems = [
    ["publicProfile","▣","Perfil público"],
    ["settings","⚙","Configuración"]
  ];

  function sectionTarget(id){
    const el = document.getElementById(id);
    if (!el) return null;
    if (id === "dashboardView") return document.getElementById("dashboardView");
    return el;
  }

  function scrollToId(id){
    const el = sectionTarget(id);
    if (!el) return;
    if (id === "dashboardView") {
      window.scrollTo({top:0,behavior:"smooth"});
    } else {
      el.scrollIntoView({behavior:"smooth",block:"start"});
    }
    setActive(id);
  }

  function setActive(id){
    $$(".ay-nav-btn,.ay-side-btn,.ay-mobile-rail button").forEach(b => {
      b.classList.toggle("active", b.dataset.target === id);
    });
  }

  function navButton(id, icon, label, cls=""){
    const b=document.createElement("button");
    b.type="button";
    b.className=`${cls} ay-nav-btn`;
    b.dataset.target=id;
    b.innerHTML=`<span class="ay-icon">${icon}</span><span>${label}</span>`;
    b.onclick=()=>scrollToId(id);
    return b;
  }

  function sideButton(id, icon, label){
    const b=document.createElement("button");
    b.type="button";
    b.className="ay-side-btn";
    b.dataset.target=id;
    b.innerHTML=`<span class="ay-icon">${icon}</span><span>${label}</span>`;
    b.onclick=()=>scrollToId(id);
    return b;
  }

  function buildHeader(){
    if ($(".ay-header")) return;

    const header=document.createElement("header");
    header.className="ay-header";
    header.innerHTML=`
      <div class="ay-header-inner">
        <button type="button" class="ay-mobile-menu-button" aria-label="Menú">☰</button>
        <a href="#" class="ay-logo" aria-label="Agenda Ya">
          <img src="agenda-ya-logo-header.jpg" alt="Agenda Ya">
        </a>
        <nav class="ay-desktop-nav" aria-label="Navegación principal"></nav>
        <div class="ay-account">
          <div class="ay-avatar">PR</div>
          <span>Mi negocio</span>
        </div>
      </div>`;
    const nav=$(".ay-desktop-nav",header);
    sections.slice(0,9).forEach(([id,icon,label])=>nav.appendChild(navButton(id,icon,label)));

    const topbar=$("#dashboardView > .topbar");
    if(topbar) topbar.insertAdjacentElement("beforebegin",header);
    else document.body.prepend(header);

    const menuBtn=$(".ay-mobile-menu-button",header);
    menuBtn.onclick=()=>toggleMobileMenu();

    return header;
  }

  function buildWorkspace(){
    const dash=$("#dashboardView");
    if(!dash || $(".ay-workspace")) return;

    const main=document.createElement("div");
    main.className="ay-workspace";

    const sidebar=document.createElement("aside");
    sidebar.className="ay-sidebar";
    sections.forEach(([id,icon,label])=>sidebar.appendChild(sideButton(id,icon,label)));
    const divider=document.createElement("div");
    divider.className="ay-sidebar-divider";
    sidebar.appendChild(divider);
    sidebar.appendChild(sideButton("publicProfile","▣","Perfil público"));
    sidebar.appendChild(sideButton("settings","⚙","Configuración"));

    const content=document.createElement("div");
    content.className="ay-main";

    // Move all dashboard children except the legacy topbar into the new workspace.
    [...dash.children].forEach(el=>{
      if(!el.classList.contains("topbar")) content.appendChild(el);
    });

    main.append(sidebar,content);
    dash.appendChild(main);
    dash.classList.add("ay-section-anchor");
  }

  function buildHero(){
    const main=$(".ay-main");
    if(!main || $(".ay-dashboard-hero")) return;

    const oldHero=$(".hero",main);
    const title=$("#welcomeTitle")?.textContent?.trim() || "Bienvenido";
    const summary=$("#businessSummary")?.textContent?.trim() || "Gestiona tu negocio y recibe más reservas.";

    const hero=document.createElement("section");
    hero.className="ay-dashboard-hero";
    hero.innerHTML=`
      <div class="ay-hero-copy">
        <p class="ay-hero-eyebrow">AGENDA YA · DASHBOARD</p>
        <h1>${escapeHtml(title)}</h1>
        <p>${escapeHtml(summary || "Gestiona tus servicios, profesionales y reservas desde un solo lugar.")}</p>
      </div>
      <div class="ay-hero-actions">
        <button class="primary" type="button" data-target="bookingsSection">＋ Nueva reserva</button>
        <button type="button" data-target="calendarSection">▦ Ver calendario</button>
      </div>`;
    if(oldHero) oldHero.replaceWith(hero); else main.prepend(hero);

    $$("[data-target]",hero).forEach(b=>b.onclick=()=>scrollToId(b.dataset.target));
  }

  function countCards(id){
    const el=document.getElementById(id);
    if(!el) return 0;
    return el.querySelectorAll(":scope > .card, :scope > article.card").length;
  }

  function buildKpis(){
    const main=$(".ay-main");
    if(!main || $(".ay-kpis")) return;

    const wrap=document.createElement("section");
    wrap.className="ay-kpis";
    const data=[
      ["▦","Reservas hoy",0,"Ver reservas"],
      ["♧","Clientes",countCards("clientsList"),"Clientes registrados"],
      ["✂","Servicios",countCards("servicesList"),"Activos"],
      ["♙","Profesionales",countCards("professionalsList"),"Activos"]
    ];
    wrap.innerHTML=data.map((x,i)=>`
      <article class="ay-kpi">
        <div class="ay-kpi-top"><span class="ay-kpi-label">${x[1]}</span><span class="ay-kpi-icon">${x[0]}</span></div>
        <strong class="ay-kpi-value" data-kpi="${i}">${x[2]}</strong>
        <p class="ay-kpi-note">${x[3]}</p>
      </article>`).join("");
    const hero=$(".ay-dashboard-hero");
    hero?.insertAdjacentElement("afterend",wrap);
    updateBookingKpi();
  }

  function updateBookingKpi(){
    const el=$('[data-kpi="0"]');
    if(!el) return;
    const list=$("#bookingsList");
    const cards=list ? list.querySelectorAll(":scope > .card, :scope > article.card") : [];
    el.textContent=String(cards.length);
  }

  function buildPanels(){
    const main=$(".ay-main");
    if(!main || $(".ay-dashboard-grid")) return;

    const grid=document.createElement("section");
    grid.className="ay-dashboard-grid";
    grid.innerHTML=`
      <article class="ay-panel">
        <div class="ay-panel-head">
          <h2>Próximas reservas</h2>
          <button type="button" data-target="bookingsSection">Ver todas</button>
        </div>
        <div class="ay-upcoming" id="ayUpcoming"></div>
      </article>
      <article class="ay-panel">
        <div class="ay-panel-head">
          <h2>Calendario de hoy</h2>
          <button type="button" data-target="calendarSection">Abrir</button>
        </div>
        <div class="ay-mini-calendar" id="ayMiniCalendar"></div>
      </article>`;
    main.appendChild(grid);
    $$("[data-target]",grid).forEach(b=>b.onclick=()=>scrollToId(b.dataset.target));
    refreshPanels();
  }

  function refreshPanels(){
    const source=$("#bookingsList");
    const upcoming=$("#ayUpcoming");
    const mini=$("#ayMiniCalendar");
    if(!source || !upcoming || !mini) return;

    const cards=[...source.querySelectorAll(":scope > .card, :scope > article.card")];
    if(!cards.length){
      upcoming.innerHTML=`<p class="ay-upcoming-meta">Aún no hay reservas.</p>`;
      mini.innerHTML=`<p class="ay-upcoming-meta">No hay eventos para mostrar.</p>`;
      updateBookingKpi();
      return;
    }

    const items=cards.slice(0,4).map(card=>{
      const h3=card.querySelector("h3")?.textContent?.trim() || "Reserva";
      const meta=[...card.querySelectorAll(".meta")].map(x=>x.textContent.trim());
      const time=(meta[1]||"").split("·")[1]?.trim() || meta[1] || "";
      const service=meta[0] || "Servicio";
      const status=card.querySelector(".pill")?.textContent?.trim() || "Pendiente";
      return {h3,service,time,status};
    });

    upcoming.innerHTML=items.map(x=>`
      <div class="ay-upcoming-item">
        <div class="ay-upcoming-time">${escapeHtml(x.time || "—")}</div>
        <div><div class="ay-upcoming-title">${escapeHtml(x.service)}</div><div class="ay-upcoming-meta">${escapeHtml(x.h3)}</div></div>
        <span class="ay-status">${escapeHtml(x.status)}</span>
      </div>`).join("");

    mini.innerHTML=items.map(x=>`
      <div class="ay-calendar-row">
        <div class="ay-calendar-time">${escapeHtml(x.time || "—")}</div>
        <div class="ay-calendar-event"><strong>${escapeHtml(x.service)}</strong><span>${escapeHtml(x.h3)}</span></div>
      </div>`).join("");

    updateBookingKpi();
  }

  function buildMobileRail(){
    if($(".ay-mobile-rail")) return;
    const rail=document.createElement("nav");
    rail.className="ay-mobile-rail";
    [["dashboardView","⌂","Inicio"],["servicesSection","✂","Servicios"],["bookingsSection","▤","Reservas"],["calendarSection","▦","Calendario"],["clientsSection","•••","Más"]]
      .forEach(([id,icon,label])=>{
        const b=document.createElement("button");
        b.type="button"; b.dataset.target=id;
        b.innerHTML=`<span class="ay-icon">${icon}</span>${label}`;
        b.onclick=()=>scrollToId(id);
        rail.appendChild(b);
      });
    document.body.appendChild(rail);
  }

  function buildPublicProfilePlaceholder(){
    const side=$(".ay-sidebar");
    if(!side) return;
    const btn=[...side.querySelectorAll("[data-target='publicProfile']")][0];
    if(btn) btn.onclick=()=>{
      const url="public-profile-admin.html";
      window.location.href=url;
    };
    const settings=[...side.querySelectorAll("[data-target='settings']")][0];
    if(settings) settings.onclick=()=>{
      window.alert("Configuración general: módulo pendiente de integración visual.");
    };
  }

  function toggleMobileMenu(){
    const sidebar=$(".ay-sidebar");
    if(!sidebar) return;
    const open=sidebar.dataset.mobileOpen==="true";
    sidebar.dataset.mobileOpen=String(!open);
    sidebar.style.display=open?"none":"block";
    if(!open){
      sidebar.style.position="fixed";
      sidebar.style.zIndex="1100";
      sidebar.style.top="66px";
      sidebar.style.left="0";
      sidebar.style.bottom="0";
      sidebar.style.width="260px";
      sidebar.style.height="calc(100vh - 66px)";
      sidebar.style.boxShadow="10px 0 30px rgba(20,33,61,.16)";
    } else {
      sidebar.removeAttribute("style");
    }
  }

  function escapeHtml(value){
    return String(value??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
  }

  function init(){
    const dashboard=$("#dashboardView");
    if(!dashboard || dashboard.classList.contains("hidden")) return false;
    document.body.classList.add("ay-ui");
    buildHeader();
    buildWorkspace();
    buildHero();
    buildKpis();
    buildPanels();
    buildMobileRail();
    buildPublicProfilePlaceholder();
    setActive("dashboardView");
    refreshPanels();
    return true;
  }

  let attempts=0;
  const timer=setInterval(()=>{
    attempts++;
    if(init() || attempts>60) clearInterval(timer);
  },250);

  // Existing app.js may populate lists after the shell is created.
  const observer=new MutationObserver(()=>{
    if(!document.body.classList.contains("ay-ui")) return;
    refreshPanels();
    const kpi=$('[data-kpi="1"]');
    if(kpi) kpi.textContent=String(countCards("clientsList"));
    const s=$('[data-kpi="2"]');
    if(s) s.textContent=String(countCards("servicesList"));
    const p=$('[data-kpi="3"]');
    if(p) p.textContent=String(countCards("professionalsList"));
  });
  observer.observe(document.body,{childList:true,subtree:true});
})();
