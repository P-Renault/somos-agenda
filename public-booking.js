const cfg=window.SOMOS_CONFIG||{};
const supabase=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY);
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const slug=new URLSearchParams(location.search).get("slug")?.trim().toLowerCase();
let context=null;

function todayLocal(){
  const d=new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function timeToMinutes(v){
  const [h,m]=String(v).slice(0,5).split(":").map(Number);
  return h*60+m;
}
function minutesToTime(v){
  const h=Math.floor(v/60),m=v%60;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
}
function formatTime(v){return String(v).slice(0,5)}
function setStatus(msg){$("status").textContent=msg||""}

function selectedService(){
  return context?.services?.find(x=>x.id===$("service").value);
}
function selectedProfessional(){
  return context?.professionals?.find(x=>x.id===$("professional").value);
}

function renderServices(){
  const items=context?.services||[];
  $("service").innerHTML=items.length
    ? items.map(x=>`<option value="${x.id}">${esc(x.name)} · ${x.duration_minutes} min${Number(x.price)>0?` · $${Number(x.price).toLocaleString("es-CL")}`:""}</option>`).join("")
    : '<option value="">No hay servicios disponibles</option>';
  renderServiceDescription();
}
function renderServiceDescription(){
  const x=selectedService();
  $("serviceDescription").textContent=x?.description||"";
  renderSlots();
}
function renderProfessionals(){
  const items=context?.professionals||[];
  $("professional").innerHTML=items.length
    ? items.map(x=>`<option value="${x.id}">${esc(x.first_name+" "+x.last_name)}</option>`).join("")
    : '<option value="">No hay profesionales disponibles</option>';
  renderSlots();
}

function windowsForProfessional(p){
  const exceptions=p.availability||[];
  if(exceptions.length){
    const available=exceptions.filter(x=>x.status==="available").map(x=>({start_time:x.start_time,end_time:x.end_time}));
    const blocked=exceptions.filter(x=>x.status==="blocked");
    return {available,blocked};
  }
  return {available:p.schedules||[],blocked:[]};
}
function slotIsFree(start,end,bookings){
  return !(bookings||[]).some(b=>start<timeToMinutes(b.end_time)&&end>timeToMinutes(b.start_time));
}
function renderSlots(){
  const p=selectedProfessional(), s=selectedService(), select=$("slot");
  select.innerHTML="";
  if(!p||!s){$("availabilityMessage").textContent="Selecciona servicio y profesional.";return}
  const {available,blocked}=windowsForProfessional(p);
  if(!available.length){$("availabilityMessage").textContent="No hay horario disponible para esta fecha.";return}
  const duration=Number(s.duration_minutes);
  const bookings=p.bookings||[];
  const options=[];
  for(const w of available){
    const ws=timeToMinutes(w.start_time), we=timeToMinutes(w.end_time);
    for(let start=ws;start+duration<=we;start+=15){
      const end=start+duration;
      const blockedOverlap=blocked.some(b=>start<timeToMinutes(b.end_time)&&end>timeToMinutes(b.start_time));
      if(!blockedOverlap&&slotIsFree(start,end,bookings)){
        options.push({start,end});
      }
    }
  }
  const unique=[...new Map(options.map(x=>[x.start,x])).values()];
  select.innerHTML=unique.length
    ? unique.map(x=>`<option value="${minutesToTime(x.start)}">${formatTime(minutesToTime(x.start))} – ${formatTime(minutesToTime(x.end))}</option>`).join("")
    : "";
  $("availabilityMessage").textContent=unique.length
    ? `${unique.length} horario${unique.length===1?"":"s"} disponible${unique.length===1?"":"s"}.`
    : "No hay horarios disponibles para esta fecha.";
}

async function loadContext(){
  if(!slug){setStatus("Falta el identificador público del negocio en el enlace.");return}
  const date=$("date").value;
  $("service").disabled=$("professional").disabled=$("slot").disabled=true;
  setStatus("Cargando disponibilidad...");
  const r=await supabase.rpc("get_public_booking_context",{p_slug:slug,p_date:date});
  if(r.error){setStatus(r.error.message==="BUSINESS_NOT_FOUND"?"No encontramos este negocio.":r.error.message);return}
  context=r.data;
  $("businessName").textContent=context.business?.name||"Agenda";
  renderServices();renderProfessionals();renderSlots();
  $("service").disabled=$("professional").disabled=$("slot").disabled=false;
  setStatus("");
}

$("date").min=todayLocal();
$("date").value=todayLocal();
$("service").addEventListener("change",renderServiceDescription);
$("professional").addEventListener("change",renderSlots);
$("date").addEventListener("change",loadContext);

$("clientForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const service=selectedService(), professional=selectedProfessional(), slot=$("slot").value;
  if(!service||!professional||!slot){setStatus("Selecciona un servicio, profesional y horario.");return}
  const start=timeToMinutes(slot), end=start+Number(service.duration_minutes);
  const args={
    p_slug:slug,
    p_client_first_name:$("firstName").value.trim(),
    p_client_last_name:$("lastName").value.trim(),
    p_client_email:$("email").value.trim()||null,
    p_client_phone:$("phone").value.trim()||null,
    p_service_id:service.id,
    p_professional_id:professional.id,
    p_booking_date:$("date").value,
    p_start_time:minutesToTime(start),
    p_end_time:minutesToTime(end),
    p_notes:$("notes").value.trim()||null
  };
  const btn=e.submitter;
  btn.disabled=true;btn.textContent="Enviando...";
  setStatus("");
  const r=await supabase.rpc("create_public_booking",args);
  btn.disabled=false;btn.textContent="Solicitar reserva";
  if(r.error){
    const map={
      BOOKING_OVERLAP:"Ese horario acaba de ser ocupado. Actualiza la disponibilidad y elige otro horario.",
      OUTSIDE_SCHEDULE:"Ese horario está fuera del horario del profesional.",
      OUTSIDE_AVAILABILITY:"Ese horario ya no está disponible.",
      SERVICE_NOT_AVAILABLE:"El servicio seleccionado ya no está disponible.",
      PROFESSIONAL_NOT_AVAILABLE:"El profesional seleccionado ya no está disponible.",
      BOOKING_DURATION_INVALID:"La duración del servicio no coincide con el horario seleccionado."
    };
    setStatus(map[r.error.message]||r.error.message);
    await loadContext();
    return;
  }
  const x=r.data;
  $("bookingCard").classList.add("hidden");
  $("successCard").classList.remove("hidden");
  $("successText").textContent=`${x.service_name} con ${x.professional_name}, el ${new Date(x.booking_date+"T00:00:00").toLocaleDateString("es-CL")} de ${formatTime(x.start_time)} a ${formatTime(x.end_time)}. Tu solicitud quedó registrada como pendiente.`;
});

$("newBooking").onclick=()=>{
  $("successCard").classList.add("hidden");
  $("bookingCard").classList.remove("hidden");
  $("clientForm").reset();
  loadContext();
};

loadContext();
