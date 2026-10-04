const cfg=window.SOMOS_CONFIG||{};const statusEl=document.getElementById("status"),onboardingStatus=document.getElementById("onboardingStatus"),authView=document.getElementById("authView"),onboardingView=document.getElementById("onboardingView"),dashboardView=document.getElementById("dashboardView");let client=null,currentUser=null,currentBusiness=null;function status(m,t=statusEl){t.textContent=m||""}function show(v){[authView,onboardingView,dashboardView].forEach(x=>x.classList.add("hidden"));v.classList.remove("hidden")}function validConfig(){return cfg.SUPABASE_URL&&!cfg.SUPABASE_URL.startsWith("REEMPLAZAR")&&cfg.SUPABASE_ANON_KEY&&!cfg.SUPABASE_ANON_KEY.startsWith("REEMPLAZAR")}if(validConfig())client=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY);else status("Configura SUPABASE_URL y SUPABASE_ANON_KEY en config.js.");async function loadUser(){if(!client)return;const r=await client.auth.getSession();if(r.data.session){currentUser=r.data.session.user;await routeUser()}else show(authView)}async function routeUser(){const r=await client.from("business_members").select("business_id,role,active,businesses(id,name,slug,active)").eq("user_id",currentUser.id).eq("active",true);if(r.error){status(r.error.message);return}if(!r.data||!r.data.length){show(onboardingView);return}const m=r.data[0];currentBusiness=m.businesses;document.getElementById("welcomeTitle").textContent="Hola,";document.getElementById("userEmail").textContent=currentUser.email||"usuario";document.getElementById("businessSummary").textContent=currentBusiness.name+" · "+currentBusiness.slug;document.getElementById("roleValue").textContent=m.role;show(dashboardView)}async function emailAuth(mode){if(!client)return;const email=document.getElementById("email").value.trim(),password=document.getElementById("password").value,r=mode==="signup"?await client.auth.signUp({email,password}):await client.auth.signInWithPassword({email,password});if(r.error){status(r.error.message);return}status(mode==="signup"?(r.data.session?"Cuenta creada.":"Cuenta creada. Revisa tu correo."):"Sesión iniciada.");if(mode==="login")await loadUser()}document.getElementById("emailForm").addEventListener("submit",e=>{e.preventDefault();emailAuth("login")});document.getElementById("signupBtn").onclick=()=>emailAuth("signup");document.getElementById("recoveryBtn").onclick=async()=>{if(!client)return;const email=document.getElementById("email").value.trim();if(!email){status("Escribe primero tu correo.");return}const r=await client.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});status(r.error?r.error.message:"Revisa tu correo para recuperar la contraseña.")};async function oauth(provider){if(!client)return;const r=await client.auth.signInWithOAuth({provider,options:{redirectTo:location.origin+location.pathname}});if(r.error)status(r.error.message)}document.getElementById("googleBtn").onclick=()=>oauth("google");document.getElementById("facebookBtn").onclick=()=>oauth("facebook");document.getElementById("businessForm").addEventListener("submit",async e=>{e.preventDefault();if(!client||!currentUser)return;status("",onboardingStatus);const r=await client.rpc("create_business",{p_name:document.getElementById("businessName").value.trim(),p_slug:document.getElementById("businessSlug").value.trim().toLowerCase(),p_legal_name:null,p_email:document.getElementById("businessEmail").value.trim()||null,p_phone:document.getElementById("businessPhone").value.trim()||null});if(r.error){status(r.error.message,onboardingStatus);return}status("Negocio creado correctamente.",onboardingStatus);await routeUser()});async function logout(){if(client)await client.auth.signOut();currentUser=null;currentBusiness=null;show(authView)}document.getElementById("logoutBtn").onclick=logout;document.getElementById("logoutOnboarding").onclick=logout;if(client){client.auth.onAuthStateChange((_e,s)=>{currentUser=s?.user||null;if(currentUser)setTimeout(()=>routeUser(),0);else show(authView)});loadUser()}


