const navLoginBtn = document.querySelector('#navLoginBtn')
const modalOverlay = document.querySelector('#modalOverlay');
const closeModal = document.querySelector('#closeModal');

lucide.createIcons();

navLoginBtn?.addEventListener('click', e  => {
  e.preventDefault();

  modalOverlay.classList.remove('hidden');
})

closeModal.addEventListener('click', e  => {
  e.preventDefault();

  modalOverlay.classList.add('hidden');
})

modalOverlay.addEventListener('click', e  => {
  if (e.target === modalOverlay) {
    modalOverlay.classList.add('hidden');
  }
})

const registerSigninBtn = document.querySelector('#registerSigninBtn');

registerSigninBtn?.addEventListener('click', e => {
  e.preventDefault();

  modalOverlay.classList.remove('hidden');
})

const loginModalForm = document.querySelector('#loginModalForm');

const loginEmailInput = document.querySelector('#loginEmailInput');
const loginPasswordInput = document.querySelector('#loginPasswordInput');

loginModalForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const submitLoginBtn = document.querySelector('#submitLoginBtn');
  submitLoginBtn.disabled = true;
  submitLoginBtn.textContent = 'Loading...';

  const email = loginEmailInput.value.trim();
  const password = loginPasswordInput.value;

  console.log(email, password)

  try {
    const response = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password})
    });

    const data = await response.json();
    const loginStatusText = document.querySelector('#loginStatusText');

    if (!response.ok) {
      loginStatusText.textContent = data.error;

      submitLoginBtn.disabled = false;
      submitLoginBtn.textContent = 'Sign In';

      return;
    }

    submitLoginBtn.disabled = false;
    submitLoginBtn.textContent = 'Sign In';

    window.location.reload();
  } catch (err) {
    console.log('Fetch failed: ', err);
    
    submitLoginBtn.disabled = false;
    submitLoginBtn.textContent = 'Sign In';
  }
})

document.querySelectorAll('.toggle-password').forEach(btn => {
  btn.addEventListener('click', () => {
    const targetId = btn.dataset.target;
    const input = document.querySelector(`#${targetId}`);
    const iconHolder = btn.querySelector('[data-lucide]');

    if (!input || !iconHolder) return;

    if (input.type === 'password') {
      input.type = 'text';
      iconHolder.setAttribute('data-lucide', 'eye');
    } else {
      input.type = 'password';
      iconHolder.setAttribute('data-lucide', 'eye-closed');
    }

    lucide.createIcons();
  })
})