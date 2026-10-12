document.addEventListener('DOMContentLoaded', () => {
    const refundModal = document.getElementById('refundModal');
    const modalCloseBtn = document.getElementById('modalCloseBtn');
    const modalCancelBtn = document.getElementById('modalCancelBtn');
    const refundForm = document.getElementById('refundForm');

    const modalOrderId = document.getElementById('modalOrderId');
    const modalCustomer = document.getElementById('modalCustomer');
    const modalAmount = document.getElementById('modalAmount');
    const modalBank = document.getElementById('modalBank');
    const modalHolder = document.getElementById('modalHolder');

    const closeModal = () => {
        if (refundModal) {
            refundModal.classList.add('hidden');
        }
    };

    modalCloseBtn?.addEventListener('click', closeModal);
    modalCancelBtn?.addEventListener('click', closeModal);

    // Close when clicking outside the modal box
    refundModal?.addEventListener('click', (e) => {
        if (e.target === refundModal) {
            closeModal();
        }
    });

    // Open modal on "Mark as Refunded" click
    document.querySelectorAll('.btn-mark-refunded').forEach(btn => {
        btn.addEventListener('click', () => {
            if (modalOrderId) modalOrderId.value = btn.dataset.orderId || '';
            if (modalCustomer) modalCustomer.textContent = btn.dataset.customer || '—';
            if (modalAmount) modalAmount.textContent = btn.dataset.amount || '—';
            if (modalBank) modalBank.textContent = `${btn.dataset.bankName || 'BANK'} - ${btn.dataset.bankAcc || '—'}`;
            if (modalHolder) modalHolder.textContent = `a.n. ${btn.dataset.bankHolder || '—'}`;
            if (refundForm) refundForm.action = `/accounting/refunds/${btn.dataset.cancelId}/complete`;
            refundModal?.classList.remove('hidden');
        });
    });
});