/* SOMOS AGENDA · SERVICES V0.1 · CRUD */
let editingServiceId=null;
const servicesView=document.getElementById("servicesView");
const servicesList=document.getElementById("servicesList");
const serviceFormCard=document.getElementById("serviceFormCard");
const serviceForm=document.getElementById("serviceForm");
const serviceFormEyebrow=document.getElementById("serviceFormEyebrow");
const serviceFormStatus=document.getElementById("serviceFormStatus");
const serviceName=document.getElementById("serviceName");
const serviceDuration=document.getElementById("serviceDuration");
const servicePrice=document.getElementById("servicePrice");
const serviceActive=document.getElementById("serviceActive");
const serviceDescription=document.getElementById("serviceDescription");
const newServiceBtn=document.getElementById("newServiceBtn");
const cancelServiceBtn=document.getElementById("cancelServiceBtn");
const saveServiceBtn=document.getElementById("saveServiceBtn");

function canManageServices(){return currentBusiness && ["owner","admin"].includes(document.getElementById("roleValue")?.textContent);}
function moneyCLP(v){return new Intl.NumberFormat("es-CL",{style:"currency",currency:"CLP",maximumFractionDigits:0}).format(Number(v)||0)}
function serviceStatus(m="",ok=false){serviceFormStatus.textContent=m;serviceFormStatus.style.color=ok?"#198754":""}
function resetServiceForm(){editingServiceId=null;serviceForm.reset();serviceDuration.value=30;servicePrice.value=0;serviceActive.value="true";serviceFormEyebrow.textContent="NUEVO SERVICIO";saveServiceBtn.textContent="Guardar servicio";serviceFormStatus.textContent="";serviceFormCard.classList.add("hidden")}
function openServiceForm(service=null){
  if(!canManageServices()){alert("Solo el propietario o administrador puede gestionar servicios.");return}
  serviceFormCard.classList.remove("hidden");
  editingServiceId=service?.id||null;
  serviceFormEyebrow.textContent=editingServiceId?"EDITAR SERVICIO":"NUEVO SERVICIO";
  saveServiceBtn.textContent=editingServiceId?"Guardar cambios":"Guardar servicio";
  serviceName.value=service?.name||"";
  serviceDuration.value=service?.duration_minutes||30;
  servicePrice.value=service?.price??0;
  serviceActive.value=String(service?.active??true);
  serviceDescription.value=service?.description||"";
  serviceFormStatus.textContent="";
  serviceFormCard.scrollIntoView({behavior:"smooth",block:"start"});
}
async function loadServices(){
  if(!client||!currentBusiness)return;
  servicesView.classList.remove("hidden");
  servicesList.innerHTML='<div class="card services-empty">Cargando servicios…</div>';
  const r=await client.from("services").select("id,name,description,duration_minutes,price,active,created_at,updated_at").eq("business_id",currentBusiness.id).order("active",{ascending:false}).order("name",{ascending:true});
  if(r.error){servicesList.innerHTML='<div class="card services-empty">No se pudieron cargar los servicios: '+escapeHtml(r.error.message)+'</div>';return}
  renderServices(r.data||[]);
}
function escapeHtml(v){return String(v??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]))}
function renderServices(items){
  if(!items.length){servicesList.innerHTML='<div class="card services-empty">Aún no hay servicios. Crea el primero para comenzar a configurar tu agenda.</div>';return}
  servicesList.innerHTML=items.map(s=>`<article class="card service-card"><div class="service-card-top"><div><p class="service-name">${escapeHtml(s.name)}</p>${s.description?`<p class="service-description">${escapeHtml(s.description)}</p>`:""}</div><span class="service-badge ${s.active?"":"inactive"}">${s.active?"Activo":"Inactivo"}</span></div><div class="service-meta"><span>⏱ ${Number(s.duration_minutes)} min</span><span>💰 ${moneyCLP(s.price)}</span></div>${canManageServices()?`<div class="service-actions"><button type="button" class="secondary edit-service" data-id="${s.id}">Editar</button><button type="button" class="secondary delete-service" data-id="${s.id}">Eliminar</button></div>`:""}</article>`).join("");
  servicesList.querySelectorAll(".edit-service").forEach(b=>b.onclick=()=>{const item=items.find(x=>x.id===b.dataset.id);if(item)openServiceForm(item)});
  servicesList.querySelectorAll(".delete-service").forEach(b=>b.onclick=()=>deleteService(b.dataset.id));
}
async function saveService(){
  if(!client||!currentBusiness||!currentUser)return;
  if(!canManageServices()){serviceStatus("No tienes permisos para gestionar servicios.");return}
  const name=serviceName.value.trim(),description=serviceDescription.value.trim()||null,duration=Number(serviceDuration.value),price=Number(servicePrice.value),active=serviceActive.value==="true";
  if(!name){serviceStatus("El nombre es obligatorio.");return}
  if(!Number.isInteger(duration)||duration<5||duration>1440){serviceStatus("La duración debe estar entre 5 y 1440 minutos.");return}
  if(!Number.isFinite(price)||price<0){serviceStatus("El precio no puede ser negativo.");return}
  saveServiceBtn.disabled=true;serviceStatus("Guardando…");
  let r;
  if(editingServiceId){r=await client.from("services").update({name,description,duration_minutes:duration,price,active}).eq("id",editingServiceId).eq("business_id",currentBusiness.id).select().single()}
  else{r=await client.from("services").insert({business_id:currentBusiness.id,name,description,duration_minutes:duration,price,active,created_by:currentUser.id}).select().single()}
  saveServiceBtn.disabled=false;
  if(r.error){serviceStatus(r.error.message);return}
  resetServiceForm();await loadServices();
}
async function deleteService(id){
  if(!client||!currentBusiness||!canManageServices())return;
  const item=servicesList.querySelector(`.delete-service[data-id="${id}"]`)?.closest(".service-card");
  const name=item?.querySelector(".service-name")?.textContent||"este servicio";
  if(!confirm(`¿Eliminar ${name}? Esta acción no se puede deshacer.`))return;
  const r=await client.from("services").delete().eq("id",id).eq("business_id",currentBusiness.id);
  if(r.error){alert("No se pudo eliminar: "+r.error.message);return}
  await loadServices();
}
newServiceBtn?.addEventListener("click",()=>openServiceForm());
cancelServiceBtn?.addEventListener("click",resetServiceForm);
serviceForm?.addEventListener("submit",e=>{e.preventDefault();saveService()});


