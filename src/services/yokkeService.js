const axios = require('axios');
const BASE_URL = process.env.YOKKE_BASE_URL;
const CLIENT_ID = process.env.YOKKE_CLIENT_ID;
const CLIENT_SECRET = process.env.YOKKE_CLIENT_SECRET;
const API_KEY = process.env.YOKKE_API_KEY;
// === TOKEN CACHE ===
// Max 3 token requests/minute — NEVER fetch a new token per request
let _cachedToken = null;
let _tokenExpiresAt = 0;
const getAccessToken = async () => {
    const now = Date.now();
    // Refresh 60 seconds before expiry
    if (_cachedToken && now < _tokenExpiresAt - 60000) {
        return _cachedToken;
    }
    const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
    const res = await axios.post(
        `${BASE_URL}/api/v1/oauth/token`,
        'grant_type=client_credentials',
        {
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        }
    );
    _cachedToken = res.data.access_token;
    _tokenExpiresAt = now + (res.data.expires_in * 1000);
    return _cachedToken;
};
const createInquiry = async ({ orderId, amount, description, referenceUrl }) => {
    const token = await getAccessToken();
    const res = await axios.post(
        `${BASE_URL}/api/v1/inquiries`,
        {
            order: {
                id: orderId,
                amount,
                description,
                referenceUrl
            }
        },
        {
            headers: {
                'Authorization': `Bearer ${token}`,
                'X-Api-Key': API_KEY,
                'Content-Type': 'application/json'
            }
        }
    );
    return res.data;
};
module.exports = { getAccessToken, createInquiry };