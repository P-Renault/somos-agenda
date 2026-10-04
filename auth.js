
(() => {
  const cfg=window.SOMOS_CONFIG||{};
  const $=id=>document.getElementById(id);
  const identity=$("ayIdentity"), app=$("ayApp");
  const form=$("identityForm"), email=$("identityEmail"), password=$("identityPassword");
  const confirmWrap=$("identityConfirmWrap"), confirm=$("identityConfirm");
  const submit=$("identitySubmit"), recovery=$("identityRecovery");
  const modeBtn=$("identityMode"), google=$("identityGoogle"), facebook=$("identityFacebook");
  const status=$("identityStatus");
  let client=null, mode="login";

  const valid=cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY &&
    !String(cfg.SUPABASE_URL).includes("REEMPLAZAR") &&
    !String(cfg.SUPABASE_ANON_KEY).includes("REEMPLAZAR");

  function msg(text,type=""){
    status.textContent=text||"";
    status.className="identity-status"+(type?" is-"+type:"");
  }
  function setMode(next){
    mode=next;
    const signup=mode==="signup";
    $("identityTitle").textContent=signup?"Crear cuenta en Agenda Ya":"Bienvenido a Agenda Ya";
    $("identityLead").textContent=signup
      ?"Crea tu acceso para comenzar a configurar tu negocio."
      :"Gestiona tu negocio y recibe más reservas desde un solo lugar.";
    confirmWrap.hidden=!signup;
    password.autocomplete=signup?"new-password":"current-password";
    submit.textContent=signup?"Crear cuenta":"Iniciar sesión";
    modeBtn.innerHTML=signup
      ?"¿Ya tienes una cuenta? <strong>Iniciar sesión</strong>"
      :"¿No tienes una cuenta? <strong>Crear cuenta</strong>";
    msg("");
  }
  function authenticated(user){
    // Identity only: do not enter Profile/Business/Dashboard in this stage.
    identity.dataset.authenticated="true";
    email.disabled=true; password.disabled=true; confirm.disabled=true;
    submit.disabled=true; recovery.disabled=true; modeBtn.disabled=true;
    google.disabled=true; facebook.disabled=true;
    msg("Sesión iniciada correctamente. Identity está validado; el siguiente motor será Perfil.","success");
  }
  async function init(){
    if(!valid){msg("Falta configurar Supabase en config.js.","error");return}
    if(!window.supabase?.createClient){msg("No se pudo cargar Supabase.","error");return}
    client=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY);
    const r=await client.auth.getSession();
    if(r.error){msg(r.error.message,"error");return}
    if(r.data.session?.user) authenticated(r.data.session.user);
    client.auth.onAuthStateChange((event,session)=>{
      if(session?.user) authenticated(session.user);
      else if(event==="SIGNED_OUT"){identity.dataset.authenticated="false";setMode("login")}
    });
  }
  form.addEventListener("submit",async e=>{
    e.preventDefault();
    if(!client)return msg("Supabase no está disponible.","error");
    const eMail=email.value.trim(), pass=password.value;
    if(!eMail||!pass)return msg("Completa email y contraseña.","error");
    if(pass.length<6)return msg("La contraseña debe tener al menos 6 caracteres.","error");
    if(mode==="signup"&&pass!==confirm.value)return msg("Las contraseñas no coinciden.","error");
    submit.disabled=true; msg(mode==="signup"?"Creando cuenta...":"Validando acceso...");
    try{
      const r=mode==="signup"
        ?await client.auth.signUp({email:eMail,password:pass})
        :await client.auth.signInWithPassword({email:eMail,password:pass});
      if(r.error)throw r.error;
      if(mode==="signup"&&!r.data.session){
        msg("Cuenta creada. Revisa tu correo para confirmar la cuenta.","success");
      }else{
        authenticated(r.data.user);
      }
    }catch(err){msg(err?.message||"No fue posible completar el acceso.","error")}
    finally{if(identity.dataset.authenticated!=="true")submit.disabled=false}
  });
  recovery.addEventListener("click",async()=>{
    if(!client)return msg("Supabase no está disponible.","error");
    const eMail=email.value.trim();
    if(!eMail)return msg("Escribe primero tu correo.","error");
    recovery.disabled=true;
    try{
      const r=await client.auth.resetPasswordForEmail(eMail,{redirectTo:location.origin+location.pathname});
      if(r.error)throw r.error;
      msg("Revisa tu correo para recuperar la contraseña.","success");
    }catch(err){msg(err?.message||"No fue posible enviar el correo.","error")}
    finally{recovery.disabled=false}
  });
  modeBtn.addEventListener("click",()=>setMode(mode==="login"?"signup":"login"));
  async function oauth(provider){
    if(!client)return msg("Supabase no está disponible.","error");
    msg("Conectando con "+(provider==="google"?"Google":"Facebook")+"...");
    const r=await client.auth.signInWithOAuth({
      provider,
      options:{redirectTo:location.origin+location.pathname}
    });
    if(r.error)msg(r.error.message,"error");
  }
  google.addEventListener("click",()=>oauth("google"));
  facebook.addEventListener("click",()=>oauth("facebook"));
  init();
})();
