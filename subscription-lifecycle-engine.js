/* Agenda Ya · B17 Subscription Lifecycle Engine v1.0 */
(() => {
  'use strict';
  if(window.AgendaYaSubscriptionLifecycleEngine)return;
  const cfg=window.SOMOS_CONFIG||{};let client=null;
  const $=(s,r=document)=>r.querySelector(s);
  function c(){if(!client&&window.supabase&&cfg.SUPABASE_URL&&cfg.SUPABASE_ANON_KEY)client=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});return client;}
  const labels={trialing:['Trial','Inicio'],active:['Activo','Pago confirmado'],past_due:['Pago pendiente','Grace period'],suspended:['Suspendido','Acceso restringido'],cancelled:['Cancelado','Fin de suscripción'],expired:['Expirado','Fin de período']};
  async function load(){
    const x=c();if(!x)return;const r=await x.rpc('get_business_membership');if(r.error){console.warn('Agenda Ya B17 Lifecycle:',r.error);return;}const row=Array.isArray(r.data)?r.data[0]:r.data;if(!row)return;
    const root=$('#ayLifecycleView');if(!root)return;const list=root.querySelector('.ay-settings-lifecycle');if(!list)return;
    list.innerHTML=Object.entries(labels).map(([key,v])=>`<div class="${row.status===key?'is-current':''}"><b>${v[0]}</b><span>${v[1]}</span></div>`).join('');
    const note=root.querySelector('.ay-settings-muted');if(note){const tail=row.days_remaining==null?'':` · ${row.days_remaining} días restantes`;note.textContent=`Estado real: ${vSafe(row.status)}${tail}. Determinado por Membership + Billing en backend.`;}
    const badge=root.querySelector('.ay-module-badge');if(badge)badge.textContent='Motor activo';
    return row;
  }
  function vSafe(s){return labels[s]?.[0]||s||'No definido';}
  window.addEventListener('agendaYa:view-change',e=>{if(e.detail?.view==='settings')setTimeout(()=>void load(),80);});
  if(window.AgendaYaUI?.getCurrentView?.()==='settings')void load();
  setInterval(()=>{if(window.AgendaYaUI?.getCurrentView?.()==='settings')void load();},60000);
  window.AgendaYaSubscriptionLifecycleEngine={version:'1.0.0',load};
})();
