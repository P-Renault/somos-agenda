(() => {
  'use strict';
  const cfg = window.SOMOS_CONFIG || {};
  const client = window.supabase?.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY,{
    auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
  });
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  let lastUnread='';
  let styleInjected=false;

  function engine(){ return window.AgendaYaCustomerData || null; }

  function injectReviewStyles(){
    if(styleInjected || document.getElementById('ayCustomerReviewStyles')) return;
    styleInjected=true;
    const style=document.createElement('style');
    style.id='ayCustomerReviewStyles';
    style.textContent=`
      #ayCustomerReviewModal{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(13,31,61,.30);backdrop-filter:blur(4px)}
      #ayCustomerReviewModal .ay-review-panel{width:min(520px,100%);max-height:min(720px,calc(100vh - 40px));overflow:auto;background:rgba(255,255,255,.98);border:1px solid var(--border,#e5ebf3);border-radius:22px;box-shadow:0 24px 70px rgba(13,38,78,.18);padding:22px;color:var(--ink,#13264b)}
      #ayCustomerReviewModal .ay-review-head{display:flex;justify-content:space-between;align-items:flex-start;gap:15px;margin-bottom:18px}
      #ayCustomerReviewModal .ay-review-copy{min-width:0}
      #ayCustomerReviewModal .ay-review-eyebrow{font-size:10px;letter-spacing:.14em;color:var(--blue,#0b63e5);font-weight:900;margin:0 0 5px}
      #ayCustomerReviewModal .ay-review-title{margin:0;font-size:22px;line-height:1.2;letter-spacing:-.025em;color:var(--ink,#13264b)}
      #ayCustomerReviewModal .ay-review-subtitle{margin:6px 0 0;color:var(--muted,#73819a);font-size:12px;line-height:1.5}
      #ayCustomerReviewModal .ay-review-close{width:34px;height:34px;flex:0 0 34px;border:1px solid #e5ebf3;background:#f8fbff;border-radius:10px;color:#52657e;font-size:22px;line-height:1;display:grid;place-items:center;padding:0;cursor:pointer}
      #ayCustomerReviewModal .ay-review-close:hover{border-color:#cbdcf0;color:var(--blue,#0b63e5);background:#edf5ff}
      #ayCustomerReviewModal .ay-review-form{display:grid;gap:14px}
      #ayCustomerReviewModal .ay-review-field{display:grid;gap:6px;color:#263b5d;font-size:12px;font-weight:850}
      #ayCustomerReviewModal .ay-review-field select,
      #ayCustomerReviewModal .ay-review-field textarea{width:100%;box-sizing:border-box;border:1px solid #dce5ef;border-radius:12px;background:#fff;color:#182d50;outline:0;font:inherit;font-size:13px;transition:border-color .16s ease,box-shadow .16s ease}
      #ayCustomerReviewModal .ay-review-field select{min-height:45px;padding:10px 40px 10px 12px;appearance:auto}
      #ayCustomerReviewModal .ay-review-field textarea{min-height:120px;padding:11px 12px;resize:vertical;line-height:1.5}
      #ayCustomerReviewModal .ay-review-field select:focus,
      #ayCustomerReviewModal .ay-review-field textarea:focus{border-color:#78abe8;box-shadow:0 0 0 3px rgba(11,99,229,.09)}
      #ayCustomerReviewModal .ay-review-field textarea::placeholder{color:#9aa8b9}
      #ayCustomerReviewModal .ay-review-status{min-height:18px;color:#6e7f95;font-size:12px;margin:0}
      #ayCustomerReviewModal .ay-review-actions{display:flex;justify-content:flex-end;gap:9px;margin-top:2px}
      #ayCustomerReviewModal .ay-review-submit{background:var(--blue,#0b63e5);color:#fff;border:0;border-radius:13px;min-height:44px;padding:0 17px;font-size:12px;font-weight:900;display:inline-flex;align-items:center;justify-content:center;box-shadow:0 8px 20px rgba(11,99,229,.16);cursor:pointer}
      #ayCustomerReviewModal .ay-review-submit:hover{background:var(--blue2,#176fe0)}
      #ayCustomerReviewModal .ay-review-submit:disabled{opacity:.65;cursor:wait}
      #ayCustomerReviewModal .ay-review-existing{display:grid;gap:12px}
      #ayCustomerReviewModal .ay-review-existing-stars{color:#f4b400;letter-spacing:2px;font-size:22px;line-height:1}
      #ayCustomerReviewModal .ay-review-existing-score{margin:0;color:#263b5d;font-size:13px;line-height:1.55}
      #ayCustomerReviewModal .ay-review-existing-comment{margin:0;padding:13px;border:1px solid #edf1f6;border-radius:14px;color:#687b94;font-size:12px;line-height:1.55;background:#fbfcfe}
      @media(max-width:600px){
        #ayCustomerReviewModal{align-items:flex-end;padding:10px}
        #ayCustomerReviewModal .ay-review-panel{width:100%;max-height:calc(100vh - 20px);border-radius:22px;padding:17px}
        #ayCustomerReviewModal .ay-review-title{font-size:20px}
        #ayCustomerReviewModal .ay-review-actions{display:block}
        #ayCustomerReviewModal .ay-review-submit{width:100%}
      }
    `;
    document.head.appendChild(style);
  }

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

  function openReviewModal(bookingId,existing){
    document.getElementById('ayCustomerReviewModal')?.remove();
    injectReviewStyles();
    const modal=document.createElement('div');
    modal.id='ayCustomerReviewModal';
    modal.innerHTML=`
      <section class="ay-review-panel" role="dialog" aria-modal="true" aria-labelledby="ayReviewTitle">
        <div class="ay-review-head">
          <div class="ay-review-copy">
            <p class="ay-review-eyebrow">AGENDA YA · REPUTACIÓN</p>
            <h2 class="ay-review-title" id="ayReviewTitle">${existing?'Valoración registrada':'Valorar negocio'}</h2>
            <p class="ay-review-subtitle">${existing?'Puedes consultar la valoración asociada a esta reserva.':'Tu valoración solo se registra sobre una reserva completada.'}</p>
          </div>
          <button type="button" id="ayCloseReview" class="ay-review-close" aria-label="Cerrar">×</button>
        </div>
        ${existing
          ? `<div class="ay-review-existing">
               <div class="ay-review-existing-stars" aria-label="${esc(existing.rating)} de 5">${'★'.repeat(Number(existing.rating))+'☆'.repeat(5-Number(existing.rating))}</div>
               <p class="ay-review-existing-score"><strong>${esc(existing.rating)}/5</strong>${existing.comment?' · '+esc(existing.comment):' · Sin comentario.'}</p>
             </div>`
          : `<div class="ay-review-form">
               <label class="ay-review-field">Puntuación
                 <select id="ayReviewRating" aria-label="Puntuación">
                   <option value="5">5 · Excelente</option><option value="4">4 · Muy bueno</option><option value="3">3 · Bueno</option><option value="2">2 · Regular</option><option value="1">1 · Deficiente</option>
                 </select>
               </label>
               <label class="ay-review-field">Comentario
                 <textarea id="ayReviewComment" maxlength="1000" rows="5" placeholder="Cuéntanos brevemente cómo fue tu experiencia."></textarea>
               </label>
               <p id="ayReviewStatus" class="ay-review-status" aria-live="polite"></p>
               <div class="ay-review-actions"><button id="aySubmitReview" class="ay-review-submit" type="button">Guardar valoración</button></div>
             </div>`}
      </section>`;
    document.body.appendChild(modal);
    document.getElementById('ayCloseReview')?.addEventListener('click',()=>modal.remove());
    modal.addEventListener('click',e=>{if(e.target===modal)modal.remove();});
    if(!existing){
      document.getElementById('aySubmitReview')?.addEventListener('click',async()=>{
        const btn=document.getElementById('aySubmitReview'),status=document.getElementById('ayReviewStatus');
        btn.disabled=true;status.textContent='Guardando…';
        const r=await client.rpc('submit_customer_business_review',{
          p_booking_id:bookingId,
          p_rating:Number(document.getElementById('ayReviewRating').value),
          p_comment:document.getElementById('ayReviewComment').value.trim()||null
        });
        if(r.error){status.textContent=r.error.message||'No fue posible guardar la valoración.';btn.disabled=false;return;}
        status.textContent='Valoración guardada correctamente.';
        try{
          const fresh=await engine().fetchRatingsAndReputation();
          engine().context.ratings=fresh.ratings;
          engine().context.reputation=fresh.reputation;
          window.AgendaYaCustomerProfile?.refreshReputationUI?.();
        }catch(err){console.warn('Agenda YA actualización de reputación:',err);}
        setTimeout(()=>modal.remove(),700);
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
      if(b)setTimeout(enhanceCustomerRatings,0);
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
