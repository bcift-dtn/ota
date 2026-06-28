const changePasswordForm = document.getElementById('changePasswordForm');
const oldPasswordInput = document.getElementById('oldPassword');
const newPasswordInput = document.getElementById('newPassword');
const confirmNewPasswordInput = document.getElementById('confirmNewPassword');
const submitBtn = document.getElementById('changePasswordBtn');
const messageEl = document.getElementById('passwordMessage');

changePasswordForm.addEventListener('submit', async e => {
    e.preventDefault();

    // get all password field
    const oldPassword = oldPasswordInput.value;
    const newPassword = newPasswordInput.value;
    const confirmNewPassword = confirmNewPasswordInput.value;

    // reset status
    messageEl.className = 'dashboard-status';
    messageEl.textContent = '';

    // check password length are more than 8 char
    if (newPassword.length < 8) {
        messageEl.className = 'dashboard-status error';
        messageEl.textContent = 'New password must be at least 8 characters long.'
        return;
    }

    // check new password and confirm new password are same
    if (newPassword !== confirmNewPassword) {
        messageEl.className = 'dashboard-status error';
        messageEl.textContent = 'New passwords do not match.';
        return;
    }

    try {
        // disable submit btn, prevent double submit
        submitBtn.disabled = true;
        submitBtn.textContent = 'Updating...';

        // post request
        const response = await fetch('/dashboard/change-password', {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
            },
            body: JSON.stringify({ oldPassword, newPassword, confirmNewPassword }),
        });

        const data = await response.json();

        if (!response.ok) {
            // password change fail message
            messageEl.className = 'dashboard-status error';
            messageEl.textContent = data.error || 'Something went wrong.';
        } else {
            // password change success message
            messageEl.className = 'dashboard-status success';
            messageEl.textContent = data.message;

            // reset form
            changePasswordForm.reset();
        }
    } catch (error) {
        console.error('fetch error:', error);
        messageEl.className = 'dashboard-status error';
        messageEl.textContent = 'Failed to connect to the server. Please try again.';
    } finally {
        // re-enable submit button after process are done
        submitBtn.disabled = false;
        submitBtn.textContent = 'Change Password'
    }
})