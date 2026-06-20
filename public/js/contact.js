const phoneInputField = document.getElementById('phone');
const phoneInput = window.intlTelInput(phoneInputField, {
    initialCountry: 'id',
    separateDialCode: true,
    useFullscreenPopup: false,
    dropdownContainer: document.body,
    utilsScript: "https://cdn.jsdelivr.net/npm/intl-tel-input@23.0.4/build/js/utils.js",
})

document.addEventListener('DOMContentLoaded', () => {
    // FAQ Accordion Toggles
    const faqQUestions = document.querySelectorAll('.faq-question');

    faqQUestions.forEach(question => {
        question.addEventListener('click', () => {
            const faqItem = question.parentElement;
            const answer = faqItem.querySelector('.faq-answer');
            const icon = question.querySelector('.faq-icon')

            // Active State
            const isActive = faqItem.classList.contains('active');

            // Close Every Accordion
            document.querySelectorAll('.faq-item').forEach(item => {
                item.classList.remove('active');
                item.querySelector('.faq-answer').style.maxHeight = null;
                const otherIcon = item.querySelector('.faq-icon');
                if (otherIcon) {
                    otherIcon.setAttribute('data-lucide', 'plus')
                }
            });

            if (!isActive) {
                faqItem.classList.add('active');
                answer.style.maxHeight = answer.scrollHeight + 'px';
                icon.setAttribute('data-lucide', 'minus');
            };

            // Re-render lucide icons
            if (window.lucide) {
                window.lucide.createIcons();
            }
        });
    });

    // Form Submission Handler
    const contactForm = document.getElementById('contactForm');
    const statusDiv = document.getElementById('contactStatus');
    const submitBtn = document.getElementById('submitBtn');

    if (contactForm) {
        contactForm.addEventListener('submit', async e => {
            e.preventDefault();

            submitBtn.disabled = true;
            submitBtn.innerHTML = 'Sending ...';
            statusDiv.className = 'contact-status';
            statusDiv.textContent = '';
            statusDiv.style.display = 'none';

            // Validation
            const emailValue = document.getElementById('email').value;

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(emailValue)) {
                statusDiv.className = 'contact-status error';
                statusDiv.textContent = 'Please enter a valid email address.';
                statusDiv.style.display = 'block';
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Submit <i data-lucide="send"></i>';
                if (window.lucide) window.lucide.createIcons();
                return;
            }

            if (!phoneInput.isValidNumber()) {
                statusDiv.className = 'contact-status error';
                statusDiv.textContent = 'Please enter a valid phone number.';
                statusDiv.style.display = 'block';
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Submit <i data-lucide="send"></i>';
                if (window.lucide) window.lucide.createIcons();
                return; // Stop form submission
            }

            // Get formatted phone number
            const fullPhoneNumber = phoneInput.getNumber();

            const formData = {
                name: document.getElementById('name').value,
                email: emailValue,
                phone: fullPhoneNumber,
                subject: document.getElementById('subject').value,
                message: document.getElementById('message').value
            };

            try {
                const response = await fetch('/contact/send', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });

                const result = await response.json();

                if (response.ok && result.success) {
                    statusDiv.className = 'contact-status success';
                    statusDiv.textContent = result.success;
                    statusDiv.style.display = 'block';
                    contactForm.reset();
                } else {
                    statusDiv.className = 'contact-status error';
                    statusDiv.textContent = result.error || 'Failed to send message.';
                    statusDiv.style.display = 'block';
                }
            } catch (error) {
                console.error('contact send error:', error);
                statusDiv.className = 'contact-status error';
                statusDiv.textContent = 'An error occurred. Please try again later.'
                statusDiv.style.display = 'block'
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = `Submit <i data-lucide="send"></i>`;
                if (window.lucide) {
                    window.lucide.createIcons();
                }
            }
        });
    }
});

