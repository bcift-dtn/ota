const today = new Date().toISOString().split('T')[0];

document.querySelectorAll('input[type="date"]').forEach(input => {
  input.setAttribute('min', today);
});


// Change main image preview
document.querySelectorAll('.detail-thumbnail').forEach(thumb => {
  thumb.addEventListener('click', () => {
    const mainImage = document.querySelector('.detail-main-image');
    mainImage.src = thumb.src
  })
})

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

bookingContinueBtn.addEventListener('click', e => {
  e.preventDefault();

  // check if all field have been filled by user

  if (!currentUser) {
    document.querySelector('#modalOverlay').classList.remove('hidden');
    return;
  }

  // redirect tp payment page
})

