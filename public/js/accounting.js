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

    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    const rowCheckboxes = document.querySelectorAll('.row-checkbox:not(:disabled)');
    const batchActionBar = document.getElementById('batchActionBar');
    const batchCountBadge = document.getElementById('batchCountBadge');
    const btnBatchReconcile = document.getElementById('btnBatchReconcile');
    const btnBatchReview = document.getElementById('btnBatchReview');
    const btnBatchClear = document.getElementById('btnBatchClear');

    const updateBatchBarState = () => {
        const checkedBoxes = document.querySelectorAll('.row-checkbox:checked');
        const count = checkedBoxes.length;
        if (count > 0) {
            batchCountBadge.textContent = count;
            batchActionBar.classList.remove('hidden');
        } else {
            batchActionBar.classList.add('hidden');
        }
        if (selectAllCheckbox) {
            selectAllCheckbox.checked = (rowCheckboxes.length > 0 && count === rowCheckboxes.length);
        }
    };

    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', () => {
            rowCheckboxes.forEach(cb => cb.checked = selectAllCheckbox.checked);
            updateBatchBarState();
        });
    }

    rowCheckboxes.forEach(cb => {
        cb.addEventListener('change', updateBatchBarState);
    });

    if (btnBatchClear) {
        btnBatchClear.addEventListener('click', () => {
            rowCheckboxes.forEach(cb => cb.checked = false);
            if (selectAllCheckbox) selectAllCheckbox.checked = false;
            updateBatchBarState();
        });
    }

    const executeBatchUpdate = async (targetStatus) => {
        const checkedBoxes = document.querySelectorAll('.row-checkbox:checked');
        const orderIds = Array.from(checkedBoxes).map(cb => parseInt(cb.value));

        if (orderIds.length === 0) return;

        batchActionBar.style.opacity = '0.5';

        try {
            const res = await fetch('/accounting/orders/batch-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderIds, status: targetStatus })
            });

            const data = await res.json();
            if (data.success) {
                // Instantly update badge appearance for all modified rows
                orderIds.forEach(id => {
                    const rowCb = document.querySelector(`.row-checkbox[value="${id}"]`);
                    if (rowCb) {
                        const tr = rowCb.closest('tr');
                        const wrapper = tr.querySelector('.status-badge-wrapper');
                        const select = tr.querySelector('.status-select-badge');
                        if (wrapper && select) {
                            wrapper.classList.remove('status-pending', 'status-awaiting-redemption', 'status-ready-for-payout', 'status-reconciled', 'status-in-review');
                            wrapper.classList.add(`status-${targetStatus.replaceAll('_', '-')}`);
                            select.value = targetStatus;
                        }
                        rowCb.checked = false;
                    }
                });

                if (selectAllCheckbox) selectAllCheckbox.checked = false;
                updateBatchBarState();
            } else {
                alert(data.message || 'Batch update failed');
            }
        } catch (err) {
            console.error('Batch update error:', err);
            alert('Connection error during batch update.');
        } finally {
            batchActionBar.style.opacity = '1';
        }
    };

    if (btnBatchReconcile) {
        btnBatchReconcile.addEventListener('click', () => executeBatchUpdate('reconciled'));
    }
    
    if (btnBatchReview) {
        btnBatchReview.addEventListener('click', () => executeBatchUpdate('in_review'));
    }
});