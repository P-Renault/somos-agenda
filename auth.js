/*
 Agenda Ya — Identity + Profile v0.2.1
 FIX: evita bloqueo del motor de autenticación al iniciar sesión.
 Flujo: Identity -> Profile -> Agenda Ya
*/
(() => {
  const cfg = window.SOMOS_CONFIG || {};
  const $ = (id) => document.getElementById(id);
  const authView = $("ayAuthView"), profileView = $("ayProfileView"), appView = $("ayApp");
  const form = $("ayAuthForm"), email = $("ayAuthEmail"), password = $("ayAuthPassword"), confirm = $("ayAuthPasswordConfirm");
  const confirmWrap = $("ayPasswordConfirmWrap"), title = $("ayAuthTitle"), subtitle = $("ayAuthSubtitle"), submit = $("ayAuthSubmit");
  const switchBtn = $("ayAuthSwitch"), switchText = $("ayAuthSwitchText"), status = $("ayAuthStatus"), recovery = $("ayRecoveryBtn");
  const google = $("ayAuthGoogle"), facebook = $("ayAuthFacebook"), formPanel = $("ayAuthFormPanel"), postLogin = $("ayAuthPostLogin");
  const postStatus = $("ayAuthPostStatus"), continueSetup = $("ayAuthContinueSetup"), accountName = $("ayAuthAccountName"), accountEmail = $("ayAuthAccountEmail");
  const businessForm = $("ayBusinessProfileForm"), customerForm = $("ayCustomerProfileForm");
  const businessStatus = $("ayBusinessStatus"), customerStatus = $("ayCustomerStatus");
  let client = null, mode = "login", currentUser = null, profileType = "business";
  let routingInProgress = false;
  const REDIRECT_URL = "https://p-renault.github.io/somos-agenda/";
  const DAYS = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];

  function setStatus(text, kind = "") {
    status.textContent = text || "";
    status.className = `ay-auth-status${kind ? ` is-${kind}` : ""}`;
  }
  function setProfileStatus(el, text, kind = "") {
    el.textContent = text || "";
    el.className = `ay-profile-status${kind ? ` is-${kind}` : ""}`;
  }
  function showAuth() { authView.hidden = false; profileView.hidden = true; appView.hidden = true; }
  function showProfile() { authView.hidden = true; profileView.hidden = false; appView.hidden = true; window.scrollTo?.(0,0); }
  function showApp(user) {
    authView.hidden = true; profileView.hidden = true; appView.hidden = false;
    const name = user?.user_metadata?.full_name || user?.user_metadata?.name || "Mi negocio";
    const emailValue = user?.email || "";
    const nameEl = document.querySelector(".ay-account-text strong");
    const emailEl = document.querySelector(".ay-account-text small");
    const avatar = document.querySelector(".ay-avatar");
    if (nameEl) nameEl.textContent = name;
    if (emailEl) emailEl.textContent = emailValue || "Cuenta";
    if (avatar) avatar.textContent = name.split(/\s+/).filter(Boolean).slice(0,2).map(x => x[0]).join("").toUpperCase() || "AY";
    const greeting = document.querySelector("#view-dashboard .ay-hero h1");
    if (greeting) greeting.textContent = `Hola, ${name}`;
  }
  function showPostLogin(user, message = "Correo confirmado y sesión activa.") {
    showAuth();
    formPanel.classList.remove("is-visible");
    postLogin.classList.add("is-visible");
    accountName.textContent = user?.user_metadata?.full_name || user?.user_metadata?.name || "Cuenta Agenda Ya";
    accountEmail.textContent = user?.email || "";
    postStatus.textContent = message;
  }
  function setMode(next) {
    mode = next;
    const signup = mode === "signup";
    title.textContent = signup ? "Crear cuenta en Agenda Ya" : "Bienvenido a Agenda Ya";
    subtitle.textContent = signup ? "Crea tu acceso para comenzar a configurar tu perfil." : "Gestiona tu negocio y recibe más reservas desde un solo lugar.";
    confirmWrap.hidden = !signup;
    recovery.hidden = signup;
    password.autocomplete = signup ? "new-password" : "current-password";
    submit.textContent = signup ? "Crear cuenta" : "Iniciar sesión";
    switchText.textContent = signup ? "¿Ya tienes una cuenta?" : "¿No tienes una cuenta?";
    switchBtn.textContent = signup ? "Iniciar sesión" : "Crear cuenta";
    formPanel.classList.add("is-visible");
    postLogin.classList.remove("is-visible");
    setStatus("");
    form.reset();
  }
  function validConfig() {
    return !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY &&
      !String(cfg.SUPABASE_URL).includes("REEMPLAZAR") &&
      !String(cfg.SUPABASE_ANON_KEY).includes("REEMPLAZAR"));
  }
  function cleanAuthHash() {
    if (window.location.hash && window.history?.replaceState) {
      window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
    }
  }
  function handleUrlError() {
    const hash = window.location.hash || "";
    if (!hash.startsWith("#")) return false;
    const p = new URLSearchParams(hash.slice(1));
    const code = p.get("error_code"), desc = p.get("error_description");
    if (code || desc || p.get("error")) {
      showAuth();
      setStatus(desc ? decodeURIComponent(desc.replace(/\+/g," ")) : (p.get("error") || "No fue posible completar la confirmación."), "error");
      cleanAuthHash();
      return true;
    }
    return false;
  }

  function initHours() {
    const wrap = $("ayBusinessHours");
    if (!wrap || wrap.children.length) return;
    wrap.innerHTML = DAYS.map((day, i) =>
      `<div class="ay-hour-row"><label><input type="checkbox" data-day="${i+1}" class="ay-hour-active" ${i < 5 ? "checked" : ""}> ${day}</label><input type="time" data-open="${i+1}" value="09:00"><input type="time" data-close="${i+1}" value="18:00"></div>`
    ).join("");
  }
  function selectProfileType(type) {
    profileType = type;
    document.querySelectorAll(".ay-profile-type-btn").forEach(btn =>
      btn.classList.toggle("is-active", btn.dataset.profileType === type)
    );
    businessForm.hidden = type !== "business";
    customerForm.hidden = type !== "customer";
  }
  function initials(name) {
    return String(name || "AY").split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join("").toUpperCase() || "AY";
  }
  function previewFile(input, target) {
    const file = input?.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    target.style.backgroundImage = `url(${url})`;
    target.style.backgroundSize = "cover";
    target.style.backgroundPosition = "center";
    target.textContent = "";
  }
  async function uploadMedia(file, kind) {
    if (!file) return null;
    if (!file.type.startsWith("image/")) throw new Error("La foto debe ser una imagen.");
    if (file.size > 3 * 1024 * 1024) throw new Error("La imagen no puede superar 3 MB.");
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `${currentUser.id}/${kind}-${Date.now()}.${ext}`;
    const upload = await client.storage.from("profile-media").upload(path, file, { contentType: file.type, upsert: false });
    if (upload.error) throw upload.error;
    return client.storage.from("profile-media").getPublicUrl(path).data.publicUrl;
  }

  async function loadProfileState(user) {
    const r = await client.from("profiles")
      .select("profile_type,full_name,phone,address,age,city,comuna,avatar_url")
      .eq("id", user.id).maybeSingle();
    if (r.error) {
      console.warn("Profile lookup:", r.error);
      return null;
    }
    return r.data?.profile_type ? r.data : null;
  }
  async function loadBusinessExisting(user) {
    const m = await client.from("business_members")
      .select("business_id,role,active")
      .eq("user_id", user.id).eq("active", true).limit(1);
    if (m.error || !m.data?.length) return null;
    const b = await client.from("businesses")
      .select("id,name,phone,address,city,comuna,business_type,logo_url")
      .eq("id", m.data[0].business_id).maybeSingle();
    return b.data || null;
  }
  function populateCustomer(p, user) {
    $("ayCustomerName").value = p?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || "";
    $("ayCustomerPhone").value = p?.phone || user?.user_metadata?.phone || "";
    $("ayCustomerAge").value = p?.age || "";
    $("ayCustomerCity").value = p?.city || "";
    $("ayCustomerComuna").value = p?.comuna || "";
    $("ayCustomerAddress").value = p?.address || "";
    $("ayCustomerAvatar").value = p?.avatar_url || "";
    $("ayCustomerAvatarPreview").textContent = initials(p?.full_name || user?.email);
  }
  function populateBusiness(b, user) {
    $("ayBusinessName").value = b?.name || "";
    $("ayBusinessType").value = b?.business_type || "";
    $("ayBusinessPhone").value = b?.phone || user?.user_metadata?.phone || "";
    $("ayBusinessCity").value = b?.city || "";
    $("ayBusinessComuna").value = b?.comuna || "";
    $("ayBusinessAddress").value = b?.address || "";
    $("ayBusinessLogo").value = b?.logo_url || "";
    $("ayBusinessAvatarPreview").textContent = initials(b?.name || user?.email);
  }

  async function routeSession(user) {
    if (!user) return;
    if (routingInProgress) return;
    routingInProgress = true;
    currentUser = user;
    try {
      const profile = await loadProfileState(user);
      if (profile?.profile_type === "business") {
        const business = await loadBusinessExisting(user);
        if (business) { showApp(user); return; }
        showProfile(); selectProfileType("business"); populateBusiness(null, user); return;
      }
      if (profile?.profile_type === "customer") {
        showProfile(); selectProfileType("customer"); populateCustomer(profile, user); return;
      }
      showProfile(); selectProfileType("business"); populateBusiness(null, user);
    } catch (err) {
      console.error("routeSession:", err);
      showProfile();
      selectProfileType("business");
      populateBusiness(null, user);
    } finally {
      routingInProgress = false;
    }
  }

  function withTimeout(promise, ms, message) {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms))
    ]);
  }

  async function submitAuth(event) {
    event.preventDefault();
    if (!client) return setStatus("Supabase no está disponible.","error");
    const emailValue = email.value.trim(), passwordValue = password.value;
    if (!emailValue || !passwordValue) return setStatus("Completa email y contraseña.","error");
    if (passwordValue.length < 6) return setStatus("La contraseña debe tener al menos 6 caracteres.","error");
    if (mode === "signup" && passwordValue !== confirm.value) return setStatus("Las contraseñas no coinciden.","error");

    submit.disabled = true;
    setStatus(mode === "signup" ? "Creando tu cuenta…" : "Iniciando sesión…");

    try {
      const result = await withTimeout(
        mode === "signup"
          ? client.auth.signUp({ email: emailValue, password: passwordValue, options: { emailRedirectTo: REDIRECT_URL } })
          : client.auth.signInWithPassword({ email: emailValue, password: passwordValue }),
        15000,
        "La autenticación está tardando demasiado. Revisa la conexión y vuelve a intentar."
      );
      if (result.error) throw result.error;

      if (mode === "signup" && !result.data.session) {
        setStatus("Cuenta creada. Revisa tu correo y pulsa el enlace de confirmación.","success");
      } else if (result.data.session?.user) {
        setStatus("Acceso confirmado. Cargando tu perfil…","success");
        await routeSession(result.data.session.user);
      } else {
        throw new Error("Supabase no devolvió una sesión activa.");
      }
    } catch (err) {
      console.error("submitAuth:", err);
      setStatus(err?.message || "No fue posible completar el acceso.","error");
    } finally {
      submit.disabled = false;
    }
  }

  async function recoveryFlow() {
    if (!client) return setStatus("Supabase no está disponible.","error");
    const value = email.value.trim();
    if (!value) return setStatus("Escribe primero tu correo.","error");
    recovery.disabled = true;
    try {
      const result = await withTimeout(
        client.auth.resetPasswordForEmail(value,{redirectTo:REDIRECT_URL}),
        15000,
        "La solicitud de recuperación está tardando demasiado."
      );
      if (result.error) throw result.error;
      setStatus("Revisa tu correo para recuperar la contraseña.","success");
    } catch (err) {
      setStatus(err?.message || "No fue posible enviar el correo.","error");
    } finally { recovery.disabled = false; }
  }

  async function oauth(provider) {
    if (!client) return setStatus("Supabase no está disponible.","error");
    setStatus(`Conectando con ${provider==="google"?"Google":"Facebook"}…`);
    const result = await client.auth.signInWithOAuth({provider, options:{redirectTo:REDIRECT_URL}});
    if (result.error) setStatus(result.error.message,"error");
  }

  async function saveCustomer(event) {
    event.preventDefault();
    if (!currentUser) return;
    setProfileStatus(customerStatus,"Guardando perfil…");
    const name=$("ayCustomerName").value.trim(), phone=$("ayCustomerPhone").value.trim(),
      ageRaw=$("ayCustomerAge").value, city=$("ayCustomerCity").value.trim(),
      comuna=$("ayCustomerComuna").value.trim(), address=$("ayCustomerAddress").value.trim(),
      url=$("ayCustomerAvatar").value.trim();
    if(!name||!city||!comuna||!address) return setProfileStatus(customerStatus,"Completa nombre, ciudad, comuna y dirección.","error");
    const age=ageRaw?Number(ageRaw):null;
    if(age!==null&&(age<13||age>120)) return setProfileStatus(customerStatus,"Ingresa una edad válida.","error");
    try {
      let avatar=url; const file=$("ayCustomerAvatarFile").files?.[0]; if(file) avatar=await uploadMedia(file,"avatar");
      const r=await client.from("profiles").upsert({
        id:currentUser.id,profile_type:"customer",full_name:name,phone,address,age,city,comuna,
        avatar_url:avatar||null,updated_at:new Date().toISOString()
      },{onConflict:"id"});
      if(r.error) throw r.error;
      setProfileStatus(customerStatus,"Perfil cliente guardado. La próxima etapa será el acceso al explorador de Agenda Ya.","success");
    } catch(err) { setProfileStatus(customerStatus,err?.message||"No fue posible guardar el perfil.","error"); }
  }

  async function saveBusiness(event) {
    event.preventDefault();
    if (!currentUser) return;
    setProfileStatus(businessStatus,"Creando perfil de negocio…");
    const name=$("ayBusinessName").value.trim(), type=$("ayBusinessType").value.trim(),
      phone=$("ayBusinessPhone").value.trim(), city=$("ayBusinessCity").value.trim(),
      comuna=$("ayBusinessComuna").value.trim(), address=$("ayBusinessAddress").value.trim(),
      logoUrl=$("ayBusinessLogo").value.trim();
    if(!name||!type||!city||!comuna||!address)
      return setProfileStatus(businessStatus,"Completa nombre, tipo de servicio, ciudad, comuna y dirección.","error");
    try {
      let logo=logoUrl; const file=$("ayBusinessLogoFile").files?.[0]; if(file) logo=await uploadMedia(file,"business-logo");
      const slug=(name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,50)||"negocio");
      const created=await client.rpc("create_business",{
        p_name:name,p_slug:`${slug}-${currentUser.id.slice(0,8)}`,p_legal_name:null,
        p_email:currentUser.email||null,p_phone:phone||null
      });
      if(created.error) throw created.error;
      const business=created.data; if(!business?.id) throw new Error("Supabase no devolvió el negocio creado.");
      const upd=await client.from("businesses").update({
        business_type:type,address,city,comuna,logo_url:logo||null,phone:phone||null,updated_at:new Date().toISOString()
      }).eq("id",business.id);
      if(upd.error) throw upd.error;
      const profileUpdate=await client.from("profiles").upsert({
        id:currentUser.id,profile_type:"business",full_name:name,phone,address,city,comuna,
        avatar_url:logo||null,updated_at:new Date().toISOString()
      },{onConflict:"id"});
      if(profileUpdate.error) throw profileUpdate.error;
      const rows=DAYS.map((_,i)=>{
        const activeEl=document.querySelector(`.ay-hour-active[data-day="${i+1}"]`);
        const openEl=document.querySelector(`[data-open="${i+1}"]`), closeEl=document.querySelector(`[data-close="${i+1}"]`);
        const active=!!activeEl?.checked;
        return {business_id:business.id,day_of_week:i+1,active,
          open_time:active?(openEl?.value||"09:00"):null,close_time:active?(closeEl?.value||"18:00"):null,
          created_by:currentUser.id,updated_at:new Date().toISOString()};
      });
      const hours=await client.from("business_hours").upsert(rows,{onConflict:"business_id,day_of_week"});
      if(hours.error) throw hours.error;
      setProfileStatus(businessStatus,"Perfil de negocio creado correctamente. Ingresando a Agenda Ya…","success");
      setTimeout(()=>showApp(currentUser),350);
    } catch(err) { setProfileStatus(businessStatus,err?.message||"No fue posible crear el perfil de negocio.","error"); }
  }

  async function boot() {
    showAuth(); initHours();
    if(!validConfig()||!window.supabase?.createClient)
      return setStatus("No se pudo inicializar la autenticación. Revisa Supabase y config.js.","error");

    client=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY,{
      auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
    });

    form.addEventListener("submit",submitAuth);
    switchBtn.addEventListener("click",()=>setMode(mode==="login"?"signup":"login"));
    recovery.addEventListener("click",recoveryFlow);
    google.addEventListener("click",()=>oauth("google"));
    facebook.addEventListener("click",()=>oauth("facebook"));
    continueSetup.addEventListener("click",async()=>{
      try {
        const r=await withTimeout(client.auth.getSession(),10000,"No se pudo recuperar la sesión.");
        if(r.data.session?.user) await routeSession(r.data.session.user);
        else { setMode("login"); setStatus("La sesión no está disponible. Inicia sesión nuevamente.","error"); }
      } catch(err) { setMode("login"); setStatus(err?.message||"No se pudo recuperar la sesión.","error"); }
    });
    document.querySelectorAll(".ay-profile-type-btn").forEach(btn=>btn.addEventListener("click",()=>selectProfileType(btn.dataset.profileType)));
    businessForm.addEventListener("submit",saveBusiness);
    customerForm.addEventListener("submit",saveCustomer);
    $("ayBusinessLogoFile").addEventListener("change",()=>previewFile($("ayBusinessLogoFile"),$("ayBusinessAvatarPreview")));
    $("ayCustomerAvatarFile").addEventListener("change",()=>previewFile($("ayCustomerAvatarFile"),$("ayCustomerAvatarPreview")));

    if(handleUrlError()) return;

    // IMPORTANT: auth state listener does not call Supabase data APIs directly.
    // This prevents the auth lock from being held while routeSession performs DB reads.
    client.auth.onAuthStateChange((event,session)=>{
      if(session?.user) {
        setTimeout(()=>routeSession(session.user),0);
      } else if(event==="SIGNED_OUT") {
        setMode("login"); showAuth();
      }
    });

    const result=await withTimeout(client.auth.getSession(),10000,"No se pudo recuperar la sesión.");
    if(result.error) return setStatus(result.error.message,"error");
    if(result.data.session?.user) {
      cleanAuthHash();
      await routeSession(result.data.session.user);
    }
  }

  window.AgendaYaAuth={
    version:"0.2.1",
    getClient:()=>client,
    setMode,showAuth,showApp,showProfile,routeSession
  };
  boot().catch(err=>{
    console.error("AgendaYaAuth boot:",err);
    setStatus(err?.message||"No se pudo iniciar Agenda Ya.","error");
  });
})();
