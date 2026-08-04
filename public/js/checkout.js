const _pageData = document.getElementById('pageData');
const rawUser = JSON.parse(_pageData.dataset.user);
const loggedInUser = {
  fullName: rawUser?.fullName || '',
  email: rawUser?.email || '',
  phone: rawUser?.phone || ''
};

flatpickr('input[type="date"]', {
  altInput: true,
  altFormat: "j F Y",
  dateFormat: "Y-m-d",
  minDate: "today",
  disableMobile: "true",
  allowInput: true,
});

flatpickr('#birthDateInput', {
    altInput: true,
    altFormat: "j F Y",
    dateFormat: "Y-m-d",
    disableMobile: "true",
    allowInput: true,
});

flatpickr('#passportIssueInput', {
    altInput: true,
    altFormat: "j F Y",
    dateFormat: "Y-m-d",
    disableMobile: "true",
    allowInput: true,
});

const phoneInstances = [];

const phoneInputs = document.querySelectorAll('input[type="tel"][id^="visitorPhoneNumber_"]');

phoneInputs.forEach(input => {
    const iti = window.intlTelInput(input, {
        initialCountry: 'id',
        separateDialCode: true,
        useFullscreenPopup: false,
        dropdownContainer: document.body,
        utilsScript: "https://cdn.jsdelivr.net/npm/intl-tel-input@23.0.4/build/js/utils.js",
    });

    phoneInstances.push({
        id: input.id,
        instance: iti
    })
})

document.addEventListener('DOMContentLoaded', () => {
    const bookingRoleRadios = document.querySelectorAll('input[name="bookingRole"]');
    const visitor1Name = document.getElementById('visitorName_1');
    const visitor1Phone = document.getElementById('visitorPhoneNumber_1');
    const visitor1Email = document.getElementById('visitorEmail_1');

    function getBookingRole() {
        const checkedRadio = document.querySelector('input[name="bookingRole"]:checked');
        return checkedRadio ? checkedRadio.value : 'self';
    }

    function handleAutoFill() {
        if (!visitor1Name) return;

        if (getBookingRole() === 'self') {
            visitor1Name.value = loggedInUser.fullName;
            visitor1Phone.value = loggedInUser.phone;
            visitor1Email.value = loggedInUser.email;

            visitor1Name.setAttribute('readonly', true);
            visitor1Phone.setAttribute('readonly', true);
            visitor1Email.setAttribute('readonly', true);
        } else {
            visitor1Name.value = '';
            visitor1Phone.value = '';
            visitor1Email.value = '';

            visitor1Name.removeAttribute('readonly');
            visitor1Phone.removeAttribute('readonly');
            visitor1Email.removeAttribute('readonly');
        }
    }

    bookingRoleRadios.forEach(radio => {
        radio.addEventListener('change', handleAutoFill);
    });

    handleAutoFill();
})