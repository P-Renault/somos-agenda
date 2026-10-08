/* =========================================================
   AGENDA YA · PROFILE ONBOARDING v1.0

   This is NOT "Mi perfil".
   It is the mandatory onboarding layer for accounts that
   authenticate successfully but do not yet have a profile_type.
   ========================================================= */
(() => {
  const cfg = window.SOMOS_CONFIG || {};
  const $ = id => document.getElementById(id);
  let client = null;
  let user = null;
  let type = "business";
  const DAYS = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];
  const PENDING_BOOKING_KEY = "agendaYaPendingBooking";
  const PENDING_BOOKING_TTL = 2 * 60 * 60 * 1000;

  function pendingBooking(){
    try{
      const raw=sessionStorage.getItem(PENDING_BOOKING_KEY) || localStorage.getItem(PENDING_BOOKING_KEY);
      if(!raw) return null;
      const draft=JSON.parse(raw);
      if(!draft?.savedAt || Date.now()-Number(draft.savedAt) > PENDING_BOOKING_TTL){
        sessionStorage.removeItem(PENDING_BOOKING_KEY);
        localStorage.removeItem(PENDING_BOOKING_KEY);
        return null;
      }
      return draft;
    }catch(_){ return null; }
  }

  function resumePendingBooking(){
    const draft=pendingBooking();
    if(!draft?.slug) return false;
    const url=new URL("public-profile.html",window.location.href);
    url.searchParams.set("slug",draft.slug);
    window.location.replace(url.href);
    return true;
  }

  function status(el, text, kind=""){
    el.textContent = text || "";
    el.dataset.kind = kind;
  }

  function selectType(next){
    type = next;
    document.querySelectorAll(".profile-type").forEach(btn => {
      const active = btn.dataset.type === next;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function showChoice(){
    $("choiceStep").hidden = false;
    $("formStep").hidden = true;
    $("profileTitle").textContent = "Bienvenido a Agenda Ya";
    $("profileSubtitle").textContent = "Elige tu perfil para comenzar.";
    window.scrollTo(0,0);
  }

  function showForm(){
    $("choiceStep").hidden = true;
    $("formStep").hidden = false;

    $("businessForm").hidden = type !== "business";
    $("scheduleForm").hidden = true;
    $("customerForm").hidden = type !== "customer";

    $("profileTitle").textContent =
      type === "business" ? "Configura tu negocio" : "Configura tu perfil";
    $("profileSubtitle").textContent =
      type === "business"
        ? "Completa los datos básicos de tu negocio."
        : "Completa tus datos para comenzar a reservar.";

    window.scrollTo(0,0);
  }

  function initHours(){
    $("hours").innerHTML = DAYS.map((day,i) => `
      <div class="ay-hour-row">
        <label><input class="hour-active" type="checkbox" data-day="${i+1}" ${i<5?"checked":""}> ${day}</label>
        <input type="time" data-open="${i+1}" value="09:00">
        <input type="time" data-close="${i+1}" value="18:00">
      </div>
    `).join("");
  }

  function phone(v){
    return String(v||"").replace(/\D/g,"").slice(0,8);
  }

  async function upload(file, kind){
    if(!file) return null;
    if(!file.type.startsWith("image/")) throw new Error("La imagen no es válida.");
    if(file.size > 3*1024*1024) throw new Error("La imagen no puede superar 3 MB.");

    const ext=(file.name.split(".").pop()||"jpg").toLowerCase().replace(/[^a-z0-9]/g,"")||"jpg";
    const path=`${user.id}/${kind}-${Date.now()}.${ext}`;

    const r=await client.storage.from("profile-media").upload(path,file,{
      contentType:file.type,
      upsert:false
    });
    if(r.error) throw r.error;

    return client.storage.from("profile-media").getPublicUrl(path).data.publicUrl;
  }

  function validateBusiness(){
    const required=[
      ["businessName","businessStatus","nombre del negocio"],
      ["businessType","businessStatus","tipo de servicio"],
      ["businessCity","businessStatus","ciudad"],
      ["businessComuna","businessStatus","comuna"],
      ["businessAddress","businessStatus","dirección"]
    ];

    for(const [id,statusId,label] of required){
      if(!$(`${id}`)?.value.trim()){
        status($(statusId),`Completa ${label}.`,"error");
        $(id).focus();
        return false;
      }
    }
    return true;
  }

  function showSchedule(){
    if(!validateBusiness()) return;

    $("businessForm").hidden=true;
    $("scheduleForm").hidden=false;
    $("profileTitle").textContent="Configura tu negocio";
    $("profileSubtitle").textContent="Paso 2 · Configura los horarios de atención.";
    window.scrollTo(0,0);
  }

  async function saveCustomer(e){
    e.preventDefault();

    const name=$("customerName").value.trim();
    const city=$("customerCity").value.trim();
    const comuna=$("customerComuna").value.trim();
    const address=$("customerAddress").value.trim();

    if(!name||!city||!comuna||!address){
      status($("customerStatus"),"Completa nombre, ciudad, comuna y dirección.","error");
      return;
    }

    const age=$("customerAge").value ? Number($("customerAge").value) : null;
    if(age!==null && (age<13||age>120)){
      status($("customerStatus"),"Ingresa una edad válida.","error");
      return;
    }

    try{
      status($("customerStatus"),"Guardando perfil…");

      const avatar=await upload($("customerAvatar").files?.[0],"avatar");
      const result=await client.from("profiles").upsert({
        id:user.id,
        profile_type:"customer",
        full_name:name,
        phone:phone($("customerPhone").value) ? `+56 9 ${phone($("customerPhone").value)}` : null,
        age,
        city,
        comuna,
        address,
        avatar_url:avatar,
        updated_at:new Date().toISOString()
      },{onConflict:"id"});

      if(result.error) throw result.error;

      status($("customerStatus"),"Perfil creado. Volviendo a tu reserva…","success");
      setTimeout(()=>{
        if(!resumePendingBooking()) window.location.replace("explorer.html");
      },350);

    }catch(err){
      console.error(err);
      status($("customerStatus"),err?.message||"No fue posible guardar el perfil.","error");
    }
  }

  async function saveBusiness(e){
    e.preventDefault();
    if(!validateBusiness()) return;

    try{
      status($("scheduleStatus"),"Guardando negocio y horarios…");

      const name=$("businessName").value.trim();
      const businessType=$("businessType").value.trim();
      const p=phone($("businessPhone").value);
      const city=$("businessCity").value.trim();
      const comuna=$("businessComuna").value.trim();
      const address=$("businessAddress").value.trim();

      const logo=await upload($("businessLogo").files?.[0],"business-logo");

      // Idempotency: do not create a second business if onboarding is retried.
      const member=await client.from("business_members")
        .select("business_id,active")
        .eq("user_id",user.id)
        .eq("active",true)
        .limit(1);

      if(member.error) throw member.error;

      let businessId=member.data?.[0]?.business_id || null;

      if(!businessId){
        const slug=name.toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
          .replace(/[^a-z0-9]+/g,"-")
          .replace(/^-|-$/g,"")
          .slice(0,50) || "negocio";

        const created=await client.rpc("create_business",{
          p_name:name,
          p_slug:`${slug}-${user.id.slice(0,8)}`,
          p_legal_name:null,
          p_email:user.email||null,
          p_phone:p?`+56 9 ${p}`:null
        });

        if(created.error) throw created.error;

        businessId=created.data?.id || created.data;
      }

      if(!businessId) throw new Error("Supabase no devolvió el negocio creado.");

      const update=await client.from("businesses").update({
        name,
        business_type:businessType,
        phone:p?`+56 9 ${p}`:null,
        city,
        comuna,
        address,
        logo_url:logo,
        updated_at:new Date().toISOString()
      }).eq("id",businessId);

      if(update.error) throw update.error;

      const profile=await client.from("profiles").upsert({
        id:user.id,
        profile_type:"business",
        full_name:name,
        phone:p?`+56 9 ${p}`:null,
        city,
        comuna,
        address,
        avatar_url:logo,
        updated_at:new Date().toISOString()
      },{onConflict:"id"});

      if(profile.error) throw profile.error;

      const rows=DAYS.map((_,i)=>{
        const active=$(`.hour-active[data-day="${i+1}"]`)?.checked;
        return {
          business_id:businessId,
          day_of_week:i+1,
          active:!!active,
          open_time:active ? ($(`[data-open="${i+1}"]`)?.value||"09:00") : null,
          close_time:active ? ($(`[data-close="${i+1}"]`)?.value||"18:00") : null,
          created_by:user.id,
          updated_at:new Date().toISOString()
        };
      });

      const hours=await client.from("business_hours")
        .upsert(rows,{onConflict:"business_id,day_of_week"});

      if(hours.error) throw hours.error;

      status($("scheduleStatus"),"Perfil de negocio creado. Abriendo Dashboard…","success");
      setTimeout(()=>window.location.replace("dashboard.html"),350);

    }catch(err){
      console.error(err);
      status($("scheduleStatus"),err?.message||"No fue posible crear el negocio.","error");
    }
  }

  async function waitForSession(retries = 8, delayMs = 250){
    for(let i=0;i<retries;i++){
      const result = await client.auth.getSession();
      if(result.error) throw result.error;
      if(result.data.session?.user) return result.data.session;
      if(i < retries-1) await new Promise(r=>setTimeout(r,delayMs));
    }
    return null;
  }

  async function resolveExistingProfile(){
    const existing=await client.from("profiles")
      .select("id,profile_type,full_name")
      .eq("id",user.id)
      .maybeSingle();

    if(existing.error) throw existing.error;
    return existing.data || null;
  }

  async function routeExistingProfile(profile){
    if(resumePendingBooking()) return true;
    if(!profile?.profile_type) return false;

    if(profile.profile_type === "customer"){
      window.location.replace(new URL("explorer.html",window.location.href).href);
      return true;
    }

    if(profile.profile_type === "business"){
      const member=await client.from("business_members")
        .select("business_id,active")
        .eq("user_id",user.id)
        .eq("active",true)
        .limit(1);

      if(member.error) throw member.error;

      if(member.data?.[0]?.business_id){
        window.location.replace(new URL("dashboard.html",window.location.href).href);
        return true;
      }

      // Business profile exists but onboarding is incomplete.
      return false;
    }

    return false;
  }

  async function boot(){
    if(!window.supabase?.createClient){
      status($("choiceStatus"),"No se pudo cargar Supabase.","error");
      return;
    }

    if(!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY){
      status($("choiceStatus"),"Configuración de Supabase no disponible.","error");
      return;
    }

    client=window.supabase.createClient(
      cfg.SUPABASE_URL,
      cfg.SUPABASE_ANON_KEY,
      {
        auth:{
          persistSession:true,
          autoRefreshToken:true,
          detectSessionInUrl:true
        }
      }
    );

    // Important: after OAuth or the email login, Supabase may need one event
    // loop to restore the persisted session. We wait instead of redirecting
    // immediately back to login.html.
    const session=await waitForSession();

    if(!session?.user){
      window.location.replace(new URL("login.html",window.location.href).href);
      return;
    }

    user=session.user;

    try{
      const existing=await resolveExistingProfile();
      const routed=await routeExistingProfile(existing);
      if(routed) return;
    }catch(err){
      // Do NOT send the user back to login on a profile/RLS/network error.
      // The authenticated session is still valid; keep onboarding visible
      // and report the real problem so it can be fixed without a redirect loop.
      console.error("Agenda YA profile resolver:",err);
      status($("choiceStatus"),
        err?.message || "No fue posible verificar tu perfil. Puedes continuar con el onboarding.",
        "error"
      );
    }

    initHours();

    document.querySelectorAll(".profile-type").forEach(btn=>{
      btn.addEventListener("click",()=>selectType(btn.dataset.type));
    });

    $("profileNext")?.addEventListener("click",showForm);
    $("profileBack")?.addEventListener("click",showChoice);
    $("businessNext")?.addEventListener("click",showSchedule);

    $("scheduleBack")?.addEventListener("click",()=>{
      $("scheduleForm").hidden=true;
      $("businessForm").hidden=false;
      $("profileTitle").textContent="Configura tu negocio";
      $("profileSubtitle").textContent="Completa los datos básicos de tu negocio.";
      window.scrollTo(0,0);
    });

    $("businessForm")?.addEventListener("submit",e=>e.preventDefault());
    $("scheduleForm")?.addEventListener("submit",saveBusiness);
    $("customerForm")?.addEventListener("submit",saveCustomer);

    ["businessPhone","customerPhone"].forEach(id=>{
      $(id)?.addEventListener("input",e=>e.target.value=phone(e.target.value));
    });

    selectType("business");
    showChoice();
  }

  boot().catch(err=>{
    console.error("Agenda YA profile boot:",err);
    status($("choiceStatus"),err?.message||"No se pudo iniciar la configuración del perfil.","error");
  });
})();
