/* Agenda YA · Dashboard bootstrap
   Keeps the existing dashboard UI from Backup-1.6,
   but gives it a real, page-level authenticated session. */
(() => {
  const cfg=window.SOMOS_CONFIG||{};
  let client=null;
  let user=null;

  function redirectByRole(profile){
    if(profile?.profile_type==="customer"){
      window.location.replace("explorer.html");
    }else{
      window.location.replace("profile.html");
    }
  }

  async function boot(){
    if(!window.supabase?.createClient){
      throw new Error("Supabase no está disponible.");
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

    const session=await client.auth.getSession();
    if(session.error) throw session.error;

    user=session.data.session?.user;
    if(!user){
      window.location.replace("login.html");
      return;
    }

    const profile=await client.from("profiles")
      .select("profile_type,full_name,phone,address,age,city,comuna,avatar_url")
      .eq("id",user.id)
      .maybeSingle();

    if(profile.error) throw profile.error;

    if(profile.data?.profile_type!=="business"){
      redirectByRole(profile.data);
      return;
    }

    const member=await client.from("business_members")
      .select("business_id,active,role")
      .eq("user_id",user.id)
      .eq("active",true)
      .limit(1);

    if(member.error) throw member.error;

    if(!member.data?.[0]?.business_id){
      window.location.replace("profile.html");
      return;
    }

    window.AgendaYaAuth={
      version:"1.0.0-dashboard-bridge",
      getClient:()=>client,
      getUser:()=>user
    };

    document.body.dataset.profileType="business";
  }

  boot().catch(err=>{
    console.error("Agenda YA dashboard:",err);
    window.location.replace("login.html");
  });
})();
