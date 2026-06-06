const { pool } = require('../../config/db');

const createTable = `
  CREATE TABLE IF NOT EXISTS announcements (
    id CHAR(36) PRIMARY KEY,
    author_id CHAR(36) NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    voice_url TEXT,
    category VARCHAR(50) NOT NULL,
    privacy ENUM('everyone','masjid') DEFAULT 'everyone',
    start_date DATE NOT NULL,
    end_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
  )`;

async function init() {
  await pool.query(createTable);
}

async function findAll({ category, privacy, page, limit, search }) {
  let where = ['1=1'];
  const params = [];

  if (category && category !== 'All') { where.push('a.category = ?'); params.push(category); }
  if (privacy && privacy !== 'All') { where.push('a.privacy = ?'); params.push(privacy); }
  if (search) { where.push('(a.title LIKE ? OR a.content LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }

  const whereClause = where.join(' AND ');
  const offset = (page - 1) * limit;

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) as total FROM announcements a WHERE ${whereClause} AND (a.end_date IS NULL OR a.end_date >= CURDATE())`, params
  );
  const [rows] = await pool.query(
    `SELECT a.*, u.name as author_name FROM announcements a JOIN users u ON a.author_id = u.id WHERE ${whereClause} AND (a.end_date IS NULL OR a.end_date >= CURDATE()) ORDER BY a.created_at DESC LIMIT ? OFFSET ?`,
    [...params, Number(limit), Number(offset)]
  );
  return { rows, total, page, limit };
}

async function findExpired({ page, limit }) {
  const offset = (page - 1) * limit;
  const [[{ total }]] = await pool.query(
    'SELECT COUNT(*) as total FROM announcements WHERE end_date IS NOT NULL AND end_date < CURDATE()'
  );
  const [rows] = await pool.query(
    `SELECT a.*, u.name as author_name FROM announcements a JOIN users u ON a.author_id = u.id WHERE a.end_date IS NOT NULL AND a.end_date < CURDATE() ORDER BY a.end_date DESC LIMIT ? OFFSET ?`,
    [Number(limit), Number(offset)]
  );
  return { rows, total, page, limit };
}

async function findById(id) {
  const [rows] = await pool.query(
    `SELECT a.*, u.name as author_name FROM announcements a JOIN users u ON a.author_id = u.id WHERE a.id = ?`, [id]
  );
  return rows[0];
}

async function create(data) {
  const { id, author_id, title, content, image_url, voice_url, category, privacy, start_date, end_date } = data;
  await pool.query(
    'INSERT INTO announcements (id, author_id, title, content, image_url, voice_url, category, privacy, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, author_id, title, content, image_url, voice_url, category, privacy, start_date, end_date]
  );
  return findById(id);
}

async function update(id, data) {
  const keys = Object.keys(data);
  const sets = keys.map(k => `${k} = ?`).join(', ');
  const vals = keys.map(k => data[k]);
  await pool.query(`UPDATE announcements SET ${sets} WHERE id = ?`, [...vals, id]);
  return findById(id);
}

async function remove(id) {
  await pool.query('DELETE FROM announcements WHERE id = ?', [id]);
}

module.exports = { init, findAll, findExpired, findById, create, update, remove };
