let _cache = { value: null, fetchedAt: 0 };
let _inflight = null;

const ONE_HOUR = 60 * 60 * 1000;

const CACHE_TTL = ONE_HOUR;

async function getSGDtoIDR() {
    // check is it newest conversion or not
    if (_cache.value && Date.now() - _cache.fetchedAt < CACHE_TTL) {
        return _cache.value;
    }

    // check if it alr been fetched by someone
    if (_inflight) return _inflight;

    _inflight = fetch('https://open.er-api.com/v6/latest/SGD')
        .then(res => {
            if (!res.ok) throw new Error(`Exchange API returned ${res.status}`);
            return res.json();
        })
        .then(data => {
            _cache = { value: data.rates.IDR, fetchedAt: Date.now() };
            console.log(`[RATE] SGD/IDR updated: ${_cache.value}`);
            return _cache.value;
        })
        .catch(err => {
            console.error(`[RATE] Fetch failed:`, err.message);
            if (_cache.value) {
                console.warn(`[RATE] Serving stale rate: ${_cache.value} (age: ${Math.round((Date.now() - _cache.fetchedAt) / 60000)}min)`);
                return _cache.value;
            }

            const fallback = parseFloat(process.env.SGD_IDR_RATE) || 13893;
            console.warn(`[RATE] Using env fallback: ${fallback}`);
            return fallback;
        }).finally(() => {
            _inflight = null;
        });

    return _inflight;
} 

module.exports = { getSGDtoIDR };