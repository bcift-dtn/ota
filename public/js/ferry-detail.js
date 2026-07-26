const productId = document.getElementById('currentProductId').value;
const pricePerPaxEl = document.getElementById('pricePerPax');
const scheduleContainer = document.getElementById('scheduleContainer');
const totalPriceDisplay = document.getElementById('bookingTotalPriceText');
const selectedTripCodeEl = document.getElementById('selectedTripCode');
const prefillDate = document.getElementById('ferryDepartureDate').value || null;

const ferryTripType = document.getElementById('ferryTripType')?.value || 'one-way';
const isTwoWay = ferryTripType === 'two-way';
const selectedReturnTripCodeEl = document.getElementById('selectedReturnTripCode');
const returnScheduleContainer = document.getElementById('returnScheduleContainer');

const currentUser = JSON.parse(document.getElementById('pageData').dataset.user);
const ferryModalOverlay = document.querySelector('#modalOverlay');
const statusEl = document.getElementById('ferryBookingStatus');

// Validation status
function showBookingStatus(message, type = 'error') {
    statusEl.textContent = message;
    statusEl.className = `status-message ${type}`;
    statusEl.scrollIntoView({ behavior: 'smooth', block: 'nearest'});
}

const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('error') === 'no_seats') {
    showBookingStatus('Sorry, this trip no longer has enough seats. Please select another departure time.')
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

if (isTwoWay) {
    const returnPreFill = document.getElementById('ferryReturnDate')?.value || null;

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

// Show schedule if date alr filled
if (prefillDate) {
    const returnPrefill = isTwoWay ? (document.getElementById('ferryReturnDate')?.value || '') : '';
    fetchSchedules(prefillDate, returnPrefill);
};

// Get schedule
async function fetchSchedules(date, returnDate = '') {
    scheduleContainer.innerHTML = '<p class="label-text">Loading schedules...</p>';
    if (isTwoWay && returnScheduleContainer) {
        returnScheduleContainer.innerHTML = `<p class="label-text">Loading returns...</p>`;
    }

    try {
        const params = new URLSearchParams({ date });
        if (isTwoWay) {
            params.set('tripType', 'two-way');
            params.set('returnDate', returnDate);
        }
        const res = await fetch(`/ferry/${productId}/schedules?${params}`);
        const data = await res.json();
        renderSchedules(data.schedule, data.pricePerPax);

        if (isTwoWay && returnScheduleContainer) {
            renderReturnSchedules(data.returnSchedule, data.pricePerPax);
        }
        
    } catch (error) {
        scheduleContainer.innerHTML = '<p class="label-text">Failed to load schedules. Please try again.</p>'
    }
}

function renderSchedules(schedule, pricePerPax) {
    if (!schedule || schedule.length === 0) {
        scheduleContainer.innerHTML = '<p class="label-text">No departures available for this date.</p>'
        return;
    }

    pricePerPaxEl.value = pricePerPax || 0;
    recalculateTotal();

    scheduleContainer.innerHTML = schedule.map(slot => `
        <div class="schedule-card" data-trip-code="${slot.TripCode}" data-price="${pricePerPax}">
            <p class="label-text">${slot.TravelTime}</p>
            <p class="even-smaller-label">${slot.SeatCategory ?? 'Premium'}</p>
            <p class="label-text">IDR ${Number(pricePerPax).toLocaleString('id-ID')}</p>
        </div>
    `).join('');

    document.querySelectorAll('.schedule-card').forEach(card => {
        card.addEventListener('click', () => selectSchedule(card));
    });
}

function selectSchedule(card) {
    document.querySelectorAll('.schedule-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    selectedTripCodeEl.value = card.dataset.tripCode;
    pricePerPaxEl.value = card.dataset.price
    recalculateTotal();
}

// Return Schedule
function renderReturnSchedules(schedule, pricePerPax) {
    if (!returnScheduleContainer) return;

    if (!schedule || schedule.length === 0) {
        returnScheduleContainer.innerHTML = '<p class="label-text">No returns available for this date.</p>'
        return;
    }

    returnScheduleContainer.innerHTML = schedule.map(slot => `
        <div class="schedule-card return-schedule-card" data-trip-code="${slot.TripCode}" data-price="${pricePerPax}">
        <p class="label-text">${slot.TravelTime}</p>
        <p class="even-smaller-label">${slot.SeatCategory ?? 'Premium'}</p>
        <p class="label-text">IDR ${Number(pricePerPax).toLocaleString('id-ID')}</p>
        </div>
    `).join('');
    
    returnScheduleContainer.querySelectorAll('.return-schedule-card').forEach(card => {
        card.addEventListener('click', () => selectReturnSchedule(card));
    });
}

function selectReturnSchedule(card) {
    returnScheduleContainer.querySelectorAll('.return-schedule-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    selectedReturnTripCodeEl.value = card.dataset.tripCode;
}

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
    })
});

function getTotalPax() {
    return Array.from(document.querySelectorAll('.pax-counter-text')).reduce((sum, el) => sum + parseInt(el.textContent), 0);
}

function recalculateTotal() {
    const price = parseFloat(pricePerPaxEl.value) || 0;
    const totalPax = getTotalPax();
    const total = price * getTotalPax();
    
    totalPriceDisplay.textContent = `IDR ${total.toLocaleString('id-ID')}`;

    document.getElementById('displayPricePerPax').textContent = price > 0 ? `IDR ${price.toLocaleString('id-ID')}` : '-';
    document.getElementById('displayTotalPax').textContent = `${totalPax} visitor${totalPax !== 1 ? 's' : ''}`;
}

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
            ...(isTwoWay && {
                returnTripCode: selectedReturnTripCodeEl.value,
                returnDate: document.getElementById('ferryReturnDate')?.value
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
                tripCode,
                departureDate: date,
                ...(isTwoWay && {
                    returnTripCode: selectedReturnTripCodeEl.value,
                    returnDate: document.getElementById('ferryReturnDate')?.value
                }),
                SeatCategory: document.querySelector('.schedule-card.selected .even-smaller-label')?.textContent || 'Premium',
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