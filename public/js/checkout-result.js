document.addEventListener('DOMContentLoaded', () => {
  const downloadBtn = document.getElementById('downloadVoucherBtn');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      window.print();
    });
  }

  const timerSpan = document.getElementById('pendingTimer');
  if (timerSpan) {
    const maxRetries = 3;
    const retryCount = parseInt(sessionStorage.getItem('mff_retry_count') || '0', 10);

    if (retryCount < maxRetries) {
      let seconds = 3;
      const interval = setInterval(() => {
        seconds --;
        if (seconds > 0) {
          timerSpan.textContent = `Refreshing in ${seconds} second${seconds > 1 ? 's' : ''}...`;
        } else {
          clearInterval(interval);
          sessionStorage.setItem('mff_retry_count', String(retryCount + 1));
          window.location.reload();
        }
      }, 1000);
    } else {
      sessionStorage.removeItem('mff_retry_count');
      timerSpan.textContent = 'Please check your email or contact support if your booking code does not appear shortly.'
    }
  } else {
    sessionStorage.removeItem('mff_retry_count');
  }
});