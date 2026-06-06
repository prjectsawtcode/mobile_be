const { pool } = require('../../config/db');

const createTable = `
  CREATE TABLE IF NOT EXISTS notifications (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT,
    type ENUM('prayer','chat','fatwa','announcement','system') NOT NULL,
    data JSON,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`;

async function init() {
  await pool.query(createTable);
}

async function findByUser(userId, page, limit) {
  const offset = (page - 1) * limit;
  const [[{ total }]] = await pool.query('SELECT COUNT(*) as total FROM notifications WHERE user_id = ?', [userId]);
  const [rows] = await pool.query(
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [userId, Number(limit), Number(offset)]
  );
  return { rows, total, page, limit };
}

async function markRead(id) {
  await pool.query('UPDATE notifications SET is_read = TRUE WHERE id = ?', [id]);
}

async function markAllRead(userId) {
  await pool.query('UPDATE notifications SET is_read = TRUE WHERE user_id = ?', [userId]);
}

async function unreadCount(userId) {
  const [[{ count }]] = await pool.query(
    'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE', [userId]
  );
  return count;
}

async function create(data) {
  await pool.query(
    'INSERT INTO notifications (id, user_id, title, body, type, data) VALUES (?, ?, ?, ?, ?, ?)',
    [data.id, data.user_id, data.title, data.body, data.type, JSON.stringify(data.data)]
  );
}

module.exports = { init, findByUser, markRead, markAllRead, unreadCount, create };
