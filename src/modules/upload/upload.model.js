const db = require('../../config/db');

const UploadModel = {
  async save(data) {
    await db.query('INSERT INTO uploads SET ?', data);
  },

  async findById(id) {
    const [rows] = await db.query('SELECT * FROM uploads WHERE id = ?', [id]);
    return rows[0];
  },

  async delete(id) {
    await db.query('DELETE FROM uploads WHERE id = ?', [id]);
  },
};

module.exports = UploadModel;
