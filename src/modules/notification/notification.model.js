const db = require('../../config/db');

const NotificationModel = {
  async list(userId, { page, limit }) {
    const offset = (page - 1) * limit;
    const [rows] = await db.query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [userId, String(limit), String(offset)]
    );
    const [{ count }] = await db.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ?',
      [userId]
    );
    return { rows, total: count, page, limit };
  },

  async markRead(id, userId) {
    await db.query('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [id, userId]);
  },

  async markAllRead(userId) {
    await db.query('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0', [userId]);
  },

  async unreadCount(userId) {
    const [rows] = await db.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
      [userId]
    );
    return rows[0].count;
  },

  async create(data) {
    await db.query('INSERT INTO notifications SET ?', data);
  },

  async getFcmTokens() {
    const [rows] = await db.query(
      'SELECT id, fcm_token FROM users WHERE fcm_token IS NOT NULL AND fcm_token != ?',
      ['']
    );
    return rows;
  },
};

module.exports = NotificationModel;
