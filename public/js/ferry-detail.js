// Fixed const
const VALID_ROUTES = {
    'HBF': ['BTC', 'SKP'],
    'TMF': ['TNJ', 'BTC'],
    'BTC': ['HBF', 'TMF'],
    'SKP': ['HBF'],
    'TNJ': ['TMF']
};

// OptGroup
const PORT_GROUPS = {
    'HBF': 'singapore', 'TMF': 'singapore',
    'BTC': 'batam',     'SKP': 'batam',
    'TNJ': 'tanjung-pinang'
};

// Dom Ref
const productId = document.getElementById('currentProductId').value;
const pricePerPaxEl = document.getElementById('pricePerPax');
const scheduleContainer = document.getElementById('scheduleContainer');
const totalPriceDisplay = document.getElementById('bookingTotalPriceText');
const selectedTripCodeEl = document.getElementById('selectedTripCode');
const prefillDate = document.getElementById('ferryDepartureDate').value || null;

const ferryTripType = document.getElementById('ferryTripType')?.value || 'one-way';
const selectedReturnTripCodeEl = document.getElementById('selectedReturnTripCode');
const returnScheduleContainer = document.getElementById('returnScheduleContainer');

const currentUser = JSON.parse(document.getElementById('pageData').dataset.user);
const ferryModalOverlay = document.querySelector('#modalOverlay');
const statusEl = document.getElementById('ferryBookingStatus');

const scheduleModalOverlay = document.getElementById('scheduleModalOverlay');
const scheduleModalBody    = document.getElementById('scheduleModalBody');
const scheduleModalTitle   = document.getElementById('scheduleModalTitle');
const departureScheduleBtn = document.getElementById('departureScheduleBtn');
const returnScheduleBtn    = document.getElementById('returnScheduleBtn');

const returnPreFill = document.getElementById('ferryReturnDate')?.value || null;

// trips type radio button
const fromPortSelect = document.getElementById('detailFromPort');
const toPortSelect = document.getElementById('detailToPort');
const returnFromPortSelect = document.getElementById('detailReturnFromPort');
const returnToPortSelect   = document.getElementById('detailReturnToPort');

// Let State
let currentScheduleType = 'depart';
let _cachedDepartSchedule = [];
let _cachedReturnSchedule = [];
let _cachedPricePerPax = 0;
let isTwoWay = ferryTripType === 'two-way';

// Validation status
function showBookingStatus(message, type = 'error') {
    statusEl.textContent = message;
    statusEl.className = `status-message ${type}`;
    statusEl.scrollIntoView({ behavior: 'smooth', block: 'nearest'});
}

function buildScheduleCardHTML(slot, pricePerPax) {
    return `
        <div class="schedule-card" data-trip-code="${slot.TripCode}" data-price="${pricePerPax}">
            <p class="label-text">${slot.TravelTime}</p>
            <p class="even-smaller-label">${slot.SeatCategory ?? 'Premium'}</p>
            <p class="label-text">IDR ${Number(pricePerPax).toLocaleString('id-ID')}</p>
        </div>
    `;
}

// Init flatpickr
flatpickr('#ferryDepartureDate', {
    altInput: true,
    altFormat: 'j F Y',
    dateFormat: 'Y-m-d',
    minDate: 'today',
    disableMobile: true,
    allowInput: true,
    defaultDate: prefillDate,
    onChange: (_, dateStr) => {
        const returnDate = isTwoWay ? (document.getElementById('ferryReturnDate')?.value || '') : '';
        fetchSchedules(dateStr, returnDate);
    }
});

flatpickr('#ferryReturnDate', {
    altInput: true,
    altFormat: 'j F Y',
    dateFormat: 'Y-m-d',
    minDate: prefillDate || 'today',
    disableMobile: true,
    allowInput: true,
    defaultDate: returnPreFill,
    onChange: (_, dateStr) => {
        const depart = document.getElementById('ferryDepartureDate').value;
        if (depart) fetchSchedules(depart, dateStr);
    }
})

// Port Logic
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

