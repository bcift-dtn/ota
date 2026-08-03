const ferrySearchStatus = document.getElementById('ferrySearchStatus');

function showSearchError(msg) {
    ferrySearchStatus.textContent = msg;
    ferrySearchStatus.className = 'status-message error';
}

const VALID_ROUTES = {
    'HBF': ['BTC', 'SKP'],
    'TMF': ['TNJ', 'BTC'],
    'BTC': ['HBF', 'TMF'],
    'SKP': ['HBF'],
    'TNJ': ['TMF']
};

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

function syncPortOptions(fromSel, toSel) {
    const validDests = VALID_ROUTES[fromSel.value] || [];
    Array.from(toSel.options).forEach(opt => {
        opt.disabled = opt.value === '' || !validDests.includes(opt.value);
    });
    if (toSel.options[toSel.selectedIndex]?.disabled) {
        const firstValid = Array.from(toSel.options).find(o => !o.disabled);
        if (firstValid) toSel.value = firstValid.value;
    }
}

const fromPortEl = document.getElementById('fromPort');
const toPortEl = document.getElementById('toPort');
if (fromPortEl && toPortEl) {
  syncPortOptions(fromPortEl, toPortEl);
  fromPortEl.addEventListener('change', () => syncPortOptions(fromPortEl, toPortEl));
}