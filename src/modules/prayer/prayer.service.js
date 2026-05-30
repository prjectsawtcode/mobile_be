const axios = require('axios');
const { get, set } = require('../../config/cache');
const PrayerModel = require('./prayer.model');

const ALADHAN_API = 'https://api.aladhan.com/v1/timings';

async function fetchTimes(date, lat, lng, method) {
  const url = `${ALADHAN_API}/${date}?latitude=${lat}&longitude=${lng}&method=${method}`;
  const { data } = await axios.get(url);
  return data.data.timings;
}

exports.getTimes = async (userId, query) => {
  const date = query.date || new Date().toISOString().split('T')[0];

  let lat = query.lat;
  let lng = query.lng;
  let method = query.method || 1;

  if (!lat || !lng) {
    const prefs = await PrayerModel.getPreferences(userId);
    if (prefs) {
      lat = prefs.lat;
      lng = prefs.lng;
      method = prefs.calculation_method || method;
    } else {
      throw Object.assign(new Error('Location not set. Send lat/lng or set preferences.'), { status: 400 });
    }
  }

  const cacheKey = `prayer:${date}:${lat}:${lng}:${method}`;
  const cached = await get(cacheKey);
  if (cached) return cached;

  const cachedDb = await PrayerModel.getCachedTimes(date, lat, lng, method);
  if (cachedDb) {
    const timings = typeof cachedDb.data === 'string' ? JSON.parse(cachedDb.data) : cachedDb.data;
    await set(cacheKey, timings, 86400);
    return timings;
  }

  try {
    const timings = await fetchTimes(date, lat, lng, method);
    await PrayerModel.cacheTimes(date, lat, lng, method, timings);
    await set(cacheKey, timings, 86400);
    return timings;
  } catch {
    throw Object.assign(new Error('Failed to fetch prayer times'), { status: 502 });
  }
};

exports.getMonth = async (userId, query) => {
  const now = new Date();
  const month = query.month || now.getMonth() + 1;
  const year = query.year || now.getFullYear();

  let lat = query.lat;
  let lng = query.lng;
  let method = query.method || 1;

  if (!lat || !lng) {
    const prefs = await PrayerModel.getPreferences(userId);
    if (prefs) {
      lat = prefs.lat;
      lng = prefs.lng;
      method = prefs.calculation_method || method;
    } else {
      throw Object.assign(new Error('Location not set'), { status: 400 });
    }
  }

  const cacheKey = `prayer:month:${year}:${month}:${lat}:${lng}:${method}`;
  const cached = await get(cacheKey);
  if (cached) return cached;

  const days = [];
  const daysInMonth = new Date(year, month, 0).getDate();

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

    const cachedDb = await PrayerModel.getCachedTimes(dateStr, lat, lng, method);
    if (cachedDb) {
      const timings = typeof cachedDb.data === 'string' ? JSON.parse(cachedDb.data) : cachedDb.data;
      days.push({ date: dateStr, timings });
      continue;
    }

    try {
      const timings = await fetchTimes(dateStr, lat, lng, method);
      await PrayerModel.cacheTimes(dateStr, lat, lng, method, timings);
      days.push({ date: dateStr, timings });
    } catch {
      days.push({ date: dateStr, timings: null });
    }
  }

  await set(cacheKey, days, 86400);
  return days;
};

exports.getPreferences = async (userId) => {
  const prefs = await PrayerModel.getPreferences(userId);
  if (!prefs) throw Object.assign(new Error('Preferences not set'), { status: 404 });

  if (prefs.offsets && typeof prefs.offsets === 'string') {
    prefs.offsets = JSON.parse(prefs.offsets);
  }
  return prefs;
};

exports.savePreferences = async (userId, data) => {
  const payload = { ...data };
  if (payload.offsets) payload.offsets = JSON.stringify(payload.offsets);

  await PrayerModel.savePreferences(userId, payload);
  return this.getPreferences(userId);
};
