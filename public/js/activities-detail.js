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
      const maxAllowed = parseInt(counter.getAttribute('data-max')) || 99;
      
      // If it's an infant or Extra Bed, it doesn't count towards the Max Pax limit
      if (counter.getAttribute('data-is-infant') === 'true' || counter.classList.contains('core-addon')) {
         if (count < maxAllowed) {
            textEl.textContent = count + 1;
            calculateGrandTotal();
         }
      } else {
         // It's an Adult or Child! Let's calculate the current total non-infant passengers
         let currentTotalHumans = 0;
         paxCounters.forEach(c => {
           if (c.getAttribute('data-is-infant') !== 'true' && !c.classList.contains('core-addon')) {
             currentTotalHumans += parseInt(c.querySelector('.pax-counter-text').textContent);
           }
         });
         
         // Calculate the dynamic limit (e.g. 1 Villa * 4 people = 4)
         const bookingQty = quantitySelect ? parseInt(quantitySelect.value) : 1;
         const maxPaxPerUnit = parseInt(document.querySelector('#maxPaxPerUnit').value) || 999;
         const totalMaxPax = maxPaxPerUnit * bookingQty;
         
         if (currentTotalHumans < totalMaxPax && count < maxAllowed) {
            textEl.textContent = count + 1;
            calculateGrandTotal();
         } else if (currentTotalHumans >= totalMaxPax) {
            alert(`Maximum capacity is ${totalMaxPax} people.`);
         }
      }
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

      const minPax = parseInt(checkbox.getAttribute('data-min')) || 1;
      if (qtyValEl && qtyValEl.tagName !== 'SELECT') {
        if (parseInt(qtyValEl.textContent) < minPax) {
          qtyValEl.textContent = minPax;
        }
      }
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
      let dynamicMax = parseInt(checkbox.getAttribute('data-current-max')) || maxPax;

      if (count < dynamicMax) {
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
      
      if (!counter.classList.contains('core-addon')) {
        totalPax += qty;
      }
    });

    addonCheckboxes.forEach(checkbox => {
      const minPax = parseInt(checkbox.getAttribute('data-min')) || 1;
      const maxPax = parseInt(checkbox.getAttribute('data-max')) || 10;
      const pricingType = checkbox.getAttribute('data-pricing-type');

      if (totalPax < minPax) {
        checkbox.disabled = true;
        checkbox.checked = false;
        checkbox.closest('.addon-item').querySelector('.addon-controls').classList.add('hidden');
      } else {
        checkbox.disabled = false;
      }

      if (pricingType === 'per_pax') {
        const maxAllowed = Math.min(totalPax, maxPax);
        checkbox.setAttribute('data-current-max', maxAllowed);

        const qtyValEl = checkbox.closest('.addon-item').querySelector('.addon-qty-val');

        if (qtyValEl && qtyValEl.tagName !== 'SELECT') {
          if (parseInt(qtyValEl.textContent) > maxAllowed) {
            qtyValEl.textContent = maxAllowed;
          }
        }
      } else {
        checkbox.setAttribute('data-current-max', maxPax);
      }

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

document.querySelector('#bookingContinueBtn').addEventListener('click', async e => {
  e.preventDefault();

  const currentProductId = document.querySelector('#currentProductId').value;
  const currentPackageId = document.querySelector('#currentPackageId').value;
  const currentProductType = document.querySelector('#currentProductType').value;

  if (!currentUser) {
    const draftData = {
      productId: currentProductId,
      packageId: currentPackageId,
      productType: currentProductType,
      totalPax: bookingPaxQuantityText ? parseInt(bookingPaxQuantityText.textContent) : 1,
      grandTotal: bookingTotalPriceText.textContent
    };

    sessionStorage.setItem('pendingCheckoutDraft', JSON.stringify(draftData));

    document.querySelector('#modalOverlay').classList.remove('hidden');
    return;
  }

  const draftData = {
    productId: currentProductId,
    packageId: currentPackageId,
    productType: currentProductType,
    totalPax: bookingPaxQuantityText ? parseInt(bookingPaxQuantityText.textContent) : 1,
    grandTotal: bookingTotalPriceText.textContent
  };

  try {
    const response = await fetch('/products/checkout/draft', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(draftData)
    });

    const result = await response.json();
    if (result.success) {
      window.location.href = '/products/checkout';
    }
  } catch (err) {
    console.error("Error saving draft:", err);
    alert("Something went wrong. Please try again.");
  }
});
