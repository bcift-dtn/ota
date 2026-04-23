const profileBtn = document.querySelector('#profileBtn');
const profileDropdownContainer = document.querySelector('#profileDropdownContainer')

profileBtn?.addEventListener('click', e => {
  e.preventDefault();

  profileDropdownContainer.classList.toggle('hidden');

})