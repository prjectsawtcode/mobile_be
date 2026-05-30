const db = require('../../config/db');

const ChatModel = {
  async createRoom(data) {
    await db.query('INSERT INTO chat_rooms SET ?', data);
  },

  async findRoomById(id) {
    const [rows] = await db.query('SELECT * FROM chat_rooms WHERE id = ?', [id]);
    return rows[0];
  },

  async listRooms(userId) {
    const [rows] = await db.query(
      `SELECT cr.*, s.name as scholar_name, s.avatar_url as scholar_avatar,
        (SELECT content FROM chat_messages WHERE room_id = cr.id ORDER BY created_at DESC LIMIT 1) as last_message
       FROM chat_rooms cr
       JOIN scholars s ON s.id = cr.scholar_id
       WHERE cr.user_id = ?
       ORDER BY cr.created_at DESC`,
      [userId]
    );
    return rows;
  },

  async getRoomMessages(roomId, { page, limit }) {
    const offset = (page - 1) * limit;
    const [rows] = await db.query(
      'SELECT * FROM chat_messages WHERE room_id = ? ORDER BY created_at ASC LIMIT ? OFFSET ?',
      [roomId, String(limit), String(offset)]
    );
    const [{ count }] = await db.query(
      'SELECT COUNT(*) as count FROM chat_messages WHERE room_id = ?',
      [roomId]
    );
    return { rows, total: count, page, limit };
  },

  async saveMessage(data) {
    await db.query('INSERT INTO chat_messages SET ?', data);
  },

  async toggleBookmark(messageId) {
    const [rows] = await db.query('SELECT is_bookmarked FROM chat_messages WHERE id = ?', [messageId]);
    if (!rows[0]) throw Object.assign(new Error('Message not found'), { status: 404 });
    const newVal = rows[0].is_bookmarked ? 0 : 1;
    await db.query('UPDATE chat_messages SET is_bookmarked = ? WHERE id = ?', [newVal, messageId]);
    return { is_bookmarked: !!newVal };
  },

  async listBookmarks(userId) {
    const [rows] = await db.query(
      `SELECT cm.*, cr.user_id 
       FROM chat_messages cm 
       JOIN chat_rooms cr ON cr.id = cm.room_id 
       WHERE cr.user_id = ? AND cm.is_bookmarked = 1 
       ORDER BY cm.created_at DESC`,
      [userId]
    );
    return rows;
  },

  async closeRoom(id) {
    await db.query('UPDATE chat_rooms SET status = ?, closed_at = NOW() WHERE id = ?', ['closed', id]);
  },
};

module.exports = ChatModel;
