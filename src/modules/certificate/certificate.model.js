const { pool } = require('../../config/db');

async function addColumnIfMissing(table, column, definition) {
  try {
    await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN IF NOT EXISTS \`${column}\` ${definition}`);
  } catch (_) {
    // MySQL < 8.0 may not support IF NOT EXISTS — try/catch is fine
  }
}

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS certificate_requests (
      id VARCHAR(36) PRIMARY KEY,
      katha_number VARCHAR(50) NOT NULL,
      applicant_name VARCHAR(200) NOT NULL,
      mobile VARCHAR(20) NOT NULL DEFAULT '',
      certificate_type VARCHAR(50) NOT NULL,
      masjid_name VARCHAR(200) NOT NULL DEFAULT 'BSJM Thodar',
      details JSON DEFAULT NULL,
      photo_url LONGTEXT DEFAULT NULL,
      document_url LONGTEXT DEFAULT NULL,
      invitation_card_url LONGTEXT DEFAULT NULL,
      payment_screenshot_url LONGTEXT DEFAULT NULL,
      fee_amount DECIMAL(10,2) DEFAULT 0,
      payment_status ENUM('pending_payment', 'pending_review', 'approved', 'rejected') DEFAULT 'pending_payment',
      admin_remarks TEXT DEFAULT NULL,
      approved_by VARCHAR(100) DEFAULT NULL,
      approved_at TIMESTAMP NULL DEFAULT NULL,
      user_id VARCHAR(100) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_katha (katha_number),
      INDEX idx_status (payment_status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Migrations: add/modify columns to LONGTEXT for storing Base64 data strings
  await pool.query('ALTER TABLE certificate_requests MODIFY COLUMN id BIGINT UNSIGNED AUTO_INCREMENT').catch(() => {});
  await pool.query('ALTER TABLE certificate_requests MODIFY COLUMN photo_url LONGTEXT DEFAULT NULL').catch(() => {});
  await pool.query('ALTER TABLE certificate_requests MODIFY COLUMN document_url LONGTEXT DEFAULT NULL').catch(() => {});
  await pool.query('ALTER TABLE certificate_requests MODIFY COLUMN invitation_card_url LONGTEXT DEFAULT NULL').catch(() => {});
  await pool.query('ALTER TABLE certificate_requests MODIFY COLUMN payment_screenshot_url LONGTEXT DEFAULT NULL').catch(() => {});
  await addColumnIfMissing('certificate_requests', 'status', "VARCHAR(50) DEFAULT 'pending'");
  await addColumnIfMissing('certificate_requests', 'mobile', "VARCHAR(20) NOT NULL DEFAULT ''");
  await addColumnIfMissing('certificate_requests', 'fee_amount', 'DECIMAL(10,2) DEFAULT 0');
  await addColumnIfMissing('certificate_requests', 'payment_status', "ENUM('pending_payment','pending_review','approved','rejected') DEFAULT 'pending_payment'");
  await addColumnIfMissing('certificate_requests', 'admin_remarks', 'TEXT DEFAULT NULL');
  await addColumnIfMissing('certificate_requests', 'user_id', 'VARCHAR(100) DEFAULT NULL');

  console.log('[DB] certificate_requests table ready');
}

async function createRequest(data) {
  const {
    katha_number, applicant_name, mobile, certificate_type,
    masjid_name, details, photo_url, document_url, invitation_card_url,
    payment_screenshot_url, fee_amount, payment_status, user_id,
  } = data;

  const initialStatus = payment_status === 'approved' ? 'approved' : (payment_status === 'rejected' ? 'rejected' : 'pending');

  const [result] = await pool.query(
    `INSERT INTO certificate_requests
      (katha_number, applicant_name, mobile, certificate_type, masjid_name,
       details, photo_url, document_url, invitation_card_url,
       payment_screenshot_url, fee_amount, payment_status, status, user_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      katha_number, applicant_name, mobile || '', certificate_type,
      masjid_name || 'BSJM Thodar',
      details ? (typeof details === 'object' ? JSON.stringify(details) : details) : null,
      photo_url || null,
      document_url || null,
      invitation_card_url || null,
      payment_screenshot_url || null,
      fee_amount || 0,
      payment_status || 'pending_payment',
      initialStatus,
      user_id || null,
    ]
  );

  return findById(result.insertId);
}

async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM certificate_requests WHERE id = ?', [id]);
  return rows[0] || null;
}

async function findByKathaNumber(katha_number) {
  const [rows] = await pool.query(
    'SELECT * FROM certificate_requests WHERE katha_number = ? ORDER BY created_at DESC',
    [katha_number]
  );
  return rows;
}

async function getAdminRequests({ page = 1, limit = 12, status = 'all', certificate_type, search, masjid_name }) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, parseInt(limit, 10) || 12);
  const offset = (pageNum - 1) * limitNum;

  const whereConditions = [];
  const queryParams = [];

  if (status && status !== 'all') {
    const s = String(status).toLowerCase();
    if (s === 'pending') {
      whereConditions.push("(payment_status IN ('pending_payment', 'pending_review') OR status = 'pending')");
    } else if (s === 'approved') {
      whereConditions.push("(payment_status = 'approved' OR status = 'approved')");
    } else if (s === 'rejected') {
      whereConditions.push("(payment_status = 'rejected' OR status = 'rejected')");
    } else {
      whereConditions.push("(payment_status = ? OR status = ?)");
      queryParams.push(s, s);
    }
  }

  if (certificate_type) {
    whereConditions.push("certificate_type = ?");
    queryParams.push(certificate_type);
  }

  if (masjid_name) {
    whereConditions.push("masjid_name = ?");
    queryParams.push(masjid_name);
  }

  if (search) {
    whereConditions.push("(katha_number LIKE ? OR applicant_name LIKE ? OR mobile LIKE ?)");
    const searchTerm = `%${search}%`;
    queryParams.push(searchTerm, searchTerm, searchTerm);
  }

  const whereSql = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  const [countRows] = await pool.query(`SELECT COUNT(*) as total FROM certificate_requests ${whereSql}`, queryParams);
  const total = countRows[0]?.total || 0;

  const [rows] = await pool.query(
    `SELECT * FROM certificate_requests ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?`,
    [...queryParams, limitNum, offset]
  );

  return { rows, total, page: pageNum, limit: limitNum };
}

async function updatePaymentScreenshot(id, screenshot_url) {
  await pool.query(
    `UPDATE certificate_requests
     SET payment_screenshot_url = ?, payment_status = 'pending_review', status = 'pending', updated_at = NOW()
     WHERE id = ?`,
    [screenshot_url, id]
  );
  return findById(id);
}

async function updateStatus(id, status, adminRemarks, approvedBy) {
  const normStatus = String(status).toLowerCase();
  const dbPaymentStatus = (normStatus === 'approved') ? 'approved' : (normStatus === 'rejected' ? 'rejected' : 'pending_review');

  await pool.query(
    `UPDATE certificate_requests
     SET payment_status = ?, status = ?, admin_remarks = ?, approved_by = ?,
         approved_at = IF(? IN ('approved','rejected'), NOW(), NULL),
         updated_at = NOW()
     WHERE id = ?`,
    [dbPaymentStatus, normStatus, adminRemarks || null, approvedBy || null, normStatus, id]
  );
  return findById(id);
}

module.exports = { init, createRequest, findById, findByKathaNumber, getAdminRequests, updatePaymentScreenshot, updateStatus };