function syncReturnFromOptions(outboundFromSel, returnFromSel) {
    const fromGroup = PORT_GROUPS[outboundFromSel.value];
    Array.from(returnFromSel.options).forEach(opt => {
        opt.disabled = opt.value === '' || PORT_GROUPS[opt.value] === fromGroup;
    });
    if (returnFromSel.options[returnFromSel.selectedIndex]?.disabled) {
        const firstValid = Array.from(returnFromSel.options).find(o => !o.disabled);
        if (firstValid) returnFromSel.value = firstValid.value;
    }
}

syncPortOptions(fromPortSelect, toPortSelect);
if (returnFromPortSelect && returnToPortSelect) {
    syncReturnFromOptions(fromPortSelect, returnFromPortSelect);
    syncPortOptions(returnFromPortSelect, returnToPortSelect);
}

// Get schedule
async function fetchSchedules(date, returnDate = '') {
    
    departureScheduleBtn?.setAttribute('disabled', '');
    if (isTwoWay) returnScheduleBtn?.setAttribute('disabled', '');

    try {
        const params = new URLSearchParams({ date });
        params.set('fromPort', fromPortSelect?.value || '');
        params.set('toPort', toPortSelect?.value || '');
        if (isTwoWay) {
            params.set('tripType', 'two-way');
            params.set('returnDate', returnDate);
            params.set('returnFromPort', returnFromPortSelect?.value || toPortSelect.value);
            params.set('returnToPort',   returnToPortSelect?.value || fromPortSelect.value);
        }
        const res = await fetch(`/ferry/${productId}/schedules?${params}`);
        const data = await res.json();

        departureScheduleBtn?.removeAttribute('disabled');
        if (isTwoWay) returnScheduleBtn?.removeAttribute('disabled');

        _cachedDepartSchedule = data.schedule || [];
        _cachedReturnSchedule = data.returnSchedule || [];
        _cachedPricePerPax    = data.pricePerPax || 0;

        departureScheduleBtn?.classList.toggle('btn-unavailable', _cachedDepartSchedule.length === 0);
        if (isTwoWay) returnScheduleBtn?.classList.toggle('btn-unavailable', _cachedReturnSchedule.length === 0)
        
    } catch (error) {
        showBookingStatus('Failed to load schedules. Please try again.');
    }
}

function renderSchedulesIntoModal(schedule, pricePerPax) {
    if (!schedule || schedule.length === 0) {
        scheduleModalBody.innerHTML = `<p class="label-text">No schedules available for this date.</p>`;
        return;
    }
    scheduleModalBody.innerHTML = schedule.map(slot => buildScheduleCardHTML(slot, pricePerPax)).join('');

    scheduleModalBody.querySelectorAll('.schedule-card').forEach(card => {
        card.addEventListener('click', () => {
            if (currentScheduleType === 'depart') selectSchedule(card);
            else selectReturnSchedule(card);
            closeScheduleModal();
        })
    })
}

