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

const _routeUser=routeUser;
routeUser=async function(){await _routeUser();if(!dashboardView.classList.contains("hidden")){await loadServices();await loadProfessionals();}};
