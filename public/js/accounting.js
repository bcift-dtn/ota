document.addEventListener('DOMContentLoaded', () => {
    // Render Lucide icons
    if (window.lucide) {
        window.lucide.createIcons();
    }

    const filterForm = document.querySelector('.settlement-filter-bar');
    if (!filterForm) return;

    // Native dropdowns auto-submit (Status, Product)
    const selects = filterForm.querySelectorAll('select.filter-pill-select');
    selects.forEach(select => {
        select.addEventListener('change', () => {
            filterForm.submit();
        });
    });

    const triggerBtn = document.getElementById('periodTriggerBtn');
    const popover = document.getElementById('periodPopover');
    const periodInput = document.getElementById('periodInput');

    if (!triggerBtn || !popover || !periodInput) return;

    // Toggle popover visibility
    triggerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        popover.classList.toggle('hidden');
    });

    // Close when clicking outside
    document.addEventListener('click', (e) => {
        if (!popover.contains(e.target) && !triggerBtn.contains(e.target)) {
            popover.classList.add('hidden');
        }
    });

    // Switch Year Tabs on the left
    const yearBtns = popover.querySelectorAll('.period-year-btn');
    const monthPanes = popover.querySelectorAll('.period-month-pane');

    yearBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // If "All Time" is clicked
            if (btn.dataset.allTime === 'true') {
                periodInput.value = '';
                filterForm.submit();
                return;
            }
            
            const targetYear = btn.dataset.year;

            // Highlight active year button
            yearBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Show corresponding months pane on the right
            monthPanes.forEach(pane => {
                if (pane.dataset.paneYear === targetYear) {
                    pane.classList.add('active');
                } else {
                    pane.classList.remove('active');
                }
            });
        });
    });

    // Click Month on the right -> Set value & Submit
    const monthBtns = popover.querySelectorAll('.period-month-btn');
    monthBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const periodVal = btn.dataset.period;
            periodInput.value = periodVal;
            popover.classList.add('hidden');
            filterForm.submit();
        });
    });
});