(() => {
  'use strict';
  const cfg = window.SOMOS_CONFIG || {};
  const client = window.supabase?.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY,{
    auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
  });
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  let lastUnread = '';

  function engine(){ return window.AgendaYaCustomerData || null; }

  function badgeFromNotifications(items){
    const b=document.getElementById('cpNotificationBadge');
    if(!b)return;
    const unread=(items||[]).filter(x=>!x.read_at);
    b.textContent=String(Math.min(unread.length,9));
    b.hidden=unread.length===0;
    const signature=unread.map(x=>x.id).join('|');
    if(lastUnread && signature!==lastUnread){
      document.dispatchEvent(new CustomEvent('agendaYa:customer-status-notification',{detail:{notifications:unread}}));
    }
    lastUnread=signature;
  }

  function openReviewModal(bookingId, existing){
    document.getElementById('ayCustomerReviewModal')?.remove();
    const modal=document.createElement('div');
    modal.id='ayCustomerReviewModal';
    modal.innerHTML=`<div style="position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px">
      <section class="cp-card" style="width:min(520px,100%);max-height:90vh;overflow:auto">
        <div class="cp-card-head"><div><span class="cp-eyebrow">AGENDA YA · REPUTACIÓN</span><h2>${existing?'Valoración registrada':'Valorar negocio'}</h2><p>${existing?'Puedes consultar la valoración asociada a esta reserva.':'Tu valoración solo se registra sobre una reserva completada.'}</p></div>
        <button type="button" id="ayCloseReview" style="border:0;background:transparent;font-size:24px;cursor:pointer">×</button></div>
        ${existing
          ? `<div style="font-size:24px;margin:18px 0">★★★★★</div><p><strong>${esc(existing.rating)}/5</strong>${existing.comment?` · ${esc(existing.comment)}`:''}</p>`
          : `<label style="display:block;margin:14px 0">Puntuación
              <select id="ayReviewRating" style="width:100%;padding:12px;margin-top:6px">
                <option value="5">5 · Excelente</option><option value="4">4 · Muy bueno</option><option value="3">3 · Bueno</option><option value="2">2 · Regular</option><option value="1">1 · Deficiente</option>
              </select></label>
             <label style="display:block;margin:14px 0">Comentario<textarea id="ayReviewComment" maxlength="1000" rows="5" style="width:100%;padding:12px;box-sizing:border-box"></textarea></label>
             <p id="ayReviewStatus" class="cp-form-status"></p>
             <button id="aySubmitReview" class="cp-primary-btn" type="button">Guardar valoración</button>`}
      </section>
    </div>`;
    document.body.appendChild(modal);
    document.getElementById('ayCloseReview')?.addEventListener('click',()=>modal.remove());
    if(!existing){
      document.getElementById('aySubmitReview')?.addEventListener('click',async()=>{
        const btn=document.getElementById('aySubmitReview'), status=document.getElementById('ayReviewStatus');
        btn.disabled=true; status.textContent='Guardando…';
        const r=await client.rpc('submit_customer_business_review',{
          p_booking_id:bookingId,
          p_rating:Number(document.getElementById('ayReviewRating').value),
          p_comment:document.getElementById('ayReviewComment').value.trim()||null
        });
        if(r.error){status.textContent=r.error.message||'No fue posible guardar la valoración.';btn.disabled=false;return;}
        status.textContent='Valoración guardada correctamente.';
        setTimeout(()=>modal.remove(),700);
        document.querySelector(`[data-rating-booking="${CSS.escape(bookingId)}"]`)?.replaceWith(Object.assign(document.createElement('button'),{className:'cp-rating-action',textContent:'Ver valoración',type:'button',disabled:false}));
      });
    }
  }

  function enhanceCustomerRatings(){
    document.querySelectorAll('[data-rating-booking]').forEach(btn=>{
      if(btn.dataset.ayReputationBound==='1')return;
      btn.dataset.ayReputationBound='1';
      btn.addEventListener('click',async e=>{
        e.preventDefault();e.stopImmediatePropagation();
        const bookingId=btn.dataset.ratingBooking;
        const data=engine()?.context?.ratings||[];
        const existing=data.find(x=>x.booking_id===bookingId);
        openReviewModal(bookingId,existing||null);
      },true);
    });
  }

  async function refreshNotificationState(){
    const e=engine();if(!e)return;
    try{
      const items=await e.fetchNotifications();
      badgeFromNotifications(items);
      const panel=document.getElementById('cpNotificationPanel');
      if(panel&&!panel.hidden)e.renderNotifications(items);
    }catch(err){console.warn('Agenda YA notifications:',err);}
  }

  function init(){
    const e=engine();if(!e)return;
    document.addEventListener('click',e=>{
      const b=e.target.closest?.('[data-rating-booking]');
      if(b) setTimeout(enhanceCustomerRatings,0);
      if(e.target.closest?.('#cpNotificationBtn')){
        setTimeout(async()=>{
          try{await engine().markNotificationsRead();await refreshNotificationState();}catch(_){}
        },450);
      }
    },true);
    const observer=new MutationObserver(()=>enhanceCustomerRatings());
    observer.observe(document.body,{childList:true,subtree:true});
    enhanceCustomerRatings();
    refreshNotificationState();
    setInterval(refreshNotificationState,30000);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();