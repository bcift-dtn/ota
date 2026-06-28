const phoneInputField = document.getElementById('phone');
const phoneInput = window.intlTelInput(phoneInputField, {
    initialCountry: 'id',
    separateDialCode: true,
    useFullscreenPopup: false,
    dropdownContainer: document.body,
    utilsScript: "https://cdn.jsdelivr.net/npm/intl-tel-input@23.0.4/build/js/utils.js",
})

const form = document.querySelector('.dashboard-form');

form.addEventListener('submit', () => {
    phoneInputField.value = phoneInput.getNumber();
})