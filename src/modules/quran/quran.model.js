const { pool } = require('../../config/db');

const createSurahsTable = `
  CREATE TABLE IF NOT EXISTS quran_surahs (
    id INT PRIMARY KEY,
    name_arabic VARCHAR(100),
    name_simple VARCHAR(100),
    name_english VARCHAR(100),
    revelation_type VARCHAR(20),
    verse_count INT
  )`;

const createVersesTable = `
  CREATE TABLE IF NOT EXISTS quran_verses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    surah_id INT NOT NULL,
    verse_number INT NOT NULL,
    text_arabic TEXT,
    juz INT,
    page INT,
    UNIQUE KEY (surah_id, verse_number),
    FOREIGN KEY (surah_id) REFERENCES quran_surahs(id) ON DELETE CASCADE
  )`;

const createTranslationsTable = `
  CREATE TABLE IF NOT EXISTS quran_translations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    verse_id INT NOT NULL,
    language VARCHAR(10) NOT NULL,
    text TEXT,
    UNIQUE KEY (verse_id, language),
    FOREIGN KEY (verse_id) REFERENCES quran_verses(id) ON DELETE CASCADE
  )`;

const createBookmarksTable = `
  CREATE TABLE IF NOT EXISTS quran_bookmarks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    surah_id INT NOT NULL,
    verse_number INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY (user_id, surah_id, verse_number),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (surah_id) REFERENCES quran_surahs(id) ON DELETE CASCADE
  )`;

async function init() {
  await pool.query(createSurahsTable);
  await pool.query(createVersesTable);
  await pool.query(createTranslationsTable);
  await pool.query(createBookmarksTable);
}

async function getSurahs() {
  const [rows] = await pool.query('SELECT * FROM quran_surahs ORDER BY id');
  return rows;
}

async function getSurah(id, translation) {
  const [surahs] = await pool.query('SELECT * FROM quran_surahs WHERE id = ?', [id]);
  if (!surahs[0]) return null;

  let query = 'SELECT v.id, v.surah_id, v.verse_number, v.text_arabic, v.juz, v.page';
  const joins = [];
  const params = [id];

  if (translation) {
    query += ', t.text as translation';
    joins.push('LEFT JOIN quran_translations t ON t.verse_id = v.id AND t.language = ?');
    params.unshift(translation);
  }

  params.push(id);
  const [verses] = await pool.query(
    `${query} FROM quran_verses v ${joins.join(' ')} WHERE v.surah_id = ? ORDER BY v.verse_number`, params
  );

  return { ...surahs[0], verses };
}

async function getVerse(surahNum, verseNum, translation) {
  const [verses] = await pool.query(
    `SELECT v.*, s.name_arabic, s.name_english FROM quran_verses v
     JOIN quran_surahs s ON v.surah_id = s.id
     WHERE v.surah_id = ? AND v.verse_number = ?`, [surahNum, verseNum]
  );
  if (!verses[0]) return null;

  if (translation) {
    const [trans] = await pool.query(
      'SELECT text FROM quran_translations WHERE verse_id = ? AND language = ?', [verses[0].id, translation]
    );
    verses[0].translation = trans[0]?.text || null;
  }
  return verses[0];
}

async function searchVerses(q, translation, page, limit) {
  const offset = (page - 1) * limit;
  const lang = translation || 'en';

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) as total FROM quran_translations t
     JOIN quran_verses v ON t.verse_id = v.id
     JOIN quran_surahs s ON v.surah_id = s.id
     WHERE t.language = ? AND t.text LIKE ?`, [lang, `%${q}%`]
  );

  const [rows] = await pool.query(
    `SELECT v.id, v.surah_id, v.verse_number, v.text_arabic, t.text as translation, s.name_english as surah_name
     FROM quran_translations t
     JOIN quran_verses v ON t.verse_id = v.id
     JOIN quran_surahs s ON v.surah_id = s.id
     WHERE t.language = ? AND t.text LIKE ?
     ORDER BY v.surah_id, v.verse_number LIMIT ? OFFSET ?`,
    [lang, `%${q}%`, Number(limit), Number(offset)]
  );
  return { rows, total, page, limit };
}

async function addBookmark(userId, surahId, verseNumber) {
  await pool.query(
    'INSERT INTO quran_bookmarks (user_id, surah_id, verse_number) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE created_at = NOW()',
    [userId, surahId, verseNumber]
  );
  return { message: 'Bookmarked' };
}

async function getBookmarks(userId) {
  const [rows] = await pool.query(
    `SELECT b.id, b.user_id, b.surah_id, b.verse_number, s.name_english as surah_name, b.created_at
     FROM quran_bookmarks b JOIN quran_surahs s ON b.surah_id = s.id
     WHERE b.user_id = ? ORDER BY b.created_at DESC`, [userId]
  );
  return rows;
}

async function removeBookmark(id) {
  await pool.query('DELETE FROM quran_bookmarks WHERE id = ?', [id]);
  return { message: 'Bookmark removed' };
}

module.exports = { init, getSurahs, getSurah, getVerse, searchVerses, addBookmark, getBookmarks, removeBookmark };
