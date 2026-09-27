const accountingModel = require('../models/accountingModel');

const getSettlementDashboard = async (req, res) => {
    try {
        const {
            search = '',
            period = '',
            status = 'all',
            type = 'all',
            page = 1
        } = req.query;

        let filterMonth = null;
        let filterYear = null;
        if (period && period.includes('-')) {
            const [m, y] = period.split('-');
            filterMonth = parseInt(m) || null;
            filterYear = parseInt(y) || null;
        }

        const currentPage = Math.max(1, parseInt(page) || 1);

        // Fetch metrics and paginated orders in parallel
        const [metrics, ordersData, availablePeriods] = await Promise.all([
            accountingModel.getSettlementMetrics({
                search,
                month: filterMonth,
                year: filterYear,
                status,
                productType: type
            }),
            accountingModel.getSettlementOrders({
                search,
                month: filterMonth,
                year: filterYear,
                status,
                productType: type,
                page: currentPage,
                limit: 10
            }),
            accountingModel.getAvailablePeriods()
        ]);

        return res.render('pages/accounting/settlement', {
            activeMenu: 'accounting',
            metrics,
            orders: ordersData.orders,
            totalOrders: ordersData.totalOrders,
            totalPages: ordersData.totalPages,
            currentPage: ordersData.currentPage,
            searchQuery: search,
            currentPeriod: period,
            availablePeriods,
            currentStatus: status,
            currentType: type
        });
    } catch (err) {
        console.error('[ACCOUNTING] Dashboard error:', err.message);
        return res.status(500).render('pages/404', { message: 'Failed to load accounting dashboard.' });
    }
};

const exportSettlementCSV = async (req, res) => {
    try {
        // Placeholder for CSV export - to be formatted in next step
        return res.status(200).send('CSV export will be configured shortly.');
    } catch (err) {
        console.error('[ACCOUNTING] Export error:', err.message);
        return res.status(500).send('Export failed.');
    }
};

module.exports = {
    getSettlementDashboard,
    exportSettlementCSV
};

