flatpickr('input[type="date"]', {
  altInput: true,
  altFormat: "j F Y",
  dateFormat: "d/m/Y",
  minDate: "today",
  disableMobile: "true",
  allowInput:true,
});


document.querySelectorAll('.detail-thumbnail').forEach(thumb => {
  thumb.addEventListener('click', () => {
    const mainImage = document.querySelector('.detail-main-image');
    mainImage.src = thumb.src;
    
    document.querySelectorAll('.detail-thumbnail').forEach(t => t.classList.remove('active-thumb'));
    thumb.classList.add('active-thumb');
  });
});

const bookingTotalPriceText = document.querySelector('#bookingTotalPriceText');
const bookingPaxQuantityText = document.querySelector('#bookingPaxQuantityText');
const bookingQuantityText = document.querySelector('#bookingQuantityText');
const packagePriceEl = document.querySelector('#packagePrice');

const paxCounters = document.querySelectorAll('.pax-counter');
if (paxCounters.length > 0) {
  
  paxCounters.forEach(counter => {
    const minusBtn = counter.querySelector('.pax-counter-minus');
    const plusBtn = counter.querySelector('.pax-counter-plus');
    const textEl = counter.querySelector('.pax-counter-text');

    const minAllowed = parseInt(counter.getAttribute('data-min')) || 0;
    
    minusBtn.addEventListener('click', (e) => {
      e.preventDefault(); 
      let count = parseInt(textEl.textContent);
      if (count > minAllowed) {
        textEl.textContent = count - 1;
        calculateGrandTotal();
      }
    });

    plusBtn.addEventListener('click', (e) => {
      e.preventDefault();
      let count = parseInt(textEl.textContent);
      textEl.textContent = count + 1;
      calculateGrandTotal();
    });
  });

  function updateTotalPaxPrice() {
    let total = 0;
    let totalPax = 0;
    
    paxCounters.forEach(counter => {
      const price = parseInt(counter.getAttribute('data-price'));
      const qty = parseInt(counter.querySelector('.pax-counter-text').textContent);
      total += price * qty;
      totalPax += qty;
    });

    bookingTotalPriceText.textContent = `IDR ${total.toLocaleString('id-ID')}`;
    if (bookingPaxQuantityText) {
      bookingPaxQuantityText.textContent = `${totalPax} People`;
    }
  }
}

const quantitySelect = document.querySelector('#bookingQuantity');
if (quantitySelect && packagePriceEl) {
  const basePrice = parseInt(packagePriceEl.getAttribute('data-price'));
  
  quantitySelect.addEventListener('change', () => {
    const qty = parseInt(quantitySelect.value);
    if (bookingQuantityText) {
      bookingQuantityText.textContent = `${qty} Unit${qty > 1 ? 's' : ''}`;
    }

    calculateGrandTotal();
  });
}

const addonsToggleBtn = document.getElementById('addonsToggleBtn');
const addonsContent = document.getElementById('addonsContent');
const addonsChevron = document.querySelector('.addons-chevron');
const addonCheckboxes = document.querySelectorAll('.addon-checkbox');

if (addonsToggleBtn) {
  addonsToggleBtn.addEventListener('click', (e) => {
    e.preventDefault();
    addonsContent.classList.toggle('hidden');
    addonsChevron.classList.toggle('open');
  });
}

addonCheckboxes.forEach(checkbox => {
  const itemRow = checkbox.closest('.addon-item');
  const controlsDiv = itemRow.querySelector('.addon-controls');
  const minusBtn = itemRow.querySelector('.addon-minus');
  const plusBtn = itemRow.querySelector('.addon-plus');
  const qtyValEl = itemRow.querySelector('.addon-qty-val');

  checkbox.addEventListener('change', () => {
    if (checkbox.checked) {
      controlsDiv.classList.remove('hidden');
    } else {
      controlsDiv.classList.add('hidden');
    }
    calculateGrandTotal();
  });

  if (minusBtn && plusBtn) {
    const minPax = parseInt(checkbox.getAttribute('data-min'));
    const maxPax = parseInt(checkbox.getAttribute('data-max'));
    
    minusBtn.addEventListener('click', e => {
      e.preventDefault();
      let count = parseInt(qtyValEl.textContent);
      if (count > minPax) {
        qtyValEl.textContent = count - 1;
        calculateGrandTotal();
      }
    })

    plusBtn.addEventListener('click', e => {
      e.preventDefault();
      let count = parseInt(qtyValEl.textContent);
      if (count < maxPax) {
        qtyValEl.textContent = count + 1;
        calculateGrandTotal();
      }
    });
  }

  if (qtyValEl && qtyValEl.tagName === 'SELECT') {
    qtyValEl.addEventListener('change', calculateGrandTotal);
  }
});

function calculateGrandTotal() {
  let baseTotal = 0;
  let totalPax = 0;

  // Base Price Calculation
  if (quantitySelect && packagePriceEl) {
    const basePrice = parseInt(packagePriceEl.getAttribute('data-price'));
    const qty = parseInt(quantitySelect.value);
    baseTotal += (basePrice * qty);

  } 
  
  if (paxCounters.length > 0) {
    paxCounters.forEach(counter => {
      const price = parseInt(counter.getAttribute('data-price'));
      const qty = parseInt(counter.querySelector('.pax-counter-text').textContent)

      baseTotal += (price * qty);
      totalPax += qty;
    });

    if (bookingPaxQuantityText) {
      bookingPaxQuantityText.textContent = `${totalPax} People`;
    }
  }

  let addonsTotal = 0;
  addonCheckboxes.forEach(checkbox => {
    if (checkbox.checked) {
      const addonPrice = parseInt(checkbox.getAttribute('data-price'));
      const itemRow = checkbox.closest('.addon-item');
      const qtyValEl = itemRow.querySelector('.addon-qty-val');

      let addonQty = 1;
      if (qtyValEl) {
        addonQty = qtyValEl.tagName === 'SELECT' ? parseInt(qtyValEl.value) : parseInt(qtyValEl.textContent);
      }

      addonsTotal += (addonPrice * addonQty);
    }
  });

  const grandTotal = baseTotal + addonsTotal;
  bookingTotalPriceText.textContent = `IDR ${grandTotal.toLocaleString('id-ID')}`;
}

calculateGrandTotal();

document.querySelector('#bookingContinueBtn').addEventListener('click', e => {
  e.preventDefault();

  if (!currentUser) {
    document.querySelector('#modalOverlay').classList.remove('hidden');
    return;
  }
});
