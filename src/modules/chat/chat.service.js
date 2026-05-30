const { v4: uuidv4 } = require('uuid');
const { get, set, del, delPattern } = require('../../config/cache');
const ChatModel = require('./chat.model');

exports.createRoom = async (userId, data) => {
  const room = {
    id: uuidv4(),
    user_id: userId,
    scholar_id: data.scholar_id,
    language: data.language,
    status: 'active',
  };
  await ChatModel.createRoom(room);
  await del(`chat:rooms:${userId}`);
  return room;
};

exports.listRooms = async (userId) => {
  const cacheKey = `chat:rooms:${userId}`;
  const cached = await get(cacheKey);
  if (cached) return cached;

  const rooms = await ChatModel.listRooms(userId);
  await set(cacheKey, rooms, 30);
  return rooms;
};

exports.getRoom = async (userId, roomId) => {
  const room = await ChatModel.findRoomById(roomId);
  if (!room) throw Object.assign(new Error('Room not found'), { status: 404 });
  if (room.user_id !== userId) throw Object.assign(new Error('Forbidden'), { status: 403 });

  const messages = await ChatModel.getRoomMessages(roomId, { page: 1, limit: 50 });
  return { ...room, messages: messages.rows };
};

exports.sendMessage = async (userId, roomId, data) => {
  const room = await ChatModel.findRoomById(roomId);
  if (!room) throw Object.assign(new Error('Room not found'), { status: 404 });

  const sender_type = room.user_id === userId ? 'user' : 'scholar';
  const message = {
    id: uuidv4(),
    room_id: roomId,
    sender_id: userId,
    sender_type,
    content: data.content || '',
    content_type: data.content_type || 'text',
  };
  await ChatModel.saveMessage(message);
  await del(`chat:rooms:${userId}`);
  return message;
};

exports.getMessages = async (userId, roomId, query) => {
  const { page = 1, limit = 20 } = query;
  const room = await ChatModel.findRoomById(roomId);
  if (!room) throw Object.assign(new Error('Room not found'), { status: 404 });
  if (room.user_id !== userId) throw Object.assign(new Error('Forbidden'), { status: 403 });

  if (page === 1) {
    const cacheKey = `chat:messages:${roomId}:1`;
    const cached = await get(cacheKey);
    if (cached) return cached;
    const result = await ChatModel.getRoomMessages(roomId, { page: 1, limit });
    await set(cacheKey, result, 10);
    return result;
  }

  return ChatModel.getRoomMessages(roomId, { page: Number(page), limit: Number(limit) });
};

exports.toggleBookmark = async (userId, messageId) => {
  return ChatModel.toggleBookmark(messageId);
};

exports.listBookmarks = async (userId) => {
  const cacheKey = `chat:bookmarks:${userId}`;
  const cached = await get(cacheKey);
  if (cached) return cached;

  const bookmarks = await ChatModel.listBookmarks(userId);
  await set(cacheKey, bookmarks, 60);
  return bookmarks;
};

exports.closeRoom = async (userId, roomId) => {
  const room = await ChatModel.findRoomById(roomId);
  if (!room) throw Object.assign(new Error('Room not found'), { status: 404 });
  if (room.user_id !== userId) throw Object.assign(new Error('Forbidden'), { status: 403 });

  await ChatModel.closeRoom(roomId);
  await del(`chat:rooms:${userId}`);
  return { message: 'Room closed' };
};
