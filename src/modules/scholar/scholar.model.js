const db = require('../../config/db');

const ScholarModel = {
  async findById(id) {
    const [rows] = await db.query(
      `SELECT s.*, u.name, u.email, u.gender 
       FROM scholars s 
       JOIN users u ON u.id = s.user_id 
       WHERE s.id = ?`,
      [id]
    );
    return rows[0];
  },

  async findByUserId(userId) {
    const [rows] = await db.query('SELECT * FROM scholars WHERE user_id = ?', [userId]);
    return rows[0];
  },

  async list({ type, page, limit }) {
    const offset = (page - 1) * limit;
    const params = [];
    let where = '';
    if (type) { where = 'WHERE s.type = ?'; params.push(type); }

    const [rows] = await db.query(
      `SELECT s.*, u.name, u.email, u.gender 
       FROM scholars s 
       JOIN users u ON u.id = s.user_id 
       ${where} 
       ORDER BY s.rating DESC 
       LIMIT ? OFFSET ?`,
      [...params, String(limit), String(offset)]
    );

    const [{ count }] = await db.query(
      `SELECT COUNT(*) as count FROM scholars s ${where}`,
      params
    );

    return { rows, total: count, page, limit };
  },

  async getSchedule(scholarId) {
    const [rows] = await db.query(
      'SELECT * FROM scholar_schedules WHERE scholar_id = ? ORDER BY day_of_week, start_time',
      [scholarId]
    );
    return rows;
  },

  async saveSchedule(scholarId, schedules) {
    await db.query('DELETE FROM scholar_schedules WHERE scholar_id = ?', [scholarId]);
    const values = schedules.map(s => [scholarId, s.day_of_week, s.start_time, s.end_time, s.timezone || 'Asia/Kolkata']);
    if (values.length) {
      await db.query(
        'INSERT INTO scholar_schedules (scholar_id, day_of_week, start_time, end_time, timezone) VALUES ?',
        [values]
      );
    }
  },

  async updateStatus(id, status) {
    await db.query('UPDATE scholars SET status = ? WHERE id = ?', [status, id]);
  },

  async updateRating(id) {
    const [rows] = await db.query(
      'SELECT AVG(rating) as avg FROM chat_feedback WHERE scholar_id = ?',
      [id]
    );
    const avg = rows[0]?.avg || 0;
    await db.query('UPDATE scholars SET rating = ? WHERE id = ?', [avg, id]);
    return avg;
  },
};

module.exports = ScholarModel;
