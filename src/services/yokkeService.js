const crypto = require('crypto');
const axios = require('axios');

const BASE_URL = process.env.YOKKE_BASE_URL;
const CLIENT_ID = process.env.YOKKE_CLIENT_ID;
const CLIENT_SECRET = process.env.YOKKE_CLIENT_SECRET;
const API_KEY = process.env.YOKKE_API_KEY;
const APP_BASE_URL = process.env.APP_BASE_URL;

// Max 3 token requests/minute
let _cachedToken = null;
let _tokenExpiresAt = 0;

const getAccessToken = async () => {
    const now = Date.now();
    if (_cachedToken && now < _tokenExpiresAt - 60000) {
        return _cachedToken;
    }
    const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
    
    const res = await axios.post(
        `${BASE_URL}/gateway/IPGAPI/v1/token`,
        'grant_type=client_credentials',
        {
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        }
    );
    _cachedToken = res.data.access_token;
    _tokenExpiresAt = now + (res.data.expires_in * 1000)
    return _cachedToken;
}

const createInquiry = async ({ orderId, amount, itemName, quantity, customer }) => {
    const token = await getAccessToken();
    const res = await axios.post(
        `${BASE_URL}/gateway/IPGAPI/v1/inquiries`,
        {
            amount,
            currency: 'IDR',
            referenceUrl: `${APP_BASE_URL}/products/checkout/result?orderId=${orderId}`,
            order: {
                id: orderId,
                items: [{ name: itemName, quantity, amount }]
            },
            customer: {
                name: customer.name,
                email: customer.email || '',
                language: 'id'
            }
        },
        {
            headers: {
                'Authorization': `Bearer ${token}`,
                'X-Api-Key': API_KEY,
                'Content-Type': 'application/json'
            }
        }
    )
    return res.data;
}

const refundPayment = async ({ orderId, transactionId, partnerRefundNo, amount, reason }) => {
    const token = await getAccessToken();
    const signPath = '/v2.0/payment/refund';

    const formattedAmount = (typeof amount === 'number' ? amount : parseFloat(amount)).toFixed(2);

    const body = JSON.stringify({
        merchantId: process.env.YOKKE_MERCHANT_ID,
        originalPartnerReferenceNo: orderId,
        originalReferenceNo: transactionId,
        partnerRefundNo,
        refundAmount: { value: formattedAmount, currency: 'IDR' },
        reason,
        additionalInfo: { traceNo: String(Date.now()) }
    });
    const ts = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 19) + '+07:00';
    const bodyHash = crypto.createHash('sha256').update(body).digest('hex');
    const signature = crypto
        .createHmac('sha512', process.env.YOKKE_SECRET_KEY)
        .update(['POST', signPath, token, bodyHash, ts].join(':'))
        .digest('base64');

    const res = await axios.post(`${BASE_URL}/gateway/IPGAPI${signPath}`, body, {
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-TIMESTAMP': ts,
            'X-SIGNATURE': signature,
            'X-PARTNER-ID': API_KEY,
            'X-EXTERNAL-ID': String(Date.now()),
            'CHANNEL-ID': '00000'
        }
    });
    return res.data;
};


module.exports = {getAccessToken, createInquiry, refundPayment};