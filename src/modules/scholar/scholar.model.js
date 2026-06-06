const { pool } = require('../../config/db');

const createScholarsTable = `
  CREATE TABLE IF NOT EXISTS scholars (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    type ENUM('maleScholar','femaleScholar','shariyaTeacher') NOT NULL,
    title VARCHAR(100),
    specialization TEXT,
    rating DECIMAL(2,1) DEFAULT 0.0,
    answered_count INT DEFAULT 0,
    is_verified BOOLEAN DEFAULT FALSE,
    is_aadhar_verified BOOLEAN DEFAULT FALSE,
    avatar_url TEXT,
    status ENUM('available','busy','offline') DEFAULT 'offline',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`;

const createSchedulesTable = `
  CREATE TABLE IF NOT EXISTS scholar_schedules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    scholar_id CHAR(36) NOT NULL,
    day_of_week TINYINT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
    FOREIGN KEY (scholar_id) REFERENCES scholars(id) ON DELETE CASCADE
  )`;

async function init() {
  await pool.query(createScholarsTable);
  await pool.query(createSchedulesTable);
}

async function findAll({ type, page, limit }) {
  let where = '1=1';
  const params = [];
  if (type) { where += ' AND s.type = ?'; params.push(type); }
  const offset = (page - 1) * limit;

  const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM scholars s WHERE ${where}`, params);
  const [rows] = await pool.query(
    `SELECT s.*, u.email, u.gender FROM scholars s JOIN users u ON s.user_id = u.id WHERE ${where} ORDER BY s.rating DESC LIMIT ? OFFSET ?`,
    [...params, Number(limit), Number(offset)]
  );
  return { rows, total, page, limit };
}

async function findById(id) {
  const [rows] = await pool.query(
    `SELECT s.*, u.email, u.gender FROM scholars s JOIN users u ON s.user_id = u.id WHERE s.id = ?`, [id]
  );
  return rows[0];
}

async function findByUserId(userId) {
  const [rows] = await pool.query('SELECT * FROM scholars WHERE user_id = ?', [userId]);
  return rows[0];
}

async function getSchedule(scholarId) {
  const [rows] = await pool.query('SELECT * FROM scholar_schedules WHERE scholar_id = ? ORDER BY day_of_week, start_time', [scholarId]);
  return rows;
}

async function replaceSchedule(scholarId, schedules) {
  await pool.query('DELETE FROM scholar_schedules WHERE scholar_id = ?', [scholarId]);
  for (const s of schedules) {
    await pool.query(
      'INSERT INTO scholar_schedules (scholar_id, day_of_week, start_time, end_time, timezone) VALUES (?, ?, ?, ?, ?)',
      [scholarId, s.day_of_week, s.start_time, s.end_time, s.timezone || 'Asia/Kolkata']
    );
  }
}

async function updateStatus(id, status) {
  await pool.query('UPDATE scholars SET status = ? WHERE id = ?', [status, id]);
}

async function updateAadharVerification(id) {
  await pool.query('UPDATE scholars SET is_aadhar_verified = TRUE WHERE id = ?', [id]);
}

module.exports = { init, findAll, findById, findByUserId, getSchedule, replaceSchedule, updateStatus, updateAadharVerification };