/* SOMOS AGENDA · PROFESSIONALS V0.1 · CRUD */
let editingProfessionalId=null;
const professionalsView=document.getElementById("professionalsView");
const professionalsList=document.getElementById("professionalsList");
const professionalFormCard=document.getElementById("professionalFormCard");
const professionalForm=document.getElementById("professionalForm");
const professionalFormEyebrow=document.getElementById("professionalFormEyebrow");
const professionalFormStatus=document.getElementById("professionalFormStatus");
const professionalFirstName=document.getElementById("professionalFirstName");
const professionalLastName=document.getElementById("professionalLastName");
const professionalEmail=document.getElementById("professionalEmail");
const professionalPhone=document.getElementById("professionalPhone");
const professionalActive=document.getElementById("professionalActive");
const professionalBio=document.getElementById("professionalBio");
const newProfessionalBtn=document.getElementById("newProfessionalBtn");
const cancelProfessionalBtn=document.getElementById("cancelProfessionalBtn");
const saveProfessionalBtn=document.getElementById("saveProfessionalBtn");
function canManageProfessionals(){return currentBusiness&&["owner","admin"].includes(document.getElementById("roleValue")?.textContent)}
function professionalStatus(m="",ok=false){professionalFormStatus.textContent=m;professionalFormStatus.style.color=ok?"#198754":""}
function resetProfessionalForm(){editingProfessionalId=null;professionalForm.reset();professionalActive.value="true";professionalFormEyebrow.textContent="NUEVO PROFESIONAL";saveProfessionalBtn.textContent="Guardar profesional";professionalFormStatus.textContent="";professionalFormCard.classList.add("hidden")}
function openProfessionalForm(item=null){if(!canManageProfessionals()){alert("Solo el propietario o administrador puede gestionar profesionales.");return}professionalFormCard.classList.remove("hidden");editingProfessionalId=item?.id||null;professionalFormEyebrow.textContent=editingProfessionalId?"EDITAR PROFESIONAL":"NUEVO PROFESIONAL";saveProfessionalBtn.textContent=editingProfessionalId?"Guardar cambios":"Guardar profesional";professionalFirstName.value=item?.first_name||"";professionalLastName.value=item?.last_name||"";professionalEmail.value=item?.email||"";professionalPhone.value=item?.phone||"";professionalActive.value=String(item?.active??true);professionalBio.value=item?.bio||"";professionalFormStatus.textContent="";professionalFormCard.scrollIntoView({behavior:"smooth",block:"start"})}
async function loadProfessionals(){if(!client||!currentBusiness)return;professionalsView.classList.remove("hidden");professionalsList.innerHTML='<div class="card professionals-empty">Cargando profesionales…</div>';const r=await client.from("professionals").select("id,first_name,last_name,email,phone,bio,active,created_at,updated_at").eq("business_id",currentBusiness.id).order("active",{ascending:false}).order("last_name",{ascending:true}).order("first_name",{ascending:true});if(r.error){professionalsList.innerHTML='<div class="card professionals-empty">No se pudieron cargar los profesionales: '+escapeHtml(r.error.message)+"</div>";return}renderProfessionals(r.data||[])}
function renderProfessionals(items){if(!items.length){professionalsList.innerHTML='<div class="card professionals-empty">Aún no hay profesionales. Crea el primero para comenzar a configurar tu agenda.</div>';return}professionalsList.innerHTML=items.map(p=>{const full=(p.first_name+" "+p.last_name).trim();const contacts=[p.email,p.phone].filter(Boolean).join(" · ");return `<article class="card professional-card"><div class="professional-card-top"><div><p class="professional-name">${escapeHtml(full)}</p>${contacts?`<p class="professional-contact">${escapeHtml(contacts)}</p>`:""}</div><span class="professional-badge ${p.active?"":"inactive"}">${p.active?"Activo":"Inactivo"}</span></div>${p.bio?`<p class="professional-bio">${escapeHtml(p.bio)}</p>`:""}<div class="professional-meta"><span>👤 Profesional</span></div>${canManageProfessionals()?`<div class="professional-actions"><button type="button" class="secondary edit-professional" data-id="${p.id}">Editar</button><button type="button" class="secondary delete-professional" data-id="${p.id}">Eliminar</button></div>`:""}</article>`}).join("");professionalsList.querySelectorAll(".edit-professional").forEach(b=>b.onclick=()=>{const item=items.find(x=>x.id===b.dataset.id);if(item)openProfessionalForm(item)});professionalsList.querySelectorAll(".delete-professional").forEach(b=>b.onclick=()=>deleteProfessional(b.dataset.id))}
async function saveProfessional(){if(!client||!currentBusiness||!currentUser)return;if(!canManageProfessionals()){professionalStatus("No tienes permisos para gestionar profesionales.");return}const first_name=professionalFirstName.value.trim(),last_name=professionalLastName.value.trim(),email=professionalEmail.value.trim()||null,phone=professionalPhone.value.trim()||null,bio=professionalBio.value.trim()||null,active=professionalActive.value==="true";if(!first_name||!last_name){professionalStatus("Nombre y apellido son obligatorios.");return}saveProfessionalBtn.disabled=true;professionalStatus("Guardando…");let r;if(editingProfessionalId){r=await client.from("professionals").update({first_name,last_name,email,phone,bio,active}).eq("id",editingProfessionalId).eq("business_id",currentBusiness.id).select().single()}else{r=await client.from("professionals").insert({business_id:currentBusiness.id,first_name,last_name,email,phone,bio,active,created_by:currentUser.id}).select().single()}saveProfessionalBtn.disabled=false;if(r.error){professionalStatus(r.error.message);return}resetProfessionalForm();await loadProfessionals()}
async function deleteProfessional(id){if(!client||!currentBusiness||!canManageProfessionals())return;const item=professionalsList.querySelector(`.delete-professional[data-id="${id}"]`)?.closest(".professional-card");const name=item?.querySelector(".professional-name")?.textContent||"este profesional";if(!confirm(`¿Eliminar ${name}? Esta acción no se puede deshacer.`))return;const r=await client.from("professionals").delete().eq("id",id).eq("business_id",currentBusiness.id);if(r.error){alert("No se pudo eliminar: "+r.error.message);return}await loadProfessionals()}
newProfessionalBtn?.addEventListener("click",()=>openProfessionalForm());cancelProfessionalBtn?.addEventListener("click",resetProfessionalForm);professionalForm?.addEventListener("submit",e=>{e.preventDefault();saveProfessional()});



