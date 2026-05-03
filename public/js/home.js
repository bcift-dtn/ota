const tabs = document.querySelectorAll('.tab-btn');
const forms = document.querySelectorAll('.search-form');
const highlight = document.querySelector('.tab-highlight');

let activeTab = tabs[0];

function moveHighlightTo(tab) {
  highlight.style.left = tab.offsetLeft + 'px';
  highlight.style.width = tab.offsetWidth + 'px';
}

moveHighlightTo(activeTab);

tabs.forEach(btn => {
  btn.addEventListener('mouseover', e => {
    moveHighlightTo(btn);
  })

  btn.addEventListener('click', e => {
    e.preventDefault();

    forms.forEach(form => {
      form.classList.add('hidden');
      if (btn.dataset.service === form.dataset.form) {
        form.classList.remove('hidden');

        activeTab = btn;
        moveHighlightTo(activeTab);
      }
    })
  })
})

const tabBar = document.querySelector('.tab-bar');
  tabBar.addEventListener('mouseleave', e => {
    moveHighlightTo(activeTab);
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

// Update Pax 
let adults = 1,
  children = 0,
  infants = 0;

const paxSummaryBtn = document.querySelector('#paxSummaryBtn');

function updatePaxSummary() {
  // Counter validation
  adults = Math.max(1, Math.min(9, adults));
  children = Math.max(0, Math.min(9, children));
  infants = Math.max(0, Math.min(9, infants));

  document.querySelector('#adultCounterText').textContent = adults;
  document.querySelector('#childCounterText').textContent = children;
  document.querySelector('#infantCounterText').textContent = infants;

  paxSummaryBtn.textContent = `${adults} Adult, ${children} Child, ${infants} Infant`
}

paxSummaryBtn.addEventListener('click', e => {
  e.preventDefault();

  const paxCounter = document.querySelector('.pax-counter');
  paxCounter.classList.toggle('hidden');
})

// Close pax counter on outside area click
document.addEventListener('click', e => {
  const paxWrapper = document.querySelector('.pax-counter-wrapper');
  const paxCounter = document.querySelector('.pax-counter');

  if (!paxWrapper.contains(e.target)) {
    paxCounter.classList.add('hidden');
  }
})

// Counter plus and min logic
const adultMinBtn = document.querySelector('#adultMinBtn');
const adultPlusBtn = document.querySelector('#adultPlusBtn');
const childMinBtn = document.querySelector('#childMinBtn');
const childPlusBtn = document.querySelector('#childPlusBtn');
const infantMinBtn = document.querySelector('#infantMinBtn');
const infantPlusBtn = document.querySelector('#infantPlusBtn');

adultMinBtn.addEventListener('click', () => {
  adults--;
  updatePaxSummary();
})

adultPlusBtn.addEventListener('click', () => {
  adults++;
  updatePaxSummary();
})

childMinBtn.addEventListener('click', () => {
  children--;
  updatePaxSummary();
})

childPlusBtn.addEventListener('click', () => {
  children++;
  updatePaxSummary();
})

infantMinBtn.addEventListener('click', () => {
  infants--;
  updatePaxSummary();
})

infantPlusBtn.addEventListener('click', () => {
  infants++;
  updatePaxSummary();
})

document.addEventListener('DOMContentLoaded', () => {
    // Swiper Logic / Slider
  const dealsSwiper = new Swiper('.deals-swiper', {
    loop: true,
    autoplay: { delay: 3000},
    slidesPerView: 2,
    spaceBetween: 20,
    breakpoints: {
      640: {
        slidesPerView: 2,
      },
      860: {
        slidesPerView: 3,
      }
    }
  })

  const bannerSwiper = new Swiper('.banner-swiper', {
    loop: true,
    autoplay: { delay: 3000},
    slidesPerView: 1,
  })

  const hotelsSwiper = new Swiper('.hotels-swiper', {
    observer: true,
    observeParents: true,
    loop: true,
    slidesPerView: 2,
    spaceBetween: 20,
    breakpoints: {
      640: {
        slidesPerView: 3,
      },
      860: {
        slidesPerView: 4,
      }
    }
  })
})