const axios = require('axios');
const model = require('./prayer.model');

// ─── Public (no-auth) prayer times ────────────────────────────────────────────

/**
 * Convert a 24-hour time string "HH:MM" to 12-hour "hh:mm AM/PM"
 * AlAdhan may return "HH:MM (EET)" style — we strip the suffix first.
 */
function to12h(raw) {
  if (!raw || typeof raw !== 'string') return '--:--';
  const clean = raw.split(' ')[0]; // strip timezone suffix if any
  const [hStr, mStr] = clean.split(':');
  if (!hStr || !mStr) return '--:--';
  let h = parseInt(hStr, 10);
  const m = mStr.padStart(2, '0');
  const period = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${String(h).padStart(2, '0')}:${m} ${period}`;
}

/**
 * Reverse-geocode lat/lng → city name via Nominatim (free, no key required).
 * Falls back to "Unknown Location" on error.
 */
async function reverseGeocode(lat, lng) {
  try {
    const { data } = await axios.get('https://nominatim.openstreetmap.org/reverse', {
      params: { lat, lon: lng, format: 'json' },
      headers: { 'User-Agent': 'SawtDeenApp/1.0' },
      timeout: 5000,
    });
    return (
      data?.address?.city ||
      data?.address?.town ||
      data?.address?.village ||
      data?.address?.county ||
      data?.address?.state ||
      'Unknown Location'
    );
  } catch {
    return 'Unknown Location';
  }
}

async function getPublicTimes(lat, lng, method = 1) {
  const numLat = Number(lat);
  const numLng = Number(lng);
  if (isNaN(numLat) || isNaN(numLng)) {
    const err = new Error('valid lat and lng query parameters are required');
    err.status = 400;
    throw err;
  }

  const today = new Date().toISOString().split('T')[0];

  let cached = null;
  try {
    cached = await model.getCachedPrayerTimes(today, lat, lng, method);
  } catch (e) {
    // DB cache read warning fallback
    console.warn('Prayer DB cache read warning:', e.message);
  }

  let timings;
  let timezone = 'UTC';

  if (cached) {
    timings = typeof cached === 'string' ? JSON.parse(cached) : cached;
  } else {
    const { data } = await axios.get(
      `https://api.aladhan.com/v1/timings/${today}`,
      { params: { latitude: lat, longitude: lng, method }, timeout: 8000 }
    );
    timings = data.data.timings;
    timezone = data.data.meta?.timezone || 'UTC';

    // Persist to cache safely
    try {
      await model.cachePrayerTimes(today, lat, lng, method, { ...timings, _timezone: timezone });
    } catch (e) {
      console.warn('Prayer DB cache write warning:', e.message);
    }
  }

  if (timings && timings._timezone) {
    timezone = timings._timezone;
  }

  const location = await reverseGeocode(lat, lng);

  return {
    date: today,
    location,
    timezone,
    prayers: {
      fajr:    to12h(timings?.Fajr    || timings?.fajr),
      sunrise: to12h(timings?.Sunrise || timings?.sunrise),
      dhuhr:   to12h(timings?.Dhuhr   || timings?.dhuhr),
      asr:     to12h(timings?.Asr     || timings?.asr),
      maghrib: to12h(timings?.Maghrib || timings?.maghrib),
      isha:    to12h(timings?.Isha    || timings?.isha),
    },
  };
}

// ─── Authenticated prayer times ───────────────────────────────────────────────

async function getTimes(userId, { lat, lng, method }) {
  const prefs = await model.getPreferences(userId);
  const finalLat = lat || prefs?.lat;
  const finalLng = lng || prefs?.lng;
  const finalMethod = method || prefs?.calculation_method || 1;

  if (!finalLat || !finalLng) throw Object.assign(new Error('Location not set. Provide lat/lng or save preferences.'), { status: 400 });

  const today = new Date().toISOString().split('T')[0];
  const cached = await model.getCachedPrayerTimes(today, finalLat, finalLng, finalMethod);
  if (cached) return cached;

  const { data } = await axios.get(`https://api.aladhan.com/v1/timings/${today}`, {
    params: { latitude: finalLat, longitude: finalLng, method: finalMethod },
  });

  const timings = data.data.timings;
  await model.cachePrayerTimes(today, finalLat, finalLng, finalMethod, timings);
  return timings;
}

async function getMonth(userId, { lat, lng, method, month, year }) {
  const prefs = await model.getPreferences(userId);
  const finalLat = lat || prefs?.lat;
  const finalLng = lng || prefs?.lng;
  const finalMethod = method || prefs?.calculation_method || 1;
  if (!finalLat || !finalLng) throw Object.assign(new Error('Location not set'), { status: 400 });

  const m = month || new Date().getMonth() + 1;
  const y = year || new Date().getFullYear();

  const { data } = await axios.get(`https://api.aladhan.com/v1/calendar/${y}/${m}`, {
    params: { latitude: finalLat, longitude: finalLng, method: finalMethod },
  });

  return data.data.map(d => ({ date: d.date.gregorian.date, timings: d.timings }));
}

async function getPreferences(userId) {
  const prefs = await model.getPreferences(userId);
  return prefs || { user_id: userId, lat: null, lng: null, calculation_method: 1, timezone: 'Asia/Kolkata', offsets: {} };
}

async function updatePreferences(userId, data) {
  const prefs = await model.upsertPreferences(userId, data);
  return prefs;
}

module.exports = { getPublicTimes, getTimes, getMonth, getPreferences, updatePreferences };
