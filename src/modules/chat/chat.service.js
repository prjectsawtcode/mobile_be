const { v4: uuidv4 } = require('uuid');
const { delPattern } = require('../../config/cache');
const model = require('./chat.model');

async function createRoom(userId, { scholar_id, language }) {
  const room = await model.createRoom({ id: uuidv4(), user_id: userId, scholar_id, language });
  await delPattern(`rooms:user:${userId}`);
  return room;
}

async function listRooms(userId) {
  return model.findUserRooms(userId);
}

async function getRoom(id) {
  const room = await model.findRoomById(id);
  if (!room) throw Object.assign(new Error('Room not found'), { status: 404 });
  const messages = await model.findRoomMessages(id, { page: 1, limit: 100 });
  return { ...room, messages: messages.rows };
}

async function sendMessage(userId, roomId, data) {
  const room = await model.findRoomById(roomId);
  if (!room) throw Object.assign(new Error('Room not found'), { status: 404 });
  const msg = await model.createMessage({
    id: uuidv4(), room_id: roomId, sender_id: userId,
    sender_type: 'user', ...data,
  });
  return msg;
}

async function getMessages(roomId, query) {
  return model.findRoomMessages(roomId, {
    page: Number(query.page) || 1,
    limit: Number(query.limit) || 50,
  });
}

async function toggleBookmark(messageId) {
  return model.toggleBookmark(messageId);
}

async function listBookmarks(userId) {
  return model.findBookmarks(userId);
}

async function closeRoom(userId, roomId) {
  const room = await model.findRoomById(roomId);
  if (!room) throw Object.assign(new Error('Room not found'), { status: 404 });
  await model.closeRoom(roomId);
  return { message: 'Room closed' };
}

module.exports = { createRoom, listRooms, getRoom, sendMessage, getMessages, toggleBookmark, listBookmarks, closeRoom };
