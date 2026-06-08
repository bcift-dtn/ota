document.addEventListener('DOMContentLoaded', () => {
    const bookingRole = document.getElementById('bookingRole');
    
    const visitor1Name = document.getElementById('visitorName_1');
    const visitor1Phone = document.getElementById('visitorPhoneNumber_1');
    const visitor1Email = document.getElementById('visitorEmail_1');

    function handleAutoFill() {
        if (!visitor1Name) return;

        if (bookingRole.value === 'self') {
            visitor1Name.value = loggedInUser.fullName;
            visitor1Phone.value = loggedInUser.phone;
            visitor1Email.value = loggedInUser.email;

            visitor1Name.setAttribute('readonly', 'true');
            visitor1Phone.setAttribute('readonly', 'true');
            visitor1Email.setAttribute('readonly', 'true');
        } else {
            visitor1Name.value = '';
            visitor1Phone.value = '';
            visitor1Email.value = '';

            visitor1Name.removeAttribute('readonly');
            visitor1Phone.removeAttribute('readonly');
            visitor1Email.removeAttribute('readonly');
        }
    }

    if (bookingRole) {
        bookingRole.addEventListener('change', handleAutoFill);
    }

    handleAutoFill();
})