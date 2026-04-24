const registerForm = document.querySelector('#registerForm');

const passwordInput = document.querySelector('#password');
const passwordLabel = document.querySelector('#passwordLabel')
const confirmPasswordInput = document.querySelector('#confirmPassword')
const confirmPasswordLabel = document.querySelector('#confirmPasswordLabel');
const emailInput = document.querySelector('#email');
const emailLabel = document.querySelector('#emailLabel');
const signupText = document.querySelector('#signupText')
const termsCheckbox = document.querySelector('#termsCheckbox')

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Get form value
  const fullName = document.querySelector('#fullName').value.trim();
  const email = emailInput.value.trim();
  const password = document.querySelector('#password').value;
  const confirmPassword = confirmPasswordInput.value;

  if (password.length < 8) {
    passwordInput.classList.add('warning-field');
    passwordLabel.classList.add('warning-text');
    passwordLabel.textContent = 'Must be 8 characters at least';

    return;
  }

  passwordInput.classList.remove('warning-field');
  passwordLabel.classList.remove('warning-text');
  passwordLabel.textContent = '';

  // Password match validation
  if (!(password === confirmPassword)) {
    confirmPasswordInput.classList.add('warning-field');
    confirmPasswordLabel.textContent = 'Password do not match';

    return;
  }

  confirmPasswordInput.classList.remove('warning-field');
  confirmPasswordLabel.textContent = '';

  if (!termsCheckbox.checked) {
    signupText.textContent = "Please agree to the Terms and Conditions";
    return;
  }

  signupText.textContent = "";
  const signupBtn = document.querySelector('#signupBtn');

  // Fetch register response
  try {
    signupBtn.disabled = true;
    signupBtn.textContent = 'Creating account...';

    const response = await fetch('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json'},
      body: JSON.stringify({ fullName, email, password, confirmPassword })
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 409) {
        emailInput.classList.add('warning-field');
        emailLabel.textContent = data.error;
      } else {
        signupText.textContent = data.error || "Something went wrong";
      }

      signupBtn.disabled = false;
      signupBtn.textContent = 'Sign Up';

      return;
    }

    signupBtn.disabled = true;
    signupBtn.textContent = 'Success';

    signupText.classList.remove('warning-text');
    signupText.classList.add('success-text');
    signupText.textContent = data.message;

    setTimeout(() => {
      window.location.href = '/';
    }, 2000);

  } catch (err) {
    console.log('Fetch failed: ', err);
    signupBtn.disabled = false;
    signupBtn.textContent = 'Sign Up';
  }
})