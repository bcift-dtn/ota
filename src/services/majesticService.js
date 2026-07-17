const MFF_BASE_URL = process.env.MFF_BASE_URL;
const MFF_USERNAME = process.env.MFF_USERNAME;
const MFF_SECURITY_KEY = process.env.MFF_SECURITY_KEY;

const mffPost = async (endpoint, body = {}) => {
    const payload = {
        Username: MFF_USERNAME,
        SecurityKey: MFF_SECURITY_KEY,
        ...body
    };

    console.log('[MFF] Calling:', endpoint, JSON.stringify(payload));

    const res = await fetch(`${MFF_BASE_URL}/${endpoint}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error(`MFF API Error: ${res.status}`);

    return res.json();
}

const getSchedule = (journeyCode, date) => {
    return mffPost('MFFSchedule', {
        JourneyCode: journeyCode,
        DepartDate: date
    });
}

const getPriceList = (journeyCode) => {
    return mffPost('MFFPriceList', { 
        JourneyCode: journeyCode
    });
}

const getTripCapacity = (tripCode) => {
    return mffPost('MFFTripCapacity', {
        TripCode: tripCode
    });
}

const checkDeposit = () => {
    return mffPost('MFFCheckDeposit');
}

module.exports = {
    getSchedule, getPriceList, getTripCapacity, checkDeposit
};