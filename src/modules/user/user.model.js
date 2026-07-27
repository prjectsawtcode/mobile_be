const { pool } = require('../../config/db');

const createTable = `
  CREATE TABLE IF NOT EXISTS user_profiles (
    user_id CHAR(36) PRIMARY KEY,
    avatar_url TEXT,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    date_of_birth DATE,
    bio TEXT,
    mosque_affiliation VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`;

async function init() {
  await pool.query(createTable);
}

async function findById(userId) {
  const [rows] = await pool.query('SELECT * FROM user_profiles WHERE user_id = ?', [userId]);
  return rows[0];
}

async function upsert(userId, data) {
  const existing = await findById(userId);
  if (existing) {
    const keys = Object.keys(data);
    const sets = keys.map(k => `${k} = ?`).join(', ');
    const vals = keys.map(k => data[k]);
    await pool.query(`UPDATE user_profiles SET ${sets} WHERE user_id = ?`, [...vals, userId]);
  } else {
    const keys = ['user_id', ...Object.keys(data)];
    const placeholders = keys.map(() => '?').join(', ');
    const vals = [userId, ...Object.keys(data).map(k => data[k])];
    await pool.query(`INSERT INTO user_profiles (${keys.join(',')}) VALUES (${placeholders})`, vals);
  }
}

async function updateAvatar(userId, url) {
  await upsert(userId, { avatar_url: url });
}

async function findAll({ page, limit, search }) {
  let query = 'SELECT id, phone, name, email, gender, role, aadhar_verified, created_at FROM users';
  let countQuery = 'SELECT COUNT(*) as total FROM users';
  const params = [];

  if (search) {
    query += ' WHERE name LIKE ? OR phone LIKE ?';
    countQuery += ' WHERE name LIKE ? OR phone LIKE ?';
    params.push(`%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  const offset = (page - 1) * limit;
  const [[{ total }]] = await pool.query(countQuery, params);
  const [rows] = await pool.query(query, [...params, Number(limit), Number(offset)]);

  return { rows, total, page, limit };
}

async function updateRole(userId, role) {
  await pool.query('UPDATE users SET role = ? WHERE id = ?', [role, userId]);
}

async function deleteUser(userId) {
  await pool.query('DELETE FROM users WHERE id = ?', [userId]);
}

module.exports = { init, findById, upsert, updateAvatar, findAll, updateRole, deleteUser };

