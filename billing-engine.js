/* Agenda Ya · B16 Billing Engine v1.0 */
(() => {
  'use strict';
  if(window.AgendaYaBillingEngine)return;
  const cfg=window.SOMOS_CONFIG||{};let client=null;let billing=null;
  const $=(s,r=document)=>r.querySelector(s);
  function c(){if(!client&&window.supabase&&cfg.SUPABASE_URL&&cfg.SUPABASE_ANON_KEY)client=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});return client;}
  function badge(){const b=$('#ayBillingView .ay-module-badge');if(b)b.textContent='Motor activo';}
  function renderPayments(){
    const root=$('#ayBillingView');if(!root||!billing)return;
    badge();
    const buttons=[...root.querySelectorAll('.ay-settings-menu-list button')];
    const payments=billing.payments||[];
    if(buttons[0]){buttons[0].querySelector('strong').textContent='Gestionar pago';buttons[0].querySelector('small').textContent=payments.some(p=>p.status==='pending')?'Pago pendiente registrado.':'Checkout y estado de pago.';}
    if(buttons[1]){buttons[1].querySelector('strong').textContent='Historial de pagos';buttons[1].querySelector('small').textContent=payments.length?`${payments.length} movimiento(s) registrado(s).`:'Sin pagos registrados todavía.';}
    if(buttons[2]){buttons[2].querySelector('strong').textContent=billing.subscription?.cancel_at_period_end?'Reactivar renovación':'Gestionar renovación';buttons[2].querySelector('small').textContent=billing.subscription?.cancel_at_period_end?'La cancelación está programada al término del período.':'Cancelación y reactivación.';}
  }
  async function load(){const x=c();if(!x)return;const r=await x.rpc('get_business_billing');if(r.error){console.warn('Agenda Ya B16 Billing:',r.error);return;}billing=r.data||null;renderPayments();return billing;}
  async function paymentAction(){
    const x=c();if(!x)return;const plans=await x.from('plans').select('code,name,price_monthly').eq('is_active',true).order('price_monthly');
    if(plans.error){alert(plans.error.message||'No fue posible cargar los planes.');return;}
    const paid=(plans.data||[]).filter(p=>Number(p.price_monthly)>0);if(!paid.length){alert('No hay planes pagados configurados.');return;}
    const current=billing?.subscription?.plan_code;const p=paid.find(z=>z.code!==current)||paid[0];
    const r=await x.rpc('create_payment_intent',{p_plan_code:p.code});
    if(r.error){alert(r.error.message||'No fue posible crear la solicitud de pago.');return;}
    alert(`Solicitud de pago creada para ${p.name}.\n\nEl proveedor Flow aún debe entregar el checkout para completar el pago.`);
    await load();
  }
  function historyAction(){
    const rows=billing?.payments||[];const text=rows.length?rows.slice(0,10).map(p=>`${new Date(p.created_at).toLocaleDateString('es-CL')} · ${p.status} · $${Number(p.amount||0).toLocaleString('es-CL')}`).join('\n'):'No hay pagos registrados.';alert(`Historial de pagos\n\n${text}`);
  }
  async function renewalAction(){
    const x=c();if(!x)return;
    if(billing?.subscription?.cancel_at_period_end){const r=await x.rpc('reactivate_business_subscription');if(r.error){alert(r.error.message||'No fue posible reactivar.');return;}}
    else{const r=await x.rpc('cancel_business_subscription',{p_immediate:false});if(r.error){alert(r.error.message||'No fue posible gestionar la renovación.');return;}}
    await load();window.AgendaYaSubscriptionLifecycleEngine?.load?.();window.AgendaYaMembershipEngine?.load?.();
  }
  document.addEventListener('click',e=>{const b=e.target.closest?.('#ayBillingView .ay-settings-menu-list button');if(!b)return;const i=[...b.parentElement.children].indexOf(b);if(i===0)void paymentAction();else if(i===1)historyAction();else if(i===2)void renewalAction();});
  window.addEventListener('agendaYa:view-change',e=>{if(e.detail?.view==='settings')setTimeout(()=>void load(),60);});
  if(window.AgendaYaUI?.getCurrentView?.()==='settings')void load();
  window.AgendaYaBillingEngine={version:'1.0.0',load,get:()=>billing};
})();
