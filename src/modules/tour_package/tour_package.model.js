const { pool } = require('../../config/db');

const createTable = `
  CREATE TABLE IF NOT EXISTS tour_packages (
    id CHAR(36) PRIMARY KEY,
    provider_id CHAR(36) NOT NULL,
    provider_name VARCHAR(200) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    duration VARCHAR(50),
    category VARCHAR(50) NOT NULL DEFAULT 'Umrah',
    contact_whatsapp VARCHAR(20),
    website VARCHAR(200),
    image_url TEXT,
    logo_url TEXT,
    about TEXT,
    total_slots INT DEFAULT 0,
    booked_slots INT DEFAULT 0,
    start_date DATE,
    end_date DATE,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE
  )`;

async function init() {
  await pool.query(createTable);
}

async function findAll({ category, page, limit, search, activeOnly }) {
  let where = ['1=1'];
  const params = [];
  if (category && category !== 'All') { where.push('category = ?'); params.push(category); }
  if (search) { where.push('(title LIKE ? OR provider_name LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }
  if (activeOnly) { where.push('is_active = 1'); }
  const whereClause = where.join(' AND ');
  const offset = (page - 1) * limit;
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM tour_packages WHERE ${whereClause}`, params);
  const [rows] = await pool.query(
    `SELECT * FROM tour_packages WHERE ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, Number(limit), Number(offset)]
  );
  return { rows, total, page, limit };
}

async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM tour_packages WHERE id = ?', [id]);
  return rows[0];
}

async function findByProvider(providerId) {
  const [rows] = await pool.query('SELECT * FROM tour_packages WHERE provider_id = ? ORDER BY created_at DESC', [providerId]);
  return rows;
}

async function create(data) {
  const providerName = data.provider_name || 'Vendor';
  const whatsapp = data.contact_whatsapp || data.whatsapp_phone || '919876543210';
  const imgUrl = data.image_url || data.imageUrl || null;
  const slots = data.total_slots || data.slots || 10;
  const priceVal = data.price || 0;

  await pool.query(
    `INSERT INTO tour_packages (id, provider_id, provider_name, title, description, price, duration, category, contact_whatsapp, website, image_url, logo_url, about, total_slots, booked_slots, start_date, end_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.id, data.provider_id, providerName, data.title, data.description || '', priceVal, data.duration || '14 Days', data.category || 'UMRAH', whatsapp, data.website || '', imgUrl, data.logo_url || null, data.about || '', slots, data.booked_slots || 0, data.start_date || null, data.end_date || null]
  );
  return findById(data.id);
}


async function update(id, data) {
  const keys = Object.keys(data);
  const sets = keys.map(k => `${k} = ?`).join(', ');
  const vals = keys.map(k => data[k]);
  await pool.query(`UPDATE tour_packages SET ${sets} WHERE id = ?`, [...vals, id]);
  return findById(id);
}

async function remove(id) {
  await pool.query('DELETE FROM tour_packages WHERE id = ?', [id]);
}

module.exports = { init, findAll, findById, findByProvider, create, update, remove };
