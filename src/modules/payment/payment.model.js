const { pool } = require('../../config/db');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

function resolveUrl(url) {
  if (!url || url.startsWith('http')) return url;
  return `${BASE_URL}${url}`;
}

const createPaymentRequestsTable = `
  CREATE TABLE IF NOT EXISTS payment_requests (
    id CHAR(36) PRIMARY KEY,
    katha_number VARCHAR(50) NOT NULL,
    member_name VARCHAR(100) NOT NULL,
    payment_type VARCHAR(100) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    month VARCHAR(20) NOT NULL,
    upi_id VARCHAR(100),
    screenshot_url TEXT,
    utr VARCHAR(100),
    status ENUM('pending','approved','rejected') DEFAULT 'pending',
    admin_remark TEXT,
    admin_id CHAR(36),
    user_id CHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  )`;

const createMasjidSettingsTable = `
  CREATE TABLE IF NOT EXISTS masjid_settings (
    id INT PRIMARY KEY DEFAULT 1,
    masjid_name VARCHAR(200) NOT NULL DEFAULT 'Masjid',
    qr_code_url TEXT,
    upi_id VARCHAR(100),
    account_number VARCHAR(50),
    ifsc_code VARCHAR(20),
    bank_name VARCHAR(100),
    account_holder VARCHAR(100),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`;

const migrationAddUserId = `
  ALTER TABLE payment_requests
  ADD COLUMN user_id CHAR(36) AFTER admin_id,
  ADD FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
`;

const createPaymentVerificationsTable = `
  CREATE TABLE IF NOT EXISTS payment_verifications (
    id CHAR(36) PRIMARY KEY,
    katha_number VARCHAR(50) NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    otp_code VARCHAR(10) NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_katha_mobile (katha_number, mobile)
  )`;

const migrationAddExtraColumns = `
  ALTER TABLE payment_requests
  ADD COLUMN mobile VARCHAR(20),
  ADD COLUMN payment_mode VARCHAR(50) DEFAULT 'Cash',
  ADD COLUMN remarks TEXT,
  ADD COLUMN category VARCHAR(100),
  ADD COLUMN collection_id VARCHAR(100),
  ADD COLUMN is_balance_payment BOOLEAN DEFAULT FALSE,
  ADD COLUMN raw_data JSON
`;

async function init() {
  await pool.query(createPaymentRequestsTable);
  await pool.query(createMasjidSettingsTable);
  await pool.query(createPaymentVerificationsTable);
  try { await pool.query(migrationAddUserId); } catch (_) { /* column may already exist */ }
  try { await pool.query(migrationAddExtraColumns); } catch (_) { /* columns may already exist */ }

  const [rows] = await pool.query('SELECT COUNT(*) as c FROM masjid_settings');
  if (rows[0].c === 0) {
    await pool.query(
      `INSERT INTO masjid_settings (id, masjid_name, upi_id) VALUES (1, 'Masjid', 'merchant@upi')`
    );
  }
}

async function getLastOtpTime(katha_number, mobile) {
  const [rows] = await pool.query(
    `SELECT created_at FROM payment_verifications 
     WHERE katha_number = ? AND mobile = ? 
     ORDER BY created_at DESC LIMIT 1`,
    [katha_number, mobile]
  );
  return rows[0]?.created_at || null;
}

async function expirePreviousOtps(katha_number, mobile) {
  await pool.query(
    `UPDATE payment_verifications SET expires_at = NOW() 
     WHERE katha_number = ? AND mobile = ? AND is_verified = FALSE`,
    [katha_number, mobile]
  );
}

async function createOtpVerification({ id, katha_number, mobile, otp_code, expires_at }) {
  await pool.query(
    `INSERT INTO payment_verifications (id, katha_number, mobile, otp_code, expires_at)
     VALUES (?, ?, ?, ?, ?)`,
    [id, katha_number, mobile, otp_code, expires_at]
  );
}

