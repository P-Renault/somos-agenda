/* Agenda YA Admin Auth · shared Supabase client. Uses the existing public client key only. */
(function(){'use strict';
  const cfg=window.SOMOS_CONFIG||{};
  if(!window.supabase||typeof window.supabase.createClient!=='function'){
    window.__agendaAdminAuthInitError='No se pudo cargar el cliente de Supabase.';return;
  }
  if(!cfg.SUPABASE_URL||!cfg.SUPABASE_ANON_KEY){
    window.__agendaAdminAuthInitError='Falta la configuración pública de Supabase en config.js.';return;
  }
  try{
    window.agendaAdminSupabase=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY,{
      auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
    });
  }catch(e){window.__agendaAdminAuthInitError='No fue posible inicializar Supabase Auth.';}
})();
