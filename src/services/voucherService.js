const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

const resolveBrandInfo = (order) => {
    const title = (order.product_title || '').toLowerCase();
    const type = (order.product_type || '').toLowerCase();
    const seller = `${order.seller_company || ''} ${order.seller_name || ''}`.toLowerCase();
    const combined = `${title} ${seller}`;
    const logosDir = path.join(__dirname, '../../public/images/logos');

    if (combined.includes('meyer') || (type === 'car_rental' && !combined.includes('partner'))) {
        return {
            brandName: 'MEYER RENTAL',
            logoPath: path.join(logosDir, 'meyer-rental-logo-short.png')
        };
    }
    if (combined.includes('majestic') || type === 'ferry') {
        return {
            brandName: 'MAJESTIC FAST FERRY',
            logoPath: path.join(logosDir, 'mff-logo-blue.png')
        };
    }
    if (combined.includes('bicc') || combined.includes('country club') || combined.includes('golf')) {
        return {
            brandName: 'BATAM ISLAND COUNTRY CLUB',
            logoPath: path.join(logosDir, 'bicc-logo.png')
        };
    }
    if (combined.includes('ranoh')) {
        return {
            brandName: 'RANOH ISLAND',
            logoPath: path.join(logosDir, 'ranoh-island-logo.png')
        };
    }

    let serviceCategory = 'BOOKING SERVICE';
    if (type === 'car_rental') serviceCategory = 'CAR RENTAL';
    else if (type === 'ferry') serviceCategory = 'FERRY TRANSPORTATION';
    else if (type === 'activities' || type === 'tour') serviceCategory = 'TOURS & ACTIVITIES';

    return {
        brandName: serviceCategory,
        logoPath: path.join(logosDir, 'megaterra-logo.png'),
        isSquare: true
    };
};


