/* Agenda YA · Centro legal y preferencias de cookies v1.0 */
(() => {
  if (window.__agendaYaLegalCenterLoaded) return;
  window.__agendaYaLegalCenterLoaded = true;
  const docs = [
    { slug:'privacy', title:'Política de privacidad y protección de datos', file:'13-politica-privacidad-proteccion-datos.pdf', desc:'Qué datos se tratan, para qué se utilizan, conservación y derechos.' },
    { slug:'terms', title:'Condiciones de uso', file:'14-condiciones-de-uso.pdf', desc:'Reglas para utilizar Agenda YA como cliente o negocio.' },
    { slug:'contract', title:'Contrato y condiciones del servicio', file:'15-contrato-condiciones-del-servicio.pdf', desc:'Alcance, pagos, soporte y condiciones comerciales.' },
    { slug:'cookies', title:'Cookies y tecnologías de seguimiento', file:'16-politica-cookies-seguimiento.pdf', desc:'Tecnologías utilizadas y gestión de preferencias.' },
    { slug:'rights', title:'Derechos y solicitudes de usuarios', file:'17-derechos-y-solicitudes-de-usuarios.pdf', desc:'Canales y procedimiento para ejercer derechos.' },
    { slug:'support', title:'Soporte y mantenimiento', file:'18-soporte-y-mantenimiento.pdf', desc:'Canales de ayuda, incidencias, mantenimiento y recuperación.' }
  ];
  const legalPath = 'docs/legal/';
  const cookieKey = 'agendaYaCookiePreferencesV1';
  const safe = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const style = document.createElement('link'); style.rel='stylesheet'; style.href='legal-center.css'; document.head.appendChild(style);
  const root = document.createElement('div'); root.id='ayLegalCenterRoot';
  root.innerHTML = `
    <button type="button" class="ay-legal-launcher" id="ayLegalOpen" aria-haspopup="dialog">♧ Centro legal</button>
    <section class="ay-legal-backdrop" id="ayLegalBackdrop" hidden>
      <div class="ay-legal-dialog" role="dialog" aria-modal="true" aria-labelledby="ayLegalTitle" tabindex="-1">
        <header class="ay-legal-head"><div><span class="ay-legal-eyebrow">AGENDA YA · TRANSPARENCIA</span><h2 id="ayLegalTitle">Centro legal y privacidad</h2><p>Consulta los documentos vigentes y gestiona tus preferencias.</p></div><button type="button" class="ay-legal-close" id="ayLegalClose" aria-label="Cerrar">×</button></header>
        <div class="ay-legal-tabs" role="tablist"><button type="button" class="is-active" data-legal-tab="documents" role="tab" aria-selected="true">Documentos</button><button type="button" data-legal-tab="cookies" role="tab" aria-selected="false">Cookies</button><button type="button" data-legal-tab="help" role="tab" aria-selected="false">Contacto</button></div>
        <div class="ay-legal-panel" id="ayLegalDocuments"><div class="ay-legal-doc-list">${docs.map(d=>`<article class="ay-legal-doc"><div class="ay-legal-doc-icon" aria-hidden="true">PDF</div><div class="ay-legal-doc-copy"><strong>${safe(d.title)}</strong><p>${safe(d.desc)}</p><a href="${legalPath+d.file}" target="_blank" rel="noopener">Leer documento PDF ↗</a></div></article>`).join('')}</div></div>
        <div class="ay-legal-panel" id="ayLegalCookies" hidden><p class="ay-legal-intro">Las tecnologías estrictamente necesarias permiten funciones básicas y no se pueden desactivar desde este panel. Las categorías opcionales deben activarse solo cuando corresponda y con el consentimiento requerido.</p><label class="ay-cookie-option"><span><strong>Necesarias</strong><small>Seguridad, sesión y funcionamiento básico.</small></span><input type="checkbox" checked disabled aria-label="Cookies necesarias siempre activas"></label><label class="ay-cookie-option"><span><strong>Analítica</strong><small>Medición de uso y mejora del servicio, si está instalada.</small></span><input type="checkbox" id="ayCookieAnalytics"></label><label class="ay-cookie-option"><span><strong>Marketing</strong><small>Publicidad o seguimiento, si se incorpora al sitio.</small></span><input type="checkbox" id="ayCookieMarketing"></label><p class="ay-legal-note">La configuración actual no confirma por sí sola qué tecnologías están instaladas. El inventario debe mantenerse alineado con el sitio publicado.</p><button type="button" class="ay-legal-primary" id="aySaveCookiePrefs">Guardar preferencias</button></div>
        <div class="ay-legal-panel" id="ayLegalHelp" hidden><p class="ay-legal-intro">Para consultas de privacidad, ejercicio de derechos o soporte, escribe a:</p><a class="ay-legal-contact" href="mailto:contacto@agenda-ya.cl">contacto@agenda-ya.cl</a><p class="ay-legal-note">Al solicitar acceso, corrección o eliminación de datos, describe tu solicitud e incluye el correo asociado a la cuenta. No envíes contraseñas ni tokens.</p><a href="${legalPath}17-derechos-y-solicitudes-de-usuarios.pdf" target="_blank" rel="noopener">Ver procedimiento de derechos ↗</a><br><a href="${legalPath}18-soporte-y-mantenimiento.pdf" target="_blank" rel="noopener">Ver política de soporte ↗</a></div>
        <footer class="ay-legal-foot"><span>Agenda YA · Documentación legal v1.0</span><button type="button" id="ayLegalDone">Cerrar</button></footer>
      </div>
    </section>
    <aside class="ay-cookie-banner" id="ayCookieBanner" hidden aria-label="Preferencias de cookies"><div><strong>Tu privacidad importa</strong><p>Usamos tecnologías necesarias para el funcionamiento. Puedes revisar las categorías opcionales en cualquier momento.</p><button type="button" class="ay-cookie-link" id="ayCookieConfigure">Configurar preferencias</button></div><div class="ay-cookie-actions"><button type="button" class="ay-cookie-secondary" id="ayCookieReject">Rechazar opcionales</button><button type="button" class="ay-cookie-primary" id="ayCookieAccept">Aceptar opcionales</button></div></aside>`;
  document.body.appendChild(root);
  const $ = id => document.getElementById(id);
  const backdrop=$('ayLegalBackdrop'), dialog=backdrop.querySelector('.ay-legal-dialog');
  let previousFocus=null;
  function openCenter(tab='documents') { previousFocus=document.activeElement; backdrop.hidden=false; document.body.classList.add('ay-legal-open'); selectTab(tab); dialog.focus(); $('ayLegalClose').focus(); }
  function closeCenter(){ backdrop.hidden=true; document.body.classList.remove('ay-legal-open'); previousFocus?.focus?.(); }
  function selectTab(tab){document.querySelectorAll('[data-legal-tab]').forEach(b=>{const on=b.dataset.legalTab===tab;b.classList.toggle('is-active',on);b.setAttribute('aria-selected',String(on));});$('ayLegalDocuments').hidden=tab!=='documents';$('ayLegalCookies').hidden=tab!=='cookies';$('ayLegalHelp').hidden=tab!=='help';if(tab==='cookies')loadCookiePrefs();}
  function loadCookiePrefs(){let p={analytics:false,marketing:false};try{p={...p,...JSON.parse(localStorage.getItem(cookieKey)||'{}')}}catch(_){}$('ayCookieAnalytics').checked=!!p.analytics;$('ayCookieMarketing').checked=!!p.marketing;}
  function saveCookiePrefs(p){const value={necessary:true,analytics:!!p.analytics,marketing:!!p.marketing,updatedAt:new Date().toISOString(),version:'1.0'};try{localStorage.setItem(cookieKey,JSON.stringify(value))}catch(_){}$('ayCookieBanner').hidden=true;return value;}
  $('ayLegalOpen').addEventListener('click',()=>openCenter());$('ayLegalClose').addEventListener('click',closeCenter);$('ayLegalDone').addEventListener('click',closeCenter);
  backdrop.addEventListener('click',e=>{if(e.target===backdrop)closeCenter()});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!backdrop.hidden)closeCenter()});
  document.querySelectorAll('[data-legal-tab]').forEach(b=>b.addEventListener('click',()=>selectTab(b.dataset.legalTab)));
  $('ayCookieConfigure').addEventListener('click',()=>openCenter('cookies'));
  $('aySaveCookiePrefs').addEventListener('click',()=>{saveCookiePrefs({analytics:$('ayCookieAnalytics').checked,marketing:$('ayCookieMarketing').checked});closeCenter();});
  $('ayCookieReject').addEventListener('click',()=>saveCookiePrefs({analytics:false,marketing:false}));
  $('ayCookieAccept').addEventListener('click',()=>{openCenter('cookies');$('ayCookieAnalytics').checked=true;$('ayCookieMarketing').checked=true;saveCookiePrefs({analytics:true,marketing:true});closeCenter();});
  let saved=null;try{saved=localStorage.getItem(cookieKey)}catch(_){}if(!saved)$('ayCookieBanner').hidden=false;
  window.AgendaYALegalCenter={open:openCenter,close:closeCenter,documents:docs,openDocument(slug){const d=docs.find(x=>x.slug===slug);if(d)window.open(legalPath+d.file,'_blank','noopener');}};
})();
