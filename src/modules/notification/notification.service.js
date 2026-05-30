const { del, incr, decr, get, set } = require('../../config/cache');
const db = require('../../config/db');
const NotificationModel = require('./notification.model');

exports.list = async (userId, query) => {
  const { page = 1, limit = 20 } = query;
  const cacheKey = `notifications:${userId}:${page}:${limit}`;

  const cached = await get(cacheKey);
  if (cached) return cached;

  const result = await NotificationModel.list(userId, { page: Number(page), limit: Number(limit) });
  await set(cacheKey, result, 30);
  return result;
};

exports.markRead = async (userId, id) => {
  await NotificationModel.markRead(id, userId);
  await del(`notifications:${userId}:*`);
  await del(`notifications:unread:${userId}`);
};

exports.markAllRead = async (userId) => {
  await NotificationModel.markAllRead(userId);
  await del(`notifications:${userId}:*`);
  await del(`notifications:unread:${userId}`);
};

exports.unreadCount = async (userId) => {
  const cacheKey = `notifications:unread:${userId}`;
  const cached = await get(cacheKey);
  if (cached !== null) return cached;

  const count = await NotificationModel.unreadCount(userId);
  await set(cacheKey, count, 30);
  return count;
};

exports.updateFcmToken = async (userId, fcm_token) => {
  await db.query('UPDATE users SET fcm_token = ? WHERE id = ?', [fcm_token, userId]);
  return { message: 'FCM token updated' };
};
