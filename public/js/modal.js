const navLoginBtn = document.querySelector('#navLoginBtn')
const modalOverlay = document.querySelector('#modalOverlay');
const closeModal = document.querySelector('#closeModal');

navLoginBtn.addEventListener('click', e  => {
  e.preventDefault();

  modalOverlay.classList.remove('hidden');
})

closeModal.addEventListener('click', e  => {
  e.preventDefault();

  modalOverlay.classList.add('hidden');
})

modalOverlay.addEventListener('click', e  => {
  console.log(e.target)
  if (e.target === modalOverlay) {
    modalOverlay.classList.add('hidden');
  }
})

const loginModalForm = document.querySelector('#loginModalForm');
