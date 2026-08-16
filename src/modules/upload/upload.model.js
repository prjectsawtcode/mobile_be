const { pool } = require('../../config/db');

const createTable = `
  CREATE TABLE IF NOT EXISTS uploads (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    size INT NOT NULL,
    url LONGTEXT NOT NULL,
    path TEXT NOT NULL,
    type ENUM('image','voice','document') NOT NULL,
    file_id VARCHAR(100),
    file_data LONGTEXT DEFAULT NULL,
    is_deleted TINYINT(1) DEFAULT 0,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`;

async function init() {
  await pool.query(createTable);
  try { await pool.query('ALTER TABLE uploads MODIFY COLUMN url LONGTEXT NOT NULL'); } catch (_) {}
  try { await pool.query('ALTER TABLE uploads ADD COLUMN file_id VARCHAR(100) AFTER type'); } catch (_) {}
  try { await pool.query('ALTER TABLE uploads ADD COLUMN file_data LONGTEXT DEFAULT NULL AFTER file_id'); } catch (_) {}
  try { await pool.query('ALTER TABLE uploads ADD COLUMN is_deleted TINYINT(1) DEFAULT 0 AFTER file_data'); } catch (_) {}
  try { await pool.query('ALTER TABLE uploads ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL AFTER is_deleted'); } catch (_) {}
}

async function create(data) {
  const fileUrl = data.url || (data.file_data && data.file_data.startsWith('data:') ? data.file_data : `/api/file-proxy?uuid=${data.id}`);
  await pool.query(
    `INSERT INTO uploads
      (id, user_id, original_name, mime_type, size, url, path, type, file_id, file_data, is_deleted)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    [
      data.id,
      data.user_id,
      data.original_name,
      data.mime_type,
      data.size,
      fileUrl,
      data.path,
      data.type,
      data.file_id || data.id,
      data.file_data || null,
    ]
  );
  return { id: data.id, url: fileUrl, original_name: data.original_name, size: data.size, type: data.type };
}

async function findById(id, includeDeleted = false) {
  const query = includeDeleted
    ? 'SELECT * FROM uploads WHERE id = ?'
    : 'SELECT * FROM uploads WHERE id = ? AND is_deleted = 0';
  const [rows] = await pool.query(query, [id]);
  return rows[0] || null;
}

async function update(id, data) {
  const fields = [];
  const params = [];

  if (data.original_name !== undefined) { fields.push('original_name = ?'); params.push(data.original_name); }
  if (data.mime_type !== undefined) { fields.push('mime_type = ?'); params.push(data.mime_type); }
  if (data.size !== undefined) { fields.push('size = ?'); params.push(data.size); }
  if (data.url !== undefined) { fields.push('url = ?'); params.push(data.url); }
  if (data.path !== undefined) { fields.push('path = ?'); params.push(data.path); }
  if (data.file_data !== undefined) { fields.push('file_data = ?'); params.push(data.file_data); }

  if (fields.length === 0) return false;

  params.push(id);
  const [result] = await pool.query(
    `UPDATE uploads SET ${fields.join(', ')} WHERE id = ? AND is_deleted = 0`,
    params
  );
  return result.affectedRows > 0;
}

async function remove(id) {
  const file = await findById(id, false);
  if (!file) return null;

  await pool.query(
    'UPDATE uploads SET is_deleted = 1, deleted_at = NOW() WHERE id = ? AND is_deleted = 0',
    [id]
  );
  return { ...file, is_deleted: true };
}

async function hardRemove(id) {
  const [rows] = await pool.query('SELECT * FROM uploads WHERE id = ?', [id]);
  await pool.query('DELETE FROM uploads WHERE id = ?', [id]);
  return rows[0] || null;
}

module.exports = { init, create, findById, update, remove, hardRemove };

