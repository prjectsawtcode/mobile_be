const { pool } = require('../../config/db');
const { get, set } = require('../../config/cache');

const createPreferencesTable = `
  CREATE TABLE IF NOT EXISTS prayer_preferences (
    user_id CHAR(36) PRIMARY KEY,
    lat DECIMAL(10,7),
    lng DECIMAL(10,7),
    calculation_method INT DEFAULT 1,
    timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
    offsets JSON DEFAULT ('{}'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`;

const createCacheTable = `
  CREATE TABLE IF NOT EXISTS prayer_cache (
    id INT AUTO_INCREMENT PRIMARY KEY,
    prayer_date DATE NOT NULL,
    lat DECIMAL(10,7) NOT NULL,
    lng DECIMAL(10,7) NOT NULL,
    method INT NOT NULL,
    data JSON NOT NULL,
    cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY (prayer_date, lat, lng, method)
  )`;

async function init() {
  await pool.query(createPreferencesTable);
  await pool.query(createCacheTable);
}

async function getPreferences(userId) {
  const [rows] = await pool.query('SELECT * FROM prayer_preferences WHERE user_id = ?', [userId]);
  return rows[0] || null;
}

async function upsertPreferences(userId, data) {
  await pool.query(
    `INSERT INTO prayer_preferences (user_id, lat, lng, calculation_method, timezone, offsets)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE lat=VALUES(lat), lng=VALUES(lng), calculation_method=VALUES(calculation_method),
     timezone=VALUES(timezone), offsets=VALUES(offsets)`,
    [userId, data.lat, data.lng, data.calculation_method, data.timezone, JSON.stringify(data.offsets || {})]
  );
  return getPreferences(userId);
}

async function getCachedPrayerTimes(date, lat, lng, method) {
  const [rows] = await pool.query(
    'SELECT data FROM prayer_cache WHERE prayer_date = ? AND lat = ? AND lng = ? AND method = ?',
    [date, lat, lng, method]
  );
  return rows[0] ? rows[0].data : null;
}

async function cachePrayerTimes(date, lat, lng, method, data) {
  await pool.query(
    'INSERT INTO prayer_cache (prayer_date, lat, lng, method, data) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE data = VALUES(data), cached_at = NOW()',
    [date, lat, lng, method, JSON.stringify(data)]
  );
}

module.exports = { init, getPreferences, upsertPreferences, getCachedPrayerTimes, cachePrayerTimes };
