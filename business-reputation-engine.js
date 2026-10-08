(() => {
  'use strict';
  const cfg=window.SOMOS_CONFIG||{};
  const client=window.supabase?.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY,{
    auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
  });
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  let reviews=new Map();

  async function loadReviews(){
    const r=await client.rpc('get_business_customer_reviews');
    if(r.error)throw r.error;
    reviews=new Map((r.data||[]).map(x=>[x.booking_id,x]));
    return reviews;
  }

  function formCard(bookingId){
    document.getElementById('ayBusinessReviewCard')?.remove();
    const el=document.createElement('section');
    el.id='ayBusinessReviewCard';
    el.className='ay-module-card';
    el.innerHTML=`<form id="ayBusinessReviewForm" class="ay-module-form">
      <strong>Valorar cliente</strong>
      <p class="ay-module-meta">La valoración queda vinculada a esta reserva completada y forma parte de la reputación del cliente.</p>
      <div class="ay-module-form-grid">
        <label>Puntuación
          <select id="ayBusinessReviewRating">
            <option value="5">5 · Excelente</option><option value="4">4 · Muy bueno</option><option value="3">3 · Bueno</option><option value="2">2 · Regular</option><option value="1">1 · Deficiente</option>
          </select>
        </label>
      </div>
      <label>Comentario<textarea id="ayBusinessReviewComment" maxlength="1000" rows="5" placeholder="Agrega un comentario sobre la experiencia con el cliente."></textarea></label>
      <div class="ay-module-actions-row">
        <button class="ay-btn ay-btn-primary" type="submit">Guardar valoración</button>
        <button class="ay-btn ay-btn-light" type="button" id="ayBusinessReviewCancel">Cancelar</button>
      </div>
      <p id="ayBusinessReviewStatus" class="ay-module-status"></p>
    </form>`;
    document.getElementById('ayModuleBody')?.prepend(el);
    document.getElementById('ayBusinessReviewCancel')?.addEventListener('click',()=>el.remove());
    document.getElementById('ayBusinessReviewForm')?.addEventListener('submit',async ev=>{
      ev.preventDefault();
      const btn=el.querySelector('button[type="submit"]'),status=el.querySelector('#ayBusinessReviewStatus');
      btn.disabled=true;status.textContent='Guardando…';
      const r=await client.rpc('submit_business_customer_review',{
        p_booking_id:bookingId,
        p_rating:Number(document.getElementById('ayBusinessReviewRating').value),
        p_comment:document.getElementById('ayBusinessReviewComment').value.trim()||null
      });
      if(r.error){status.textContent=r.error.message||'No fue posible guardar la valoración.';btn.disabled=false;return;}
      status.textContent='Valoración guardada correctamente.';
      await loadReviews();
      setTimeout(()=>{el.remove();enhanceBookings();},500);
    });
    el.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function enhanceBookings(){
    if(window.AgendaYaUI?.getCurrentView?.()!=='bookings')return;
    document.querySelectorAll('#ayModuleBody .ay-module-item').forEach(card=>{
      if(card.dataset.ayReputationEnhanced==='1')return;
      const edit=card.querySelector('[data-ay-action="edit-booking"]');
      const status=card.querySelector('.ay-module-badge');
      if(!edit||!status)return;
      if(status.textContent.trim()!=='Completada')return;
      const bookingId=edit.dataset.id;
      if(!bookingId)return;
      card.dataset.ayReputationEnhanced='1';
      const row=reviews.get(bookingId);
      const btn=document.createElement('button');
      btn.type='button';btn.className='ay-btn ay-btn-light';
      if(row){
        btn.textContent=`Valorado · ${row.rating}/5`;
        btn.addEventListener('click',()=>alert(`Valoración: ${row.rating}/5${row.comment?`\\n\\n${row.comment}`:''}`));
      }else{
        btn.textContent='Valorar cliente';
        btn.addEventListener('click',()=>formCard(bookingId));
      }
      edit.parentElement?.appendChild(btn);
    });
  }

  async function onViewChange(e){
    if(e.detail?.view!=='bookings')return;
    setTimeout(async()=>{try{await loadReviews();enhanceBookings();}catch(err){console.warn('Agenda YA reputación negocio:',err);}},250);
  }

  function init(){
    window.addEventListener('agendaYa:view-change',onViewChange);
    setInterval(()=>{if(window.AgendaYaUI?.getCurrentView?.()==='bookings')enhanceBookings();},2000);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();