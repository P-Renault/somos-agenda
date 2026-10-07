/* Agenda Ya · Profile Module v0.6.0
   Presentation + profile persistence for authenticated business/customer accounts.
   No billing logic is implemented here; subscription remains a Configuration concern.
*/
(() => {
  const $ = id => document.getElementById(id);
  const panel = $('ayProfilePanel');
  const sheet = $('ayMoreSheet');
  const backdrop = $('ayProfileBackdrop');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  let role = 'business';
  let user = null;
  let business = null;

  function initials(name, email='') {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length) return parts.slice(0,2).map(x=>x[0]).join('').toUpperCase();
    return String(email || 'AY').slice(0,2).toUpperCase();
  }
  function client() { return window.AgendaYaAuth?.getClient?.() || null; }
  function setVisible(el, visible) {
    if (!el) return;
    el.hidden = !visible;
    el.classList.toggle('is-open', visible);
  }
  function closeAll() {
    setVisible(panel,false); setVisible(sheet,false); setVisible(backdrop,false);
    document.body.classList.remove('ay-modal-open');
  }
  function openBackdrop() { setVisible(backdrop,true); document.body.classList.add('ay-modal-open'); }

  async function getContext() {
    const c=client();
    if(!c) return null;
    const session=await c.auth.getSession();
    user=session.data.session?.user || null;
    if(!user) return null;
    const p=await c.from('profiles').select('profile_type,full_name,phone,address,age,city,comuna,avatar_url').eq('id',user.id).maybeSingle();
    role=p.data?.profile_type || role;
    business=null;
    if(role==='business'){
      const m=await c.from('business_members').select('business_id,role,active').eq('user_id',user.id).eq('active',true).limit(1).maybeSingle();
      if(m.data?.business_id){
        const b=await c.from('businesses').select('id,name,business_type,phone,address,city,comuna,logo_url,email').eq('id',m.data.business_id).maybeSingle();
        business=b.data||null;
      }
    }
    return {profile:p.data||{},business,user,role};
  }

  function paint(ctx) {
    if(!ctx) return;
    role=ctx.role||role;
    const p=ctx.profile||{}, b=ctx.business||{};
    const display=role==='business'?(b.name||p.full_name||ctx.user.email):(p.full_name||ctx.user.email);
    const avatarUrl=role==='business'?(b.logo_url||p.avatar_url):(p.avatar_url);
    const avatar=$('ayProfileAvatar');
    if(avatar){ avatar.textContent=initials(display,ctx.user.email); if(avatarUrl){avatar.style.backgroundImage=`url(${encodeURI(avatarUrl)})`;avatar.classList.add('has-image');}else{avatar.style.backgroundImage='';avatar.classList.remove('has-image');} }
    $('ayProfileName').textContent=display||'Mi perfil';
    $('ayProfileEmail').textContent=ctx.user.email||'';
    $('ayProfileRole').textContent=role==='business'?'Perfil de negocio':'Perfil cliente';
    $('ayProfileBusinessFields').hidden=role!=='business';
    $('ayProfileCustomerFields').hidden=role!=='customer';
    if(role==='business'){
      $('ayProfileBusinessName').value=b.name||'';
      $('ayProfileBusinessType').value=b.business_type||'';
      $('ayProfileBusinessPhone').value=(b.phone||p.phone||'').replace(/^\+56\s*9\s*/,'').replace(/\D/g,'').replace(/^9(?=\d{8}$)/,'').slice(0,8);
      $('ayProfileBusinessCity').value=b.city||p.city||'';
      $('ayProfileBusinessComuna').value=b.comuna||p.comuna||'';
      $('ayProfileBusinessAddress').value=b.address||p.address||'';
    }else{
      $('ayProfileCustomerName').value=p.full_name||ctx.user.user_metadata?.full_name||'';
      $('ayProfileCustomerPhone').value=(p.phone||'').replace(/^\+56\s*9\s*/,'').replace(/\D/g,'').replace(/^9(?=\d{8}$)/,'').slice(0,8);
      $('ayProfileCustomerAge').value=p.age||'';
      $('ayProfileCustomerCity').value=p.city||'';
      $('ayProfileCustomerComuna').value=p.comuna||'';
      $('ayProfileCustomerAddress').value=p.address||'';
    }
    document.querySelectorAll('[data-business-only]').forEach(el=>el.hidden=role!=='business');
    const account=$('ayAccountBtn');
    if(account){account.querySelector('.ay-account-text strong').textContent=role==='business'?'Mi negocio':'Mi perfil';account.querySelector('.ay-account-text small').textContent=ctx.user.email||'Cuenta';}
    const headAvatar=document.querySelector('.ay-header .ay-avatar');
    if(headAvatar){headAvatar.textContent=initials(display,ctx.user.email);if(avatarUrl){headAvatar.style.backgroundImage=`url(${encodeURI(avatarUrl)})`;headAvatar.classList.add('has-image');}else{headAvatar.style.backgroundImage='';headAvatar.classList.remove('has-image');}}
  }

  async function openProfile(){
    closeAll(); openBackdrop(); setVisible(panel,true);
    $('ayProfileStatus').textContent='Cargando perfil…';
    try{ const ctx=await getContext(); if(!ctx) throw new Error('Sesión no disponible.'); paint(ctx); $('ayProfileStatus').textContent=''; }
    catch(e){$('ayProfileStatus').textContent=e.message||'No fue posible cargar el perfil.';}
  }

  function openMore(){
    closeAll(); openBackdrop(); setVisible(sheet,true);
    document.querySelectorAll('[data-business-only]').forEach(el=>el.hidden=role!=='business');
  }

  async function save(){
    const c=client(); if(!c||!user) return;
    const status=$('ayProfileStatus'); status.textContent='Guardando…';
    try{
      if(role==='business'){
        const name=$('ayProfileBusinessName').value.trim(), type=$('ayProfileBusinessType').value.trim();
        const phone=$('ayProfileBusinessPhone').value.replace(/\D/g,'');
        const city=$('ayProfileBusinessCity').value.trim(), comuna=$('ayProfileBusinessComuna').value.trim(), address=$('ayProfileBusinessAddress').value.trim();
        if(!name||!type||!city||!comuna||!address) throw new Error('Completa nombre, tipo de servicio, ciudad, comuna y dirección.');
        if(!business?.id) throw new Error('No se encontró el negocio asociado.');
        const fullPhone=phone?`+56 9 ${phone}`:null;
        const ub=await c.from('businesses').update({name,business_type:type,phone:fullPhone,city,comuna,address,updated_at:new Date().toISOString()}).eq('id',business.id);
        if(ub.error) throw ub.error;
        const up=await c.from('profiles').upsert({id:user.id,profile_type:'business',full_name:name,phone:fullPhone,city,comuna,address,updated_at:new Date().toISOString()},{onConflict:'id'});
        if(up.error) throw up.error;
      }else{
        const name=$('ayProfileCustomerName').value.trim(), phone=$('ayProfileCustomerPhone').value.replace(/\D/g,'');
        const ageRaw=$('ayProfileCustomerAge').value, city=$('ayProfileCustomerCity').value.trim(), comuna=$('ayProfileCustomerComuna').value.trim(), address=$('ayProfileCustomerAddress').value.trim();
        if(!name||!city||!comuna||!address) throw new Error('Completa nombre, ciudad, comuna y dirección.');
        const age=ageRaw?Number(ageRaw):null; if(age!==null&&(age<13||age>120)) throw new Error('Ingresa una edad válida.');
        const fullPhone=phone?`+56 9 ${phone}`:null;
        const up=await c.from('profiles').upsert({id:user.id,profile_type:'customer',full_name:name,phone:fullPhone,age,city,comuna,address,updated_at:new Date().toISOString()},{onConflict:'id'});
        if(up.error) throw up.error;
      }
      status.textContent='Perfil actualizado.';
      const ctx=await getContext(); paint(ctx);
      setTimeout(closeAll,450);
    }catch(e){status.textContent=e.message||'No fue posible guardar el perfil.';}
  }

  async function signOut(){
    const c=client(); closeAll();
    if(c) await c.auth.signOut();
    window.location.href='index.html';
  }

  function init(){
    $('ayAccountBtn')?.addEventListener('click',openProfile);
    $('ayProfileClose')?.addEventListener('click',closeAll);
    $('ayMoreBtn')?.addEventListener('click',openMore);
    $('ayMoreClose')?.addEventListener('click',closeAll);
    $('ayProfileBackdrop')?.addEventListener('click',closeAll);
    $('ayProfileSave')?.addEventListener('click',save);
    $('ayLogoutBtn')?.addEventListener('click',signOut);
    $('ayMoreLogout')?.addEventListener('click',signOut);
    $('ayMoreProfile')?.addEventListener('click',openProfile);
    $('ayMorePublicProfile')?.addEventListener('click',()=>{closeAll();window.AgendaYaUI?.activate('public-profile');});
    $('ayMoreSettings')?.addEventListener('click',()=>{closeAll();window.AgendaYaUI?.activate('settings');});
    document.querySelectorAll('[data-phone-eight]').forEach(i=>i.addEventListener('input',()=>i.value=i.value.replace(/\D/g,'').slice(0,8)));
    window.AgendaYaProfile={version:'0.6.0',setRole:r=>{role=r;document.querySelectorAll('[data-business-only]').forEach(el=>el.hidden=role!=='business');},open:openProfile,close:closeAll,refresh:async()=>{const ctx=await getContext();paint(ctx)}};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
