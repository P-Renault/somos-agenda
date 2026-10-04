const cfg=window.SOMOS_CONFIG||{};
const $=id=>document.getElementById(id);
const authView=$("authView"), onboardingView=$("onboardingView"), dashboardView=$("dashboardView");
let client=null,currentUser=null,currentBusiness=null;
let editing={service:null,professional:null,schedule:null,availability:null,client:null};

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
 $("welcomeTitle").textContent="Hola, "+(currentUser.user_metadata?.full_name||currentUser.email||"usuario");
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

if(client)client.auth.onAuthStateChange((event,session)=>{currentUser=session?.user||null;if(session)setTimeout(()=>routeUser(),0);else if(event==="SIGNED_OUT")show(authView)});
loadUser();
