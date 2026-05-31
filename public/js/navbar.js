const profileBtn = document.querySelector('#profileBtn');
const profileDropdownContainer = document.querySelector('#profileDropdownContainer')

profileBtn?.addEventListener('click', e => {
  e.preventDefault();

  profileDropdownContainer.classList.toggle('hidden');
})

window.addEventListener('scroll', () => {
  const nav = document.querySelector('.main-nav');
  if (window.scrollY > 0) {
    nav.classList.add('scrolled');
  } else {
    nav.classList.remove('scrolled');
  }
});