const profileBtn = document.querySelector('#profileBtn');
const profileDropdownContainer = document.querySelector('#profileDropdownContainer')

profileBtn?.addEventListener('click', e => {
  e.preventDefault();

  profileDropdownContainer.classList.toggle('hidden');
})

window.addEventListener('scroll', () => {
  const nav = document.querySelector('.main-nav');
  const navLogo = document.querySelector('#navLogo');

  if (window.scrollY > 0) {
    nav.classList.add('scrolled');

    if (navLogo) {
      navLogo.src = '/images/logos/megaterra-logo.avif';
    }

  } else {
    nav.classList.remove('scrolled');

    if (navLogo) {
      navLogo.src = '/images/logos/megaterra-logo-white.avif';
    }
  }
});