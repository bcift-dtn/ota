const _pageData = document.getElementById('pageData');
const packageDurationHours = _pageData.dataset.duration ? Number(_pageData.dataset.duration) : null;
const currentUser = JSON.parse(_pageData.dataset.user);

flatpickr('input[type="date"]', {
  altInput: true,
  altFormat: "j F Y",
  dateFormat: "Y-m-d",
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
      
      const bookingQty = quantitySelect ? parseInt(quantitySelect.value) : 1;
      const baseMaxAllowed = parseInt(counter.getAttribute('data-max')) || 99;
      const maxAllowed = baseMaxAllowed * bookingQty;
      
      // If it's an infant or Extra Bed, it doesn't count towards the Max Pax limit
      if (counter.getAttribute('data-is-infant') === 'true') {
        if (count < maxAllowed) {
          textEl.textContent = count + 1;
          calculateGrandTotal();
        }

      } else if (counter.classList.contains('core-addon')) {
        if (count < maxAllowed) {
          textEl.textContent = count + 1;
          calculateGrandTotal();
        }
      } else {
        let currentTotalHumans = 0;
        paxCounters.forEach(c => {
          if (c.getAttribute('data-is-infant') !== 'true' && !c.classList.contains('core-addon')) {
            currentTotalHumans += parseInt(c.querySelector('.pax-counter-text').textContent);
          }
        });

        const maxPaxInput = document.querySelector('#maxPaxPerUnit');
        const maxPaxPerUnit = maxPaxInput ? parseInt(maxPaxInput.value) || 999 : 999;
        const totalMaxPax = maxPaxPerUnit * bookingQty;

        if (currentTotalHumans < totalMaxPax && count < maxAllowed) {
          textEl.textContent = count + 1;
          calculateGrandTotal();
        }
      }
    });
  });
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
      
      const labelEl = counter.querySelector('.label-text');
      const isExtraBed = labelEl && labelEl.textContent.toLowerCase().includes('extra bed');

      if (!counter.classList.contains('core-addon') || isExtraBed) {
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
      bookingPaxQuantityText.textContent = `${totalPax} Person(s)`;
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
  const visitDateInput = document.querySelector('#activitiesCheckInDate');
  const slotTimeInput = document.querySelector('#slotTime');
  const quantityInput = document.querySelector('#bookingQuantity');

  const visitDate = visitDateInput ? visitDateInput.value : '';
  const slotTime = slotTimeInput ? slotTimeInput.value : null;
  const bookingQuantity = quantityInput ? parseInt(quantityInput.value) : 1;
  const totalPax = bookingPaxQuantityText ? parseInt(bookingPaxQuantityText.textContent) : 1;

  if (!visitDate) {
    alert("Please select a Check-In Date before continuing.");
    return;
  }

  const selectedAddons = [];

  document.querySelectorAll('.core-addon').forEach(addon => {
    const qty = parseInt(addon.querySelector('.addon-qty-val').textContent);
    if (qty > 0) {
      selectedAddons.push({
        id: addon.getAttribute('data-id'),
        quantity: qty
      })
    }
  })

  document.querySelectorAll('.addon-checkbox:checked').forEach(checkbox => {
    const addonContainer = checkbox.closest('.addon-item');
    const qty = parseInt(addonContainer.querySelector('.addon-qty-val').textContent);
    selectedAddons.push({
      id: checkbox.getAttribute('data-id'),
      quantity: qty
    })
  })

  const paxBreakdown = [];

  document.querySelectorAll('.pax-counter:not(.core-addon):not(.informational-pax)').forEach(counter => {
    const tierTitle = counter.querySelector('.label-text').textContent.trim().toLowerCase();
    const qty = parseInt(counter.querySelector('.pax-counter-text').textContent);

    if (qty > 0) {
      paxBreakdown.push({
        tier: tierTitle,
        quantity: qty
      });
    }
  });

  const draftData = {
    productId: currentProductId,
    packageId: currentPackageId,
    productType: currentProductType,
    visitDate: visitDate,
    slotTime: slotTime,
    bookingQuantity: bookingQuantity,
    totalPax: totalPax,
    paxBreakdown: paxBreakdown,
    grandTotal: bookingTotalPriceText.textContent,
    addons: selectedAddons
  }

  if (!currentUser) {
    sessionStorage.setItem('pendingCheckoutDraft', JSON.stringify(draftData));
    document.querySelector('#modalOverlay').classList.remove('hidden');
    return;
  }

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