const formatVoucherDate = (date) => {
    if (!date) return '—';
    const d = new Date(date);
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

const generateVoucherPDF = (order, res) => {
    const doc = new PDFDocument({
        size: 'A5',
        margin: 0
    });
    doc.pipe(res);

    const pageWidth = 419.53;
    const pageHeight = 595.28;
    const paddingX = 24;
    const contentWidth = pageWidth - (paddingX * 2);

    doc.rect(0, 0, pageWidth, pageHeight).fill('#F4F6F8');
    
     const headerHeight = 68;
    doc.rect(0, 0, pageWidth, headerHeight).fill('#006671');

    const brand = resolveBrandInfo(order);

    // Header Text
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#B2DFDB')
       .text(brand.brandName.toUpperCase(), paddingX, 18, { width: contentWidth });
    doc.font('Helvetica-Bold').fontSize(16).fillColor('#FFFFFF')
       .text('BOOKING VOUCHER', paddingX, 31, { width: contentWidth });

    let y = headerHeight + 14;

    const drawCard = (cardY, height) => {
        doc.roundedRect(paddingX, cardY, contentWidth, height, 10)
           .fillColor('#FFFFFF')
           .strokeColor('#E5E7EB')
           .lineWidth(1)
           .fillAndStroke();
    };

    const card1Height = 160;
    drawCard(y, card1Height);

    const logoMaxW = brand.isSquare ? 50 : 130;
    const logoMaxH = brand.isSquare ? 50 : 38;
    const logoX = paddingX + (contentWidth - logoMaxW) / 2;
    const logoY = y + 12;

    if (fs.existsSync(brand.logoPath)) {
        try {
            doc.image(brand.logoPath, logoX, logoY, { 
                fit: [logoMaxW, logoMaxH], 
                align: 'center', 
                valign: 'center' 
            });
        } catch (e) {
            console.error('[VOUCHER] Logo render error:', e.message);
        }
    }

    const textStartY = logoY + logoMaxH + 20;
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#6B7280')
       .text('YOUR REDEMPTION CODE', paddingX, textStartY, { align: 'center', width: contentWidth });

    const redemptionCode = order.secret_code || order.vendor_booking_code || `MT-${order.order_id}`;
    doc.font('Helvetica-Bold').fontSize(22).fillColor('#006671')
       .text(redemptionCode, paddingX, textStartY + 14, { align: 'center', width: contentWidth });

    doc.font('Helvetica').fontSize(8.5).fillColor('#4B5563')
       .text('Present this code to redeem your booking', paddingX, textStartY + 42, { align: 'center', width: contentWidth });

    const pillWidth = 170;
    const pillHeight = 20;
    const pillX = paddingX + (contentWidth - pillWidth) / 2;
    const pillY = textStartY + 60;

    doc.roundedRect(pillX, pillY, pillWidth, pillHeight, 10)
       .fillColor('#E6F7F8').fill();

    const lockW = 6.5;
    const lockGap = 5.5;
    const pillText = 'KEEP THIS CODE CONFIDENTIAL';
    doc.font('Helvetica-Bold').fontSize(7.5);
    const pillTextW = doc.widthOfString(pillText);
    const totalGroupW = lockW + lockGap + pillTextW;
    const groupStartX = pillX + (pillWidth - totalGroupW) / 2;
    
    const lockX = groupStartX;
    const lockY = pillY + 6.2;
    doc.roundedRect(lockX, lockY + 3, lockW, 4.5, 1).fillColor('#006671').fill();
    doc.roundedRect(lockX + 1, lockY, 4.5, 4, 1.5).strokeColor('#006671').lineWidth(1).stroke();

    doc.fillColor('#006671')
       .text(pillText, lockX + lockW + lockGap, pillY + 6.5, { lineBreak: false });

    y += card1Height + 10;

    const card2Height = 96;
    drawCard(y, card2Height);

    doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#111827')
       .text('BOOKING INFORMATION', paddingX + 16, y + 12);

    doc.moveTo(paddingX + 16, y + 26)
       .lineTo(paddingX + contentWidth - 16, y + 26)
       .strokeColor('#E5E7EB').lineWidth(0.8).stroke();

    const infoRows = [
        { label: 'Booked By', value: order.customer_name || 'Guest' },
        { label: 'Phone Number', value: order.customer_phone || '—' },
        { label: 'Booking Date', value: formatVoucherDate(order.booking_date || order.paid_at) }
    ];

    let rowY = y + 33;
    infoRows.forEach(row => {
        doc.font('Helvetica').fontSize(8.5).fillColor('#6B7280')
           .text(row.label, paddingX + 16, rowY);
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#111827')
           .text(row.value, paddingX + 16, rowY, { align: 'right', width: contentWidth - 32 });
        rowY += 18;
    });

    y += card2Height + 10;

    const card3Height = 146;
    drawCard(y, card3Height);

    doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#111827')
       .text('ESSENTIAL PASSENGER GUIDANCE', paddingX + 16, y + 12);

    const guidanceSteps = [
        {
            num: '01',
            title: 'Save your redemption code',
            desc: 'Keep this voucher accessible on your phone.'
        },
        {
            num: '02',
            title: 'Present the code',
            desc: 'Show your code to the assigned staff or driver.'
        },
        {
            num: '03',
            title: 'Verification and redemption',
            desc: 'Staff will verify the code before providing service.'
        }
    ];

    let stepY = y + 31;
    guidanceSteps.forEach(step => {
        const circleRadius = 9;
        const circleCenterX = paddingX + 26;
        const circleCenterY = stepY + 8;

        doc.circle(circleCenterX, circleCenterY, circleRadius).fillColor('#006671').fill();
        
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#FFFFFF')
           .text(step.num, circleCenterX - circleRadius, circleCenterY - 2.7, { width: circleRadius * 2, align: 'center' });
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#111827')
           .text(step.title, circleCenterX + 15, stepY);
        doc.font('Helvetica').fontSize(7.5).fillColor('#6B7280')
           .text(step.desc, circleCenterX + 15, stepY + 11);

        stepY += 34;
    });


    const footerY = pageHeight - 32;
    doc.rect(0, footerY, pageWidth, 32).fillColor('#F9FAFB').fill();
    doc.font('Helvetica').fontSize(7.5).fillColor('#9CA3AF')
       .text('This is a system-generated voucher. No signature is required', 0, footerY + 11, { align: 'center', width: pageWidth });


    doc.end();
};

module.exports = {
    generateVoucherPDF
};
