/* Agenda Ya · B14 Entitlements Engine v1.0 */
(() => {
  'use strict';
  if(window.AgendaYaEntitlementsEngine)return;
  const cfg=window.SOMOS_CONFIG||{};let client=null;
  const $=(s,r=document)=>r.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  function c(){if(!client&&window.supabase&&cfg.SUPABASE_URL&&cfg.SUPABASE_ANON_KEY)client=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});return client;}
  function display(data){
    const root=$('#ayEntitlementsView');if(!root)return;
    const map={
      services:{keys:['services.max','service.max','services_limit','max_services'],labels:['servicios','services']},
      professionals:{keys:['professionals.max','professional.max','professionals_limit','max_professionals'],labels:['profesionales','professionals']},
      clients:{keys:['clients.max','client.max','clients_limit','max_clients'],labels:['clientes','clients']},
      bookings:{keys:['bookings.monthly.max','bookings.max','reservations.monthly.max','reservations.max','monthly_bookings.max'],labels:['reservas','bookings','reservations']}
    };
    const rows=root.querySelectorAll('.ay-settings-feature-list>div');
    const list=Array.isArray(data)?data:(Array.isArray(data?.entitlements)?data.entitlements:(Array.isArray(data?.items)?data.items:[]));
    const normalizeKey=v=>String(v??'').trim().toLowerCase();
    const getKey=e=>normalizeKey(e.key??e.entitlement_key??e.feature_key??e.code??e.slug??e.name);
    const getValue=e=>e.value??e.limit_value??e.numeric_value??e.max_value??e.limit??e.quantity;
    rows.forEach(row=>{
      const label=normalizeKey(row.querySelector('span')?.textContent);
      const category=Object.keys(map).find(k=>map[k].labels.some(l=>label===l||label.startsWith(l)));
      if(!category)return;
      const aliases=map[category].keys;
      const e=list.find(v=>aliases.includes(getKey(v)));
      if(!e)return;
      const b=row.querySelector('b');if(!b)return;
      const type=normalizeKey(e.value_type??e.limit_type??e.type);
      const enabled=e.enabled??e.is_enabled??e.active;
      const value=getValue(e);
      if(type==='unlimited'||e.unlimited===true||value==='unlimited'||value==='infinity')b.textContent='Ilimitado';
      else if(type==='boolean'||typeof enabled==='boolean')b.textContent=(type==='boolean'||typeof enabled==='boolean')?(Boolean(enabled)?'Sí':'No'):String(value??'—');
      else if(value!==undefined&&value!==null&&value!=='')b.textContent=Number.isFinite(Number(value))?Number(value).toLocaleString('es-CL'):String(value);
      b.title=getKey(e);
    });
    const badge=root.querySelector('.ay-module-badge');if(badge)badge.textContent='Motor activo';
    const muted=root.querySelector('.ay-settings-muted');if(muted)muted.textContent='Disponibilidad y capacidades se resuelven desde los entitlements del plan actual.';
  }
  async function load(){const x=c();if(!x)return;const r=await x.rpc('get_business_entitlements');if(r.error){console.warn('Agenda Ya B14 Entitlements:',r.error);return;}window.__AY_ENTITLEMENTS=r.data||[];display(r.data||[]);return r.data||[];}
  window.addEventListener('agendaYa:view-change',e=>{if(e.detail?.view==='settings')setTimeout(()=>void load(),20);});
  if(window.AgendaYaUI?.getCurrentView?.()==='settings')void load();
  window.AgendaYaEntitlementsEngine={version:'1.0.0',load};
})();
