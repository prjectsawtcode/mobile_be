const db = require('../../config/db');

const FatwaModel = {
  async findById(id) {
    const [rows] = await db.query(
      `SELECT f.*, s.name as scholar_name 
       FROM fatwa_archive f 
       JOIN scholars s ON s.id = f.scholar_id 
       WHERE f.id = ?`,
      [id]
    );
    return rows[0];
  },

  async list({ category, language, search, page, limit }) {
    const offset = (page - 1) * limit;
    const conditions = [];
    const params = [];

    if (category) { conditions.push('f.category = ?'); params.push(category); }
    if (language) { conditions.push('f.language = ?'); params.push(language); }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    let fullText = '';
    if (search) {
      fullText = conditions.length ? 'AND ' : 'WHERE ';
      fullText += 'MATCH(f.question, f.answer) AGAINST(? IN BOOLEAN MODE)';
      params.push(`+${search}*`);
    }

    const [rows] = await db.query(
      `SELECT f.id, f.question, f.language, f.category, f.tags, f.view_count, f.created_at, s.name as scholar_name
       FROM fatwa_archive f 
       JOIN scholars s ON s.id = f.scholar_id 
       ${where} ${fullText} 
       ORDER BY f.created_at DESC 
       LIMIT ? OFFSET ?`,
      [...params, String(limit), String(offset)]
    );

    const [{ count }] = await db.query(
      `SELECT COUNT(*) as count FROM fatwa_archive f ${where} ${fullText}`,
      params
    );

    return { rows, total: count, page, limit };
  },

  async create(data) {
    await db.query('INSERT INTO fatwa_archive SET ?', data);
  },

  async update(id, data) {
    await db.query('UPDATE fatwa_archive SET ? WHERE id = ?', [data, id]);
  },

  async incrementView(id) {
    await db.query('UPDATE fatwa_archive SET view_count = view_count + 1 WHERE id = ?', [id]);
  },

  async toggleBookmark(userId, fatwaId) {
    const [rows] = await db.query(
      'SELECT id FROM fatwa_bookmarks WHERE user_id = ? AND fatwa_id = ?',
      [userId, fatwaId]
    );
    if (rows[0]) {
      await db.query('DELETE FROM fatwa_bookmarks WHERE id = ?', [rows[0].id]);
      return { bookmarked: false };
    }
    await db.query('INSERT INTO fatwa_bookmarks (user_id, fatwa_id) VALUES (?, ?)', [userId, fatwaId]);
    return { bookmarked: true };
  },

  async listBookmarks(userId) {
    const [rows] = await db.query(
      `SELECT f.*, fb.created_at as bookmarked_at 
       FROM fatwa_bookmarks fb 
       JOIN fatwa_archive f ON f.id = fb.fatwa_id 
       WHERE fb.user_id = ? 
       ORDER BY fb.created_at DESC`,
      [userId]
    );
    return rows;
  },
};

module.exports = FatwaModel;
