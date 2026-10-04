const cfg=window.SOMOS_CONFIG||{};
const $=id=>document.getElementById(id);
const authView=$("authView"), onboardingView=$("onboardingView"), dashboardView=$("dashboardView");
let client=null,currentUser=null,currentBusiness=null;
let editing={service:null,professional:null,schedule:null,availability:null,client:null,booking:null};

function msg(id,text){const e=$(id);if(e)e.textContent=text||""}
function show(view){[authView,onboardingView,dashboardView].forEach(v=>v.classList.add("hidden"));view.classList.remove("hidden")}
function esc(v){return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}
function validConfig(){return cfg.SUPABASE_URL&&!cfg.SUPABASE_URL.startsWith("REEMPLAZAR")&&cfg.SUPABASE_ANON_KEY&&!cfg.SUPABASE_ANON_KEY.startsWith("REEMPLAZAR")}
if(validConfig())client=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY);else msg("status","Configura SUPABASE_URL y SUPABASE_ANON_KEY en config.js.");

async function loadUser(){
 if(!client)return;
 const r=await client.auth.getSession();
 if(r.error){msg("status",r.error.message);return}
 if(r.data.session){currentUser=r.data.session.user;await routeUser()}else show(authView);
}
async function routeUser(){
 const r=await client.from("business_members").select("business_id,role,active,businesses(id,name,slug,active)").eq("user_id",currentUser.id).eq("active",true);
 if(r.error){msg("status",r.error.message);return}
 if(!r.data?.length){show(onboardingView);return}
 const m=r.data[0];currentBusiness=m.businesses;
 const displayName=currentUser.user_metadata?.full_name||currentUser.user_metadata?.name||(currentUser.email||"usuario").split("@")[0].replace(/[._-]+/g," ").split(" ")[0]; $("welcomeTitle").textContent="Hola, "+displayName;
 $("businessSummary").textContent=currentBusiness.name+" · "+currentBusiness.slug;
 $("roleValue").textContent=m.role;
 show(dashboardView);
 await Promise.all([loadServices(),loadProfessionals(),loadSchedules(),loadAvailability(),loadClients()]);
}
async function emailAuth(mode){
 if(!client)return;
 const email=$("email").value.trim(),password=$("password").value;
 const r=mode==="signup"?await client.auth.signUp({email,password}):await client.auth.signInWithPassword({email,password});
 if(r.error){msg("status",r.error.message);return}
 msg("status",mode==="signup"?(r.data.session?"Cuenta creada.":"Cuenta creada. Revisa tu correo."):"Sesión iniciada.");
 if(mode==="login")await loadUser();
}
$("emailForm").addEventListener("submit",e=>{e.preventDefault();emailAuth("login")});
$("signupBtn").onclick=()=>emailAuth("signup");
$("recoveryBtn").onclick=async()=>{const email=$("email").value.trim();if(!email){msg("status","Escribe primero tu correo.");return}const r=await client.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});msg("status",r.error?.message||"Revisa tu correo.")};
async function oauth(provider){const r=await client.auth.signInWithOAuth({provider,options:{redirectTo:location.origin+location.pathname}});if(r.error)msg("status",r.error.message)}
$("googleBtn").onclick=()=>oauth("google");$("facebookBtn").onclick=()=>oauth("facebook");

$("businessForm").addEventListener("submit",async e=>{
 e.preventDefault();if(!client||!currentUser)return;
 const r=await client.rpc("create_business",{p_name:$("businessName").value.trim(),p_slug:$("businessSlug").value.trim().toLowerCase(),p_legal_name:null,p_email:$("businessEmail").value.trim()||null,p_phone:$("businessPhone").value.trim()||null});
 if(r.error){msg("onboardingStatus",r.error.message);return}await routeUser();
});
async function logout(){if(client)await client.auth.signOut();currentUser=null;currentBusiness=null;show(authView)}
$("logoutBtn").onclick=logout;$("logoutOnboarding").onclick=logout;

