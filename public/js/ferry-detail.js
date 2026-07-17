const productId = document.getElementById('currentProductId').value;
const pricePerPaxEl = document.getElementById('pricePerPax');
const scheduleContainer = document.getElementById('scheduleContainer');
const totalPriceDisplay = document.getElementById('bookingTotalPriceText');
const selectedTripCodeEl = document.getElementById('selectedTripCode');

// Init flatpickr
flatpickr('#ferryDepartureDate', {
    altInput: true,
    altFormat: 'j F Y',
    dateFormat: 'Y-m-d',
    minDate: 'today',
    disableMobile: true,
    allowInput: true,
    onChange: (SelectedDates, dateStr) => fetchSchedules(dateStr),
});

// Get schedule
async function fetchSchedules(date) {
    scheduleContainer.innerHTML = '<p class="label-text">Loading schedules...</p>';
    try {
        const res = await fetch(`/ferry/${productId}/schedules?date=${date}`);
        const data = await res.json();
        renderSchedules(data.schedule);
        
    } catch (error) {
        scheduleContainer.innerHTML = '<p class="label-text">Failed to load schedules. Please try again.</p>'
    }
}

function renderSchedules(schedule) {
    if (!schedule || schedule.length === 0) {
        scheduleContainer.innerHTML = '<p class="label-text">No departures available for this date.</p>'
        return;
    }

    scheduleContainer.innerHTML = schedule.map(slot => `
        <div class="schedule-card" data-trip-code="${slot.TripCode}" data-price="${slot.Price}">
            <p class="label-text">${slot.DepartTime}</p>
            <p class="even-smaller-label">Seats: ${slot.AvailSeat ?? 'N/A'}</p>
            <p class="label-text">IDR ${Number(slot.Price).toLocaleString('id-ID')}</p>
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
    const total = price * getTotalPax();
    totalPriceDisplay.textContent = `IDR ${total.toLocaleString('id-ID')}`;
}

// Show schedule if date alr filled
const prefillDate = document.getElementById('ferryDepartureDate').value;
if (prefillDate) fetchSchedules(prefillDate);