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

    // Settlement Status Quick Updater
    const statusSelects = document.querySelectorAll('.status-select-badge');
    statusSelects.forEach(select => {
        select.addEventListener('change', async (e) => {
            const orderId = select.dataset.orderId;
            const newStatus = select.value;
            const wrapper = select.closest('.status-badge-wrapper');

            // Visual feedback: brief opacity
            wrapper.style.opacity = '0.5';

            try {
                const res = await fetch(`/accounting/orders/${orderId}/status`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: newStatus })
                });
                const data = await res.json();
                if (data.success) {
                    // Remove all old status classes
                    wrapper.classList.remove(
                        'status-pending', 
                        'status-awaiting-redemption', 
                        'status-ready-for-payout', 
                        'status-reconciled', 
                        'status-in-review'
                    );
                    wrapper.classList.add(`status-${newStatus.replaceAll('_', '-')}`);
                } else {
                    alert(data.message || 'Failed to update status');
                }
            } catch (err) {
                console.error('Failed to update settlement status:', err);
                alert('Connection error while updating status.');
            } finally {
                wrapper.style.opacity = '1';
            }
        });
    });
});