function selectSchedule(card) {
    document.querySelectorAll('.schedule-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    selectedTripCodeEl.value = card.dataset.tripCode;
    pricePerPaxEl.value = card.dataset.price
    recalculateTotal();

    const time = card.querySelector('.label-text').textContent;
    const cat  = card.querySelector('.even-smaller-label').textContent;
    document.getElementById('departureScheduleLabel').textContent = `${time} — ${cat}`;
    departureScheduleBtn?.classList.add('has-selection');
}

function selectReturnSchedule(card) {
    scheduleModalBody.querySelectorAll('.schedule-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    selectedReturnTripCodeEl.value = card.dataset.tripCode;
    
    const time = card.querySelector('.label-text').textContent;
    const cat = card.querySelector('.even-smaller-label').textContent;
    document.getElementById('returnScheduleLabel').textContent = `${time} - ${cat}`;
    returnScheduleBtn?.classList.add('has-selection');
}

// Pax Counter

function initPaxCounters() {
    document.querySelectorAll('.pax-counter').forEach(counter => {
        const minCount = parseInt(counter.dataset.min) || 0;
        const display = counter.querySelector('.pax-counter-text');
        counter.querySelector('.pax-counter-plus').addEventListener('click', () => {
            display.textContent = parseInt(display.textContent) + 1;
            recalculateTotal();
        });
        counter.querySelector('.pax-counter-minus').addEventListener('click', () => {
            const current = parseInt(display.textContent);
            if (current > minCount) {
                display.textContent = current - 1;
                recalculateTotal();
            }
        });
    });
}

function getTotalPax() {
    return Array.from(document.querySelectorAll('.pax-counter-text')).reduce((sum, el) => sum + parseInt(el.textContent), 0);
}

function getPaidPax() {
    let total = 0;
    document.querySelectorAll('.pax-counter').forEach(counter => {
        if (counter.dataset.type !== 'infant') {
            total += parseInt(counter.querySelector('.pax-counter-text').textContent) || 0;
        }
    });

    return total;
}

function recalculateTotal() {
    const price = parseFloat(pricePerPaxEl.value) || 0;
    const paidPax = getPaidPax();
    const totalPax = getTotalPax();
    const total = price * paidPax;
    
    totalPriceDisplay.textContent = `IDR ${total.toLocaleString('id-ID')}`;

    document.getElementById('displayPricePerPax').textContent = price > 0 ? `IDR ${price.toLocaleString('id-ID')}` : '-';
    document.getElementById('displayTotalPax').textContent = `${totalPax} visitor${totalPax !== 1 ? 's' : ''}`;
}

// Modals
function openScheduleModal(type) {
    currentScheduleType = type;
    scheduleModalTitle.textContent = type === 'depart' ? 'Select Departure Time' : 'Select Return Time';
    const data = type === 'depart' ? _cachedDepartSchedule : _cachedReturnSchedule;
    renderSchedulesIntoModal(data, _cachedPricePerPax);
    scheduleModalOverlay.classList.remove('hidden');
}
function closeScheduleModal() {
    scheduleModalOverlay.classList.add('hidden');
}

// Event Listener
departureScheduleBtn?.addEventListener('click', () => openScheduleModal('depart'));
returnScheduleBtn?.addEventListener('click',    () => openScheduleModal('return'));
document.getElementById('scheduleModalClose')?.addEventListener('click', closeScheduleModal);
scheduleModalOverlay?.addEventListener('click', e => { if (e.target === e.currentTarget) closeScheduleModal(); });

const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('error') === 'no_seats') {
    showBookingStatus('Sorry, this trip no longer has enough seats. Please select another departure time.')
}

// Change main image preview
document.querySelectorAll('.detail-thumbnail').forEach(thumb => {
  thumb.addEventListener('click', () => {
    const mainImage = document.querySelector('.detail-main-image');
    mainImage.src = thumb.src;
    document.querySelectorAll('.detail-thumbnail').forEach(t => t.classList.remove('active-thumb'));
    thumb.classList.add('active-thumb');
  });
});

document.querySelectorAll('input[name="detailTripType"]').forEach(radio => {
    radio.addEventListener('change', e => {
        const isNowTwoWay = e.target.value === 'two-way';
        isTwoWay = isNowTwoWay;

        document.getElementById('ferryTripType').value = e.target.value;

        const returnDateWrapper = document.getElementById('returnDateBookingWrapper');
        const returnSection = document.getElementById('returnScheduleSection')
        const returnPortRow = document.getElementById('returnPortRow');
        if (returnDateWrapper) returnDateWrapper.classList.toggle('hidden', !isNowTwoWay);
        if (returnSection) returnSection.classList.toggle('hidden', !isNowTwoWay);
        if (returnPortRow) returnPortRow.classList.toggle('hidden', !isNowTwoWay);
        returnScheduleBtn?.classList.toggle('hidden', !isNowTwoWay);

        const currentDate = document.getElementById('ferryDepartureDate').value;
        if(currentDate) {
            const returnDate = isNowTwoWay ? (document.getElementById('ferryReturnDate')?.value || '') : '';
            fetchSchedules(currentDate, returnDate);
        }
    });
});

// change from to port logic
[fromPortSelect, toPortSelect].forEach(sel => {
    if (!sel) return;
    sel.addEventListener('change', () => {
        syncPortOptions(fromPortSelect, toPortSelect);
        syncReturnFromOptions(fromPortSelect, returnFromPortSelect);
        syncPortOptions(returnFromPortSelect, returnToPortSelect);

        statusEl.className = 'status-message';
        const currentDate = document.getElementById('ferryDepartureDate').value;
        const currentTripType = document.getElementById('ferryTripType').value;
        const isNowTwoWay = currentTripType === 'two-way';
        const returnDate = isNowTwoWay ? (document.getElementById('ferryReturnDate')?.value || '') : '';

        if (currentDate) fetchSchedules(currentDate, returnDate);
    });
});

// Return from to port logic
[returnFromPortSelect, returnToPortSelect].forEach(sel => {
    if (!sel) return;
    sel.addEventListener('change', () => {
        syncPortOptions(fromPortSelect, toPortSelect);
        syncPortOptions(returnFromPortSelect, returnToPortSelect);
        statusEl.className = 'status-message';
        const currentDate = document.getElementById('ferryDepartureDate').value;
        const returnDate = document.getElementById('ferryReturnDate')?.value || '';
        if (currentDate) fetchSchedules(currentDate, returnDate);
    });
});

// Show schedule if date alr filled
if (prefillDate) {
    const returnPrefill = isTwoWay ? (document.getElementById('ferryReturnDate')?.value || '') : '';
    fetchSchedules(prefillDate, returnPrefill);
};

document.getElementById('ferryBookingContinueBtn').addEventListener('click', async () => {
    const date = document.getElementById('ferryDepartureDate').value;
    const tripCode = selectedTripCodeEl.value;

    if (!date) {
        showBookingStatus('Please select a departure date first.');
        return;
    }

    if (!tripCode) {
        showBookingStatus('Please select a departure time from the schedule.');
        return;
    }

    if (isTwoWay && !selectedReturnTripCodeEl.value) {
        showBookingStatus('Please select a return departure time.');
        return;
    }

    // clear old status
    statusEl.className = 'status-message';

    if (!currentUser) {
        const draftPayload = JSON.stringify({
            productId,
            productType: 'ferry',
            tripCode,
            departureDate: date,
            fromPort: fromPortSelect?.value,
            toPort: toPortSelect?.value,
            ...(isTwoWay && {
                returnTripCode: selectedReturnTripCodeEl.value,
                returnDate: document.getElementById('ferryReturnDate')?.value,
                returnFromPort: returnFromPortSelect?.value,
                returnToPort: returnToPortSelect?.value
            }),
            adults: parseInt(document.getElementById('adultCount').textContent),
            children: parseInt(document.getElementById('childCount').textContent),
            infants: parseInt(document.getElementById('infantCount').textContent)
        });

        sessionStorage.setItem('pendingCheckoutDraft', draftPayload);
        ferryModalOverlay.classList.remove('hidden');
        return;
    }

    try {
        const res = await fetch('/products/checkout/draft', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                productId,
                productType: 'ferry',
                journeyType: isTwoWay ? '2' : '1',
                isReturnOpenTicket: '0',
                tripCode,
                departureDate: date,
                fromPort: fromPortSelect?.value,
                toPort: toPortSelect?.value,
                ...(isTwoWay && {
                    returnTripCode: selectedReturnTripCodeEl.value,
                    returnDate: document.getElementById('ferryReturnDate')?.value,
                    returnFromPort: returnFromPortSelect?.value,
                    returnToPort: returnToPortSelect?.value,
                    returnSeatCategory: document.querySelector('#returnScheduleContainer .schedule-card.selected .even-smaller-label')?.textContent || 'Premium',
                }),
                seatCategory: document.querySelector('.schedule-card.selected .even-smaller-label')?.textContent || 'Premium',
                adults: parseInt(document.getElementById('adultCount').textContent),
                children: parseInt(document.getElementById('childCount').textContent),
                infants: parseInt(document.getElementById('infantCount').textContent)
            })
        });

        const data = await res.json();

        if (data.success) {
            window.location.href = '/products/checkout';
        } else {
            showBookingStatus(data.message || 'Something went wrong. Please try again.');
        }
    } catch (error) {
        showBookingStatus('Failed to proceed to checkout. Please try again.');
    }
});

initPaxCounters();