const { pool } = require('../../config/db');

const createTable = `
  CREATE TABLE IF NOT EXISTS uploads (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    size INT NOT NULL,
    url TEXT NOT NULL,
    path TEXT NOT NULL,
    type ENUM('image','voice','document') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`;

async function init() {
  await pool.query(createTable);
}

async function create(data) {
  await pool.query(
    'INSERT INTO uploads (id, user_id, original_name, mime_type, size, url, path, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [data.id, data.user_id, data.original_name, data.mime_type, data.size, data.url, data.path, data.type]
  );
  return { id: data.id, url: data.url, original_name: data.original_name, size: data.size, type: data.type };
}

async function remove(id) {
  const [rows] = await pool.query('SELECT * FROM uploads WHERE id = ?', [id]);
  await pool.query('DELETE FROM uploads WHERE id = ?', [id]);
  return rows[0];
}

module.exports = { init, create, remove };
