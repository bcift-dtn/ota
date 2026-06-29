const profileBtn = document.querySelector('#profileBtn');
const profileDropdownContainer = document.querySelector('#profileDropdownContainer')

const hamburgerBtn = document.querySelector('#navHamburgerBtn');
const drawerCloseBtn = document.querySelector('#drawerCloseBtn');
const mobileDrawer = document.querySelector('#mobileNavDrawer');
const mobileOverlay = document.querySelector('#mobileNavOverlay');


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



profileBtn?.addEventListener('click', e => {
  e.preventDefault();

  profileDropdownContainer.classList.toggle('hidden');
})

const nav = document.querySelector('.main-nav');
const navLogo = document.querySelector('#navLogo');
const isForceSolid = document.body.classList.contains('force-solid-nav');

function updateNavState() {
  if (window.scrollY > 0 || isForceSolid) {
    nav.classList.add('scrolled');
    if (navLogo) navLogo.src = '/images/logos/megaterra-logo.avif';
  } else {
    nav.classList.remove('scrolled');
    if (navLogo) navLogo.src = '/images/logos/megaterra-logo-white.avif';
  }
}

window.addEventListener('scroll', updateNavState);
updateNavState();