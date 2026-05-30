const db = require('../../config/db');

const UserModel = {
  async findById(id) {
    const [rows] = await db.query(
      'SELECT id, phone, name, email, gender, role, aadhar_verified, created_at, updated_at FROM users WHERE id = ?',
      [id]
    );
    return rows[0];
  },

  async getProfile(userId) {
    const [rows] = await db.query(
      'SELECT * FROM user_profiles WHERE user_id = ?',
      [userId]
    );
    return rows[0];
  },

  async upsertProfile(userId, data) {
    const existing = await this.getProfile(userId);
    if (existing) {
      await db.query('UPDATE user_profiles SET ? WHERE user_id = ?', [data, userId]);
    } else {
      await db.query('INSERT INTO user_profiles SET ?', { user_id: userId, ...data });
    }
  },

  async updateAvatar(userId, avatar_url) {
    await db.query('UPDATE user_profiles SET avatar_url = ? WHERE user_id = ?', [avatar_url, userId]);
  },

  async updateUser(userId, data) {
    await db.query('UPDATE users SET ? WHERE id = ?', [data, userId]);
  },

  async list({ page, limit, search }) {
    const offset = (page - 1) * limit;
    let where = '';
    const params = [];
    if (search) {
      where = 'WHERE name LIKE ? OR phone LIKE ?';
      params.push(`%${search}%`, `%${search}%`);
    }
    const [rows] = await db.query(
      `SELECT id, phone, name, email, gender, role, aadhar_verified, created_at FROM users ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, String(limit), String(offset)]
    );
    const [{ count }] = await db.query(
      `SELECT COUNT(*) as count FROM users ${where}`,
      params
    );
    return { rows, total: count, page, limit };
  },
};

module.exports = UserModel;
