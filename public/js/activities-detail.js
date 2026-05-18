const today = new Date().toISOString().split('T')[0];

document.querySelectorAll('input[type="date"]').forEach(input => {
  input.setAttribute('min', today);
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
    
    minusBtn.addEventListener('click', (e) => {
      e.preventDefault(); 
      let count = parseInt(textEl.textContent);
      if (count > 0) {
        textEl.textContent = count - 1;
        updateTotalPaxPrice();
      }
    });

    plusBtn.addEventListener('click', (e) => {
      e.preventDefault();
      let count = parseInt(textEl.textContent);
      textEl.textContent = count + 1;
      updateTotalPaxPrice();
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
    const total = basePrice * qty;
    
    bookingTotalPriceText.textContent = `IDR ${total.toLocaleString('id-ID')}`;
    if (bookingQuantityText) {
      bookingQuantityText.textContent = `${qty} Unit${qty > 1 ? 's' : ''}`;
    }
  });
}

document.querySelector('#bookingContinueBtn').addEventListener('click', e => {
  e.preventDefault();

  if (!currentUser) {
    document.querySelector('#modalOverlay').classList.remove('hidden');
    return;
  }
});
