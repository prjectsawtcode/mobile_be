const { pool } = require('../../config/db');

const createCategoriesTable = `
  CREATE TABLE IF NOT EXISTS food_categories (
    id CHAR(36) PRIMARY KEY,
    provider_id CHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    logo_url TEXT,
    sort_order INT DEFAULT 0,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE
  )`;

const createMenuItemsTable = `
  CREATE TABLE IF NOT EXISTS food_menu_items (
    id CHAR(36) PRIMARY KEY,
    category_id CHAR(36) NOT NULL,
    provider_id CHAR(36) NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    subcategory VARCHAR(100),
    image_url TEXT,
    whatsapp_number VARCHAR(20),
    is_available TINYINT(1) DEFAULT 1,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES food_categories(id) ON DELETE CASCADE,
    FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE
  )`;

async function init() {
  await pool.query(createCategoriesTable);
  await pool.query(createMenuItemsTable);
}

async function findAllCategories(providerId) {
  let where = ['1=1'];
  const params = [];
  if (providerId) { where.push('provider_id = ?'); params.push(providerId); }
  where.push('is_active = 1');
  const [rows] = await pool.query(
    `SELECT * FROM food_categories WHERE ${where.join(' AND ')} ORDER BY sort_order ASC, name ASC`, params
  );
  return rows;
}

async function findCategoryById(id) {
  const [rows] = await pool.query('SELECT * FROM food_categories WHERE id = ?', [id]);
  return rows[0];
}

async function createCategory(data) {
  await pool.query(
    'INSERT INTO food_categories (id, provider_id, name, description, logo_url, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
    [data.id, data.provider_id, data.name, data.description, data.logo_url, data.sort_order]
  );
  return findCategoryById(data.id);
}

async function updateCategory(id, data) {
  const keys = Object.keys(data);
  const sets = keys.map(k => `${k} = ?`).join(', ');
  const vals = keys.map(k => data[k]);
  await pool.query(`UPDATE food_categories SET ${sets} WHERE id = ?`, [...vals, id]);
  return findCategoryById(id);
}

async function removeCategory(id) {
  await pool.query('DELETE FROM food_categories WHERE id = ?', [id]);
}

async function findMenuItemsByCategory(categoryId) {
  const [rows] = await pool.query(
    'SELECT * FROM food_menu_items WHERE category_id = ? AND is_active = 1 ORDER BY subcategory ASC, name ASC',
    [categoryId]
  );
  return rows;
}

async function findMenuItemById(id) {
  const [rows] = await pool.query('SELECT * FROM food_menu_items WHERE id = ?', [id]);
  return rows[0];
}

async function createMenuItem(data) {
  await pool.query(
    `INSERT INTO food_menu_items (id, category_id, provider_id, name, description, price, subcategory, image_url, whatsapp_number, is_available)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.id, data.category_id, data.provider_id, data.name, data.description, data.price, data.subcategory, data.image_url, data.whatsapp_number, data.is_available]
  );
  return findMenuItemById(data.id);
}

async function updateMenuItem(id, data) {
  const keys = Object.keys(data);
  const sets = keys.map(k => `${k} = ?`).join(', ');
  const vals = keys.map(k => data[k]);
  await pool.query(`UPDATE food_menu_items SET ${sets} WHERE id = ?`, [...vals, id]);
  return findMenuItemById(id);
}

async function removeMenuItem(id) {
  await pool.query('DELETE FROM food_menu_items WHERE id = ?', [id]);
}

async function getFullMenu(providerId) {
  const categories = await findAllCategories(providerId);
  const menu = [];
  for (const cat of categories) {
    const items = await findMenuItemsByCategory(cat.id);
    menu.push({ ...cat, items });
  }
  return menu;
}

module.exports = {
  init,
  findAllCategories,
  findCategoryById,
  createCategory,
  updateCategory,
  removeCategory,
  findMenuItemsByCategory,
  findMenuItemById,
  createMenuItem,
  updateMenuItem,
  removeMenuItem,
  getFullMenu,
};
