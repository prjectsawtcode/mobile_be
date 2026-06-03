const { pool } = require('../../config/db');

const createUsersTable = `
  CREATE TABLE IF NOT EXISTS users (
    id CHAR(36) PRIMARY KEY,
    phone VARCHAR(15) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    gender ENUM('male','female') NOT NULL,
    role ENUM('user','admin','scholar') DEFAULT 'user',
    password_hash VARCHAR(255) NOT NULL,
    phone_verified BOOLEAN DEFAULT FALSE,
    aadhar_verified BOOLEAN DEFAULT FALSE,
    fcm_token TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`;

const createRefreshTokensTable = `
  CREATE TABLE IF NOT EXISTS refresh_tokens (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`;

async function init() {
  await pool.query(createUsersTable);
  await pool.query(createRefreshTokensTable);
  try {
    await pool.query('ALTER TABLE users ADD COLUMN phone_verified BOOLEAN DEFAULT FALSE');
  } catch (_) {}
  await pool.query('UPDATE users SET phone_verified = TRUE WHERE phone_verified IS NULL');
}

async function findByPhone(phone) {
  const trimmed = String(phone).trim();
  const [rows] = await pool.query('SELECT * FROM users WHERE phone = ?', [trimmed]);
  return rows[0];
}

async function findById(id) {
  const [rows] = await pool.query(
    'SELECT id, phone, name, email, gender, role, aadhar_verified, created_at, updated_at FROM users WHERE id = ?',
    [id]
  );
  return rows[0];
}

async function create(user) {
  const [result] = await pool.query(
    'INSERT INTO users (id, phone, name, email, gender, password_hash) VALUES (?, ?, ?, ?, ?, ?)',
    [user.id, user.phone, user.name, user.email, user.gender, user.password_hash]
  );
  return result;
}

async function updatePassword(phone, hash) {
  await pool.query('UPDATE users SET password_hash = ? WHERE phone = ?', [hash, phone]);
}

async function updateFcmToken(userId, token) {
  await pool.query('UPDATE users SET fcm_token = ? WHERE id = ?', [token, userId]);
}

async function markPhoneVerified(phone) {
  await pool.query('UPDATE users SET phone_verified = TRUE WHERE phone = ?', [phone]);
}

async function saveRefreshToken(id, userId, token, expiresAt) {
  await pool.query(
    'INSERT INTO refresh_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)',
    [id, userId, token, expiresAt]
  );
}

async function findRefreshToken(token) {
  const [rows] = await pool.query('SELECT * FROM refresh_tokens WHERE token = ? AND expires_at > NOW()', [token]);
  return rows[0];
}

async function deleteRefreshToken(token) {
  await pool.query('DELETE FROM refresh_tokens WHERE token = ?', [token]);
}

async function deleteUserRefreshTokens(userId) {
  await pool.query('DELETE FROM refresh_tokens WHERE user_id = ?', [userId]);
}

// Auto-create tables on first load
init().catch((err) => console.error('Failed to init auth tables:', err.message));

module.exports = {
  init, findByPhone, findById, create, updatePassword, updateFcmToken, markPhoneVerified,
  saveRefreshToken, findRefreshToken, deleteRefreshToken, deleteUserRefreshTokens,
};
