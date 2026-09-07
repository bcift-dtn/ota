document.addEventListener('DOMContentLoaded', () => {
  const downloadBtn = document.getElementById('downloadVoucherBtn');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      window.print();
    });
  }
});