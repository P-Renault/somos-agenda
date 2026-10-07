/* Agenda Ya · Platinum Reference Controller B1.3
   Keeps the production DOM/IDs/events intact and only changes the visual reference state.
*/
(() => {
  const profile = document.getElementById('ayProfileView');
  const choice = document.getElementById('ayProfileChoiceStep');
  const formStep = document.getElementById('ayProfileFormStep');
  const businessForm = document.getElementById('ayBusinessProfileForm');
  const customerForm = document.getElementById('ayCustomerProfileForm');

  function visible(el){
    if(!el) return false;
    const cs = getComputedStyle(el);
    return !el.hidden && cs.display !== 'none' && cs.visibility !== 'hidden';
  }

  function syncProfileReference(){
    if(!profile) return;
    let state='choice';
    if(visible(formStep)) state = visible(customerForm) ? 'customer' : 'business';
    profile.dataset.refState = state;
  }

  if(profile){
    const mo = new MutationObserver(syncProfileReference);
    [profile, choice, formStep, businessForm, customerForm].filter(Boolean).forEach(el=>mo.observe(el,{attributes:true,attributeFilter:['hidden','style','class']}));
    syncProfileReference();
  }

  // Keep the exact reference image while allowing the production app to change views.
  document.addEventListener('click',()=>setTimeout(syncProfileReference,0),true);
})();
