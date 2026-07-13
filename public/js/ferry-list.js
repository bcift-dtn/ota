flatpickr('input[type="date"]', {
  altInput: true,
  altFormat: "j F Y",
  dateFormat: "Y-m-d",
  minDate: "today",
  disableMobile: "true",
  allowInput: true,
});
document.querySelectorAll('input[name="tripType"]').forEach(radio => {
  radio.addEventListener('change', e => {
    const wrapper = document.getElementById('returnDateWrapper');
    wrapper.classList.toggle('hidden', e.target.value !== 'two-way');
  });
});