const MFF_BASE_URL = process.env.MFF_BASE_URL;
const MFF_USERNAME = process.env.MFF_USERNAME;
const MFF_SECURITY_KEY = process.env.MFF_SECURITY_KEY;

const mffPost = async (endpoint, body = {}) => {
    const payload = {
        Username: MFF_USERNAME,
        SecurityKey: MFF_SECURITY_KEY,
        ...body
    };

    const res = await fetch(`${MFF_BASE_URL}/${endpoint}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!res.ok) {
        const errorBody = await res.text(); // ← read their error message
        console.error('[MFF] Error body:', errorBody);
        throw new Error(`MFF API Error: ${res.status}`);
    }

    return res.json();
}

const getSchedule = ({ departPort, arrivalPort, travelDate, totalPax = 1, journeyType = '1', isReturnOpenTicket = '0', returnDepartPort = '', returnArrivalPort = '', returnTravelDate = '' }) => {
    return mffPost('MFFSchedule', {
        TicketCategory: 'Normal',
        TotalPax: String(totalPax),
        JourneyType: String(journeyType),
        IsReturnOpenTicket: String(isReturnOpenTicket),
        DepartPort: departPort,
        ArrivalPort: arrivalPort,
        TravelDate: travelDate,
        ReturnDepartPort: returnDepartPort,
        ReturnArrivalPort: returnArrivalPort,
        ReturnTravelDate: returnTravelDate
    });
};

async function getPriceByTripCode(tripCode) {
    return mffPost('MFFPriceList', {
        JourneyType: '1',
        IsReturnOpenTicket: '0',
        CodeType: 'TripCode',
        DepartCode: tripCode,
        ReturnCode: ''
    });
}

const getPriceList = () => mffPost('MFFPriceList', {});

const getTripCapacity = (tripCode) => {
    return mffPost('MFFTripCapacity', {
        TripCode: tripCode
    });
}

const checkDeposit = () => {
    return mffPost('MFFCheckDeposit');
}

module.exports = {
    getSchedule, getPriceList, getTripCapacity, checkDeposit, getPriceByTripCode
};