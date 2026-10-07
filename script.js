document.querySelector('.menu-btn')?.addEventListener('click',()=>{document.querySelector('.main-nav')?.classList.toggle('mobile-open')});
document.querySelectorAll('a[href="login.html"]').forEach(a=>a.addEventListener('click',()=>{sessionStorage.setItem('agendaYaLoginOrigin','landing')}));
document.querySelectorAll('.search-box').forEach(form=>form.addEventListener('submit',e=>{const q=form.querySelector('[name=q]').value.trim();if(!q)return;e.preventDefault();location.href='explorer.html?q='+encodeURIComponent(q)}));