/* SOMOS AGENDA · SCHEDULES V0.1 · CRUD */
let editingScheduleId=null;
const schedulesView=document.getElementById("schedulesView");
const schedulesList=document.getElementById("schedulesList");
const scheduleFormCard=document.getElementById("scheduleFormCard");
const scheduleForm=document.getElementById("scheduleForm");
const scheduleFormEyebrow=document.getElementById("scheduleFormEyebrow");
const scheduleFormStatus=document.getElementById("scheduleFormStatus");
const scheduleProfessional=document.getElementById("scheduleProfessional");
const scheduleDay=document.getElementById("scheduleDay");
const scheduleStart=document.getElementById("scheduleStart");
const scheduleEnd=document.getElementById("scheduleEnd");
const scheduleActive=document.getElementById("scheduleActive");
const newScheduleBtn=document.getElementById("newScheduleBtn");
const cancelScheduleBtn=document.getElementById("cancelScheduleBtn");
const saveScheduleBtn=document.getElementById("saveScheduleBtn");
const scheduleDays={1:"Lunes",2:"Martes",3:"Miércoles",4:"Jueves",5:"Viernes",6:"Sábado",7:"Domingo"};
let scheduleProfessionals=[];
function canManageSchedules(){return currentBusiness&&["owner","admin"].includes(document.getElementById("roleValue")?.textContent)}
function scheduleStatus(m="",ok=false){scheduleFormStatus.textContent=m;scheduleFormStatus.style.color=ok?"#198754":""}
function formatTime(t){return String(t||"").slice(0,5)}
function resetScheduleForm(){editingScheduleId=null;scheduleForm.reset();scheduleActive.value="true";scheduleFormEyebrow.textContent="NUEVO HORARIO";saveScheduleBtn.textContent="Guardar horario";scheduleFormStatus.textContent="";scheduleFormCard.classList.add("hidden")}
function populateScheduleProfessionals(selectedId=""){
  scheduleProfessional.innerHTML=scheduleProfessionals.length?scheduleProfessionals.map(p=>`<option value="${p.id}">${escapeHtml((p.first_name+" "+p.last_name).trim())}${p.active?"":" · Inactivo"}</option>`).join(""):"<option value=\"\">Primero crea un profesional</option>";
  if(selectedId)scheduleProfessional.value=selectedId;
}
function openScheduleForm(item=null){
  if(!canManageSchedules()){alert("Solo el propietario o administrador puede gestionar horarios.");return}
  scheduleFormCard.classList.remove("hidden");
  editingScheduleId=item?.id||null;
  scheduleFormEyebrow.textContent=editingScheduleId?"EDITAR HORARIO":"NUEVO HORARIO";
  saveScheduleBtn.textContent=editingScheduleId?"Guardar cambios":"Guardar horario";
  populateScheduleProfessionals(item?.professional_id||scheduleProfessionals.find(p=>p.active)?.id||scheduleProfessionals[0]?.id||"");
  scheduleDay.value=String(item?.day_of_week??1);
  scheduleStart.value=formatTime(item?.start_time)||"09:00";
  scheduleEnd.value=formatTime(item?.end_time)||"18:00";
  scheduleActive.value=String(item?.active??true);
  scheduleFormStatus.textContent=scheduleProfessionals.length?"":"Primero debes crear al menos un profesional.";
  scheduleFormCard.scrollIntoView({behavior:"smooth",block:"start"});
}
async function loadScheduleProfessionals(){
  if(!client||!currentBusiness)return;
  const r=await client.from("professionals").select("id,first_name,last_name,active").eq("business_id",currentBusiness.id).order("active",{ascending:false}).order("last_name",{ascending:true}).order("first_name",{ascending:true});
  if(r.error){scheduleProfessionals=[];return}
  scheduleProfessionals=r.data||[];
  populateScheduleProfessionals(scheduleProfessional?.value||"");
}
async function loadSchedules(){
  if(!client||!currentBusiness)return;
  schedulesView.classList.remove("hidden");
  schedulesList.innerHTML='<div class="card schedules-empty">Cargando horarios…</div>';
  await loadScheduleProfessionals();
  const r=await client.from("professional_schedules").select("id,professional_id,day_of_week,start_time,end_time,active,created_at,updated_at,professionals(first_name,last_name)").eq("business_id",currentBusiness.id).order("day_of_week",{ascending:true}).order("start_time",{ascending:true});
  if(r.error){schedulesList.innerHTML='<div class="card schedules-empty">No se pudieron cargar los horarios: '+escapeHtml(r.error.message)+"</div>";return}
  renderSchedules(r.data||[]);
}
function renderSchedules(items){
  if(!items.length){schedulesList.innerHTML='<div class="card schedules-empty">Aún no hay horarios. Crea el primero para comenzar a configurar la disponibilidad.</div>';return}
  schedulesList.innerHTML=items.map(s=>{
    const p=s.professionals||{};const name=((p.first_name||"")+" "+(p.last_name||"")).trim()||"Profesional";
    return `<article class="card schedule-card"><div class="schedule-card-top"><div><p class="schedule-professional">${escapeHtml(name)}</p><p class="schedule-day">${scheduleDays[s.day_of_week]||"Día"}</p></div><span class="schedule-badge ${s.active?"":"inactive"}">${s.active?"Activo":"Inactivo"}</span></div><p class="schedule-time">${formatTime(s.start_time)} – ${formatTime(s.end_time)}</p>${canManageSchedules()?`<div class="schedule-actions"><button type="button" class="secondary edit-schedule" data-id="${s.id}">Editar</button><button type="button" class="secondary delete-schedule" data-id="${s.id}">Eliminar</button></div>`:""}</article>`
  }).join("");
  schedulesList.querySelectorAll(".edit-schedule").forEach(b=>b.onclick=()=>{const item=items.find(x=>x.id===b.dataset.id);if(item)openScheduleForm(item)});
  schedulesList.querySelectorAll(".delete-schedule").forEach(b=>b.onclick=()=>deleteSchedule(b.dataset.id));
}
async function saveSchedule(){
  if(!client||!currentBusiness||!currentUser)return;
  if(!canManageSchedules()){scheduleStatus("No tienes permisos para gestionar horarios.");return}
  const professional_id=scheduleProfessional.value,day_of_week=Number(scheduleDay.value),start_time=scheduleStart.value,end_time=scheduleEnd.value,active=scheduleActive.value==="true";
  if(!professional_id){scheduleStatus("Selecciona un profesional.");return}
  if(!start_time||!end_time){scheduleStatus("Debes indicar la hora de inicio y término.");return}
  if(start_time>=end_time){scheduleStatus("La hora de inicio debe ser anterior a la hora de término.");return}
  if(!scheduleProfessionals.some(p=>p.id===professional_id)){scheduleStatus("El profesional seleccionado no pertenece a este negocio.");return}
  saveScheduleBtn.disabled=true;scheduleStatus("Guardando…");
  let r;
  if(editingScheduleId){r=await client.from("professional_schedules").update({professional_id,day_of_week,start_time,end_time,active}).eq("id",editingScheduleId).eq("business_id",currentBusiness.id).select().single()}
  else{r=await client.from("professional_schedules").insert({business_id:currentBusiness.id,professional_id,day_of_week,start_time,end_time,active,created_by:currentUser.id}).select().single()}
  saveScheduleBtn.disabled=false;
  if(r.error){scheduleStatus(r.error.message);return}
  resetScheduleForm();await loadSchedules();
}
async function deleteSchedule(id){
  if(!client||!currentBusiness||!canManageSchedules())return;
  const item=schedulesList.querySelector(`.delete-schedule[data-id="${id}"]`)?.closest(".schedule-card");
  const name=item?.querySelector(".schedule-professional")?.textContent||"este horario";
  if(!confirm(`¿Eliminar el horario de ${name}? Esta acción no se puede deshacer.`))return;
  const r=await client.from("professional_schedules").delete().eq("id",id).eq("business_id",currentBusiness.id);
  if(r.error){alert("No se pudo eliminar: "+r.error.message);return}
  await loadSchedules();
}
newScheduleBtn?.addEventListener("click",()=>openScheduleForm());
cancelScheduleBtn?.addEventListener("click",resetScheduleForm);
scheduleForm?.addEventListener("submit",e=>{e.preventDefault();saveSchedule()});

