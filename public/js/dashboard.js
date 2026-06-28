const phoneInputField = document.getElementById('phone');
const phoneInput = window.intlTelInput(phoneInputField, {
    initialCountry: 'id',
    separateDialCode: true,
    useFullscreenPopup: false,
    dropdownContainer: document.body,
    utilsScript: "https://cdn.jsdelivr.net/npm/intl-tel-input@23.0.4/build/js/utils.js",
})

const updateProfileForm = document.getElementById('updateProfileForm');
const profileMessage = document.getElementById('profileMessage');
const submitBtn = document.querySelector('.dashboard-submit-btn');

updateProfileForm.addEventListener('submit', async e => {
    e.preventDefault();

    // format number so it include country code
    phoneInputField.value = phoneInput.getNumber();
    
    const fullName = document.getElementById('fullName').value;
    const phone = phoneInputField.value;
    const email = document.getElementById('email').value;
    const address = document.getElementById('address').value;

    profileMessage.className = 'dashboard-status';
    profileMessage.textContent = '';

    try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Updating...';

        const response = await fetch('/dashboard/update-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fullName, phone, email, address })
        });

        const data = await response.json();

        if (!response.ok) {
            profileMessage.className = 'dashboard-status error';
            profileMessage.textContent = data.error;
            submitBtn.disabled = false;
            submitBtn.textContent = 'Update profile';
        } else {
            profileMessage.className = 'dashboard-status success';
            profileMessage.textContent = data.message;

            setTimeout(() => {
                window.location.reload();
            }, 2000);
        }
    } catch (err) {
        console.error(err);
        profileMessage.className = 'dashboard-status error';
        profileMessage.textContent = 'Something went wrong.';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Update profile';
    }
});