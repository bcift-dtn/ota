const rejectModal = document.getElementById('rejectModal');
const rejectModalForm = document.getElementById('rejectModalForm');
const rejectModalCompany = document.getElementById('rejectModalCompany');
const rejectReasonInput = document.getElementById('rejectReason');
const closeRejectModalBtn = document.getElementById('closeRejectModal');

document.querySelectorAll('.open-reject-modal').forEach((btn) => {
  btn.addEventListener('click', () => {
    const id = btn.dataset.id;
    const company = btn.dataset.company;

    rejectModalForm.action = `/admin/agent-requests/${id}/reject`;
    rejectModalCompany.textContent = company;
    rejectReasonInput.value = '';
    rejectModal.classList.remove('hidden');
    rejectReasonInput.focus();
  });
});

closeRejectModalBtn?.addEventListener('click', () => {
  rejectModal.classList.add('hidden');
});

rejectModal?.addEventListener('click', (e) => {
  if (e.target === rejectModal) {
    rejectModal.classList.add('hidden');
  }
});