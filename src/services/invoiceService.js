const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');


// Format Date to "DD MMM YYYY HH:mm (DayName)"
const formatInvoiceDate = (date) => {
    const d = new Date(date || Date.now());
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const dayName = days[d.getDay()];
    const day = String(d.getDate()).padStart(2, '0');
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    
    return `${day} ${month} ${year} ${hours}:${minutes} (${dayName})`;
};

const formatShortDate = (date) => {
    if (!date) return '—';
    const d = new Date(date);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

const formatCurrency = (amount) => {
    return Number(amount || 0).toLocaleString('id-ID');
};


const generateInvoicePDF = (order, res) => {
    const doc = new PDFDocument({
        size: 'A4',
        margin: 45
    });
    doc.pipe(res);

    const leftCol = 45;
    const rightMargin = 550;
    const pageWidth = 505;
    let y = 45;

    // Header
    doc.fontSize(24).font('Helvetica-Bold').fillColor('#000000').text('INVOICE', leftCol, y);
    y += 32;

    // Header Left
    const invoiceNumber = `#INV-${(order.product_type || 'MT').toUpperCase()}-${order.order_id}`;
    doc.fontSize(10).font('Helvetica').fillColor('#000000');
    doc.text(`Number: ${invoiceNumber}`, leftCol, y);
    y += 15;
    doc.text(`Date: ${formatInvoiceDate(order.paid_at || order.booking_date)}`, leftCol, y);

    // Header Right
    const logoPath = path.join(__dirname, '../../public/images/logos/megaterra-logo-tagline.png');
    const logoWidth = 305;
    const logoX = 305;

    if (fs.existsSync(logoPath)) {
        doc.image(logoPath, logoX, 32, { width: logoWidth });
    }
    

    const addressY = 92;
    const rightX = 300;
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#000000').text('PT. MEGAH NEX TECHNOLOGY', rightX, addressY, { align: 'right', width: 250 });
    doc.fontSize(8.5).font('Helvetica').fillColor('#374151');
    doc.text('Komplek Pertokoan Coastarina Blok A No.1', rightX, addressY + 13, { align: 'right', width: 250 });
    doc.text('Kota Batam, Kepulauan Riau, Indonesia 29432', rightX, addressY + 25, { align: 'right', width: 250 });

    y = 135;


    const printField = (label, value, curY) => {
        doc.font('Helvetica').fontSize(10).fillColor('#000000').text(label, leftCol, curY, { width: 110 });
        doc.text(`: ${value || '—'}`, leftCol + 110, curY);
    };

    // Payment Detail
    doc.fontSize(10.5).font('Helvetica-Bold').fillColor('#000000').text('PAYMENT DETAIL', leftCol, y);
    y += 16;

    let poNumber = `00${order.order_id}`;
    if (order.transaction_id && !order.transaction_id.includes('-')) {
        poNumber = order.transaction_id;
    }
    printField('P.O Number', poNumber, y);
    y += 15;

    let paymentMethod = 'Credit Card';
    if (order.payment_method && !order.payment_method.includes('credit')) {
        paymentMethod = order.payment_method;
    }
    printField('Payment Method', paymentMethod, y);
    y += 15;


    const isPaid = order.payment_status === 'SUCCESS' || order.payment_status === 'SETTLED' || order.order_status === 'paid';
    doc.font('Helvetica').fontSize(10).fillColor('#000000').text('Status', leftCol, y, { width: 110 });
    doc.font('Helvetica-Bold').fillColor(isPaid ? '#000000' : '#DC2626').text(`: ${isPaid ? 'PAID' : 'UNPAID'}`, leftCol + 110, y);
    y += 24;

    // Customer Detail
    doc.fontSize(10.5).font('Helvetica-Bold').fillColor('#000000').text('CUSTOMER DETAIL', leftCol, y);
    y += 16;
    printField('Name', order.customer_name, y);
    y += 15;
    printField('Email', order.customer_email, y);
    y += 15;
    printField('Contact Number', order.customer_phone, y);
    y += 24;

    // Guest / Passengers
    doc.fontSize(10.5).font('Helvetica-Bold').fillColor('#000000').text('GUEST', leftCol, y);
    y += 16;

    let guests = [];
    if (order.passengers) {
        try {
            const parsed = typeof order.passengers === 'string' ? JSON.parse(order.passengers) : order.passengers;
            const list = Array.isArray(parsed) ? parsed : (parsed.passengers || []);
            guests = list.map(p => p.name || p.passportName || `${p.given_name || ''} ${p.family_name || ''}`.trim()).filter(Boolean);
        } catch (e) {}
    }
    if (guests.length === 0 && order.customer_name) {
        guests.push(order.customer_name);
    }


    doc.font('Helvetica-Bold').fontSize(10).fillColor('#000000');
    guests.forEach(guest => {
        doc.text(guest, leftCol, y);
        y += 15;
    });
    y += 10;

    // Product Detail
    let detailSectionTitle = 'HOTEL DETAIL';
    let dateLabel = 'Check-in';

    if (order.product_type === 'car_rental') {
        detailSectionTitle = 'CAR RENTAL DETAIL';
        dateLabel = 'Rental Date';
    } else if (order.product_type === 'ferry') {
        detailSectionTitle = 'FERRY DETAIL';
        dateLabel = 'Departure Date';
    } else {
        detailSectionTitle = 'TOUR & ACTIVITY DETAIL';
        dateLabel = 'Activity Date';
    }

    doc.fontSize(10.5).font('Helvetica-Bold').fillColor('#000000').text(detailSectionTitle, leftCol, y);
    y += 16;

    doc.font('Helvetica-Bold').fontSize(10).fillColor('#000000').text(order.product_title, leftCol, y);
    y += 16;

    printField('Address', order.product_location || 'Batam, Kepulauan Riau, Indonesia', y);
    y += 15;
    printField(dateLabel, formatShortDate(order.start_date), y);
    y += 15;

    let durationText = '1 Day';
    if (order.duration_hours) {
        const hours = parseFloat(order.duration_hours);
        durationText = hours >= 24 
            ? `${Math.round(hours / 24)} Day`
            : `${hours} Hours`;
    }
    printField('Duration', durationText, y);
    y += 26;

    // Purchase Record Table
    doc.fontSize(10.5).font('Helvetica-Bold').fillColor('#000000').text('PURCHASE RECORD', leftCol, y);
    y += 16;

    const cols = [
        { title: 'No.', x: 45, width: 32, align: 'center' },
        { title: 'Item Name', x: 77, width: 128, align: 'left' },
        { title: 'Description', x: 205, width: 150, align: 'left' },
        { title: 'Qty', x: 355, width: 35, align: 'center' },
        { title: 'Price (IDR)', x: 390, width: 80, align: 'right' },
        { title: 'Amount (IDR)', x: 470, width: 80, align: 'right' }
    ];

    const rowHeight = 24;

    // Table Header
    doc.rect(leftCol, y, pageWidth, rowHeight).strokeColor('#000000').lineWidth(1).stroke();
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#000000');
    cols.forEach(c => {
        doc.text(c.title, c.x + 3, y + 7, { width: c.width - 6, align: c.align });
    });
    
    let currentX = leftCol;
    cols.slice(0, -1).forEach(c => {
        currentX += c.width;
        doc.moveTo(currentX, y).lineTo(currentX, y + rowHeight).stroke();
    });

    y += rowHeight;

    // Table Row Item
    const rows = [
        {
            name: order.product_title,
            desc: order.package_name || (order.product_type === 'car_rental' ? 'Car Rental' : 'Tour Package'),
            qty: order.quantity || 1,
            price: order.unit_price || order.base_price,
            amount: (order.quantity || 1) * (order.unit_price || order.base_price)
        }
    ];

    if (order.addons && order.addons.length > 0) {
        order.addons.forEach(ad => {
            rows.push({
                name: ad.addon_name,
                desc: 'Addon Service',
                qty: ad.quantity,
                price: ad.unit_price,
                amount: ad.quantity * ad.unit_price
            });
        });
    }

    // Draw Data Rows
    doc.font('Helvetica').fontSize(8.5).fillColor('#000000');
    rows.forEach((row, idx) => {
        doc.rect(leftCol, y, pageWidth, rowHeight).strokeColor('#000000').lineWidth(1).stroke();
        doc.text(String(idx + 1), cols[0].x + 3, y + 7, { width: cols[0].width - 6, align: 'center' });
        doc.text(row.name, cols[1].x + 3, y + 7, { width: cols[1].width - 6, align: 'left' });
        doc.text(row.desc, cols[2].x + 3, y + 7, { width: cols[2].width - 6, align: 'left' });
        doc.text(String(row.qty), cols[3].x + 3, y + 7, { width: cols[3].width - 6, align: 'center' });
        doc.text(formatCurrency(row.price), cols[4].x + 3, y + 7, { width: cols[4].width - 6, align: 'right' });
        doc.font('Helvetica-Bold').text(formatCurrency(row.amount), cols[5].x + 3, y + 7, { width: cols[5].width - 6, align: 'right' }).font('Helvetica');

        let rX = leftCol;
        cols.slice(0, -1).forEach(c => {
            rX += c.width;
            doc.moveTo(rX, y).lineTo(rX, y + rowHeight).stroke();
        });
        y += rowHeight;
    });

    // Subtotal Row
    const totalsLeft = cols[4].x;
    const totalsWidth = cols[4].width + cols[5].width;

    doc.rect(totalsLeft, y, totalsWidth, rowHeight).strokeColor('#000000').lineWidth(1).stroke();
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#000000');
    doc.text('Sub Total', cols[4].x + 3, y + 7, { width: cols[4].width - 6, align: 'left' });
    doc.text(formatCurrency(order.base_price || order.total_amount), cols[5].x + 3, y + 7, { width: cols[5].width - 6, align: 'right' });
    doc.moveTo(cols[5].x, y).lineTo(cols[5].x, y + rowHeight).stroke();

    y += rowHeight;

    // Grand Total Row
    doc.rect(totalsLeft, y, totalsWidth, rowHeight).strokeColor('#000000').lineWidth(1).stroke();
    doc.text('Grand Total', cols[4].x + 3, y + 7, { width: cols[4].width - 6, align: 'left' });
    doc.text(formatCurrency(order.total_amount), cols[5].x + 3, y + 7, { width: cols[5].width - 6, align: 'right' });
    doc.moveTo(cols[5].x, y).lineTo(cols[5].x, y + rowHeight).stroke();

    // End Document
    doc.end();
}


module.exports = {
    generateInvoicePDF
};
