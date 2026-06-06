const { pool } = require('../../config/db');

const createFatwaTable = `
  CREATE TABLE IF NOT EXISTS fatwa_archive (
    id CHAR(36) PRIMARY KEY,
    scholar_id CHAR(36) NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    language VARCHAR(20) NOT NULL,
    category VARCHAR(50),
    tags JSON,
    view_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (scholar_id) REFERENCES scholars(id) ON DELETE CASCADE
  )`;

const createBookmarksTable = `
  CREATE TABLE IF NOT EXISTS fatwa_bookmarks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    fatwa_id CHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY (user_id, fatwa_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (fatwa_id) REFERENCES fatwa_archive(id) ON DELETE CASCADE
  )`;

async function init() {
  await pool.query(createFatwaTable);
  await pool.query(createBookmarksTable);
}

async function findAll({ category, language, search, page, limit }) {
  let where = ['1=1'];
  const params = [];
  if (category) { where.push('category = ?'); params.push(category); }
  if (language) { where.push('language = ?'); params.push(language); }
  if (search) { where.push('(question LIKE ? OR answer LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }
  const w = where.join(' AND ');
  const offset = (page - 1) * limit;

  const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM fatwa_archive WHERE ${w}`, params);
  const [rows] = await pool.query(
    `SELECT f.id, f.question, f.language, f.category, f.tags, f.view_count, f.created_at, s.name as scholar_name
     FROM fatwa_archive f JOIN scholars s ON f.scholar_id = s.id WHERE ${w} ORDER BY f.created_at DESC LIMIT ? OFFSET ?`,
    [...params, Number(limit), Number(offset)]
  );
  return { rows, total, page, limit };
}

async function findById(id) {
  const [rows] = await pool.query(
    `SELECT f.*, s.name as scholar_name FROM fatwa_archive f JOIN scholars s ON f.scholar_id = s.id WHERE f.id = ?`, [id]
  );
  return rows[0];
}

async function incrementView(id) {
  await pool.query('UPDATE fatwa_archive SET view_count = view_count + 1 WHERE id = ?', [id]);
}

async function create(data) {
  await pool.query(
    'INSERT INTO fatwa_archive (id, scholar_id, question, answer, language, category, tags) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [data.id, data.scholar_id, data.question, data.answer, data.language, data.category, JSON.stringify(data.tags)]
  );
  return findById(data.id);
}

async function update(id, data) {
  const keys = Object.keys(data);
  if (data.tags) data.tags = JSON.stringify(data.tags);
  const sets = keys.map(k => `${k} = ?`).join(', ');
  const vals = keys.map(k => data[k]);
  await pool.query(`UPDATE fatwa_archive SET ${sets} WHERE id = ?`, [...vals, id]);
  return findById(id);
}

async function toggleBookmark(userId, fatwaId) {
  const [existing] = await pool.query('SELECT id FROM fatwa_bookmarks WHERE user_id = ? AND fatwa_id = ?', [userId, fatwaId]);
  if (existing.length) {
    await pool.query('DELETE FROM fatwa_bookmarks WHERE id = ?', [existing[0].id]);
    return { bookmarked: false };
  }
  await pool.query('INSERT INTO fatwa_bookmarks (user_id, fatwa_id) VALUES (?, ?)', [userId, fatwaId]);
  return { bookmarked: true };
}

async function findBookmarks(userId) {
  const [rows] = await pool.query(
    `SELECT f.id, f.question, f.answer, f.language, f.category, fb.created_at as bookmarked_at
     FROM fatwa_bookmarks fb JOIN fatwa_archive f ON fb.fatwa_id = f.id WHERE fb.user_id = ? ORDER BY fb.created_at DESC`, [userId]
  );
  return rows;
}

module.exports = { init, findAll, findById, incrementView, create, update, toggleBookmark, findBookmarks };
