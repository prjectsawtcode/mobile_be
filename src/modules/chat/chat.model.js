const { pool } = require('../../config/db');

const createRoomsTable = `
  CREATE TABLE IF NOT EXISTS chat_rooms (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    scholar_id CHAR(36) NOT NULL,
    language VARCHAR(20) NOT NULL,
    status ENUM('active','closed') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (scholar_id) REFERENCES scholars(id) ON DELETE CASCADE
  )`;

const createMessagesTable = `
  CREATE TABLE IF NOT EXISTS chat_messages (
    id CHAR(36) PRIMARY KEY,
    room_id CHAR(36) NOT NULL,
    sender_id CHAR(36) NOT NULL,
    sender_type ENUM('user','scholar') NOT NULL,
    content TEXT,
    content_type ENUM('text','voice','image') DEFAULT 'text',
    is_bookmarked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE
  )`;

async function init() {
  await pool.query(createRoomsTable);
  await pool.query(createMessagesTable);
}

async function createRoom(data) {
  await pool.query(
    'INSERT INTO chat_rooms (id, user_id, scholar_id, language) VALUES (?, ?, ?, ?)',
    [data.id, data.user_id, data.scholar_id, data.language]
  );
  return findRoomById(data.id);
}

async function findRoomById(id) {
  const [rows] = await pool.query('SELECT * FROM chat_rooms WHERE id = ?', [id]);
  return rows[0];
}

async function findUserRooms(userId) {
  const [rows] = await pool.query(
    `SELECT r.*, s.name as scholar_name, s.avatar_url as scholar_avatar,
     (SELECT content FROM chat_messages WHERE room_id = r.id ORDER BY created_at DESC LIMIT 1) as last_message
     FROM chat_rooms r JOIN scholars s ON r.scholar_id = s.id
     WHERE r.user_id = ? ORDER BY r.created_at DESC`, [userId]
  );
  return rows;
}

async function findScholarRooms(scholarId) {
  const [rows] = await pool.query(
    `SELECT r.*, u.name as user_name FROM chat_rooms r JOIN users u ON r.user_id = u.id
     WHERE r.scholar_id = ? ORDER BY r.created_at DESC`, [scholarId]
  );
  return rows;
}

async function findRoomMessages(roomId, { page, limit }) {
  const offset = (page - 1) * limit;
  const [[{ total }]] = await pool.query('SELECT COUNT(*) as total FROM chat_messages WHERE room_id = ?', [roomId]);
  const [rows] = await pool.query(
    'SELECT * FROM chat_messages WHERE room_id = ? ORDER BY created_at ASC LIMIT ? OFFSET ?',
    [roomId, Number(limit), Number(offset)]
  );
  return { rows, total, page, limit };
}

async function createMessage(data) {
  await pool.query(
    'INSERT INTO chat_messages (id, room_id, sender_id, sender_type, content, content_type) VALUES (?, ?, ?, ?, ?, ?)',
    [data.id, data.room_id, data.sender_id, data.sender_type, data.content, data.content_type]
  );
  const [rows] = await pool.query('SELECT * FROM chat_messages WHERE id = ?', [data.id]);
  return rows[0];
}

async function toggleBookmark(id) {
  const [rows] = await pool.query('SELECT is_bookmarked FROM chat_messages WHERE id = ?', [id]);
  if (!rows[0]) throw Object.assign(new Error('Message not found'), { status: 404 });
  const newVal = !rows[0].is_bookmarked;
  await pool.query('UPDATE chat_messages SET is_bookmarked = ? WHERE id = ?', [newVal, id]);
  return { is_bookmarked: newVal };
}

async function findBookmarks(userId) {
  const [rows] = await pool.query(
    `SELECT m.id, m.room_id, m.content, m.content_type, m.created_at FROM chat_messages m
     JOIN chat_rooms r ON m.room_id = r.id
     WHERE r.user_id = ? AND m.is_bookmarked = TRUE ORDER BY m.created_at DESC`, [userId]
  );
  return rows;
}

async function closeRoom(id) {
  await pool.query('UPDATE chat_rooms SET status = ?, closed_at = NOW() WHERE id = ?', ['closed', id]);
}

module.exports = { init, createRoom, findRoomById, findUserRooms, findScholarRooms, findRoomMessages, createMessage, toggleBookmark, findBookmarks, closeRoom };
