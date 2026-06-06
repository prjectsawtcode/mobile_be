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

async function init() {
  await pool.query(createPaymentRequestsTable);
  await pool.query(createMasjidSettingsTable);
  try { await pool.query(migrationAddUserId); } catch (_) { /* column may already exist */ }

  const [rows] = await pool.query('SELECT COUNT(*) as c FROM masjid_settings');
  if (rows[0].c === 0) {
    await pool.query(
      `INSERT INTO masjid_settings (id, masjid_name, upi_id) VALUES (1, 'Masjid', 'merchant@upi')`
    );
  }
}

async function createRequest(data) {
  await pool.query(
    `INSERT INTO payment_requests (id, katha_number, member_name, payment_type, amount, month, upi_id, screenshot_url, utr, user_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.id, data.katha_number, data.member_name, data.payment_type, data.amount, data.month, data.upi_id, data.screenshot_url, data.utr, data.user_id]
  );
  return findRequestById(data.id);
}

async function findRequestById(id) {
  const [rows] = await pool.query('SELECT * FROM payment_requests WHERE id = ?', [id]);
  const row = rows[0];
  if (row) row.screenshot_url = resolveUrl(row.screenshot_url);
  return row;
}

async function findAllRequests({ status, katha_number, page, limit }) {
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
  const sets = ['status = ?', 'admin_id = ?'];
  const params = [status, adminId];
  if (remark !== undefined) { sets.push('admin_remark = ?'); params.push(remark); }
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
};
