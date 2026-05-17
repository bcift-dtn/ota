document.querySelectorAll('.detail-btn').forEach(btn => {
  btn.addEventListener('click', e => {
    const parent = btn.closest('.product-card-horizontal');
    const packageList = parent.querySelector('.package-dropdown');

    packageList.classList.toggle('hidden');
    
    if (packageList.classList.contains('hidden')) btn.textContent = 'Detail';
    else btn.textContent = 'Close'
  })
})

document.querySelectorAll('.package-option').forEach(option => {
  option.addEventListener('click', e => {
    const parent = option.closest('.package-list');
    const activeOption = parent.querySelectorAll('.active');
    const optionName = option.querySelector('.package-name');
    const optionPrice = option.querySelector('.package-price');

    activeOption.forEach(child => {
      child.classList.remove('active');
      child.querySelector('.package-name')?.classList.remove('active-text');
      child.querySelector('.package-price')?.classList.remove('active-text');
    })

    optionName.classList.add('active-text');
    optionPrice.classList.add('active-text');
    option.classList.add('active')
  })
})

document.querySelectorAll('.confirm-selection-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const parent = btn.closest('.product-card-horizontal');
    const productId = parent.getAttribute('data-product-id');
    const activeOption = parent.querySelector('.active');

    if (!activeOption) {
      const errorMsg = parent.querySelector('.package-error');
      if (errorMsg) errorMsg.classList.remove('hidden');
      return;
    }

    const packageId = activeOption.getAttribute('data-package-id');

    window.location.href = `/products/activities/${productId}?packageId=${packageId}`;
  })
})