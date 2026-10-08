/* Agenda Ya · B15 Limits Engine v1.0 */
(() => {
  'use strict';
  if(window.AgendaYaLimitsEngine)return;
  const cfg=window.SOMOS_CONFIG||{};let client=null;
  const $=(s,r=document)=>r.querySelector(s);
  function c(){if(!client&&window.supabase&&cfg.SUPABASE_URL&&cfg.SUPABASE_ANON_KEY)client=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});return client;}
  function apply(rows){
    (rows||[]).forEach(x=>{
      const usage=document.querySelector(`[data-membership-usage="${x.metric_key}"]`),progress=document.querySelector(`[data-membership-progress="${x.metric_key}"]`),status=document.querySelector(`[data-membership-limit-status="${x.metric_key}"]`);
      if(usage)usage.textContent=x.unlimited?`${x.usage} / ∞`:`${x.usage} / ${x.limit_value}`;
      if(progress){const pct=x.unlimited?0:Math.min(100,Math.round((Number(x.usage||0)/Math.max(1,Number(x.limit_value||0)))*100));progress.style.width=`${pct}%`;progress.classList.toggle('is-exceeded',!!x.exceeded);}
      if(status)status.textContent=x.exceeded?`Límite excedido · ${x.usage}/${x.limit_value}`:x.unlimited?'Ilimitado':`${Math.max(0,Number(x.limit_value||0)-Number(x.usage||0))} disponibles`;
    });
    const root=$('#ayLimitsView');const badge=root?.querySelector('.ay-module-badge');if(badge)badge.textContent='Motor activo';
    const muted=root?.querySelector('.ay-settings-muted');if(muted)muted.textContent='Uso calculado en backend y límites aplicados por funciones y triggers de Supabase.';
  }
  async function load(){const x=c();if(!x)return;const r=await x.rpc('get_business_limits');if(r.error){console.warn('Agenda Ya B15 Limits:',r.error);return;}apply(r.data||[]);return r.data||[];}
  window.addEventListener('agendaYa:view-change',e=>{if(e.detail?.view==='settings')setTimeout(()=>void load(),40);});
  if(window.AgendaYaUI?.getCurrentView?.()==='settings')void load();
  window.AgendaYaLimitsEngine={version:'1.0.0',load};
})();
