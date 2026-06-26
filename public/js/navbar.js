const profileBtn = document.querySelector('#profileBtn');
const profileDropdownContainer = document.querySelector('#profileDropdownContainer')

const hamburgerBtn = document.querySelector('#navHamburgerBtn');
const drawerCloseBtn = document.querySelector('#drawerCloseBtn');
const mobileDrawer = document.querySelector('#mobileNavDrawer');
const mobileOverlay = document.querySelector('#mobileNavOverlay');
const drawerLoginBtn = document.querySelector('#drawerLoginBtn');

function openDrawer() {
  mobileDrawer.classList.add('is-open');
  mobileOverlay.classList.add('is-open');
  document.body.style.overflow = 'hidden';
}

function closeDrawer() {
  mobileDrawer.classList.remove('is-open');
  mobileOverlay.classList.remove('is-open');
  document.body.style.overflow =  '';
}

hamburgerBtn?.addEventListener('click', openDrawer);
mobileOverlay?.addEventListener('click', closeDrawer);
drawerCloseBtn?.addEventListener('click', closeDrawer);

drawerLoginBtn?.addEventListener('click', () => {
    closeDrawer();
    document.querySelector('#navLoginBtn')?.click();
});

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