async function findValidOtp({ katha_number, mobile, otp_code }) {
  const [rows] = await pool.query(
    `SELECT * FROM payment_verifications 
     WHERE katha_number = ? AND mobile = ? AND otp_code = ? AND is_verified = FALSE AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [katha_number, mobile, otp_code]
  );
  return rows[0] || null;
}

async function markOtpVerified(id) {
  await pool.query(
    `UPDATE payment_verifications SET is_verified = TRUE WHERE id = ?`,
    [id]
  );
}

async function createRequest(data) {
  console.log(`[DB CREATE REQUEST] Attempting insert for ID: ${data.id}, Katha: ${data.katha_number}, Type: ${data.payment_type}, Amount: ${data.amount}`);
  let validUserId = null;
  if (data.user_id && data.user_id !== 'portal-admin') {
    try {
      const [uRows] = await pool.query('SELECT id FROM users WHERE id = ?', [data.user_id]);
      if (uRows.length > 0) {
        validUserId = data.user_id;
      }
    } catch (_) {}
  }

  try {
    await pool.query(
      `INSERT INTO payment_requests (id, katha_number, mobile, member_name, payment_type, amount, payment_mode, month, remarks, category, collection_id, is_balance_payment, raw_data, upi_id, screenshot_url, utr, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.id,
        data.katha_number,
        data.mobile || null,
        data.member_name,
        data.payment_type,
        data.amount,
        data.payment_mode || 'Cash',
        data.month || '',
        data.remarks || null,
        data.category || null,
        data.collection_id || null,
        data.is_balance_payment ? 1 : 0,
        data.raw_data ? JSON.stringify(data.raw_data) : null,
        data.upi_id || null,
        data.screenshot_url || null,
        data.utr || null,
        validUserId
      ]
    );
    console.log(`[DB CREATE REQUEST SUCCESS] Row inserted successfully with ID: ${data.id}`);
  } catch (err) {
    console.warn(`[DB CREATE REQUEST FULL INSERT WARN] ${err.message}. Retrying safe basic insert...`);
    try {
      await pool.query(
        `INSERT INTO payment_requests (id, katha_number, member_name, payment_type, amount, month, upi_id, screenshot_url, utr)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [data.id, data.katha_number, data.member_name, data.payment_type, data.amount, data.month || '', data.upi_id || null, data.screenshot_url || null, data.utr || null]
      );
      console.log(`[DB CREATE REQUEST BASIC SUCCESS] Row inserted via basic insert with ID: ${data.id}`);
    } catch (basicErr) {
      console.error(`[DB CREATE REQUEST FAILURE] Basic insert also failed: ${basicErr.message}`);
      throw basicErr;
    }
  }

  return findRequestById(data.id);
}

async function findRequestById(id) {
  const [rows] = await pool.query('SELECT * FROM payment_requests WHERE id = ?', [id]);
  const row = rows[0];
  if (row) row.screenshot_url = resolveUrl(row.screenshot_url);
  return row;
}

async function findAllRequests({ status, katha_number, page, limit }) {
  console.log(`[DB FIND ALL REQUESTS] Filter status: ${status}, katha: ${katha_number}, page: ${page}, limit: ${limit}`);
  let where = ['1=1'];
  const params = [];
  if (status && status !== 'all') { where.push('pr.status = ?'); params.push(status); }
  if (katha_number) { where.push('pr.katha_number LIKE ?'); params.push(`%${katha_number}%`); }
  const whereClause = where.join(' AND ');
  const offset = (page - 1) * limit;

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) as total FROM payment_requests pr WHERE ${whereClause}`, params
  );
  let [rows] = await pool.query(
    `SELECT pr.*, u.name as admin_name FROM payment_requests pr
     LEFT JOIN users u ON pr.admin_id = u.id
     WHERE ${whereClause}
     ORDER BY pr.created_at DESC LIMIT ? OFFSET ?`,
    [...params, Number(limit), Number(offset)]
  );
  console.log(`[DB FIND ALL REQUESTS RESULT] Query returned total: ${total}, rows count: ${rows.length}`);
  rows = rows.map(r => ({ ...r, screenshot_url: resolveUrl(r.screenshot_url) }));
  return { rows, total, page, limit };
}

async function findMemberRequests(katha_number) {
  let [rows] = await pool.query(
    'SELECT * FROM payment_requests WHERE katha_number = ? ORDER BY created_at DESC', [katha_number]
  );
  rows = rows.map(r => ({ ...r, screenshot_url: resolveUrl(r.screenshot_url) }));
  return rows;
}

async function updateRequestStatus(id, status, adminId, remark) {
  const sets = ['status = ?'];
  const params = [status];
  
  if (adminId) {
    try {
      const [uRows] = await pool.query('SELECT id FROM users WHERE id = ?', [adminId]);
      if (uRows.length > 0) {
        sets.push('admin_id = ?');
        params.push(adminId);
      }
    } catch (_) {}
  }

  if (remark !== undefined) {
    sets.push('admin_remark = ?');
    params.push(remark);
  }

  params.push(id);
  await pool.query(
    `UPDATE payment_requests SET ${sets.join(', ')} WHERE id = ?`, params
  );
  return findRequestById(id);
}

async function getSettings() {
  const [rows] = await pool.query('SELECT * FROM masjid_settings WHERE id = 1');
  return rows[0] || null;
}

async function updateSettings(data) {
  const keys = Object.keys(data);
  const sets = keys.map(k => `${k} = ?`).join(', ');
  const vals = keys.map(k => data[k]);
  await pool.query(
    `UPDATE masjid_settings SET ${sets} WHERE id = 1`, vals
  );
  return getSettings();
}

module.exports = {
  init,
  createRequest,
  findRequestById,
  findAllRequests,
  findMemberRequests,
  updateRequestStatus,
  getSettings,
  updateSettings,
  getLastOtpTime,
  expirePreviousOtps,
  createOtpVerification,
  findValidOtp,
  markOtpVerified,
};

