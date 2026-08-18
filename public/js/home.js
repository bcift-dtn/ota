const brandTabs = document.querySelectorAll('.brand-tab-btn');
const serviceTabs = document.querySelectorAll('.service-tab-btn');
const forms = document.querySelectorAll('.search-form');

const VALID_ROUTES = {
    'HBF': ['BTC', 'SKP'],
    'TMF': ['TNJ', 'BTC'],
    'BTC': ['HBF', 'TMF'],
    'SKP': ['HBF'],
    'TNJ': ['TMF']
};

flatpickr('input[type="date"]', {
  altInput: true,
  altFormat: "j F Y",
  dateFormat: "Y-m-d",
  minDate: "today",
  disableMobile: "true",
  allowInput:true,
});

function swapHeroImage(serviceName) {
  document.querySelectorAll('.hero-layer').forEach(layer => {
    layer.classList.remove('active');
  });

  const targetLayer = document.getElementById(`hero-${serviceName}`);

  if (targetLayer) {
    targetLayer.classList.add('active');
  } else {
    document.getElementById('hero-ferry').classList.add('active');
  }
}

function applyBrandRules(brand) {
  document.querySelector('.driver-wrapper').classList.remove('hidden');
  document.querySelector('#withoutDriverRadio').classList.remove('hidden');
  document.querySelector('label[for="withoutDriverRadio"]').classList.remove('hidden');
  const activityLocation = document.querySelector('#activitiesLocation');
  activityLocation.closest('.search-input-wrapper').classList.remove('hidden');
  activityLocation.setAttribute('required', 'true');

  if (brand === "meyer") {
    document.querySelector('#withoutDriverRadio').classList.add('hidden');
    document.querySelector('label[for="withoutDriverRadio"]').classList.add('hidden');

    document.querySelector('#withDriverRadio').checked = true;
  } else if (brand === "ranoh") {
    activityLocation.closest('.search-input-wrapper').classList.add('hidden');
    activityLocation.removeAttribute('required');
  }
}

function clearAllActive() {
  brandTabs.forEach(t => t.classList.remove('active'));
  serviceTabs.forEach(t => t.classList.remove('active'));
}

function showForm(serviceType) {
  forms.forEach(form => {
    form.classList.toggle('hidden', form.dataset.form !== serviceType)
  });
}

function updateFormAction(serviceType, brand) {
  const activeForm = document.querySelector(`.search-form[data-form="${serviceType}"] form`);

  if (!activeForm) return;

  const baseAction = activeForm.dataset.baseAction || activeForm.action.split('?')[0];

  activeForm.dataset.baseAction = baseAction;
  activeForm.action = brand ? `${baseAction}?brand=${brand}` : baseAction;

  applyBrandRules(brand);
}

brandTabs.forEach(btn => {
  btn.addEventListener('click', (e) => {
    clearAllActive();
    btn.classList.add('active');

    const service = btn.dataset.service;

    showForm(service);
    swapHeroImage(service);
    updateFormAction(service, btn.dataset.brand);
  })
})

serviceTabs.forEach(btn => {
  btn.addEventListener('click', () => {
    clearAllActive();
    btn.classList.add('active');

    const service = btn.dataset.service;
    showForm(service);
    swapHeroImage(service);
    updateFormAction(service, null);
  })
})

const tripTypeRadio = document.querySelectorAll('input[name="tripType"]');


tripTypeRadio.forEach(radio => {
  radio.addEventListener('change', e => {
    const returnDateWrapper = document.querySelector('#returnDateWrapper');

    if (e.target.value === 'two-way') {
      returnDateWrapper.classList.remove('hidden');
    } else {
      returnDateWrapper.classList.add('hidden');
    }
  })
})

document.addEventListener('DOMContentLoaded', () => {
  // Swiper Logic / Slider
  const dealsSwiper = new Swiper('.deals-swiper', {
    loop: true,
    autoplay: { delay: 3000 },
    slidesPerView: 2,
    spaceBetween: 20,
    navigation: {
      nextEl: '.deals-btn-next',
      prevEl: '.deals-btn-prev',
    },
    breakpoints: {
      640: {
        slidesPerView: 2,
      },
      860: {
        slidesPerView: 3,
      }
    },
  });

  const bannerSwiper = new Swiper('.banner-swiper', {
    slidesPerView: 1,
    pagination: {
      el: '.swiper-pagination',
      clickable: true,
    }
  })

  const hotelsSwiper = new Swiper('.hotels-swiper', {
    observer: true,
    observeParents: true,
    loop: true,
    slidesPerView: 2,
    spaceBetween: 20,
    navigation: {
      nextEl: '.hotels-btn-next',
      prevEl: '.hotels-btn-prev',
    },
    breakpoints: {
      640: {
        slidesPerView: 3,
      },
      860: {
        slidesPerView: 4,
      }
    }
  })

  const brandSwiper = new Swiper('.brand-swiper', {
    loop: true,
    slidesPerView: 2,
    spaceBetween: 20,
    speed: 4000,
    autoplay: {
      delay: 0,
      disableOnInteraction: false,
      pauseOnMouseEnter: false,
    },
    allowTouchMove: false,
    freeMode: {
      enabled: true,
      momentum: false,
    },
    breakpoints: {
      640: {
        slidesPerView: 3
      },
      860: {
        slidesPerView: 5
      }
    }
  })
})

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

const fromPortEl = document.getElementById('fromPort');
const toPortEl   = document.getElementById('toPort');
if (fromPortEl && toPortEl) {
    syncPortOptions(fromPortEl, toPortEl);
    fromPortEl.addEventListener('change', () => syncPortOptions(fromPortEl, toPortEl));
}