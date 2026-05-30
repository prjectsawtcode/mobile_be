const db = require('../../config/db');

const AuthModel = {
  async findByPhone(phone) {
    const [rows] = await db.query('SELECT * FROM users WHERE phone = ?', [phone]);
    return rows[0];
  },

  async findById(id) {
    const [rows] = await db.query(
      'SELECT id, phone, name, email, gender, role, aadhar_verified, fcm_token, created_at, updated_at FROM users WHERE id = ?',
      [id]
    );
    return rows[0];
  },

  async create({ id, phone, name, email, gender, password_hash }) {
    await db.query(
      'INSERT INTO users (id, phone, name, email, gender, password_hash) VALUES (?, ?, ?, ?, ?, ?)',
      [id, phone, name, email, gender, password_hash]
    );
  },

  async updatePassword(phone, password_hash) {
    await db.query('UPDATE users SET password_hash = ? WHERE phone = ?', [password_hash, phone]);
  },

  async updateFcmToken(userId, fcm_token) {
    await db.query('UPDATE users SET fcm_token = ? WHERE id = ?', [fcm_token, userId]);
  },

  async saveRefreshToken({ id, user_id, token, expires_at }) {
    await db.query(
      'INSERT INTO refresh_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)',
      [id, user_id, token, expires_at]
    );
  },

  async findRefreshToken(token) {
    const [rows] = await db.query(
      'SELECT * FROM refresh_tokens WHERE token = ? AND expires_at > NOW()',
      [token]
    );
    return rows[0];
  },

  async deleteRefreshToken(token) {
    await db.query('DELETE FROM refresh_tokens WHERE token = ?', [token]);
  },

  async deleteUserRefreshTokens(userId) {
    await db.query('DELETE FROM refresh_tokens WHERE user_id = ?', [userId]);
  },
};

module.exports = AuthModel;