function toggle(id,open=true){$(id).classList.toggle("hidden",!open)}
function resetForm(type){editing[type]=null}
function price(v){return new Intl.NumberFormat("es-CL",{style:"currency",currency:"CLP",maximumFractionDigits:0}).format(Number(v)||0)}
const days=["","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];

async function loadServices(){
 const list=$("servicesList");list.innerHTML='<div class="card"><p class="lead">Cargando...</p></div>';
 const r=await client.from("services").select("*").eq("business_id",currentBusiness.id).order("name");
 if(r.error){list.innerHTML=`<div class="card"><p class="status">${esc(r.error.message)}</p></div>`;return}
 if(!r.data?.length){list.innerHTML='<div class="card"><p class="lead">Aún no hay servicios. Crea el primero para comenzar.</p></div>';return}
 list.innerHTML=r.data.map(s=>`<article class="card module-card"><h3>${esc(s.name)}</h3>${s.description?`<p class="meta">${esc(s.description)}</p>`:""}<span class="pill">${s.active?"Activo":"Inactivo"}</span><p class="meta">⏱ ${s.duration_minutes} min · 💰 ${price(s.price)}</p><div class="actions-grid"><button class="secondary" data-edit-service="${s.id}">Editar</button><button class="secondary" data-delete-service="${s.id}">Eliminar</button></div></article>`).join("");
 list.querySelectorAll("[data-edit-service]").forEach(b=>b.onclick=()=>{const x=r.data.find(v=>v.id===b.dataset.editService);openService(x)});
 list.querySelectorAll("[data-delete-service]").forEach(b=>b.onclick=()=>deleteRow("services",b.dataset.deleteService,loadServices));
}
function openService(x=null){editing.service=x?.id||null;toggle("serviceFormWrap");if(x){$("serviceFormTitle").textContent="EDITAR SERVICIO";$("serviceName").value=x.name;$("serviceDescription").value=x.description||"";$("serviceDuration").value=x.duration_minutes;$("servicePrice").value=x.price;$("serviceActive").value=String(x.active)}else{$("serviceForm").reset();$("serviceDuration").value=30;$("servicePrice").value=0;$("serviceActive").value="true";$("serviceFormTitle").textContent="NUEVO SERVICIO"}}
$("newServiceBtn").onclick=()=>openService();$("cancelServiceBtn").onclick=()=>{toggle("serviceFormWrap",false);resetForm("service")};
$("serviceForm").onsubmit=async e=>{e.preventDefault();const p={business_id:currentBusiness.id,name:$("serviceName").value.trim(),description:$("serviceDescription").value.trim()||null,duration_minutes:Number($("serviceDuration").value),price:Number($("servicePrice").value),active:$("serviceActive").value==="true"};let r=editing.service?await client.from("services").update(p).eq("id",editing.service):await client.from("services").insert({...p,created_by:currentUser.id});if(r.error){msg("serviceStatus",r.error.message);return}toggle("serviceFormWrap",false);resetForm("service");await loadServices()};

async function loadProfessionals(){
 const list=$("professionalsList");list.innerHTML='<div class="card"><p class="lead">Cargando...</p></div>';
 const r=await client.from("professionals").select("*").eq("business_id",currentBusiness.id).order("first_name").order("last_name");
 if(r.error){list.innerHTML=`<div class="card"><p class="status">${esc(r.error.message)}</p></div>`;return}
 if(!r.data?.length){list.innerHTML='<div class="card"><p class="lead">Aún no hay profesionales. Crea el primero para comenzar a configurar tu agenda.</p></div>';return}
 list.innerHTML=r.data.map(p=>`<article class="card module-card"><h3>${esc(p.first_name+" "+p.last_name)}</h3><p class="meta">${esc([p.email,p.phone].filter(Boolean).join(" · "))}</p><span class="pill">${p.active?"Activo":"Inactivo"}</span>${p.bio?`<p class="note">${esc(p.bio)}</p>`:""}<div class="actions-grid"><button class="secondary" data-edit-prof="${p.id}">Editar</button><button class="secondary" data-delete-prof="${p.id}">Eliminar</button></div></article>`).join("");
 list.querySelectorAll("[data-edit-prof]").forEach(b=>b.onclick=()=>openProfessional(r.data.find(v=>v.id===b.dataset.editProf)));
 list.querySelectorAll("[data-delete-prof]").forEach(b=>b.onclick=()=>deleteRow("professionals",b.dataset.deleteProf,()=>Promise.all([loadProfessionals(),loadSchedules(),loadAvailability()])));
 fillProfessionalSelects(r.data);
}
function fillProfessionalSelects(data){["scheduleProfessional","availabilityProfessional"].forEach(id=>{const e=$(id);if(!e)return;e.innerHTML=data.map(p=>`<option value="${p.id}">${esc(p.first_name+" "+p.last_name)}</option>`).join("")})}
function openProfessional(x=null){editing.professional=x?.id||null;toggle("professionalFormWrap");if(x){$("professionalFormTitle").textContent="EDITAR PROFESIONAL";$("professionalFirstName").value=x.first_name;$("professionalLastName").value=x.last_name;$("professionalEmail").value=x.email||"";$("professionalPhone").value=x.phone||"";$("professionalBio").value=x.bio||"";$("professionalActive").value=String(x.active)}else{$("professionalForm").reset();$("professionalActive").value="true";$("professionalFormTitle").textContent="NUEVO PROFESIONAL"}}
$("newProfessionalBtn").onclick=()=>openProfessional();$("cancelProfessionalBtn").onclick=()=>{toggle("professionalFormWrap",false);resetForm("professional")};
$("professionalForm").onsubmit=async e=>{e.preventDefault();const p={business_id:currentBusiness.id,first_name:$("professionalFirstName").value.trim(),last_name:$("professionalLastName").value.trim(),email:$("professionalEmail").value.trim()||null,phone:$("professionalPhone").value.trim()||null,bio:$("professionalBio").value.trim()||null,active:$("professionalActive").value==="true"};let r=editing.professional?await client.from("professionals").update(p).eq("id",editing.professional):await client.from("professionals").insert({...p,created_by:currentUser.id});if(r.error){msg("professionalStatus",r.error.message);return}toggle("professionalFormWrap",false);resetForm("professional");await loadProfessionals()};

async function loadSchedules(){
 const list=$("schedulesList");list.innerHTML='<div class="card"><p class="lead">Cargando...</p></div>';
 const r=await client.from("professional_schedules").select("*").eq("business_id",currentBusiness.id).order("day_of_week").order("start_time");
 if(r.error){list.innerHTML=`<div class="card"><p class="status">${esc(r.error.message)}</p></div>`;return}
 const profs=await client.from("professionals").select("id,first_name,last_name").eq("business_id",currentBusiness.id);
 const pm=new Map((profs.data||[]).map(p=>[p.id,p.first_name+" "+p.last_name]));
 if(!r.data?.length){list.innerHTML='<div class="card"><p class="lead">Aún no hay horarios. Crea el primero.</p></div>';return}
 list.innerHTML=r.data.map(s=>`<article class="card module-card"><h3>${esc(pm.get(s.professional_id)||"Profesional")}</h3><p class="meta">${days[s.day_of_week]}</p><span class="pill">${s.active?"Activo":"Inactivo"}</span><h3>${esc(s.start_time?.slice(0,5))} – ${esc(s.end_time?.slice(0,5))}</h3><div class="actions-grid"><button class="secondary" data-edit-sch="${s.id}">Editar</button><button class="secondary" data-delete-sch="${s.id}">Eliminar</button></div></article>`).join("");
 list.querySelectorAll("[data-edit-sch]").forEach(b=>b.onclick=()=>openSchedule(r.data.find(v=>v.id===b.dataset.editSch)));
 list.querySelectorAll("[data-delete-sch]").forEach(b=>b.onclick=()=>deleteRow("professional_schedules",b.dataset.deleteSch,loadSchedules));
}
function openSchedule(x=null){editing.schedule=x?.id||null;toggle("scheduleFormWrap");if(x){$("scheduleFormTitle").textContent="EDITAR HORARIO";$("scheduleProfessional").value=x.professional_id;$("scheduleDay").value=x.day_of_week;$("scheduleStart").value=x.start_time.slice(0,5);$("scheduleEnd").value=x.end_time.slice(0,5);$("scheduleActive").value=String(x.active)}else{$("scheduleForm").reset();$("scheduleStart").value="09:00";$("scheduleEnd").value="18:00";$("scheduleActive").value="true";$("scheduleFormTitle").textContent="NUEVO HORARIO"}}
$("newScheduleBtn").onclick=()=>openSchedule();$("cancelScheduleBtn").onclick=()=>{toggle("scheduleFormWrap",false);resetForm("schedule")};
$("scheduleForm").onsubmit=async e=>{e.preventDefault();const start=$("scheduleStart").value,end=$("scheduleEnd").value;if(start>=end){msg("scheduleStatus","La hora de inicio debe ser anterior a la hora de término.");return}const p={business_id:currentBusiness.id,professional_id:$("scheduleProfessional").value,day_of_week:Number($("scheduleDay").value),start_time:start,end_time:end,active:$("scheduleActive").value==="true"};let r=editing.schedule?await client.from("professional_schedules").update(p).eq("id",editing.schedule):await client.from("professional_schedules").insert({...p,created_by:currentUser.id});if(r.error){msg("scheduleStatus",r.error.message);return}toggle("scheduleFormWrap",false);resetForm("schedule");await loadSchedules()};

async function loadAvailability(){
 const list=$("availabilityList");list.innerHTML='<div class="card"><p class="lead">Cargando...</p></div>';
 const r=await client.from("professional_availability").select("*").eq("business_id",currentBusiness.id).order("availability_date").order("start_time");
 if(r.error){list.innerHTML=`<div class="card"><p class="status">${esc(r.error.message)}</p></div>`;return}
 const profs=await client.from("professionals").select("id,first_name,last_name").eq("business_id",currentBusiness.id);
 const pm=new Map((profs.data||[]).map(p=>[p.id,p.first_name+" "+p.last_name]));
 if(!r.data?.length){list.innerHTML='<div class="card"><p class="lead">Aún no hay disponibilidades. Crea la primera.</p></div>';return}
 list.innerHTML=r.data.map(a=>`<article class="card module-card"><h3>${esc(pm.get(a.professional_id)||"Profesional")}</h3><p class="meta">${esc(new Date(a.availability_date+"T00:00:00").toLocaleDateString("es-CL"))}</p><span class="pill">${a.status==="available"?"Disponible":"Bloqueado"}${a.active?"":" · Inactivo"}</span><h3>${esc(a.start_time.slice(0,5))} – ${esc(a.end_time.slice(0,5))}</h3>${a.note?`<p class="note">${esc(a.note)}</p>`:""}<div class="actions-grid"><button class="secondary" data-edit-av="${a.id}">Editar</button><button class="secondary" data-delete-av="${a.id}">Eliminar</button></div></article>`).join("");
 list.querySelectorAll("[data-edit-av]").forEach(b=>b.onclick=()=>openAvailability(r.data.find(v=>v.id===b.dataset.editAv)));
 list.querySelectorAll("[data-delete-av]").forEach(b=>b.onclick=()=>deleteRow("professional_availability",b.dataset.deleteAv,loadAvailability));
}
function openAvailability(x=null){editing.availability=x?.id||null;toggle("availabilityFormWrap");if(x){$("availabilityFormTitle").textContent="EDITAR DISPONIBILIDAD";$("availabilityProfessional").value=x.professional_id;$("availabilityDate").value=x.availability_date;$("availabilityStart").value=x.start_time.slice(0,5);$("availabilityEnd").value=x.end_time.slice(0,5);$("availabilityStatus").value=x.status;$("availabilityActive").value=String(x.active);$("availabilityNote").value=x.note||""}else{$("availabilityForm").reset();$("availabilityStart").value="09:00";$("availabilityEnd").value="18:00";$("availabilityActive").value="true";$("availabilityFormTitle").textContent="NUEVA DISPONIBILIDAD"}}
$("newAvailabilityBtn").onclick=()=>openAvailability();$("cancelAvailabilityBtn").onclick=()=>{toggle("availabilityFormWrap",false);resetForm("availability")};
$("availabilityForm").onsubmit=async e=>{e.preventDefault();const start=$("availabilityStart").value,end=$("availabilityEnd").value;if(start>=end){msg("availabilityFormStatus","La hora de inicio debe ser anterior a la hora de término.");return}const p={business_id:currentBusiness.id,professional_id:$("availabilityProfessional").value,availability_date:$("availabilityDate").value,start_time:start,end_time:end,status:$("availabilityStatus").value,active:$("availabilityActive").value==="true",note:$("availabilityNote").value.trim()||null};let r=editing.availability?await client.from("professional_availability").update(p).eq("id",editing.availability):await client.from("professional_availability").insert({...p,created_by:currentUser.id});if(r.error){msg("availabilityFormStatus",r.error.message);return}toggle("availabilityFormWrap",false);resetForm("availability");await loadAvailability()};

async function loadClients(){
 const list=$("clientsList");list.innerHTML='<div class="card"><p class="lead">Cargando...</p></div>';
 const r=await client.from("clients").select("*").eq("business_id",currentBusiness.id).order("first_name").order("last_name");
 if(r.error){list.innerHTML=`<div class="card"><p class="status">${esc(r.error.message)}</p></div>`;return}
 if(!r.data?.length){list.innerHTML='<div class="card"><p class="lead">Aún no hay clientes. Crea el primero para comenzar.</p></div>';return}
 list.innerHTML=r.data.map(c=>`<article class="card module-card"><h3>${esc(c.first_name+" "+c.last_name)}</h3><p class="meta">${esc([c.email,c.phone].filter(Boolean).join(" · "))}</p><span class="pill">${c.active?"Activo":"Inactivo"}</span>${c.notes?`<p class="note">${esc(c.notes)}</p>`:""}<div class="actions-grid"><button class="secondary" data-edit-cli="${c.id}">Editar</button><button class="secondary" data-delete-cli="${c.id}">Eliminar</button></div></article>`).join("");
 list.querySelectorAll("[data-edit-cli]").forEach(b=>b.onclick=()=>openClient(r.data.find(v=>v.id===b.dataset.editCli)));
 list.querySelectorAll("[data-delete-cli]").forEach(b=>b.onclick=()=>deleteRow("clients",b.dataset.deleteCli,loadClients));
}
function openClient(x=null){editing.client=x?.id||null;toggle("clientFormWrap");if(x){$("clientFormTitle").textContent="EDITAR CLIENTE";$("clientFirstName").value=x.first_name;$("clientLastName").value=x.last_name;$("clientEmail").value=x.email||"";$("clientPhone").value=x.phone||"";$("clientNotes").value=x.notes||"";$("clientActive").value=String(x.active)}else{$("clientForm").reset();$("clientActive").value="true";$("clientFormTitle").textContent="NUEVO CLIENTE"}}
$("newClientBtn").onclick=()=>openClient();$("cancelClientBtn").onclick=()=>{toggle("clientFormWrap",false);resetForm("client")};
$("clientForm").onsubmit=async e=>{e.preventDefault();const p={business_id:currentBusiness.id,first_name:$("clientFirstName").value.trim(),last_name:$("clientLastName").value.trim(),email:$("clientEmail").value.trim()||null,phone:$("clientPhone").value.trim()||null,notes:$("clientNotes").value.trim()||null,active:$("clientActive").value==="true"};let r=editing.client?await client.from("clients").update(p).eq("id",editing.client):await client.from("clients").insert({...p,created_by:currentUser.id});if(r.error){msg("clientFormStatus",r.error.message);return}toggle("clientFormWrap",false);resetForm("client");await loadClients()};

async function deleteRow(table,id,reload){if(!confirm("¿Eliminar este registro?"))return;const r=await client.from(table).delete().eq("id",id);if(r.error){alert(r.error.message);return}await reload()}

async function loadBookingReferences(){
  const [clients,services,professionals]=await Promise.all([
    client.from("clients").select("id,first_name,last_name").eq("business_id",currentBusiness.id).eq("active",true).order("first_name").order("last_name"),
    client.from("services").select("id,name,duration_minutes,price").eq("business_id",currentBusiness.id).eq("active",true).order("name"),
    client.from("professionals").select("id,first_name,last_name").eq("business_id",currentBusiness.id).eq("active",true).order("first_name").order("last_name")
  ]);
  if(clients.error||services.error||professionals.error){
    msg("bookingFormStatus",(clients.error||services.error||professionals.error).message);
    return false;
  }
  $("bookingClient").innerHTML=(clients.data||[]).map(x=>`<option value="${x.id}">${esc(x.first_name+" "+x.last_name)}</option>`).join("");
  $("bookingService").innerHTML=(services.data||[]).map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join("");
  $("bookingProfessional").innerHTML=(professionals.data||[]).map(x=>`<option value="${x.id}">${esc(x.first_name+" "+x.last_name)}</option>`).join("");
  return true;
}

function bookingStatusLabel(s){
  return ({pending:"Pendiente",confirmed:"Confirmada",cancelled:"Cancelada",completed:"Completada",no_show:"No asistió"})[s]||s;
}

async function loadBookings(){
  const list=$("bookingsList");
  list.innerHTML='<div class="card"><p class="lead">Cargando...</p></div>';
  const r=await client.from("bookings").select("*,clients(first_name,last_name),services(name),professionals(first_name,last_name)").eq("business_id",currentBusiness.id).order("booking_date").order("start_time");
  if(r.error){list.innerHTML=`<div class="card"><p class="status">${esc(r.error.message)}</p></div>`;return}
  if(!r.data?.length){list.innerHTML='<div class="card"><p class="lead">Aún no hay reservas. Crea la primera.</p></div>';return}
  list.innerHTML=r.data.map(b=>{
    const clientName=b.clients?`${b.clients.first_name} ${b.clients.last_name}`:"Cliente";
    const professional=b.professionals?`${b.professionals.first_name} ${b.professionals.last_name}`:"Profesional";
    const service=b.services?.name||"Servicio";
    const date=new Date(b.booking_date+"T00:00:00").toLocaleDateString("es-CL");
    return `<article class="card module-card">
      <h3>${esc(clientName)}</h3>
      <p class="meta">${esc(service)} · ${esc(professional)}</p>
      <p class="meta">${esc(date)} · ${esc(b.start_time.slice(0,5))} – ${esc(b.end_time.slice(0,5))}</p>
      <span class="pill">${esc(bookingStatusLabel(b.status))}</span>
      ${b.notes?`<p class="note">${esc(b.notes)}</p>`:""}
      <div class="actions-grid">
        <button class="secondary" data-edit-booking="${b.id}">Editar</button>
        <button class="secondary" data-delete-booking="${b.id}">Eliminar</button>
      </div>
    </article>`;
  }).join("");
  list.querySelectorAll("[data-edit-booking]").forEach(b=>b.onclick=async()=>{
    const x=r.data.find(v=>v.id===b.dataset.editBooking);
    await openBooking(x);
  });
  list.querySelectorAll("[data-delete-booking]").forEach(b=>b.onclick=()=>deleteRow("bookings",b.dataset.deleteBooking,loadBookings));
}

async function openBooking(x=null){
  editing.booking=x?.id||null;
  const ok=await loadBookingReferences();
  if(!ok)return;
  toggle("bookingFormWrap");
  if(x){
    $("bookingFormTitle").textContent="EDITAR RESERVA";
    $("bookingClient").value=x.client_id;
    $("bookingService").value=x.service_id;
    $("bookingProfessional").value=x.professional_id;
    $("bookingDate").value=x.booking_date;
    $("bookingStart").value=x.start_time.slice(0,5);
    $("bookingEnd").value=x.end_time.slice(0,5);
    $("bookingStatus").value=x.status;
    $("bookingNotes").value=x.notes||"";
  }else{
    $("bookingForm").reset();
    $("bookingStart").value="09:00";
    $("bookingEnd").value="09:30";
    $("bookingStatus").value="pending";
    $("bookingFormTitle").textContent="NUEVA RESERVA";
  }
}

$("newBookingBtn").onclick=()=>openBooking();
$("cancelBookingBtn").onclick=()=>{toggle("bookingFormWrap",false);resetForm("booking")};

$("bookingService").addEventListener("change",async()=>{
  const id=$("bookingService").value;
  if(!id)return;
  const r=await client.from("services").select("duration_minutes").eq("id",id).maybeSingle();
  if(r.data?.duration_minutes){
    const [h,m]=$("bookingStart").value.split(":").map(Number);
    const total=h*60+m+Number(r.data.duration_minutes);
    const eh=Math.floor(total/60)%24, em=total%60;
    $("bookingEnd").value=`${String(eh).padStart(2,"0")}:${String(em).padStart(2,"0")}`;
  }
});

$("bookingForm").onsubmit=async e=>{
  e.preventDefault();
  const start=$("bookingStart").value,end=$("bookingEnd").value;
  if(start>=end){msg("bookingFormStatus","La hora de inicio debe ser anterior a la hora de término.");return}
  const p={
    business_id:currentBusiness.id,
    client_id:$("bookingClient").value,
    service_id:$("bookingService").value,
    professional_id:$("bookingProfessional").value,
    booking_date:$("bookingDate").value,
    start_time:start,
    end_time:end,
    status:$("bookingStatus").value,
    notes:$("bookingNotes").value.trim()||null
  };
  let r=editing.booking
    ?await client.from("bookings").update(p).eq("id",editing.booking)
    :await client.from("bookings").insert({...p,created_by:currentUser.id});
  if(r.error){
    msg("bookingFormStatus",r.error.message.includes("booking_professional_overlap")
      ?"El profesional ya tiene una reserva que se cruza con este horario."
      :r.error.message);
    return;
  }
  toggle("bookingFormWrap",false);
  resetForm("booking");
  await loadBookings();
};

const originalRouteUser=routeUser;
routeUser=async function(){
  await originalRouteUser();
  if(currentBusiness) await loadBookings();
};

/* SOMOS AGENDA · CALENDARIO V0.1 */
let calendarCursor=new Date();
let calendarBookings=[];
let calendarProfessionals=[];
let calendarSelectedDate=null;

function calendarDateKey(y,m,d){return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`}
function calendarParseDate(s){const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)}
function calendarMonthLabel(d){return d.toLocaleDateString('es-CL',{month:'long',year:'numeric'}).replace(/^./,c=>c.toUpperCase())}
function calendarStatusLabel(s){return ({pending:'Pendiente',confirmed:'Confirmada',cancelled:'Cancelada',completed:'Completada',no_show:'No asistió'})[s]||s}

async function loadCalendar(){
  if(!currentBusiness)return;
  const [b,p]=await Promise.all([
    client.from('bookings').select('id,client_id,service_id,professional_id,booking_date,start_time,end_time,status,notes,clients(first_name,last_name),services(name),professionals(first_name,last_name)').eq('business_id',currentBusiness.id).order('booking_date').order('start_time'),
    client.from('professionals').select('id,first_name,last_name').eq('business_id',currentBusiness.id).order('first_name').order('last_name')
  ]);
  if(b.error||p.error){
    const d=$('calendarDayDetail');
    if(d)d.innerHTML=`<p class="status">${esc((b.error||p.error).message)}</p>`;
    return;
  }
  calendarBookings=b.data||[];
  calendarProfessionals=p.data||[];
  const filter=$('calendarProfessionalFilter');
  if(filter){
    const previous=filter.value||'all';
    filter.innerHTML='<option value="all">Todos los profesionales</option>'+calendarProfessionals.map(x=>`<option value="${x.id}">${esc(x.first_name+' '+x.last_name)}</option>`).join('');
    filter.value=calendarProfessionals.some(x=>x.id===previous)?previous:'all';
  }
  renderCalendar();
}

function calendarFilteredBookings(){
  const filter=$('calendarProfessionalFilter')?.value||'all';
  return calendarBookings.filter(x=>filter==='all'||x.professional_id===filter);
}

function renderCalendar(){
  const grid=$('calendarGrid');
  if(!grid)return;
  const y=calendarCursor.getFullYear(), m=calendarCursor.getMonth();
  $('calendarMonthTitle').textContent=calendarMonthLabel(calendarCursor);
  const items=calendarFilteredBookings();
  const first=new Date(y,m,1);
  const daysInMonth=new Date(y,m+1,0).getDate();
  const mondayOffset=(first.getDay()+6)%7;
  const prevDays=new Date(y,m,0).getDate();
  const today=new Date();
  const todayKey=calendarDateKey(today.getFullYear(),today.getMonth(),today.getDate());
  const selected=calendarSelectedDate;
  let html=['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(x=>`<div class="calendar-weekday">${x}</div>`).join('');
  for(let i=0;i<42;i++){
    const dayNum=i-mondayOffset+1;
    let dateObj, muted=false;
    if(dayNum<1){dateObj=new Date(y,m-1,prevDays+dayNum);muted=true}
    else if(dayNum>daysInMonth){dateObj=new Date(y,m+1,dayNum-daysInMonth);muted=true}
    else dateObj=new Date(y,m,dayNum);
    const key=calendarDateKey(dateObj.getFullYear(),dateObj.getMonth(),dateObj.getDate());
    const dayItems=items.filter(x=>x.booking_date===key&&x.status!=='cancelled');
    const classes=['calendar-day'];
    if(muted)classes.push('muted');
    if(key===todayKey)classes.push('today');
    if(key===selected)classes.push('selected');
    html+=`<button type="button" class="${classes.join(' ')}" data-calendar-date="${key}">
      <span class="calendar-day-number">${dateObj.getDate()}</span>
      ${dayItems.length?`<span class="calendar-event-dot"></span><span class="calendar-event-count">${dayItems.length} ${dayItems.length===1?'reserva':'reservas'}</span>`:''}
    </button>`;
  }
  grid.innerHTML=html;
  grid.querySelectorAll('[data-calendar-date]').forEach(btn=>btn.onclick=()=>{calendarSelectedDate=btn.dataset.calendarDate;renderCalendar();setTimeout(()=>$("calendarDayDetail")?.scrollIntoView({behavior:"smooth",block:"start"}),40)});
  const monthItems=items.filter(x=>{const d=calendarParseDate(x.booking_date);return d.getFullYear()===y&&d.getMonth()===m});
  $('calendarMonthCount').textContent=monthItems.length;
  $('calendarConfirmedCount').textContent=monthItems.filter(x=>x.status==='confirmed').length;
  $('calendarPendingCount').textContent=monthItems.filter(x=>x.status==='pending').length;
  if(!calendarSelectedDate){const isCurrentMonth=y===today.getFullYear()&&m===today.getMonth();calendarSelectedDate=isCurrentMonth?todayKey:calendarDateKey(y,m,1)}
  renderCalendarDayDetail();
}

function renderCalendarDayDetail(){
  const box=$('calendarDayDetail');
  if(!box)return;
  const items=calendarFilteredBookings().filter(x=>x.booking_date===calendarSelectedDate&&x.status!=='cancelled');
  const date=calendarParseDate(calendarSelectedDate);
  const label=date.toLocaleDateString('es-CL',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).replace(/^./,c=>c.toUpperCase());
  if(!items.length){box.innerHTML=`<h3>${esc(label)}</h3><p class="calendar-day-empty">No hay reservas para este día.</p>`;return}
  box.innerHTML=`<h3>${esc(label)}</h3>`+items.map(x=>{
    const c=x.clients?`${x.clients.first_name} ${x.clients.last_name}`:'Cliente';
    const p=x.professionals?`${x.professionals.first_name} ${x.professionals.last_name}`:'Profesional';
    const s=x.services?.name||'Servicio';
    return `<div class="calendar-event"><div class="calendar-event-time">${esc(x.start_time.slice(0,5))} – ${esc(x.end_time.slice(0,5))}</div><div class="calendar-event-title">${esc(c)}</div><div class="calendar-event-meta">${esc(s)} · ${esc(p)}</div><span class="calendar-event-status">${esc(calendarStatusLabel(x.status))}</span>${x.notes?`<div class="calendar-event-meta">${esc(x.notes)}</div>`:''}</div>`;
  }).join('');
}

$('calendarPrev').onclick=()=>{calendarCursor=new Date(calendarCursor.getFullYear(),calendarCursor.getMonth()-1,1);calendarSelectedDate=null;renderCalendar()};
$('calendarNext').onclick=()=>{calendarCursor=new Date(calendarCursor.getFullYear(),calendarCursor.getMonth()+1,1);calendarSelectedDate=null;renderCalendar()};
$('calendarToday').onclick=()=>{calendarCursor=new Date();calendarSelectedDate=calendarDateKey(calendarCursor.getFullYear(),calendarCursor.getMonth(),calendarCursor.getDate());renderCalendar()};
$('calendarProfessionalFilter').onchange=()=>{calendarSelectedDate=null;renderCalendar()};

const routeUserWithCalendar=routeUser;
routeUser=async function(){
  await routeUserWithCalendar();
  if(currentBusiness)await loadCalendar();
};


if(client)client.auth.onAuthStateChange((event,session)=>{currentUser=session?.user||null;if(session)setTimeout(()=>routeUser(),0);else if(event==="SIGNED_OUT")show(authView)});
loadUser();
