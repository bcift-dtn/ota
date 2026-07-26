const ferrySearchStatus = document.getElementById('ferrySearchStatus');

function showSearchError(msg) {
    ferrySearchStatus.textContent = msg;
    ferrySearchStatus.className = 'status-message error';
}

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
    const newTripType = e.target.value;

    const wrapper = document.getElementById('returnDateWrapper');
    wrapper.classList.toggle('hidden', e.target.value !== 'two-way');

    const url = new URL(window.location.href);
    url.searchParams.set('tripType', newTripType);
    window.history.replaceState(null, '', url.toString());

    document.querySelectorAll('.detail-btn').forEach(link => {
      const linkUrl = new URL(link.href);
      linkUrl.searchParams.set('tripType', newTripType);
      link.href = linkUrl.toString();
    })
  });
});

document.querySelector('.search-form[data-form="ferry"] form').addEventListener('submit', e => {
  const departureDate = document.getElementById('departureDate').value;
  const tripType = document.querySelector('input[name="tripType"]:checked')?.value;
  const returnDate = document.getElementById('returnDate').value;

  if (!departureDate) {
    e.preventDefault();
    showSearchError('Please select a departure date.');
    document.getElementById('departureDate').focus();
    return;
  }

  if (tripType === 'two-way' && !returnDate) {
      e.preventDefault();
      showSearchError('Please select a return date for round trips.');
      document.getElementById('returnDate').focus();
      return;
  }
})

function syncPortOptions() {
    const from = document.getElementById('fromPort');
    const to   = document.getElementById('toPort');
    if (!from || !to) return;
    Array.from(to.options).forEach(opt   => opt.disabled = (opt.value === from.value));
    Array.from(from.options).forEach(opt => opt.disabled = (opt.value === to.value));
}
document.getElementById('fromPort')?.addEventListener('change', syncPortOptions);
document.getElementById('toPort')?.addEventListener('change', syncPortOptions);
syncPortOptions();