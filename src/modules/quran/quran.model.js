const db = require('../../config/db');

const QuranModel = {
  async listSurahs() {
    const [rows] = await db.query('SELECT * FROM quran_surahs ORDER BY id');
    return rows;
  },

  async getSurah(id) {
    const [surah] = await db.query('SELECT * FROM quran_surahs WHERE id = ?', [id]);
    if (!surah[0]) return null;
    const [verses] = await db.query(
      'SELECT qv.*, qt.text as translation FROM quran_verses qv LEFT JOIN quran_translations qt ON qt.verse_id = qv.id WHERE qv.surah_id = ? ORDER BY qv.verse_number',
      [id]
    );
    return { ...surah[0], verses };
  },

  async getVerse(surahNum, verseNum) {
    const [rows] = await db.query(
      `SELECT qv.*, qs.name_arabic, qs.name_english 
       FROM quran_verses qv 
       JOIN quran_surahs qs ON qs.id = qv.surah_id 
       WHERE qv.surah_id = ? AND qv.verse_number = ?`,
      [surahNum, verseNum]
    );
    return rows[0];
  },

  async searchVerses(query, translation, page, limit) {
    const offset = (page - 1) * limit;
    const [rows] = await db.query(
      `SELECT qv.*, qt.text as translation, qs.name_english as surah_name 
       FROM quran_verses qv 
       JOIN quran_surahs qs ON qs.id = qv.surah_id 
       LEFT JOIN quran_translations qt ON qt.verse_id = qv.id AND qt.language = ? 
       WHERE qv.text_arabic LIKE ? OR qt.text LIKE ? 
       LIMIT ? OFFSET ?`,
      [translation, `%${query}%`, `%${query}%`, String(limit), String(offset)]
    );
    const [{ count }] = await db.query(
      `SELECT COUNT(*) as count 
       FROM quran_verses qv 
       LEFT JOIN quran_translations qt ON qt.verse_id = qv.id AND qt.language = ? 
       WHERE qv.text_arabic LIKE ? OR qt.text LIKE ?`,
      [translation, `%${query}%`, `%${query}%`]
    );
    return { rows, total: count, page, limit };
  },

  async addBookmark(userId, surahId, verseNumber) {
    const [existing] = await db.query(
      'SELECT id FROM quran_bookmarks WHERE user_id = ? AND surah_id = ? AND verse_number = ?',
      [userId, surahId, verseNumber]
    );
    if (!existing[0]) {
      await db.query(
        'INSERT INTO quran_bookmarks (user_id, surah_id, verse_number) VALUES (?, ?, ?)',
        [userId, surahId, verseNumber]
      );
    }
  },

  async listBookmarks(userId) {
    const [rows] = await db.query(
      `SELECT qb.*, qs.name_english as surah_name 
       FROM quran_bookmarks qb 
       JOIN quran_surahs qs ON qs.id = qb.surah_id 
       WHERE qb.user_id = ? 
       ORDER BY qb.created_at DESC`,
      [userId]
    );
    return rows;
  },

  async deleteBookmark(id, userId) {
    await db.query('DELETE FROM quran_bookmarks WHERE id = ? AND user_id = ?', [id, userId]);
  },
};

module.exports = QuranModel;
