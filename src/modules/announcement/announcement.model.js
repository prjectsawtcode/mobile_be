const db = require('../../config/db');

const AnnouncementModel = {
  async findById(id) {
    const [rows] = await db.query(
      `SELECT a.*, u.name as author_name 
       FROM announcements a 
       JOIN users u ON u.id = a.author_id 
       WHERE a.id = ?`,
      [id]
    );
    return rows[0];
  },

  async list({ category, privacy, search, page, limit }) {
    const offset = (page - 1) * limit;
    const conditions = ['end_date >= NOW() OR end_date IS NULL'];
    const params = [];

    if (category) { conditions.push('category = ?'); params.push(category); }
    if (privacy) { conditions.push('privacy = ?'); params.push(privacy); }

    const where = 'WHERE ' + conditions.join(' AND ');
    let fullText = '';
    if (search) {
      fullText = 'AND MATCH(title, content) AGAINST(? IN BOOLEAN MODE)';
      params.push(`+${search}*`);
    }

    const [rows] = await db.query(
      `SELECT a.*, u.name as author_name 
       FROM announcements a 
       JOIN users u ON u.id = a.author_id 
       ${where} ${fullText} 
       ORDER BY a.created_at DESC 
       LIMIT ? OFFSET ?`,
      [...params, String(limit), String(offset)]
    );

    const [{ count }] = await db.query(
      `SELECT COUNT(*) as count FROM announcements a ${where} ${fullText}`,
      params
    );

    return { rows, total: count, page, limit };
  },

  async listExpired({ page, limit }) {
    const offset = (page - 1) * limit;
    const [rows] = await db.query(
      `SELECT a.*, u.name as author_name 
       FROM announcements a 
       JOIN users u ON u.id = a.author_id 
       WHERE a.end_date < NOW() 
       ORDER BY a.end_date DESC 
       LIMIT ? OFFSET ?`,
      [String(limit), String(offset)]
    );
    const [{ count }] = await db.query(
      'SELECT COUNT(*) as count FROM announcements WHERE end_date < NOW()'
    );
    return { rows, total: count, page, limit };
  },

  async create(data) {
    const [result] = await db.query('INSERT INTO announcements SET ?', data);
    return result.insertId;
  },

  async update(id, data) {
    await db.query('UPDATE announcements SET ? WHERE id = ?', [data, id]);
  },

  async delete(id) {
    await db.query('DELETE FROM announcements WHERE id = ?', [id]);
  },
};

module.exports = AnnouncementModel;
