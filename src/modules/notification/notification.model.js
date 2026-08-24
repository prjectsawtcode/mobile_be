const { pool } = require('../../config/db');

const alterTypeEnum = `
  ALTER TABLE notifications
  MODIFY COLUMN type ENUM('prayer','chat','fatwa','announcement','system','payment','quran','zikr') NOT NULL
`;

const createTable = `
  CREATE TABLE IF NOT EXISTS notifications (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT,
    type ENUM('prayer','chat','fatwa','announcement','system','payment','quran','zikr') NOT NULL,
    data JSON,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`;

async function init() {
  await pool.query(createTable);
  try { await pool.query(alterTypeEnum); } catch (_) { /* column may already have new types */ }
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

// One statement per broadcast instead of one per member; chunked so a large
// membership cannot exceed max_allowed_packet.
async function createMany(rows, chunkSize = 500) {
  if (!rows.length) return;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    await pool.query(
      'INSERT INTO notifications (id, user_id, title, body, type, data) VALUES ?',
      [chunk.map((r) => [r.id, r.user_id, r.title, r.body, r.type, JSON.stringify(r.data)])]
    );
  }
}

module.exports = { init, findByUser, markRead, markAllRead, unreadCount, create, createMany };
