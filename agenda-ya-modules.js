/* Agenda Ya · Modules Integration v1.1
   Cumulative controller for Backup-1.0.
   Services · Professionals · Schedules · Availability · Clients · Bookings · Calendar · Public Profile.
   Does not own authentication or the shell. It reads the authenticated business session from Supabase.
*/
(() => {
  if (window.AgendaYaModules?.version === "1.1.0") return;

  const cfg = window.SOMOS_CONFIG || {};
  let client = null;
  let user = null;
  let business = null;
  let role = null;
  let currentView = "dashboard";
  const state = {
    services: [], professionals: [], schedules: [], availability: [], clients: [], bookings: [],
    calendarCursor: new Date(), calendarSelected: null, calendarProfessional: "all",
    editing: {}
  };

  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));
  const money = (v) => Number(v || 0).toLocaleString("es-CL", {style:"currency", currency:"CLP", maximumFractionDigits:0});
  const days = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
  const statusLabels = {pending:"Pendiente", confirmed:"Confirmada", cancelled:"Cancelada", completed:"Completada", no_show:"No asistió"};

  function validConfig(){ return !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && !String(cfg.SUPABASE_URL).includes("REEMPLAZAR")); }
  function root(){ return $("view-generic"); }
  function moduleBody(){ return $("ayModuleBody"); }
  function status(text, kind=""){ const e=$("ayModuleStatus"); if(e){e.textContent=text||"";e.className=`ay-module-status${kind?` is-${kind}`:""}`;} }
  function btn(text, action, primary=false){ return `<button type="button" class="ay-btn ${primary?"ay-btn-primary":"ay-btn-light"}" data-ay-action="${action}">${text}</button>`; }
  function shell(title, eyebrow, description, actions=""){
    root().innerHTML = `<div class="ay-module-workspace">
      <div class="ay-module-toolbar"><div class="ay-module-title"><span class="ay-eyebrow">${esc(eyebrow)}</span><h1>${esc(title)}</h1><p>${esc(description)}</p></div><div class="ay-module-actions">${actions}</div></div>
      <p id="ayModuleStatus" class="ay-module-status" aria-live="polite"></p>
      <div id="ayModuleBody"></div>
    </div>`;
    return $("ayModuleBody");
  }
  function empty(title, text){ return `<div class="ay-module-empty"><strong>${esc(title)}</strong><span>${esc(text)}</span></div>`; }
  function formField(label,id,value="",type="text",extra=""){
    return `<label>${esc(label)}<input id="${id}" type="${type}" value="${esc(value)}" ${extra}></label>`;
  }
  function selectField(label,id,options,value=""){
    return `<label>${esc(label)}<select id="${id}">${options.map(o=>`<option value="${esc(o.value)}" ${String(o.value)===String(value)?"selected":""}>${esc(o.label)}</option>`).join("")}</select></label>`;
  }
  function closeForm(){ const f=$("ayModuleFormCard"); if(f)f.remove(); state.editing={}; }
  function showForm(html){ closeForm(); const body=$("ayModuleBody"); body.insertAdjacentHTML("afterbegin",html); document.getElementById("ayModuleFormCard")?.scrollIntoView({behavior:"smooth",block:"start"}); }

  async function context(force=false){
    if(!client){
      if(validConfig() && window.supabase) client=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY);
      else { status("Configuración de Supabase no disponible.","error"); return false; }
    }
    if(!force && user?.id && business?.id) return true;
    const session=await client.auth.getSession();
    if(session.error) throw session.error;
    user=session.data.session?.user||null;
    if(!user){ business=null; role=null; status("La sesión de Agenda Ya no está disponible. Inicia sesión nuevamente.","error"); return false; }

    // No dependemos de un JOIN anidado para identificar el negocio. Primero
    // resolvemos membership y después consultamos businesses por ID.
    const m=await client.from("business_members")
      .select("business_id,role,active")
      .eq("user_id",user.id)
      .eq("active",true)
      .limit(1)
      .maybeSingle();
    if(m.error) throw m.error;
    if(!m.data?.business_id){
      business=null; role=null;
      status("Tu cuenta todavía no tiene un negocio asociado. Completa el perfil de negocio.","error");
      return false;
    }
    const b=await client.from("businesses")
      .select("id,name,slug,active,created_by,phone,address,city,comuna,business_type,logo_url")
      .eq("id",m.data.business_id)
      .maybeSingle();
    if(b.error) throw b.error;
    if(!b.data?.id){ business=null; role=null; status("No se pudo cargar el negocio asociado a tu cuenta.","error"); return false; }
    business=b.data; role=m.data.role;
    return true;
  }
  function ensureAdmin(){ if(!["owner","admin"].includes(role)){status("Se requiere rol propietario o administrador para modificar este módulo.","error");return false;} return true; }

  async function load(table, order=[]){
    let q=client.from(table).select("*").eq("business_id",business.id);
    for(const o of order) q=q.order(o.column,{ascending:o.ascending!==false});
    const r=await q; if(r.error) throw r.error; return r.data||[];
  }
  async function del(table,id,reload){
    if(!ensureAdmin() || !confirm("¿Eliminar este registro?")) return;
    const r=await client.from(table).delete().eq("id",id); if(r.error){status(r.error.message,"error");return;} await reload();
  }

  async function renderServices(){
    const body=shell("Servicios","GESTIÓN","Administra el catálogo de servicios, duración y precios.",btn("＋ Nuevo servicio","new-service",true));
    try{state.services=await load("services",[{column:"name"}]);}catch(e){status(e.message,"error");return;}
    body.insertAdjacentHTML("beforeend",state.services.length?`<div class="ay-module-grid">${state.services.map(s=>`<article class="ay-module-item"><div class="ay-module-item-head"><div><h3>${esc(s.name)}</h3><p class="ay-module-meta">${s.duration_minutes} min · ${money(s.price)}</p></div><span class="ay-module-badge ${s.active?"":"is-off"}">${s.active?"Activo":"Inactivo"}</span></div>${s.description?`<p class="ay-module-note">${esc(s.description)}</p>`:""}<div class="ay-module-actions-row"><button class="ay-btn ay-btn-light" data-ay-action="edit-service" data-id="${s.id}">Editar</button><button class="ay-btn ay-btn-light" data-ay-action="delete-service" data-id="${s.id}">Eliminar</button></div></article>`).join("")}</div>`:empty("Aún no hay servicios","Crea el primero para comenzar a recibir reservas."));
  }
  function serviceForm(x=null){
    state.editing={type:"service",id:x?.id||null};
    showForm(`<section id="ayModuleFormCard" class="ay-module-card"><form id="ayDynamicForm" class="ay-module-form">
      <strong>${x?"Editar servicio":"Nuevo servicio"}</strong><div class="ay-module-form-grid">
      ${formField("Nombre","fName",x?.name||"","text","required maxlength=150")}
      ${formField("Duración (minutos)","fDuration",x?.duration_minutes??30,"number","required min=5 max=1440")}
      ${formField("Precio","fPrice",x?.price??0,"number","required min=0 step=1")}
      ${selectField("Estado","fActive",[{value:"true",label:"Activo"},{value:"false",label:"Inactivo"}],String(x?.active??true))}</div>
      <label>Descripción<textarea id="fDescription" maxlength="2000">${esc(x?.description||"")}</textarea></label>
      <div class="ay-module-actions-row"><button class="ay-btn ay-btn-primary" type="submit">Guardar</button><button class="ay-btn ay-btn-light" type="button" data-ay-action="cancel-form">Cancelar</button></div><p id="ayFormStatus" class="ay-module-status"></p>
    </form></section>`);
  }

  async function renderProfessionals(){
    const body=shell("Profesionales","GESTIÓN","Gestiona las personas que atienden los servicios.",btn("＋ Nuevo profesional","new-professional",true));
    try{state.professionals=await load("professionals",[{column:"first_name"},{column:"last_name"}]);}catch(e){status(e.message,"error");return;}
    body.insertAdjacentHTML("beforeend",state.professionals.length?`<div class="ay-module-grid">${state.professionals.map(p=>`<article class="ay-module-item"><div class="ay-module-item-head"><div><h3>${esc(`${p.first_name} ${p.last_name}`)}</h3><p class="ay-module-meta">${esc([p.email,p.phone].filter(Boolean).join(" · ")||"Sin datos de contacto")}</p></div><span class="ay-module-badge ${p.active?"":"is-off"}">${p.active?"Activo":"Inactivo"}</span></div>${p.bio?`<p class="ay-module-note">${esc(p.bio)}</p>`:""}<div class="ay-module-actions-row"><button class="ay-btn ay-btn-light" data-ay-action="edit-professional" data-id="${p.id}">Editar</button><button class="ay-btn ay-btn-light" data-ay-action="delete-professional" data-id="${p.id}">Eliminar</button></div></article>`).join("")}</div>`:empty("Aún no hay profesionales","Crea profesionales para poder configurar horarios y reservas."));
  }
  function professionalForm(x=null){
    state.editing={type:"professional",id:x?.id||null};
    showForm(`<section id="ayModuleFormCard" class="ay-module-card"><form id="ayDynamicForm" class="ay-module-form"><strong>${x?"Editar profesional":"Nuevo profesional"}</strong><div class="ay-module-form-grid">
      ${formField("Nombre","fFirst",x?.first_name||"","text","required maxlength=100")}${formField("Apellido","fLast",x?.last_name||"","text","required maxlength=100")}
      ${formField("Correo","fEmail",x?.email||"","email","maxlength=200")}${formField("Teléfono","fPhone",x?.phone||"","tel","maxlength=50")}</div>
      <label>Descripción<textarea id="fBio" maxlength="1000">${esc(x?.bio||"")}</textarea></label>${selectField("Estado","fActive",[{value:"true",label:"Activo"},{value:"false",label:"Inactivo"}],String(x?.active??true))}
      <div class="ay-module-actions-row"><button class="ay-btn ay-btn-primary" type="submit">Guardar</button><button class="ay-btn ay-btn-light" type="button" data-ay-action="cancel-form">Cancelar</button></div><p id="ayFormStatus" class="ay-module-status"></p></form></section>`);
  }

  async function renderSchedules(){
    const body=shell("Horarios","CONFIGURACIÓN","Define los horarios de atención de cada profesional.",btn("＋ Nuevo horario","new-schedule",true));
    try{[state.schedules,state.professionals]=await Promise.all([load("professional_schedules",[{column:"day_of_week"},{column:"start_time"}]),load("professionals",[{column:"first_name"}])]);}catch(e){status(e.message,"error");return;}
    const pm=new Map(state.professionals.map(p=>[p.id,`${p.first_name} ${p.last_name}`]));
    body.insertAdjacentHTML("beforeend",state.schedules.length?`<div class="ay-module-grid">${state.schedules.map(s=>`<article class="ay-module-item"><div class="ay-module-item-head"><div><h3>${esc(pm.get(s.professional_id)||"Profesional")}</h3><p class="ay-module-meta">${days[s.day_of_week]} · ${String(s.start_time).slice(0,5)}–${String(s.end_time).slice(0,5)}</p></div><span class="ay-module-badge ${s.active?"":"is-off"}">${s.active?"Activo":"Inactivo"}</span></div><div class="ay-module-actions-row"><button class="ay-btn ay-btn-light" data-ay-action="edit-schedule" data-id="${s.id}">Editar</button><button class="ay-btn ay-btn-light" data-ay-action="delete-schedule" data-id="${s.id}">Eliminar</button></div></article>`).join("")}</div>`:empty("Aún no hay horarios","Configura la jornada de cada profesional."));
  }
  function scheduleForm(x=null){
    state.editing={type:"schedule",id:x?.id||null};
    const opts=state.professionals.map(p=>({value:p.id,label:`${p.first_name} ${p.last_name}`}));
    showForm(`<section id="ayModuleFormCard" class="ay-module-card"><form id="ayDynamicForm" class="ay-module-form"><strong>${x?"Editar horario":"Nuevo horario"}</strong><div class="ay-module-form-grid">
      ${selectField("Profesional","fProfessional",opts,x?.professional_id||"")}${selectField("Día","fDay",days.slice(1).map((d,i)=>({value:i+1,label:d})),x?.day_of_week||1)}
      ${formField("Hora de inicio","fStart",x?.start_time?.slice(0,5)||"09:00","time","required")}${formField("Hora de término","fEnd",x?.end_time?.slice(0,5)||"18:00","time","required")}
      </div>${selectField("Estado","fActive",[{value:"true",label:"Activo"},{value:"false",label:"Inactivo"}],String(x?.active??true))}
      <div class="ay-module-actions-row"><button class="ay-btn ay-btn-primary" type="submit">Guardar</button><button class="ay-btn ay-btn-light" type="button" data-ay-action="cancel-form">Cancelar</button></div><p id="ayFormStatus" class="ay-module-status"></p></form></section>`);
  }

  async function renderAvailability(){
    const body=shell("Disponibilidad","OPERACIÓN","Controla excepciones y espacios disponibles para reservar.",btn("＋ Nueva disponibilidad","new-availability",true));
    try{[state.availability,state.professionals]=await Promise.all([load("professional_availability",[{column:"availability_date"},{column:"start_time"}]),load("professionals",[{column:"first_name"}])]);}catch(e){status(e.message,"error");return;}
    const pm=new Map(state.professionals.map(p=>[p.id,`${p.first_name} ${p.last_name}`]));
    body.insertAdjacentHTML("beforeend",state.availability.length?`<div class="ay-module-grid">${state.availability.map(a=>`<article class="ay-module-item"><div class="ay-module-item-head"><div><h3>${esc(pm.get(a.professional_id)||"Profesional")}</h3><p class="ay-module-meta">${esc(a.availability_date)} · ${String(a.start_time).slice(0,5)}–${String(a.end_time).slice(0,5)}</p></div><span class="ay-module-badge ${a.status==="available"?"":"is-off"}">${a.status==="available"?"Disponible":"Bloqueado"}</span></div>${a.note?`<p class="ay-module-note">${esc(a.note)}</p>`:""}<div class="ay-module-actions-row"><button class="ay-btn ay-btn-light" data-ay-action="edit-availability" data-id="${a.id}">Editar</button><button class="ay-btn ay-btn-light" data-ay-action="delete-availability" data-id="${a.id}">Eliminar</button></div></article>`).join("")}</div>`:empty("Aún no hay disponibilidades","Crea una disponibilidad especial o un bloqueo para una fecha concreta."));
  }
  function availabilityForm(x=null){
    state.editing={type:"availability",id:x?.id||null};
    const opts=state.professionals.map(p=>({value:p.id,label:`${p.first_name} ${p.last_name}`}));
    showForm(`<section id="ayModuleFormCard" class="ay-module-card"><form id="ayDynamicForm" class="ay-module-form"><strong>${x?"Editar disponibilidad":"Nueva disponibilidad"}</strong><div class="ay-module-form-grid">
      ${selectField("Profesional","fProfessional",opts,x?.professional_id||"")}${formField("Fecha","fDate",x?.availability_date||"","date","required")}
      ${formField("Hora de inicio","fStart",x?.start_time?.slice(0,5)||"09:00","time","required")}${formField("Hora de término","fEnd",x?.end_time?.slice(0,5)||"18:00","time","required")}
      ${selectField("Tipo","fStatus",[{value:"available",label:"Disponible"},{value:"blocked",label:"Bloqueado"}],x?.status||"available")}${selectField("Estado","fActive",[{value:"true",label:"Activo"},{value:"false",label:"Inactivo"}],String(x?.active??true))}
      </div><label>Nota<textarea id="fNote" maxlength="500">${esc(x?.note||"")}</textarea></label>
      <div class="ay-module-actions-row"><button class="ay-btn ay-btn-primary" type="submit">Guardar</button><button class="ay-btn ay-btn-light" type="button" data-ay-action="cancel-form">Cancelar</button></div><p id="ayFormStatus" class="ay-module-status"></p></form></section>`);
  }

  async function renderClients(){
    const body=shell("Clientes","RELACIÓN","Consulta y administra la cartera de clientes.",btn("＋ Nuevo cliente","new-client",true));
    try{state.clients=await load("clients",[{column:"first_name"},{column:"last_name"}]);}catch(e){status(e.message,"error");return;}
    body.insertAdjacentHTML("beforeend",state.clients.length?`<div class="ay-module-grid">${state.clients.map(c=>`<article class="ay-module-item"><div class="ay-module-item-head"><div><h3>${esc(`${c.first_name} ${c.last_name}`)}</h3><p class="ay-module-meta">${esc([c.email,c.phone].filter(Boolean).join(" · ")||"Sin datos de contacto")}</p></div><span class="ay-module-badge ${c.active?"":"is-off"}">${c.active?"Activo":"Inactivo"}</span></div>${c.notes?`<p class="ay-module-note">${esc(c.notes)}</p>`:""}<div class="ay-module-actions-row"><button class="ay-btn ay-btn-light" data-ay-action="edit-client" data-id="${c.id}">Editar</button><button class="ay-btn ay-btn-light" data-ay-action="delete-client" data-id="${c.id}">Eliminar</button></div></article>`).join("")}</div>`:empty("Aún no hay clientes","Los clientes también se crean automáticamente cuando llega una reserva pública."));
  }
  function clientForm(x=null){
    state.editing={type:"client",id:x?.id||null};
    showForm(`<section id="ayModuleFormCard" class="ay-module-card"><form id="ayDynamicForm" class="ay-module-form"><strong>${x?"Editar cliente":"Nuevo cliente"}</strong><div class="ay-module-form-grid">
      ${formField("Nombre","fFirst",x?.first_name||"","text","required maxlength=100")}${formField("Apellido","fLast",x?.last_name||"","text","required maxlength=100")}
      ${formField("Correo","fEmail",x?.email||"","email","maxlength=200")}${formField("Teléfono","fPhone",x?.phone||"","tel","maxlength=50")}</div>
      <label>Notas<textarea id="fNotes" maxlength="1000">${esc(x?.notes||"")}</textarea></label>${selectField("Estado","fActive",[{value:"true",label:"Activo"},{value:"false",label:"Inactivo"}],String(x?.active??true))}
      <div class="ay-module-actions-row"><button class="ay-btn ay-btn-primary" type="submit">Guardar</button><button class="ay-btn ay-btn-light" type="button" data-ay-action="cancel-form">Cancelar</button></div><p id="ayFormStatus" class="ay-module-status"></p></form></section>`);
  }

  async function bookingRefs(){
    const [c,s,p]=await Promise.all([
      client.from("clients").select("id,first_name,last_name").eq("business_id",business.id).eq("active",true).order("first_name"),
      client.from("services").select("id,name,duration_minutes,price").eq("business_id",business.id).eq("active",true).order("name"),
      client.from("professionals").select("id,first_name,last_name").eq("business_id",business.id).eq("active",true).order("first_name")
    ]);
    if(c.error||s.error||p.error) throw (c.error||s.error||p.error);
    return {clients:c.data||[],services:s.data||[],professionals:p.data||[]};
  }
  async function renderBookings(){
    const body=shell("Reservas","OPERACIÓN","Gestiona reservas, estados y atención.",btn("＋ Nueva reserva","new-booking",true));
    try{state.bookings=await load("bookings",[{column:"booking_date"},{column:"start_time"}]);}catch(e){status(e.message,"error");return;}
    const refs=await bookingRefs().catch(e=>({clients:[],services:[],professionals:[]}));
    const cm=new Map(refs.clients.map(x=>[x.id,`${x.first_name} ${x.last_name}`]));
    const sm=new Map(refs.services.map(x=>[x.id,x.name])); const pm=new Map(refs.professionals.map(x=>[x.id,`${x.first_name} ${x.last_name}`]));
    body.insertAdjacentHTML("beforeend",state.bookings.length?`<div class="ay-module-list">${state.bookings.map(b=>`<article class="ay-module-item"><div class="ay-module-item-head"><div><h3>${esc(cm.get(b.client_id)||"Cliente")}</h3><p class="ay-module-meta">${esc(sm.get(b.service_id)||"Servicio")} · ${esc(pm.get(b.professional_id)||"Profesional")}</p><p class="ay-module-meta">${esc(b.booking_date)} · ${String(b.start_time).slice(0,5)}–${String(b.end_time).slice(0,5)}</p></div><span class="ay-module-badge ${b.status==="cancelled"?"is-off":""}">${esc(statusLabels[b.status]||b.status)}</span></div>${b.notes?`<p class="ay-module-note">${esc(b.notes)}</p>`:""}<div class="ay-module-actions-row"><button class="ay-btn ay-btn-light" data-ay-action="edit-booking" data-id="${b.id}">Editar</button><button class="ay-btn ay-btn-light" data-ay-action="delete-booking" data-id="${b.id}">Eliminar</button></div></article>`).join("")}</div>`:empty("Aún no hay reservas","Crea una reserva manual o recibe una desde el perfil público."));
  }
  async function bookingForm(x=null){
    const refs=await bookingRefs(); state.editing={type:"booking",id:x?.id||null};
    const co=refs.clients.map(v=>({value:v.id,label:`${v.first_name} ${v.last_name}`}));
    const so=refs.services.map(v=>({value:v.id,label:`${v.name} · ${v.duration_minutes} min`}));
    const po=refs.professionals.map(v=>({value:v.id,label:`${v.first_name} ${v.last_name}`}));
    showForm(`<section id="ayModuleFormCard" class="ay-module-card"><form id="ayDynamicForm" class="ay-module-form"><strong>${x?"Editar reserva":"Nueva reserva"}</strong><div class="ay-module-form-grid">
      ${selectField("Cliente","fClient",co,x?.client_id||"")}${selectField("Servicio","fService",so,x?.service_id||"")}${selectField("Profesional","fProfessional",po,x?.professional_id||"")}
      ${formField("Fecha","fDate",x?.booking_date||"","date","required")}${formField("Hora de inicio","fStart",x?.start_time?.slice(0,5)||"09:00","time","required")}${formField("Hora de término","fEnd",x?.end_time?.slice(0,5)||"09:30","time","required")}
      ${selectField("Estado","fStatus",Object.entries(statusLabels).map(([value,label])=>({value,label})),x?.status||"pending")}</div>
      <label>Notas<textarea id="fNotes" maxlength="1000">${esc(x?.notes||"")}</textarea></label>
      <div class="ay-module-actions-row"><button class="ay-btn ay-btn-primary" type="submit">Guardar</button><button class="ay-btn ay-btn-light" type="button" data-ay-action="cancel-form">Cancelar</button></div><p id="ayFormStatus" class="ay-module-status"></p></form></section>`);
    $("fService")?.addEventListener("change",async()=>{const s=refs.services.find(v=>v.id===$("fService").value);if(!s)return;const [h,m]=$("fStart").value.split(":").map(Number);const t=h*60+m+Number(s.duration_minutes);$("fEnd").value=`${String(Math.floor(t/60)%24).padStart(2,"0")}:${String(t%60).padStart(2,"0")}`});
  }

  function dateKey(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;}
  function parseKey(s){const [y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d);}
  function monthLabel(d){return d.toLocaleDateString("es-CL",{month:"long",year:"numeric"});}
  async function renderCalendar(){
    const body=shell("Calendario","OPERACIÓN","Visualiza la agenda y la carga diaria del negocio.");
    const profs=await client.from("professionals").select("id,first_name,last_name").eq("business_id",business.id).order("first_name");
    const books=await client.from("bookings").select("id,client_id,service_id,professional_id,booking_date,start_time,end_time,status,notes,clients(first_name,last_name),services(name),professionals(first_name,last_name)").eq("business_id",business.id).order("booking_date").order("start_time");
    if(profs.error||books.error){status((profs.error||books.error).message,"error");return;}
    state.professionals=profs.data||[];state.bookings=books.data||[];
    const pOpts=state.professionals.map(p=>`<option value="${p.id}" ${state.calendarProfessional===p.id?"selected":""}>${esc(`${p.first_name} ${p.last_name}`)}</option>`).join("");
    body.innerHTML=`<div class="ay-module-card"><div class="ay-calendar-toolbar"><button class="ay-btn ay-btn-light" type="button" data-ay-action="cal-prev">‹</button><div class="ay-calendar-title" id="ayCalendarTitle"></div><button class="ay-btn ay-btn-light" type="button" data-ay-action="cal-next">›</button></div><div class="ay-calendar-filters"><select id="ayCalendarProfessional"><option value="all">Todos los profesionales</option>${pOpts}</select><button class="ay-btn ay-btn-light" type="button" data-ay-action="cal-today">Hoy</button></div><div class="ay-calendar-grid" id="ayCalendarGrid"></div><div class="ay-calendar-kpis"><div class="ay-calendar-kpi"><strong id="ayCalCount">0</strong><span>Reservas del mes</span></div><div class="ay-calendar-kpi"><strong id="ayCalConfirmed">0</strong><span>Confirmadas</span></div><div class="ay-calendar-kpi"><strong id="ayCalPending">0</strong><span>Pendientes</span></div></div><div class="ay-calendar-detail" id="ayCalendarDetail"></div></div>`;
    $("ayCalendarProfessional").addEventListener("change",e=>{state.calendarProfessional=e.target.value;state.calendarSelected=null;drawCalendar()});
    drawCalendar();
  }
  function filteredBookings(){return state.bookings.filter(b=>state.calendarProfessional==="all"||b.professional_id===state.calendarProfessional);}
  function drawCalendar(){
    const d=state.calendarCursor,y=d.getFullYear(),m=d.getMonth();const grid=$("ayCalendarGrid");if(!grid)return;
    $("ayCalendarTitle").textContent=monthLabel(d);const items=filteredBookings();const first=new Date(y,m,1),offset=(first.getDay()+6)%7,daysIn=new Date(y,m+1,0).getDate(),prevIn=new Date(y,m,0).getDate(),today=dateKey(new Date());
    let html=["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"].map(x=>`<div class="ay-calendar-weekday">${x}</div>`).join("");
    for(let i=0;i<42;i++){const n=i-offset+1;let x,muted=false;if(n<1){x=new Date(y,m-1,prevIn+n);muted=true}else if(n>daysIn){x=new Date(y,m+1,n-daysIn);muted=true}else x=new Date(y,m,n);const k=dateKey(x),di=items.filter(b=>b.booking_date===k&&b.status!=="cancelled");html+=`<button type="button" class="ay-calendar-day ${muted?"is-muted":""} ${k===today?"is-today":""} ${k===state.calendarSelected?"is-selected":""}" data-cal-date="${k}"><strong>${x.getDate()}</strong>${di.length?`<span class="ay-calendar-dot"></span><span class="ay-calendar-count">${di.length}</span>`:""}</button>`;}
    grid.innerHTML=html;grid.querySelectorAll("[data-cal-date]").forEach(b=>b.addEventListener("click",()=>{state.calendarSelected=b.dataset.calDate;drawCalendar()}));
    const monthItems=items.filter(b=>{const x=parseKey(b.booking_date);return x.getFullYear()===y&&x.getMonth()===m});$("ayCalCount").textContent=monthItems.filter(b=>b.status!=="cancelled").length;$("ayCalConfirmed").textContent=monthItems.filter(b=>b.status==="confirmed").length;$("ayCalPending").textContent=monthItems.filter(b=>b.status==="pending").length;
    if(!state.calendarSelected||parseKey(state.calendarSelected).getMonth()!==m)state.calendarSelected=y===new Date().getFullYear()&&m===new Date().getMonth()?today:dateKey(new Date(y,m,1));
    const dayItems=items.filter(b=>b.booking_date===state.calendarSelected&&b.status!=="cancelled");const label=parseKey(state.calendarSelected).toLocaleDateString("es-CL",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
    $("ayCalendarDetail").innerHTML=`<h3>${esc(label)}</h3>${dayItems.length?dayItems.map(b=>`<div class="ay-calendar-event"><div class="ay-calendar-event-time">${esc(String(b.start_time).slice(0,5))}–${esc(String(b.end_time).slice(0,5))}</div><div class="ay-calendar-event-title">${esc(b.clients?`${b.clients.first_name} ${b.clients.last_name}`:"Cliente")}</div><div class="ay-calendar-event-meta">${esc(b.services?.name||"Servicio")} · ${esc(b.professionals?`${b.professionals.first_name} ${b.professionals.last_name}`:"Profesional")}</div><span class="ay-calendar-event-status">${esc(statusLabels[b.status]||b.status)}</span></div>`).join(""):"<p class='ay-module-status'>No hay reservas para este día.</p>"}`;
  }

  async function renderPublicProfile(){
    const body=shell("Perfil público","PUBLICACIÓN","Vista previa pública de tu propio negocio. No abre el Marketplace.");
    body.innerHTML=`<div id="ayPublicPreview" class="ay-public-preview">${empty("Cargando perfil público","Estamos preparando la misma información que verá un cliente.")}</div>`;
    const r=await client.rpc("get_public_business_profile",{p_slug:business.slug});
    if(r.error){$("ayPublicPreview").innerHTML=`<div class="ay-module-empty"><strong>Perfil público aún no disponible</strong><span>${esc(r.error.message)}. Puedes configurarlo desde “Editar perfil público”.</span></div>`;return;}
    const x=r.data;const p=x.profile||{};const cat=x.category?.name||"Servicio";const loc=[p.address,p.comuna,p.city].filter(Boolean).join(" · ");
    $("ayPublicPreview").innerHTML=`<section class="ay-public-hero"><span class="ay-eyebrow">${esc(cat)}</span><h2>${esc(x.business?.name||business.name)}</h2><p>${esc(p.description||"Información del negocio.")}</p>${loc?`<p>${esc(loc)}</p>`:""}</section>
      <div class="ay-module-grid"><section class="ay-public-section"><h3>Servicios</h3><div class="ay-public-items">${(x.services||[]).length?(x.services||[]).map(s=>`<div class="ay-public-item"><strong>${esc(s.name)}</strong><span>${s.duration_minutes} min · ${money(s.price)}</span>${s.description?`<p>${esc(s.description)}</p>`:""}</div>`).join(""):"<p class='ay-module-status'>No hay servicios publicados.</p>"}</div></section>
      <section class="ay-public-section"><h3>Profesionales</h3><div class="ay-public-items">${(x.professionals||[]).length?(x.professionals||[]).map(p=>`<div class="ay-public-item"><strong>${esc(`${p.first_name} ${p.last_name}`)}</strong>${p.bio?`<p>${esc(p.bio)}</p>`:""}</div>`).join(""):"<p class='ay-module-status'>No hay profesionales publicados.</p>"}</div></section></div>
      <section class="ay-public-section"><h3>Horarios</h3><div class="ay-public-items">${(x.schedules||[]).length?(x.schedules||[]).map(s=>`<div class="ay-public-item"><strong>${esc(days[s.day_of_week]||s.day_of_week)}</strong><span>${esc(String(s.start_time).slice(0,5))}–${esc(String(s.end_time).slice(0,5))}</span></div>`).join(""):"<p class='ay-module-status'>Consulta disponibilidad al reservar.</p>"}</div></section>
      <section class="ay-module-card ay-public-cta"><div><strong>Vista pública del negocio</strong><p class="ay-module-meta">Esta es la representación pública de tu negocio. El Marketplace permanece fuera de este módulo.</p></div><a class="ay-btn ay-btn-primary" href="public-profile.html?slug=${encodeURIComponent(business.slug)}" target="_blank" rel="noopener">Abrir perfil público</a></section>`;
  }

  async function submitDynamic(e){
    e.preventDefault();
    const form=e.target;
    form?.setAttribute("aria-busy","true");
    const t=state.editing.type,id=state.editing.id;const fs=id=>$(id)?.value||"";let table,p,after;
    try{
      if(!(await context(true))) throw new Error("No se pudo identificar el negocio autenticado. Vuelve a iniciar sesión y completa el perfil del negocio.");
      if(!ensureAdmin()) return;
      if(t==="service"){table="services";p={business_id:business.id,name:fs("fName").trim(),description:fs("fDescription").trim()||null,duration_minutes:Number(fs("fDuration")),price:Number(fs("fPrice")),active:fs("fActive")==="true"};after=renderServices;}
      else if(t==="professional"){table="professionals";p={business_id:business.id,first_name:fs("fFirst").trim(),last_name:fs("fLast").trim(),email:fs("fEmail").trim()||null,phone:fs("fPhone").trim()||null,bio:fs("fBio").trim()||null,active:fs("fActive")==="true"};after=renderProfessionals;}
      else if(t==="schedule"){const a=fs("fStart"),b=fs("fEnd");if(a>=b)throw new Error("La hora de inicio debe ser anterior a la hora de término.");table="professional_schedules";p={business_id:business.id,professional_id:fs("fProfessional"),day_of_week:Number(fs("fDay")),start_time:a,end_time:b,active:fs("fActive")==="true"};after=renderSchedules;}
      else if(t==="availability"){const a=fs("fStart"),b=fs("fEnd");if(a>=b)throw new Error("La hora de inicio debe ser anterior a la hora de término.");table="professional_availability";p={business_id:business.id,professional_id:fs("fProfessional"),availability_date:fs("fDate"),start_time:a,end_time:b,status:fs("fStatus"),active:fs("fActive")==="true",note:fs("fNote").trim()||null};after=renderAvailability;}
      else if(t==="client"){table="clients";p={business_id:business.id,first_name:fs("fFirst").trim(),last_name:fs("fLast").trim(),email:fs("fEmail").trim()||null,phone:fs("fPhone").trim()||null,notes:fs("fNotes").trim()||null,active:fs("fActive")==="true"};after=renderClients;}
      else if(t==="booking"){const a=fs("fStart"),b=fs("fEnd");if(a>=b)throw new Error("La hora de inicio debe ser anterior a la hora de término.");table="bookings";p={business_id:business.id,client_id:fs("fClient"),service_id:fs("fService"),professional_id:fs("fProfessional"),booking_date:fs("fDate"),start_time:a,end_time:b,status:fs("fStatus"),notes:fs("fNotes").trim()||null};after=renderBookings;}
      if(!p || !p.business_id) throw new Error("No se pudo determinar el negocio actual.");
      if(t !== "service" && t !== "professional" && t !== "schedule" && t !== "availability" && t !== "client" && t !== "booking") throw new Error("Módulo no soportado.");
      const r=id
        ? await client.from(table).update(p).eq("id",id).eq("business_id",business.id)
        : await client.from(table).insert({...p,created_by:user.id});
      if(r.error) throw r.error;
      status("Guardado correctamente.","success");
      await after();
    }catch(err){
      const e=$("ayFormStatus");
      if(e) e.textContent=err.message||String(err);
      else status(err.message,"error");
    }finally{
      form?.removeAttribute("aria-busy");
    }
  }

  async function activate(view){
    currentView=view||"dashboard";
    if(currentView==="dashboard"||currentView==="settings") return;
    const body=root();
    if(!body) return;
    if(!(await context())) return;
    // Show the selected module immediately, even while Supabase is loading.
    body.hidden=false;
    body.innerHTML=`<div class="ay-module-workspace"><div class="ay-module-loading">Cargando ${esc(currentView)}…</div></div>`;
    try{
      if(currentView==="services")await renderServices();
      else if(currentView==="professionals")await renderProfessionals();
      else if(currentView==="schedules")await renderSchedules();
      else if(currentView==="availability")await renderAvailability();
      else if(currentView==="clients")await renderClients();
      else if(currentView==="bookings")await renderBookings();
      else if(currentView==="calendar")await renderCalendar();
      else if(currentView==="public-profile")await renderPublicProfile();
    }catch(e){
      const msg=e?.message||String(e)||"No fue posible cargar el módulo.";
      const body=moduleBody();
      if(body) body.innerHTML=`<div class="ay-module-error"><strong>No fue posible cargar este módulo.</strong><div>${esc(msg)}</div></div>`;
      status(msg,"error");
    }
  }

  document.addEventListener("click",async e=>{
    const b=e.target.closest("[data-ay-action]");if(!b)return;const a=b.dataset.ayAction;
    try{
      if(a==="new-service")serviceForm();
      else if(a==="edit-service")serviceForm(state.services.find(x=>x.id===b.dataset.id));
      else if(a==="delete-service")await del("services",b.dataset.id,renderServices);
      else if(a==="new-professional")professionalForm();
      else if(a==="edit-professional")professionalForm(state.professionals.find(x=>x.id===b.dataset.id));
      else if(a==="delete-professional")await del("professionals",b.dataset.id,renderProfessionals);
      else if(a==="new-schedule")scheduleForm();
      else if(a==="edit-schedule")scheduleForm(state.schedules.find(x=>x.id===b.dataset.id));
      else if(a==="delete-schedule")await del("professional_schedules",b.dataset.id,renderSchedules);
      else if(a==="new-availability")availabilityForm();
      else if(a==="edit-availability")availabilityForm(state.availability.find(x=>x.id===b.dataset.id));
      else if(a==="delete-availability")await del("professional_availability",b.dataset.id,renderAvailability);
      else if(a==="new-client")clientForm();
      else if(a==="edit-client")clientForm(state.clients.find(x=>x.id===b.dataset.id));
      else if(a==="delete-client")await del("clients",b.dataset.id,renderClients);
      else if(a==="new-booking")await bookingForm();
      else if(a==="edit-booking")await bookingForm(state.bookings.find(x=>x.id===b.dataset.id));
      else if(a==="delete-booking")await del("bookings",b.dataset.id,renderBookings);
      else if(a==="cancel-form")closeForm();
      else if(a==="cal-prev"){state.calendarCursor=new Date(state.calendarCursor.getFullYear(),state.calendarCursor.getMonth()-1,1);state.calendarSelected=null;drawCalendar()}
      else if(a==="cal-next"){state.calendarCursor=new Date(state.calendarCursor.getFullYear(),state.calendarCursor.getMonth()+1,1);state.calendarSelected=null;drawCalendar()}
      else if(a==="cal-today"){state.calendarCursor=new Date();state.calendarSelected=dateKey(new Date());drawCalendar()}
    }catch(err){status(err.message||String(err),"error");}
  });
  document.addEventListener("submit",e=>{if(e.target.id==="ayDynamicForm")void submitDynamic(e);});

  // Navigation fallback: the shell owns the visual state, while this layer
  // guarantees that every module view is actually rendered after a tap.
  document.addEventListener("click",e=>{
    const nav=e.target.closest("[data-view]");
    if(!nav) return;
    const view=nav.dataset.view;
    if(!view || view==="dashboard" || view==="settings") return;
    setTimeout(()=>void activate(view),0);
  },true);

  window.addEventListener("agendaYa:view-change",e=>void activate(e.detail?.view));
  window.AgendaYaModules={version:"1.1.0",activate,refresh:()=>activate(currentView),getContext:()=>({user,business,role})};
  void activate(window.AgendaYaUI?.getCurrentView?.() || "dashboard");
})();
