flatpickr('input[type="date"]', {
  altInput: true,
  altFormat: "j F Y",
  dateFormat: "Y-m-d",
  minDate: "today",
  disableMobile: "true",
  allowInput:true,
});


// Change main image preview
document.querySelectorAll('.detail-thumbnail').forEach(thumb => {
  thumb.addEventListener('click', () => {
    const mainImage = document.querySelector('.detail-main-image');
    mainImage.src = thumb.src;
    document.querySelectorAll('.detail-thumbnail').forEach(t => t.classList.remove('active-thumb'));
    thumb.classList.add('active-thumb');
  });
});

const packagePrice = Number(document.querySelector('#packagePrice').dataset.price);
const bookingQuantitySelect = document.querySelector('#bookingQuantity');

bookingQuantitySelect.addEventListener('change', e => {
  const bookingTotalPriceText = document.querySelector('#bookingTotalPriceText')
  const bookingcarQuantityText = document.querySelector('#bookingcarQuantityText')
  const quantity = bookingQuantitySelect.value;
  let quantityText = bookingQuantitySelect.value;
  const totalPrice = packagePrice * quantity;

  if (quantity > 1) {
    quantityText = `${quantity} Cars`;
  } else {
    quantityText = `${quantity} Car`;
  }

  bookingcarQuantityText.textContent = quantityText;
  bookingTotalPriceText.textContent = `IDR ${totalPrice.toLocaleString('id-ID')}`;
})

const pickupTime = document.querySelector('#pickupTime');

pickupTime.addEventListener('change', e => {
  const pickupNote = document.querySelector('.rental-duration-note');

  if (!packageDurationHours) {
    return;
  }

  const [hours, mins] = e.target.value.split(':').map(Number);
  const endHours = (hours + packageDurationHours) % 24;
  const endTime = `${String(Math.floor(endHours)).padStart(2,'0')}:${String(mins).padStart(2,'0')}`;

  pickupNote.textContent = `Rental duration: ${e.target.value} - ${endTime}`
})

const bookingContinueBtn = document.querySelector('#bookingContinueBtn')

bookingContinueBtn.addEventListener('click', async e => {
  e.preventDefault();

  const currentProductId = document.querySelector('#currentProductId').value;
  const currentPackageId = document.querySelector('#currentPackageId').value;
  const currentProductType = document.querySelector('#currentProductType').value;

  const pickupLocation = document.querySelector('#pickupLocation').value;
  const visitDate = document.querySelector('#pickupDate').value;
  const slotTime = document.querySelector('#pickupTime').value;
  const bookingQuantity = document.querySelector('#bookingQuantity').value;

  if (!pickupLocation || !visitDate || !slotTime) {
    alert('Please fill out all booking details (Location, Date, and Time).');
    return;
  }

  const draftData = {
    productId: currentProductId,
    packageId: currentPackageId,
    productType: currentProductType,
    pickupLocation: pickupLocation,
    visitDate: visitDate,
    slotTime: slotTime,
    bookingQuantity: parseInt(bookingQuantity),
    totalPax: 1,
    paxBreakdown: [],
    addons: []
  };

  if (!currentUser) {
    sessionStorage.setItem('pendingCheckoutDraft', JSON.stringify(draftData));
    document.querySelector('#modalOverlay').classList.remove('hidden');
    return;
  }

  try {
    const response = await fetch('/products/checkout/draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draftData)
    });

    const result = await response.json();
    if (result.success) {
      window.location.href = '/products/checkout';
    }
  } catch (err) {
    console.error('Error saving draft data: ', err);
  }
})

