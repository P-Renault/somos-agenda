/* Agenda YA · profile.html
   Onboarding standalone.
   NO modifica index.html.
*/
(() => {
  const cfg = window.SOMOS_CONFIG || {};
  const $ = id => document.getElementById(id);

  let client = null;
  let currentUser = null;
  let profileType = "business";
  let businessStep = "details";

  const DAYS = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];

  const setStatus = (el,msg,kind="") => {
    if(!el) return;
    el.textContent = msg || "";
    el.dataset.kind = kind;
  };

  function initHours(){
    const wrap = $("ayBusinessHours");
    if(!wrap || wrap.children.length) return;

    wrap.innerHTML = DAYS.map((day,i) => `
      <div class="ay-hour-row">
        <label>
          <input type="checkbox" class="ay-hour-active" data-day="${i+1}" ${i<5?"checked":""}>
          ${day}
        </label>
        <input type="time" data-open="${i+1}" value="09:00">
        <input type="time" data-close="${i+1}" value="18:00">
      </div>
    `).join("");
  }

  function selectType(type){
    profileType = type;
    document.querySelectorAll(".ay-profile-type-btn").forEach(btn => {
      const active = btn.dataset.profileType === type;
      btn.classList.toggle("is-active",active);
      btn.setAttribute("aria-pressed",active?"true":"false");
    });
  }

  function showChoice(){
    $("ayProfileChoiceStep").hidden = false;
    $("ayProfileFormStep").hidden = true;
    $("ayProfileTitle").textContent = "Bienvenido a Agenda Ya";
    $("ayProfileSubtitle").textContent = "Elige tu perfil para comenzar.";
    window.scrollTo(0,0);
  }

  function showForm(){
    $("ayProfileChoiceStep").hidden = true;
    $("ayProfileFormStep").hidden = false;

    $("ayBusinessProfileForm").hidden = profileType !== "business";
    $("ayBusinessScheduleForm").hidden = true;
    $("ayCustomerProfileForm").hidden = profileType !== "customer";

    $("ayProfileTitle").textContent =
      profileType === "business" ? "Configura tu negocio" : "Configura tu perfil cliente";

    $("ayProfileSubtitle").textContent =
      profileType === "business"
        ? "Completa los datos básicos de tu negocio."
        : "Completa tus datos para comenzar a reservar.";

    businessStep = "details";
    window.scrollTo(0,0);
  }

  async function uploadMedia(file,kind){
    if(!file) return null;
    if(!file.type.startsWith("image/")) throw new Error("La foto debe ser una imagen.");
    if(file.size > 3*1024*1024) throw new Error("La imagen no puede superar 3 MB.");

    const ext=(file.name.split(".").pop()||"jpg").toLowerCase().replace(/[^a-z0-9]/g,"")||"jpg";
    const path=`${currentUser.id}/${kind}-${Date.now()}.${ext}`;

    const up=await client.storage.from("profile-media").upload(
      path,file,{contentType:file.type,upsert:false}
    );

    if(up.error) throw up.error;

    return client.storage.from("profile-media").getPublicUrl(path).data.publicUrl;
  }

  async function existingBusiness(){
    const r=await client
      .from("businesses")
      .select("id,name,phone,logo_url")
      .eq("owner_id",currentUser.id)
      .maybeSingle();

    if(r.error) throw r.error;
    return r.data || null;
  }

  function validateBusiness(){
    const values=[
      $("ayBusinessName").value.trim(),
      $("ayBusinessType").value.trim(),
      $("ayBusinessCity").value.trim(),
      $("ayBusinessComuna").value.trim(),
      $("ayBusinessAddress").value.trim()
    ];

    if(values.some(v=>!v)){
      setStatus($("ayBusinessStatus"),
        "Completa nombre, tipo de servicio, ciudad, comuna y dirección.","error");
      return false;
    }
    return true;
  }

  function showSchedule(){
    if(!validateBusiness()) return;

    businessStep="schedule";
    $("ayBusinessProfileForm").hidden=true;
    $("ayBusinessScheduleForm").hidden=false;

    $("ayProfileTitle").textContent="Configura tu negocio";
    $("ayProfileSubtitle").textContent="Paso 2 · Configura los horarios de atención.";

    window.scrollTo(0,0);
  }

  async function saveCustomer(event){
    event.preventDefault();

    const name=$("ayCustomerName").value.trim();
    const phone=$("ayCustomerPhone").value.replace(/\D/g,"").slice(0,8);
    const ageRaw=$("ayCustomerAge").value;
    const city=$("ayCustomerCity").value.trim();
    const comuna=$("ayCustomerComuna").value.trim();
    const address=$("ayCustomerAddress").value.trim();

    if(!name||!city||!comuna||!address){
      setStatus($("ayCustomerStatus"),
        "Completa nombre, ciudad, comuna y dirección.","error");
      return;
    }

    const age=ageRaw?Number(ageRaw):null;
    if(age!==null && (age<13||age>120)){
      setStatus($("ayCustomerStatus"),"Ingresa una edad válida.","error");
      return;
    }

    try{
      setStatus($("ayCustomerStatus"),"Guardando perfil…");

      let avatar=null;
      const file=$("ayCustomerAvatarFile").files?.[0];
      if(file) avatar=await uploadMedia(file,"avatar");

      const r=await client.from("profiles").upsert({
        id:currentUser.id,
        profile_type:"customer",
        full_name:name,
        phone:phone?`+56 9 ${phone}`:null,
        address,
        age,
        city,
        comuna,
        avatar_url:avatar,
        updated_at:new Date().toISOString()
      },{onConflict:"id"});

      if(r.error) throw r.error;

      setStatus($("ayCustomerStatus"),"Perfil guardado. Abriendo marketplace…","success");

      setTimeout(()=>{
        window.location.href="index.html";
      },350);

    }catch(err){
      console.error(err);
      setStatus($("ayCustomerStatus"),
        err?.message||"No fue posible guardar el perfil.","error");
    }
  }

  async function saveBusiness(event){
    event.preventDefault();
    if(!validateBusiness()) return;

    try{
      setStatus($("ayBusinessScheduleStatus"),"Guardando datos del negocio…");

      const name=$("ayBusinessName").value.trim();
      const type=$("ayBusinessType").value.trim();
      const phone=$("ayBusinessPhone").value.replace(/\D/g,"").slice(0,8);
      const city=$("ayBusinessCity").value.trim();
      const comuna=$("ayBusinessComuna").value.trim();
      const address=$("ayBusinessAddress").value.trim();

      let logo=null;
      const file=$("ayBusinessLogoFile").files?.[0];
      if(file) logo=await uploadMedia(file,"business-logo");

      let business=await existingBusiness();

      if(!business){
        const slug=name.toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
          .replace(/[^a-z0-9]+/g,"-")
          .replace(/^-|-$/g,"")
          .slice(0,50)||"negocio";

        const created=await client.rpc("create_business",{
          p_name:name,
          p_slug:`${slug}-${currentUser.id.slice(0,8)}`,
          p_legal_name:null,
          p_email:currentUser.email||null,
          p_phone:phone?`+56 9 ${phone}`:null
        });

        if(created.error) throw created.error;
        business=created.data;
      }

      if(!business?.id) throw new Error("Supabase no devolvió el negocio creado.");

      const upd=await client.from("businesses").update({
        name,
        business_type:type,
        address,
        city,
        comuna,
        logo_url:logo||business.logo_url||null,
        phone:phone?`+56 9 ${phone}`:(business.phone||null),
        updated_at:new Date().toISOString()
      }).eq("id",business.id);

      if(upd.error) throw upd.error;

      const profile=await client.from("profiles").upsert({
        id:currentUser.id,
        profile_type:"business",
        full_name:name,
        phone:phone?`+56 9 ${phone}`:null,
        address,
        city,
        comuna,
        avatar_url:logo||null,
        updated_at:new Date().toISOString()
      },{onConflict:"id"});

      if(profile.error) throw profile.error;

      const rows=DAYS.map((_,i)=>{
        const active=document.querySelector(`.ay-hour-active[data-day="${i+1}"]`)?.checked;
        const open=document.querySelector(`[data-open="${i+1}"]`)?.value||"09:00";
        const close=document.querySelector(`[data-close="${i+1}"]`)?.value||"18:00";

        return {
          business_id:business.id,
          day_of_week:i+1,
          active:!!active,
          open_time:active?open:null,
          close_time:active?close:null,
          created_by:currentUser.id,
          updated_at:new Date().toISOString()
        };
      });

      const hours=await client.from("business_hours")
        .upsert(rows,{onConflict:"business_id,day_of_week"});

      if(hours.error) throw hours.error;

      setStatus($("ayBusinessScheduleStatus"),
        "Perfil creado correctamente.","success");

      /*
       * El índice NO se toca.
       * La URL final del dashboard se puede definir antes de cargar
       * profile.js mediante:
       * window.AGENDA_YA_BUSINESS_DASHBOARD_URL = "ruta-real-del-dashboard";
       *
       * Si no se define, queda en dashboard.html como fallback explícito.
       */
      const dashboardUrl =
        window.AGENDA_YA_BUSINESS_DASHBOARD_URL || "dashboard.html";

      setTimeout(()=>{window.location.href=dashboardUrl;},350);

    }catch(err){
      console.error(err);
      setStatus($("ayBusinessScheduleStatus"),
        err?.message||"No fue posible guardar el perfil de negocio.","error");
    }
  }

  async function boot(){
    if(!window.supabase?.createClient){
      setStatus($("ayChoiceStatus"),"No se pudo cargar Supabase.","error");
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

    initHours();

    document.querySelectorAll(".ay-profile-type-btn")
      .forEach(btn=>btn.addEventListener("click",()=>{
        selectType(btn.dataset.profileType);
      }));

    $("ayProfileNext").addEventListener("click",showForm);
    $("ayProfileBack").addEventListener("click",showChoice);

    $("ayBusinessNext").addEventListener("click",showSchedule);

    $("ayBusinessScheduleBack").addEventListener("click",()=>{
      $("ayBusinessScheduleForm").hidden=true;
      $("ayBusinessProfileForm").hidden=false;
      $("ayProfileTitle").textContent="Configura tu negocio";
      $("ayProfileSubtitle").textContent="Completa los datos básicos de tu negocio.";
      businessStep="details";
      window.scrollTo(0,0);
    });

    $("ayBusinessScheduleForm").addEventListener("submit",saveBusiness);
    $("ayCustomerProfileForm").addEventListener("submit",saveCustomer);

    ["ayBusinessPhone","ayCustomerPhone"].forEach(id=>{
      $(id)?.addEventListener("input",e=>{
        e.target.value=e.target.value.replace(/\D/g,"").slice(0,8);
      });
    });

    const {data,error}=await client.auth.getSession();

    if(error) throw error;

    if(!data.session?.user){
      window.location.href="login.html";
      return;
    }

    currentUser=data.session.user;

    // Esta página es exclusivamente para onboarding de usuario nuevo.
    // Si alguien llega directamente con perfil ya creado, se evita duplicar onboarding.
    const profile=await client
      .from("profiles")
      .select("profile_type")
      .eq("id",currentUser.id)
      .maybeSingle();

    if(profile.error) throw profile.error;

    if(profile.data?.profile_type==="customer"){
      window.location.href="index.html";
      return;
    }

    if(profile.data?.profile_type==="business"){
      const dashboardUrl =
        window.AGENDA_YA_BUSINESS_DASHBOARD_URL || "dashboard.html";
      window.location.href=dashboardUrl;
      return;
    }

    selectType("business");
    showChoice();
  }

  boot().catch(err=>{
    console.error("Agenda YA profile:",err);
    setStatus($("ayChoiceStatus"),
      err?.message||"No se pudo iniciar la configuración del perfil.","error");
  });
})();
