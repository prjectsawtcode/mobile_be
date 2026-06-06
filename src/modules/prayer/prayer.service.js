const axios = require('axios');
const model = require('./prayer.model');

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

module.exports = { getTimes, getMonth, getPreferences, updatePreferences };
