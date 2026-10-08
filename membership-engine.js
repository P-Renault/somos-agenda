/* Agenda Ya · B13 Membership Engine v1.0 */
(() => {
  'use strict';
  if (window.AgendaYaMembershipEngine) return;
  const cfg = window.SOMOS_CONFIG || {};
  let client = null;
  let loaded = false;
  const $ = (s, r=document) => r.querySelector(s);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const money = v => Number(v || 0).toLocaleString('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0});
  function ensureStyles(){
    if(document.getElementById('ayB13B17EngineStyles'))return;
    const st=document.createElement('style');st.id='ayB13B17EngineStyles';st.textContent=`
      .ay-b13-plan-modal{position:fixed;inset:0;z-index:100500;display:grid;place-items:center;padding:18px;background:rgba(13,35,70,.42);backdrop-filter:blur(4px)}
      .ay-b13-plan-dialog{width:min(920px,100%);max-height:min(760px,calc(100vh - 36px));overflow:auto;background:#fff;border:1px solid #dfe8f3;border-radius:24px;box-shadow:0 30px 90px rgba(13,38,78,.24);padding:22px}
      .ay-b13-plan-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:16px}.ay-b13-plan-head h3{margin:4px 0 0;font-size:23px;color:#172f55}.ay-b13-plan-close{width:38px;height:38px;border:0;border-radius:12px;background:#f3f7fc;color:#53657e;font-size:24px;cursor:pointer}
      .ay-b13-plan-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.ay-b13-plan-card{border:1px solid #e4ebf3;border-radius:18px;padding:16px;background:#fbfdff}.ay-b13-plan-card.is-current{border-color:#80b4ef;background:#f0f7ff}.ay-b13-plan-card>span{display:block;color:#0b63e5;font-size:11px;font-weight:900;letter-spacing:.08em}.ay-b13-plan-card>strong{display:block;margin:7px 0;font-size:23px;color:#172f55}.ay-b13-plan-card>strong small{font-size:11px;color:#718096}.ay-b13-plan-card p{min-height:42px;margin:0 0 8px;color:#6f7e93;font-size:12px;line-height:1.45}.ay-b13-plan-card>small{display:block;color:#0b63e5;font-size:11px;font-weight:800;min-height:17px}.ay-b13-plan-card button{width:100%;margin-top:12px;min-height:42px;border:0;border-radius:12px;background:#0b63e5;color:#fff;font-weight:850;cursor:pointer}.ay-b13-plan-card button:disabled{opacity:.6;cursor:wait}.ay-b13-plan-status{margin:14px 0 0;color:#6f7e93;font-size:12px}
      .ay-settings-progress i.is-exceeded{background:#d33a3a}
      @media(max-width:700px){.ay-b13-plan-grid{grid-template-columns:1fr}.ay-b13-plan-dialog{padding:17px;border-radius:20px}.ay-b13-plan-card p{min-height:0}}
    `;document.head.appendChild(st);
  }
  ensureStyles();

  function getClient(){
    if(!client && cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase){
      client = window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    }
    return client;
  }
  function setBadge(root,text){ const b=root?.querySelector('.ay-module-badge'); if(b)b.textContent=text; }
  function updateMembership(row){
    const root=$('#ayMembershipView'); if(!root||!row)return;
    const stats=root.querySelectorAll('.ay-settings-stat-grid>div');
    if(stats[0]){stats[0].querySelector('strong').textContent=row.plan_name||'—';stats[0].querySelector('span').textContent=money(row.price_monthly)+' / mes';}
    if(stats[1]){stats[1].querySelector('strong').textContent=({trialing:'Trial',active:'Activo',past_due:'Pago pendiente',suspended:'Suspendido',cancelled:'Cancelado',expired:'Expirado'}[row.status]||row.status||'—');stats[1].querySelector('span').textContent=row.cancel_at_period_end?'Cancelación al término del período':'Estado validado por backend';}
    if(stats[2]){stats[2].querySelector('strong').textContent=row.days_remaining==null?'—':`${row.days_remaining} días`;stats[2].querySelector('span').textContent=row.current_period_end?'Próxima renovación según período':'Vigencia según membresía';}
    setBadge(root,'Motor activo');
    const hero=$('.ay-settings-engine-badge');if(hero)hero.textContent='Membership Engine · Activo';
    const contract=[...document.querySelectorAll('.ay-settings-contract-grid span')];contract.forEach(x=>{if(x.textContent.trim()==='Membership Engine')x.textContent='Membership Engine · Activo';});
    const contractTitle=$('.ay-settings-contract h3');if(contractTitle)contractTitle.textContent='Motores B13–B17 activos';
    const contractText=$('.ay-settings-contract p');if(contractText)contractText.textContent='Membership, entitlements, límites, billing y ciclo de vida están conectados al backend sin rediseñar esta interfaz.';
  }
  async function load(){
    const c=getClient(); if(!c)return;
    const r=await c.rpc('get_business_membership');
    if(r.error){console.warn('Agenda Ya B13 Membership:',r.error);return;}
    const row=Array.isArray(r.data)?r.data[0]:r.data;
    updateMembership(row); loaded=true;
    return row;
  }
  function closeModal(){document.getElementById('ayB13PlanModal')?.remove();}
  async function openPlanModal(){
    const c=getClient();if(!c)return;
    closeModal();
    const current=await load();
    const plans=await c.from('plans').select('code,name,description,price_monthly,currency,trial_days').eq('is_active',true).order('price_monthly');
    if(plans.error){alert(plans.error.message||'No fue posible cargar los planes.');return;}
    const el=document.createElement('section');el.id='ayB13PlanModal';el.className='ay-b13-plan-modal';
    el.innerHTML=`<div class="ay-b13-plan-dialog" role="dialog" aria-modal="true" aria-label="Planes Agenda Ya">
      <div class="ay-b13-plan-head"><div><span class="ay-settings-label">MEMBRESÍA</span><h3>Plan de Agenda Ya</h3></div><button type="button" class="ay-b13-plan-close" aria-label="Cerrar">×</button></div>
      <div class="ay-b13-plan-grid">${(plans.data||[]).map(p=>`<article class="ay-b13-plan-card ${current?.plan_code===p.code?'is-current':''}"><span>${esc(p.name)}</span><strong>${money(p.price_monthly)}${p.price_monthly>0?'<small>/mes</small>':''}</strong><p>${esc(p.description||'')}</p>${p.trial_days?`<small>${p.trial_days} días de prueba</small>`:''}<button type="button" data-plan-code="${esc(p.code)}">${current?.plan_code===p.code?'Plan actual':p.code==='free'?'Solicitar FREE':'Iniciar pago'}</button></article>`).join('')}</div>
      <p class="ay-b13-plan-status" id="ayB13PlanStatus">El estado de pago siempre se valida en backend.</p>
    </div>`;
    document.body.appendChild(el);
    el.addEventListener('click',async e=>{
      if(e.target===el||e.target.closest('.ay-b13-plan-close')){closeModal();return;}
      const b=e.target.closest('[data-plan-code]');if(!b)return;
      const code=b.dataset.planCode;if(code===current?.plan_code)return;
      const status=$('#ayB13PlanStatus',el);b.disabled=true;status.textContent='Registrando solicitud…';
      const r=code==='free'
        ? await c.rpc('downgrade_business_to_free')
        : await c.rpc('create_payment_intent',{p_plan_code:code});
      if(r.error){status.textContent=r.error.message||'No fue posible iniciar la solicitud.';b.disabled=false;return;}
      status.textContent=code==='free'?'Plan FREE activado por backend.':'Solicitud de pago registrada. El checkout del proveedor se conecta en la siguiente capa de Flow.';
      await load();
    });
  }
  function bind(){
    window.addEventListener('agendaYa:view-change',e=>{if(e.detail?.view==='settings')setTimeout(()=>void load(),0);});
    document.addEventListener('click',e=>{const b=e.target.closest?.('[data-ay-action="membership-engine-placeholder"]');if(b){e.preventDefault();void openPlanModal();}});
    if(window.AgendaYaUI?.getCurrentView?.()==='settings')void load();
  }
  bind();
  window.AgendaYaMembershipEngine={version:'1.0.0',load,openPlanModal,getCurrent:()=>loaded};
})();
