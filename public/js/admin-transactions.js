document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Flatpickr matching Home calendar
    if (typeof flatpickr !== 'undefined') {
        flatpickr('.admin-date-input', {
            altInput: true,
            altFormat: "j M Y",
            dateFormat: "Y-m-d",
            allowInput: true,
            disableMobile: "true"
        });
    }
    
    // 2. Status filter auto-submit
    const statusSelect = document.querySelector('.admin-filter-select');
    statusSelect?.addEventListener('change', () => {
        statusSelect.form?.submit();
    });

    // 3. Row Limit Selector (preserves active search & filters)
    const limitSelect = document.getElementById('limitSelect');
    limitSelect?.addEventListener('change', () => {
        const url = new URL(window.location.href);
        url.searchParams.set('limit', limitSelect.value);
        url.searchParams.set('page', '1');
        window.location.href = url.toString();
    });
});