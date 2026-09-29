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
        const {
            search = '',
            period = '',
            status = 'all',
            type = 'all'
        } = req.query;

        let filterMonth = null;
        let filterYear = null;
        if (period && period.includes('-')) {
            const [m, y] = period.split('-');
            filterMonth = parseInt(m) || null;
            filterYear = parseInt(y) || null;
        }

        // Query both metrics and ALL orders without pagination (limit: null)
        const [metrics, ordersData] = await Promise.all([
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
                limit: null
            })
        ]);

        // Helper to escape values with commas or quotes
        const escapeCSV = (val) => {
            if (val === null || val === undefined) return '""';
            const str = String(val);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };

        const formatDate = (dateStr) => {
            const d = new Date(dateStr);
            const datePart = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
            const timePart = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
            return `"${datePart}, ${timePart}"`;
        };

        // Format KPI amounts with Indonesian grouping (IDR 394.300.000)
        const kpiNet = `IDR ${Number(metrics?.net_settlement || 0).toLocaleString('id-ID')}`;
        const kpiCommission = `IDR ${Number(metrics?.platform_commission || 0).toLocaleString('id-ID')}`;
        const kpiTax = `IDR ${Number(metrics?.tax_withheld || 0).toLocaleString('id-ID')}`;

        const rows = [];

        // 1. KPI Metric Rows
        rows.push('NET SETTLEMENT,PLATFORM COMMISSION,TAX & PPN WITHHELD');

        rows.push(`${escapeCSV(kpiNet)},${escapeCSV(kpiCommission)},${escapeCSV(kpiTax)}`);
        
        // 2. Empty Spacing Row
        rows.push('');

        // 3. Table Header Row
        rows.push('INVOICE CODE,VENDOR,PRODUCT,ORDER DATE,GROSS AMOUNT,TAX (PPN 11%),PLATFORM FEE,PG FEE,NET PAYABLE,STATUS');

        // 4. Data Rows
        ordersData.orders.forEach(item => {
            let statusLabel = 'Awaiting Redemption';
            if (item.settlement_status === 'ready_for_payout') statusLabel = 'Ready for Payout';
            else if (item.settlement_status === 'reconciled') statusLabel = 'Reconciled';
            else if (item.settlement_status === 'in_review') statusLabel = 'In Review';

            rows.push([
                escapeCSV(item.invoice_code),
                escapeCSV(item.vendor_name),
                escapeCSV(item.product_title),
                formatDate(item.order_date),
                Math.round(Number(item.gross_amount || 0)),
                Math.round(Number(item.tax_amount || 0)),
                Math.round(Number(item.platform_fee || 0)),
                Math.round(Number(item.pg_fee || 0)),
                Math.round(Number(item.net_payable || 0)),
                escapeCSV(statusLabel)
            ].join(','));
        });

        const csvContent = rows.join('\r\n');
        const filename = `settlement-report-${period || 'all'}-${Date.now()}.csv`;

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.status(200).send(csvContent);
    } catch (err) {
        console.error('[ACCOUNTING] Export error:', err.message);
        return res.status(500).send('Export failed.');
    }
};

const updateSettlementStatus = async (req, res) => { 
    try {
        const { orderId } = req.params;
        const { status } = req.body;

        const updated = await accountingModel.updateSettlementStatus(orderId, status);
        if (!updated) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        return res.status(200).json({
            success: true,
            orderId: updated.id,
            status: updated.settlement_status,
            settledAt: updated.settled_at
        });
    } catch (err) {
        console.error('[ACCOUNTING] Update status error:', err.message);
        return res.status(500).json({ success: false, message: err.message || 'Failed to update settlement status' });
    }
}

module.exports = {
    getSettlementDashboard,
    exportSettlementCSV,
    updateSettlementStatus
};

