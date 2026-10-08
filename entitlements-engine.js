/* Agenda Ya · B14 Entitlements Engine v1.0 */
(() => {
  'use strict';
  if(window.AgendaYaEntitlementsEngine)return;
  const cfg=window.SOMOS_CONFIG||{};let client=null;
  const $=(s,r=document)=>r.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  function c(){if(!client&&window.supabase&&cfg.SUPABASE_URL&&cfg.SUPABASE_ANON_KEY)client=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});return client;}
  function display(x){
    const map={services:'services.max',professionals:'professionals.max',clients:'clients.max',bookings:'bookings.monthly.max'};
    const root=$('#ayEntitlementsView');if(!root)return;
    const rows=root.querySelectorAll('.ay-settings-feature-list>div');
    rows.forEach(row=>{const label=row.querySelector('span')?.textContent?.trim().toLowerCase();const key=Object.keys(map).find(k=>label?.startsWith(k==='bookings'?'reservas':k));if(!key)return;const e=window.__AY_ENTITLEMENTS?.find(v=>v.key===map[key]);if(!e)return;row.querySelector('b').textContent=e.value_type==='unlimited'?'Ilimitado':e.value_type==='boolean'?(e.enabled?'Sí':'No'):e.value;row.querySelector('b').title=e.key;});
    const badge=root.querySelector('.ay-module-badge');if(badge)badge.textContent='Motor activo';
    const muted=root.querySelector('.ay-settings-muted');if(muted)muted.textContent='Disponibilidad y capacidades se resuelven desde los entitlements del plan actual.';
  }
  async function load(){const x=c();if(!x)return;const r=await x.rpc('get_business_entitlements');if(r.error){console.warn('Agenda Ya B14 Entitlements:',r.error);return;}window.__AY_ENTITLEMENTS=r.data||[];display(r.data||[]);return r.data||[];}
  window.addEventListener('agendaYa:view-change',e=>{if(e.detail?.view==='settings')setTimeout(()=>void load(),20);});
  if(window.AgendaYaUI?.getCurrentView?.()==='settings')void load();
  window.AgendaYaEntitlementsEngine={version:'1.0.0',load};
})();
