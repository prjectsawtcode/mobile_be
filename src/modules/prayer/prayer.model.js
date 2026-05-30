const db = require('../../config/db');

const PrayerModel = {
  async getPreferences(userId) {
    const [rows] = await db.query('SELECT * FROM prayer_preferences WHERE user_id = ?', [userId]);
    return rows[0];
  },

  async savePreferences(userId, data) {
    const existing = await this.getPreferences(userId);
    if (existing) {
      await db.query('UPDATE prayer_preferences SET ? WHERE user_id = ?', [data, userId]);
    } else {
      await db.query('INSERT INTO prayer_preferences SET ?', { user_id: userId, ...data });
    }
  },

  async getCachedTimes(date, lat, lng, method) {
    const [rows] = await db.query(
      'SELECT * FROM prayer_cache WHERE date = ? AND lat = ? AND lng = ? AND method = ?',
      [date, lat, lng, method]
    );
    return rows[0];
  },

  async cacheTimes(date, lat, lng, method, data) {
    await db.query(
      'REPLACE INTO prayer_cache (date, lat, lng, method, data, cached_at) VALUES (?, ?, ?, ?, ?, NOW())',
      [date, lat, lng, method, JSON.stringify(data)]
    );
  },
};

module.exports = PrayerModel;
