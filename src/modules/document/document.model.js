const { pool } = require('../../config/db');

async function initTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS uploaded_documents (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        file_uuid VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50) NOT NULL DEFAULT 'certificate',
        entity_id VARCHAR(100) DEFAULT NULL,
        category VARCHAR(50) NOT NULL DEFAULT 'documents',
        masjid_name VARCHAR(100) DEFAULT 'BSJM Thodar',
        original_name VARCHAR(255) NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        original_size INT UNSIGNED DEFAULT 0,
        compressed_size INT UNSIGNED DEFAULT 0,
        b2_key VARCHAR(500) DEFAULT NULL,
        file_url LONGTEXT DEFAULT NULL,
        file_data LONGTEXT DEFAULT NULL,
        is_deleted TINYINT(1) DEFAULT 0,
        deleted_at DATETIME DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_entity (entity_type, entity_id),
        INDEX idx_uuid (file_uuid),
        INDEX idx_deleted (is_deleted)
      )
    `);

    // Migrations for existing tables
    try { await pool.query('ALTER TABLE uploaded_documents MODIFY COLUMN file_url LONGTEXT DEFAULT NULL'); } catch (_) {}
    try { await pool.query('ALTER TABLE uploaded_documents ADD COLUMN file_data LONGTEXT DEFAULT NULL AFTER file_url'); } catch (_) {}
    try { await pool.query('ALTER TABLE uploaded_documents ADD COLUMN is_deleted TINYINT(1) DEFAULT 0 AFTER created_at'); } catch (_) {}
    try { await pool.query('ALTER TABLE uploaded_documents ADD COLUMN deleted_at DATETIME DEFAULT NULL AFTER is_deleted'); } catch (_) {}
    try { await pool.query('ALTER TABLE uploaded_documents MODIFY b2_key VARCHAR(500) NULL'); } catch (_) {}

    console.log('[DOCUMENT DB] uploaded_documents table initialized with local DB storage & soft-delete');
  } catch (err) {
    console.warn('[DOCUMENT DB INIT WARN]', err.message);
  }
}

// Auto init on module import
initTable();

async function recordDocument(data) {
  const {
    file_uuid, entity_type, entity_id, category, masjid_name,
    original_name, mime_type, original_size, compressed_size,
    b2_key, file_url, file_data,
  } = data;

  const uuid = file_uuid || require('crypto').randomUUID();
  const url = file_url || (file_data && file_data.startsWith('data:') ? file_data : `/api/file-proxy?uuid=${uuid}`);

  const [result] = await pool.query(
    `INSERT INTO uploaded_documents
      (file_uuid, entity_type, entity_id, category, masjid_name,
       original_name, mime_type, original_size, compressed_size, b2_key, file_url, file_data, is_deleted)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    [
      uuid,
      entity_type || 'certificate',
      entity_id ? String(entity_id) : null,
      category || 'documents',
      masjid_name || 'BSJM Thodar',
      original_name || 'file',
      mime_type || 'application/octet-stream',
      original_size || 0,
      compressed_size || 0,
      b2_key || null,
      url,
      file_data || null,
    ]
  );
  return { insertId: result.insertId, file_uuid: uuid, file_url: url };
}

async function updateDocument(fileUuid, updateData) {
  const {
    entity_type, entity_id, category, masjid_name,
    original_name, mime_type, original_size, compressed_size,
    file_url, file_data,
  } = updateData;

  const fields = [];
  const params = [];

  if (entity_type !== undefined) { fields.push('entity_type = ?'); params.push(entity_type); }
  if (entity_id !== undefined) { fields.push('entity_id = ?'); params.push(String(entity_id)); }
  if (category !== undefined) { fields.push('category = ?'); params.push(category); }
  if (masjid_name !== undefined) { fields.push('masjid_name = ?'); params.push(masjid_name); }
  if (original_name !== undefined) { fields.push('original_name = ?'); params.push(original_name); }
  if (mime_type !== undefined) { fields.push('mime_type = ?'); params.push(mime_type); }
  if (original_size !== undefined) { fields.push('original_size = ?'); params.push(original_size); }
  if (compressed_size !== undefined) { fields.push('compressed_size = ?'); params.push(compressed_size); }
  if (file_url !== undefined) { fields.push('file_url = ?'); params.push(file_url); }
  if (file_data !== undefined) { fields.push('file_data = ?'); params.push(file_data); }

  if (fields.length === 0) return false;

  params.push(fileUuid);
  const [result] = await pool.query(
    `UPDATE uploaded_documents SET ${fields.join(', ')} WHERE file_uuid = ? AND is_deleted = 0`,
    params
  );
  return result.affectedRows > 0;
}

async function softDeleteDocument(fileUuid) {
  const [result] = await pool.query(
    'UPDATE uploaded_documents SET is_deleted = 1, deleted_at = NOW() WHERE file_uuid = ? AND is_deleted = 0',
    [fileUuid]
  );
  return result.affectedRows > 0;
}

async function hardDeleteDocument(fileUuid) {
  const [result] = await pool.query(
    'DELETE FROM uploaded_documents WHERE file_uuid = ?',
    [fileUuid]
  );
  return result.affectedRows > 0;
}

async function findByEntity(entityType, entityId, includeDeleted = false) {
  const query = includeDeleted
    ? 'SELECT * FROM uploaded_documents WHERE entity_type = ? AND entity_id = ? ORDER BY id ASC'
    : 'SELECT * FROM uploaded_documents WHERE entity_type = ? AND entity_id = ? AND is_deleted = 0 ORDER BY id ASC';
  const [rows] = await pool.query(query, [entityType, String(entityId)]);
  return rows;
}

async function findByUuid(uuid, includeDeleted = false) {
  const query = includeDeleted
    ? 'SELECT * FROM uploaded_documents WHERE file_uuid = ? LIMIT 1'
    : 'SELECT * FROM uploaded_documents WHERE file_uuid = ? AND is_deleted = 0 LIMIT 1';
  const [[row]] = await pool.query(query, [uuid]);
  return row || null;
}

module.exports = {
  recordDocument,
  updateDocument,
  softDeleteDocument,
  hardDeleteDocument,
  findByEntity,
  findByUuid,
};