\n\n/* SOMOS AGENDA · AVAILABILITY V0.1 · CRUD */\nlet editingAvailabilityId=null;\nconst availabilityView=document.getElementById("availabilityView");\nconst availabilityList=document.getElementById("availabilityList");\nconst availabilityFormCard=document.getElementById("availabilityFormCard");\nconst availabilityForm=document.getElementById("availabilityForm");\nconst availabilityFormEyebrow=document.getElementById("availabilityFormEyebrow");\nconst availabilityFormStatus=document.getElementById("availabilityFormStatus");\nconst availabilityProfessional=document.getElementById("availabilityProfessional");\nconst availabilityDate=document.getElementById("availabilityDate");\nconst availabilityStart=document.getElementById("availabilityStart");\nconst availabilityEnd=document.getElementById("availabilityEnd");\nconst availabilityStatusValue=document.getElementById("availabilityStatusValue");\nconst availabilityNote=document.getElementById("availabilityNote");\nconst availabilityActive=document.getElementById("availabilityActive");\nconst newAvailabilityBtn=document.getElementById("newAvailabilityBtn");\nconst cancelAvailabilityBtn=document.getElementById("cancelAvailabilityBtn");\nconst saveAvailabilityBtn=document.getElementById("saveAvailabilityBtn");\nlet availabilityProfessionals=[];\nfunction availabilityStatus(m="",ok=false){availabilityFormStatus.textContent=m;availabilityFormStatus.style.color=ok?"#198754":""}\nfunction todayISO(){return new Date().toLocaleDateString("en-CA")}\nfunction formatDateValue(v){if(!v)return "";const p=String(v).split("-");if(p.length!==3)return v;return `${p[2]}/${p[1]}/${p[0]}`}\nfunction resetAvailabilityForm(){editingAvailabilityId=null;availabilityForm.reset();availabilityDate.value=todayISO();availabilityStatusValue.value="available";availabilityActive.value="true";availabilityFormEyebrow.textContent="NUEVA DISPONIBILIDAD";saveAvailabilityBtn.textContent="Guardar disponibilidad";availabilityFormStatus.textContent="";availabilityFormCard.classList.add("hidden")}\nfunction populateAvailabilityProfessionals(selectedId=""){availabilityProfessional.innerHTML=availabilityProfessionals.length?availabilityProfessionals.map(p=>`<option value="${p.id}">${escapeHtml((p.first_name+" "+p.last_name).trim())}${p.active?"":" · Inactivo"}</option>`).join(""):"<option value=\"\">Primero crea un profesional</option>";if(selectedId)availabilityProfessional.value=selectedId}\nfunction openAvailabilityForm(item=null){if(!canManageSchedules()){alert("Solo el propietario o administrador puede gestionar disponibilidad.");return}availabilityFormCard.classList.remove("hidden");editingAvailabilityId=item?.id||null;availabilityFormEyebrow.textContent=editingAvailabilityId?"EDITAR DISPONIBILIDAD":"NUEVA DISPONIBILIDAD";saveAvailabilityBtn.textContent=editingAvailabilityId?"Guardar cambios":"Guardar disponibilidad";populateAvailabilityProfessionals(item?.professional_id||availabilityProfessionals.find(p=>p.active)?.id||availabilityProfessionals[0]?.id||"");availabilityDate.value=item?.availability_date||todayISO();availabilityStart.value=formatTime(item?.start_time)||"09:00";availabilityEnd.value=formatTime(item?.end_time)||"18:00";availabilityStatusValue.value=item?.status||"available";availabilityNote.value=item?.note||"";availabilityActive.value=String(item?.active??true);availabilityFormStatus.textContent=availabilityProfessionals.length?"":"Primero debes crear al menos un profesional.";availabilityFormCard.scrollIntoView({behavior:"smooth",block:"start"})}\nasync function loadAvailabilityProfessionals(){if(!client||!currentBusiness)return;const r=await client.from("professionals").select("id,first_name,last_name,active").eq("business_id",currentBusiness.id).order("active",{ascending:false}).order("last_name",{ascending:true}).order("first_name",{ascending:true});if(r.error){availabilityProfessionals=[];return}availabilityProfessionals=r.data||[];populateAvailabilityProfessionals(availabilityProfessional?.value||"")}\nasync function loadAvailability(){if(!client||!currentBusiness)return;availabilityView.classList.remove("hidden");availabilityList.innerHTML='<div class="card availability-empty">Cargando disponibilidad…</div>';await loadAvailabilityProfessionals();const r=await client.from("professional_availability").select("id,professional_id,availability_date,start_time,end_time,status,note,active,created_at,updated_at,professionals(first_name,last_name)").eq("business_id",currentBusiness.id).order("availability_date",{ascending:true}).order("start_time",{ascending:true});if(r.error){availabilityList.innerHTML='<div class="card availability-empty">No se pudo cargar la disponibilidad: '+escapeHtml(r.error.message)+"</div>";return}renderAvailability(r.data||[])}\nfunction renderAvailability(items){if(!items.length){availabilityList.innerHTML='<div class="card availability-empty">Aún no hay excepciones de disponibilidad. Crea la primera para configurar una fecha específica.</div>';return}availabilityList.innerHTML=items.map(a=>{const p=a.professionals||{};const name=((p.first_name||"")+" "+(p.last_name||"")).trim()||"Profesional";const statusLabel=a.status==="blocked"?"Bloqueado":"Disponible";return `<article class="card availability-card"><div class="availability-card-top"><div><p class="availability-professional">${escapeHtml(name)}</p><p class="availability-date">${formatDateValue(a.availability_date)}</p></div><span class="availability-badge ${a.status==="blocked"?"blocked":""} ${a.active?"":"inactive"}">${a.active?statusLabel:"Inactivo"}</span></div><p class="availability-time">${formatTime(a.start_time)} – ${formatTime(a.end_time)}</p>${a.note?`<p class="availability-note">${escapeHtml(a.note)}</p>`:""}${canManageSchedules()?`<div class="availability-actions"><button type="button" class="secondary edit-availability" data-id="${a.id}">Editar</button><button type="button" class="secondary delete-availability" data-id="${a.id}">Eliminar</button></div>`:""}</article>`}).join("");availabilityList.querySelectorAll(".edit-availability").forEach(b=>b.onclick=()=>{const item=items.find(x=>x.id===b.dataset.id);if(item)openAvailabilityForm(item)});availabilityList.querySelectorAll(".delete-availability").forEach(b=>b.onclick=()=>deleteAvailability(b.dataset.id))}\nasync function saveAvailability(){if(!client||!currentBusiness||!currentUser)return;if(!canManageSchedules()){availabilityStatus("No tienes permisos para gestionar disponibilidad.");return}const professional_id=availabilityProfessional.value,availability_date=availabilityDate.value,start_time=availabilityStart.value,end_time=availabilityEnd.value,status=availabilityStatusValue.value,note=availabilityNote.value.trim()||null,active=availabilityActive.value==="true";if(!professional_id){availabilityStatus("Selecciona un profesional.");return}if(!availability_date){availabilityStatus("Debes indicar una fecha.");return}if(!start_time||!end_time){availabilityStatus("Debes indicar la hora de inicio y término.");return}if(start_time>=end_time){availabilityStatus("La hora de inicio debe ser anterior a la hora de término.");return}if(!availabilityProfessionals.some(p=>p.id===professional_id)){availabilityStatus("El profesional seleccionado no pertenece a este negocio.");return}saveAvailabilityBtn.disabled=true;availabilityStatus("Guardando…");let r;if(editingAvailabilityId){r=await client.from("professional_availability").update({professional_id,availability_date,start_time,end_time,status,note,active}).eq("id",editingAvailabilityId).eq("business_id",currentBusiness.id).select().single()}else{r=await client.from("professional_availability").insert({business_id:currentBusiness.id,professional_id,availability_date,start_time,end_time,status,note,active,created_by:currentUser.id}).select().single()}saveAvailabilityBtn.disabled=false;if(r.error){availabilityStatus(r.error.message);return}resetAvailabilityForm();await loadAvailability()}\nasync function deleteAvailability(id){if(!client||!currentBusiness||!canManageSchedules())return;const item=availabilityList.querySelector(`.delete-availability[data-id="${id}"]`)?.closest(".availability-card");const name=item?.querySelector(".availability-professional")?.textContent||"esta disponibilidad";if(!confirm(`¿Eliminar la disponibilidad de ${name}? Esta acción no se puede deshacer.`))return;const r=await client.from("professional_availability").delete().eq("id",id).eq("business_id",currentBusiness.id);if(r.error){alert("No se pudo eliminar: "+r.error.message);return}await loadAvailability()}\nnewAvailabilityBtn?.addEventListener("click",()=>openAvailabilityForm());cancelAvailabilityBtn?.addEventListener("click",resetAvailabilityForm);availabilityForm?.addEventListener("submit",e=>{e.preventDefault();saveAvailability()});\n\nconst _routeUser2=routeUser;\nrouteUser=async function(){await _routeUser2();if(!dashboardView.classList.contains("hidden")){await loadServices();await loadProfessionals();await loadSchedules();await loadAvailability();}};\n
