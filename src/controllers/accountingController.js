const accountingModel = require('../models/accountingModel');

const getSettlementDashboard = async (req, res) => {
    try {
        const {
            search = '',
            month = '',
            year = '',
            status = 'all',
            type = 'all',
            page = 1
        } = req.query;

        const currentPage = Math.max(1, parseInt(page) || 1);

        // Fetch metrics and paginated orders in parallel
        const [metrics, ordersData] = await Promise.all([
            accountingModel.getSettlementMetrics({
                search,
                month: month ? parseInt(month) : null,
                year: year ? parseInt(year) : null,
                status,
                productType: type
            }),
            accountingModel.getSettlementOrders({
                search,
                month: month ? parseInt(month) : null,
                year: year ? parseInt(year) : null,
                status,
                productType: type,
                page: currentPage,
                limit: 10
            })
        ]);

        return res.render('pages/accounting/settlement', {
            activeMenu: 'accounting',
            metrics,
            orders: ordersData.orders,
            totalOrders: ordersData.totalOrders,
            totalPages: ordersData.totalPages,
            currentPage: ordersData.currentPage,
            searchQuery: search,
            currentMonth: month,
            currentYear: year,
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

