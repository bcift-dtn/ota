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
        const errorBody = await res.text();
        console.error('[MFF] Error body:', errorBody);
        throw new Error(`MFF API Error: ${res.status}`);
    }

    return res.json();
}

const getSchedule = ({ 
    departPort, arrivalPort, travelDate, totalPax = 1, journeyType = '1', 
    isReturnOpenTicket = '0', returnDepartPort = '', returnArrivalPort = '', 
    returnTravelDate = '' }) => {
        const isReturn = journeyType === '2';
    return mffPost('MFFSchedule', {
        TicketCategory: 'Normal',
        TotalPax: String(totalPax),
        JourneyType: String(journeyType),
        IsReturnOpenTicket: String(isReturnOpenTicket),
        DepartPort: departPort,
        ArrivalPort: arrivalPort,
        TravelDate: travelDate,
        ...(isReturn && {
            ReturnDepartPort: returnDepartPort,
            ReturnArrivalPort: returnArrivalPort,
            ReturnTravelDate: returnTravelDate,
        })
    });
};

async function getPriceByTripCode(tripCode, returnCode = '', journeyType = '1') {
    return mffPost('MFFPriceListByTripCode', {
        TicketCategory: 'Normal',
        JourneyType: journeyType,
        IsReturnOpenTicket: '0',
        CodeType: 'TripCode',
        DepartCode: tripCode,
        ReturnCode: returnCode,
    });
}

const getPriceList = () => mffPost('MFFPriceList', {});

const getTripCapacity = (tripCode, travelDate, totalPax) => {
    return mffPost('MFFTripCapacity', {
        TripCode: tripCode,
        TravelDate: travelDate,
        TotalPax: String(totalPax)
    });
}

let _countryCache = { value: null, fetchedAt: 0};
let _countryInFlight = null;
const ONE_DAY = 24 * 60 * 60 * 1000;

async function getCountryList() {
    if (_countryCache.value && Date.now() - _countryCache.fetchedAt < ONE_DAY) {
        return _countryCache.value;
    }

    if (_countryInFlight) return _countryInFlight;

    _countryInFlight = mffPost('MFFCountryList')
        .then(data => {
            _countryCache = { value: data, fetchedAt: Date.now() };

            console.log(`[MFF] CountryList cached: ${data.length} countries`);
            return data;
        })
        .catch(err => {
            console.error(`[MFF] CountryList fetch failed:`, err.message);
            return _countryCache.value || [];
        })
        .finally(() => {
            _countryInFlight = null;
        });

    return _countryInFlight;
}

const checkDeposit = () => {
    return mffPost('MFFCheckDeposit');
}

const bookFerry = ({ orderId, journeyType, isReturnOpenTicket, departTripCode, 
    departSeatCategory, travelDate, returnTripCode, returnSeatCategory, returnTravelDate, passengers }) => {
    const passengerPayload = passengers.map(p => ({
        PassportNo:             p.passportNo,
        PassportName:           p.passportName,
        BirthDate:              p.birthDate,
        BirthPlace:             p.birthPlace,
        Gender:                 p.gender,
        Nationality:            p.nationality,
        PassportExpiredDate:    p.passportExpiredDate,
        PassportIssueDate:      p.passportIssueDate,
        PriceCode:              p.priceCode || '',
    }));

    return mffPost('MFFPassengerBooking', {
        BookingName:                `MT-FERRY-${orderId}`,
        TicketCategory:             `Normal`,
        JourneyType:                String(journeyType),
        IsReturnOpenTicket:         String(isReturnOpenTicket),
        DepartTripCode:             departTripCode,
        DepartSeatCategory:         departSeatCategory,
        TravelDate:                 travelDate,
        ReturnTripCode:             returnTripCode || '',
        ReturnSeatCategory:         returnSeatCategory || '',
        ReturnTravelDate:           returnTravelDate || '',
        IncludeDepartTerminalFee:   '1',
        IncludeReturnTerminalFee:   journeyType === '2' ? '1' : '0',
        Passenger:                  JSON.stringify(passengerPayload),
    })
}

module.exports = {
    getSchedule, getPriceList, getTripCapacity, checkDeposit, getPriceByTripCode, getCountryList, bookFerry
};