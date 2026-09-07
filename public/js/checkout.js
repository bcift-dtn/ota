const _pageData = document.getElementById('pageData');
const rawUser = JSON.parse(_pageData.dataset.user);
const loggedInUser = {
  fullName: rawUser?.fullName || '',
  email: rawUser?.email || '',
  phone: rawUser?.phone || ''
};

flatpickr('.birth-date-picker', {
  altInput: true,
  altFormat: "j F Y",
  dateFormat: "Y-m-d",
  maxDate: "today",
  disableMobile: "true",
  allowInput: true,
});

flatpickr('.issue-date-picker', {
  altInput: true,
  altFormat: "j F Y",
  dateFormat: "Y-m-d",
  maxDate: "today",
  disableMobile: "true",
  allowInput: true,
});

const checkoutForm = document.getElementById('checkoutForm');
const departureDateVal = checkoutForm?.dataset?.departureDate;
// Min passport issue date validation
let minExpiryDate = new Date();
if (departureDateVal) {
    minExpiryDate = new Date(departureDateVal);
}
minExpiryDate.setMonth(minExpiryDate.getMonth() + 6);

flatpickr('.expiry-date-picker', {
    altInput: true,
    altFormat: "j F Y",
    dateFormat: "Y-m-d",
    minDate: minExpiryDate,
    disableMobile: "true",
    allowInput: true,
});

checkoutForm?.addEventListener('submit', e => {
    const errorBox = document.getElementById('checkoutErrorBox');
    const passportCards = document.querySelectorAll('.visitor-card');
    let errorMessage = '';

    for (let i = 0; i < passportCards.length; i++) {
        const idx = i + 1;
        const passportNo = document.querySelector(`[name="passportNo_${idx}"]`);
        const expiryDate = document.querySelector(`[name="passportExpiredDate_${idx}"]`);
        const birthDate = document.querySelector(`[name="birthDate_${idx}"]`);

        if (passportNo) {
            if (passportNo.value.trim().length > 10) {
                errorMessage = `Passenger ${idx}: Passport numebr cannot exceed 10 characters.`;
                break;
            }
        }

        if (expiryDate && departureDateVal) {
            const expDate = new Date(expiryDate.value);
            if (isNaN(expDate.getTime()) || expDate < minExpiryDate) {
                const formattedMin = minExpiryDate.toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                });
                errorMessage = `Passenger ${idx}: Passport must be valid for at least 6 months beyong travel date (minimun expiry: ${formattedMin}).`;
                break;
            }
        }
    }

    if (errorMessage) {
        e.preventDefault();
        if (errorBox) {
            errorBox.textContent = errorMessage;
            errorBox.style.display = 'block';
            errorBox.scrollIntoView({ behavior: 'smooth', block: 'center'});
        }
    }
})

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