const { pool } = require('../../config/db');

const createTable = `
  CREATE TABLE IF NOT EXISTS shopping_products (
    id CHAR(36) PRIMARY KEY,
    provider_id CHAR(36) NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    category VARCHAR(100) NOT NULL,
    provider_name VARCHAR(200) NOT NULL,
    whatsapp_number VARCHAR(20) NOT NULL,
    logo_url TEXT,
    image_url TEXT,
    about TEXT,
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
  if (search) { where.push('(name LIKE ? OR provider_name LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }
  if (activeOnly) { where.push('is_active = 1'); }
  const whereClause = where.join(' AND ');
  const offset = (page - 1) * limit;
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM shopping_products WHERE ${whereClause}`, params);
  const [rows] = await pool.query(
    `SELECT * FROM shopping_products WHERE ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, Number(limit), Number(offset)]
  );
  return { rows, total, page, limit };
}

async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM shopping_products WHERE id = ?', [id]);
  return rows[0];
}

async function findByProvider(providerId) {
  const [rows] = await pool.query('SELECT * FROM shopping_products WHERE provider_id = ? ORDER BY created_at DESC', [providerId]);
  return rows;
}

async function create(data) {
  const prodName = data.name || data.title || 'Product';
  const whatsapp = data.whatsapp_number || data.whatsapp_phone || '919876543210';
  const providerName = data.provider_name || 'Vendor';
  const imgUrl = data.image_url || data.imageUrl || null;

  await pool.query(
    `INSERT INTO shopping_products (id, provider_id, name, description, price, category, provider_name, whatsapp_number, logo_url, image_url, about)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.id, data.provider_id, prodName, data.description || '', data.price || 0, data.category || 'GENERAL', providerName, whatsapp, data.logo_url || null, imgUrl, data.about || '']
  );
  return findById(data.id);
}


async function update(id, data) {
  const keys = Object.keys(data);
  const sets = keys.map(k => `${k} = ?`).join(', ');
  const vals = keys.map(k => data[k]);
  await pool.query(`UPDATE shopping_products SET ${sets} WHERE id = ?`, [...vals, id]);
  return findById(id);
}

async function remove(id) {
  await pool.query('DELETE FROM shopping_products WHERE id = ?', [id]);
}

module.exports = { init, findAll, findById, findByProvider, create, update, remove };
