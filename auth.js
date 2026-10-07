/*
 Agenda Ya — Identity + Profile v0.4.2
 FIX: completa el onboarding negocio sin bloqueo de RLS y evita duplicar negocios.
 Flujo: Identity -> Profile -> Business Details -> Hours -> Agenda Ya / Customer -> Marketplace
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
  const businessForm = $("ayBusinessProfileForm"), businessScheduleForm = $("ayBusinessScheduleForm"), customerForm = $("ayCustomerProfileForm");
  const businessStatus = $("ayBusinessStatus"), businessScheduleStatus = $("ayBusinessScheduleStatus"), customerStatus = $("ayCustomerStatus");
  const profileTitle = $("ayProfileTitle"), profileSubtitle = $("ayProfileSubtitle");
  let client = null, mode = "login", currentUser = null, profileType = "business";
  let profileStep = "choice";
  let businessStep = "details";
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
  function showAuth() {
    if (authView) { authView.hidden = false; authView.style.display = "flex"; }
    if (profileView) { profileView.hidden = true; profileView.style.display = "none"; }
    if (appView) { appView.hidden = true; appView.style.display = "none"; }
  }
  function showProfile() {
    // HARD NAVIGATION: do not rely only on the hidden attribute.
    // Explicit display values make the transition deterministic on mobile browsers.
    if (authView) { authView.hidden = true; authView.style.display = "none"; }
    if (profileView) { profileView.hidden = false; profileView.style.display = "block"; }
    if (appView) { appView.hidden = true; appView.style.display = "none"; }
    try { window.scrollTo(0, 0); } catch (_) {}
  }
  function showApp(user) {
    if (authView) { authView.hidden = true; authView.style.display = "none"; }
    if (profileView) { profileView.hidden = true; profileView.style.display = "none"; }
    if (appView) { appView.hidden = false; appView.style.display = "block"; }
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
    document.querySelectorAll(".ay-profile-type-btn").forEach(btn => {
      const active = btn.dataset.profileType === type;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });
    if (businessForm && profileStep === "form") businessForm.hidden = type !== "business";
    if (businessScheduleForm && profileStep === "form") businessScheduleForm.hidden = type !== "business" || businessStep !== "schedule";
    if (customerForm && profileStep === "form") customerForm.hidden = type !== "customer";
  }
  function showProfileChoice() {
    profileStep = "choice";
    const choice = $("ayProfileChoiceStep"), formStep = $("ayProfileFormStep");
    if (choice) { choice.hidden = false; choice.style.display = "block"; }
    if (formStep) { formStep.hidden = true; formStep.style.display = "none"; }
    if (profileTitle) profileTitle.textContent = "Bienvenido a Agenda Ya";
    if (profileSubtitle) profileSubtitle.textContent = "Elige tu perfil para comenzar.";
    selectProfileType(profileType);
    try { window.scrollTo(0, 0); } catch (_) {}
  }
  function showSelectedProfileForm() {
    profileStep = "form";
    const choice = $("ayProfileChoiceStep"), formStep = $("ayProfileFormStep");
    if (choice) { choice.hidden = true; choice.style.display = "none"; }
    if (formStep) { formStep.hidden = false; formStep.style.display = "block"; }
    if (profileTitle) profileTitle.textContent = profileType === "business" ? "Configura tu negocio" : "Configura tu perfil cliente";
    if (profileSubtitle) profileSubtitle.textContent = profileType === "business" ? "Completa los datos básicos de tu negocio." : "Completa tus datos para comenzar a reservar.";
    businessStep = "details";
    if (businessForm) { businessForm.hidden = profileType !== "business"; businessForm.style.display = profileType === "business" ? "grid" : "none"; }
    if (businessScheduleForm) { businessScheduleForm.hidden = true; businessScheduleForm.style.display = "none"; }
    if (customerForm) { customerForm.hidden = profileType !== "customer"; customerForm.style.display = profileType === "customer" ? "grid" : "none"; }
    selectProfileType(profileType);
    try { window.scrollTo(0, 0); } catch (_) {}
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
    try {
      const r = await withTimeout(
        client.from("profiles")
          .select("profile_type,full_name,phone,address,age,city,comuna,avatar_url")
          .eq("id", user.id).maybeSingle(),
        8000,
        "La consulta del perfil está tardando demasiado."
      );
      if (r.error) {
        console.warn("Profile lookup:", r.error);
        return null;
      }
      return r.data?.profile_type ? r.data : null;
    } catch (err) {
      console.warn("Profile lookup timeout/error:", err);
      return null;
    }
  }
  async function loadBusinessExisting(user) {
    try {
      const m = await withTimeout(
        client.from("business_members")
          .select("business_id,role,active")
          .eq("user_id", user.id).eq("active", true).limit(1),
        8000,
        "La consulta del negocio está tardando demasiado."
      );
      if (m.error || !m.data?.length) return null;
      const b = await withTimeout(
        client.from("businesses")
          .select("id,name,phone,address,city,comuna,business_type,logo_url")
          .eq("id", m.data[0].business_id).maybeSingle(),
        8000,
        "La consulta del negocio está tardando demasiado."
      );
      return b.data || null;
    } catch (err) {
      console.warn("Business lookup timeout/error:", err);
      return null;
    }
  }
  function phoneLocalValue(value) {
    let digits = String(value || "").replace(/\D/g, "");
    if (digits.startsWith("569") && digits.length >= 11) digits = digits.slice(3);
    else if (digits.startsWith("56") && digits.length >= 10) digits = digits.slice(2);
    if (digits.length === 9 && digits.startsWith("9")) digits = digits.slice(1);
    return digits.slice(0, 8);
  }
  function fullChileMobile(value) {
    const local = phoneLocalValue(value);
    return local ? `+56 9 ${local}` : "";
  }

  function populateCustomer(p, user) {
    $("ayCustomerName").value = p?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || "";
    $("ayCustomerPhone").value = phoneLocalValue(p?.phone || user?.user_metadata?.phone || "");
    $("ayCustomerAge").value = p?.age || "";
    $("ayCustomerCity").value = p?.city || "";
    $("ayCustomerComuna").value = p?.comuna || "";
    $("ayCustomerAddress").value = p?.address || "";
    $("ayCustomerAvatarPreview").textContent = initials(p?.full_name || user?.email);
  }
  function populateBusiness(b, user) {
    $("ayBusinessName").value = b?.name || "";
    $("ayBusinessType").value = b?.business_type || "";
    $("ayBusinessPhone").value = phoneLocalValue(b?.phone || user?.user_metadata?.phone || "");
    $("ayBusinessCity").value = b?.city || "";
    $("ayBusinessComuna").value = b?.comuna || "";
    $("ayBusinessAddress").value = b?.address || "";
    $("ayBusinessAvatarPreview").textContent = initials(b?.name || user?.email);
  }

  async function routeSession(user) {
    if (!user) return;
    if (routingInProgress && currentUser?.id === user.id) {
      // A second auth event may arrive while hydration is running.
      // Never block navigation because of it.
      showProfile();
      return;
    }
    routingInProgress = true;
    currentUser = user;

    // CRITICAL: the authenticated user must see Profile immediately.
    // Database reads are hydration only and must never block navigation.
    showProfile();
    selectProfileType("business");
    populateBusiness(null, user);
    setProfileStatus(businessStatus, "Sesión activa. Cargando tus datos de perfil…", "success");

    try {
      const profile = await loadProfileState(user);

      if (profile?.profile_type === "customer") {
        profileType = "customer";
        selectProfileType("customer");
        populateCustomer(profile, user);
        showSelectedProfileForm();
        setProfileStatus(customerStatus, "Perfil cliente cargado. Completa o verifica tus datos.", "success");
        return;
      }

      if (profile?.profile_type === "business") {
        profileType = "business";
        const business = await loadBusinessExisting(user);
        selectProfileType("business");
        populateBusiness(business, user);
        showSelectedProfileForm();
        setProfileStatus(businessStatus, business ? "Perfil de negocio cargado. Verifica tus datos para continuar." : "Completa los datos básicos de tu negocio.", "success");
        return;
      }

      // New account: first show ONLY the two profile choices.
      profileType = "business";
      selectProfileType("business");
      showProfileChoice();
    } catch (err) {
      console.error("routeSession hydration:", err);
      // Never send the user back to Login because a profile read failed.
      showProfile();
      selectProfileType("business");
      populateBusiness(null, user);
      setProfileStatus(businessStatus, "Sesión activa. Puedes comenzar a configurar tu perfil.", "success");
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
        const authenticatedUser = result.data.session.user;
        setStatus("Acceso confirmado. Abriendo tu perfil…","success");
        currentUser = authenticatedUser;
        // Deterministic navigation BEFORE any profile/database work.
        showProfile();
        selectProfileType("business");
        showProfileChoice();
        populateBusiness(null, authenticatedUser);
        // Database hydration is strictly secondary.
        setTimeout(() => { void routeSession(authenticatedUser); }, 0);
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
    const name=$("ayCustomerName").value.trim(), phone=fullChileMobile($("ayCustomerPhone").value),
      ageRaw=$("ayCustomerAge").value, city=$("ayCustomerCity").value.trim(),
      comuna=$("ayCustomerComuna").value.trim(), address=$("ayCustomerAddress").value.trim();
    if(!name||!city||!comuna||!address) return setProfileStatus(customerStatus,"Completa nombre, ciudad, comuna y dirección.","error");
    const age=ageRaw?Number(ageRaw):null;
    if(age!==null&&(age<13||age>120)) return setProfileStatus(customerStatus,"Ingresa una edad válida.","error");
    try {
      let avatar=null; const file=$("ayCustomerAvatarFile").files?.[0]; if(file) avatar=await uploadMedia(file,"avatar");
      const r=await client.from("profiles").upsert({
        id:currentUser.id,profile_type:"customer",full_name:name,phone,address,age,city,comuna,
        avatar_url:avatar||null,updated_at:new Date().toISOString()
      },{onConflict:"id"});
      if(r.error) throw r.error;
      setProfileStatus(customerStatus,"Perfil cliente guardado. Abriendo Agenda Ya…","success");
      setTimeout(()=>{ window.location.href = "explorer.html"; }, 500);
    } catch(err) { setProfileStatus(customerStatus,err?.message||"No fue posible guardar el perfil.","error"); }
  }

  function validateBusinessDetails() {
    const name = $("ayBusinessName").value.trim();
    const type = $("ayBusinessType").value.trim();
    const city = $("ayBusinessCity").value.trim();
    const comuna = $("ayBusinessComuna").value.trim();
    const address = $("ayBusinessAddress").value.trim();
    if (!name || !type || !city || !comuna || !address) {
      setProfileStatus(businessStatus, "Completa nombre, tipo de servicio, ciudad, comuna y dirección.", "error");
      return false;
    }
    return true;
  }

  function showBusinessScheduleStep() {
    if (!validateBusinessDetails()) return;
    businessStep = "schedule";
    if (businessForm) { businessForm.hidden = true; businessForm.style.display = "none"; }
    if (businessScheduleForm) { businessScheduleForm.hidden = false; businessScheduleForm.style.display = "grid"; }
    if (profileTitle) profileTitle.textContent = "Configura tu negocio";
    if (profileSubtitle) profileSubtitle.textContent = "Paso 2 · Configura los horarios de atención.";
    if (businessScheduleStatus) setProfileStatus(businessScheduleStatus, "Revisa los horarios antes de guardar.");
    try { window.scrollTo(0, 0); } catch (_) {}
  }

  function showBusinessDetailsStep() {
    businessStep = "details";
    if (businessForm) { businessForm.hidden = false; businessForm.style.display = "grid"; }
    if (businessScheduleForm) { businessScheduleForm.hidden = true; businessScheduleForm.style.display = "none"; }
    if (profileTitle) profileTitle.textContent = "Configura tu negocio";
    if (profileSubtitle) profileSubtitle.textContent = "Completa los datos básicos de tu negocio.";
    try { window.scrollTo(0, 0); } catch (_) {}
  }

  async function saveBusiness(event) {
    event.preventDefault();
    if (!currentUser) return;
    if (!validateBusinessDetails()) return;
    setProfileStatus(businessScheduleStatus, "Guardando datos del negocio…");
    const name = $("ayBusinessName").value.trim(), type = $("ayBusinessType").value.trim(),
      phone = fullChileMobile($("ayBusinessPhone").value), city = $("ayBusinessCity").value.trim(),
      comuna = $("ayBusinessComuna").value.trim(), address = $("ayBusinessAddress").value.trim();
    try {
      let logo = null;
      const file = $("ayBusinessLogoFile").files?.[0];
      if (file) logo = await uploadMedia(file, "business-logo");

      // Reuse the existing business when the user is retrying onboarding.
      // This prevents duplicate businesses after a failed schedule save.
      let existing = await loadBusinessExisting(currentUser);
      let business = existing;

      if (!business?.id) {
        const slug = (name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "negocio");
        const created = await client.rpc("create_business", {
          p_name: name, p_slug: `${slug}-${currentUser.id.slice(0, 8)}`, p_legal_name: null,
          p_email: currentUser.email || null, p_phone: phone || null
        });
        if (created.error) throw created.error;
        business = created.data;
      }
      if (!business?.id) throw new Error("Supabase no devolvió el negocio creado.");

      const upd = await client.from("businesses").update({
        name, business_type: type, address, city, comuna, logo_url: logo || business.logo_url || null,
        phone: phone || business.phone || null, updated_at: new Date().toISOString()
      }).eq("id", business.id);
      if (upd.error) throw upd.error;

      const profileUpdate = await client.from("profiles").upsert({
        id: currentUser.id, profile_type: "business", full_name: name, phone, address, city, comuna,
        avatar_url: logo || null, updated_at: new Date().toISOString()
      }, { onConflict: "id" });
      if (profileUpdate.error) throw profileUpdate.error;

      const rows = DAYS.map((_, i) => {
        const activeEl = document.querySelector(`.ay-hour-active[data-day="${i + 1}"]`);
        const openEl = document.querySelector(`[data-open="${i + 1}"]`), closeEl = document.querySelector(`[data-close="${i + 1}"]`);
        const active = !!activeEl?.checked;
        return { business_id: business.id, day_of_week: i + 1, active,
          open_time: active ? (openEl?.value || "09:00") : null,
          close_time: active ? (closeEl?.value || "18:00") : null,
          created_by: currentUser.id, updated_at: new Date().toISOString() };
      });

      // business_hours has a unique (business_id, day_of_week) constraint in 005_identity_profiles_v0_2.
      // The SQL fix shipped with this package aligns its RLS policies with the one-argument core helpers.
      const hours = await client.from("business_hours").upsert(rows, { onConflict: "business_id,day_of_week" });
      if (hours.error) throw hours.error;

      setProfileStatus(businessScheduleStatus, "Perfil de negocio creado. Abriendo Agenda Ya…", "success");
      setTimeout(() => showApp(currentUser), 350);
    } catch (err) {
      console.error("saveBusiness:", err);
      setProfileStatus(businessScheduleStatus, err?.message || "No fue posible guardar el perfil de negocio.", "error");
    }
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
        if(r.data.session?.user) { currentUser=r.data.session.user; showProfile(); showProfileChoice(); }
        else { setMode("login"); setStatus("La sesión no está disponible. Inicia sesión nuevamente.","error"); }
      } catch(err) { setMode("login"); setStatus(err?.message||"No se pudo recuperar la sesión.","error"); }
    });
    document.querySelectorAll(".ay-profile-type-btn").forEach(btn=>btn.addEventListener("click",()=>selectProfileType(btn.dataset.profileType)));
    $("ayProfileNext").addEventListener("click",()=>showSelectedProfileForm());
    $("ayProfileBack").addEventListener("click",()=>showProfileChoice());
    $("ayBusinessNext").addEventListener("click",showBusinessScheduleStep);
    $("ayBusinessScheduleBack").addEventListener("click",showBusinessDetailsStep);
    businessScheduleForm.addEventListener("submit",saveBusiness);
    customerForm.addEventListener("submit",saveCustomer);
    $("ayBusinessLogoFile").addEventListener("change",()=>previewFile($("ayBusinessLogoFile"),$("ayBusinessAvatarPreview")));
    $("ayCustomerAvatarFile").addEventListener("change",()=>previewFile($("ayCustomerAvatarFile"),$("ayCustomerAvatarPreview")));
    [$("ayBusinessPhone"), $("ayCustomerPhone")].forEach(input=>input?.addEventListener("input",()=>{
      input.value = input.value.replace(/\D/g, "").slice(0, 8);
    }));

    if(handleUrlError()) return;

    // IMPORTANT: auth state listener does not call Supabase data APIs directly.
    // This prevents the auth lock from being held while routeSession performs DB reads.
    client.auth.onAuthStateChange((event,session)=>{
      if(session?.user) {
        currentUser = session.user;
        showProfile();
        selectProfileType("business");
        showProfileChoice();
        populateBusiness(null, session.user);
        if (!routingInProgress) setTimeout(()=>routeSession(session.user),0);
      } else if(event==="SIGNED_OUT") {
        setMode("login"); showAuth();
      }
    });

    const result=await withTimeout(client.auth.getSession(),10000,"No se pudo recuperar la sesión.");
    if(result.error) return setStatus(result.error.message,"error");
    if(result.data.session?.user) {
      cleanAuthHash();
      currentUser = result.data.session.user;
      showProfile();
      selectProfileType("business");
      showProfileChoice();
      populateBusiness(null, result.data.session.user);
      void routeSession(result.data.session.user);
    }
  }

  window.AgendaYaAuth={
    version:"0.4.2",
    getClient:()=>client,
    setMode,showAuth,showApp,showProfile,routeSession
  };
  boot().catch(err=>{
    console.error("AgendaYaAuth boot:",err);
    setStatus(err?.message||"No se pudo iniciar Agenda Ya.","error");
  });
})();
