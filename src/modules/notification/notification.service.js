const model = require('./notification.model');

async function list(userId, { page, limit }) {
  return model.findByUser(userId, Number(page) || 1, Number(limit) || 20);
}

async function markRead(userId, id) {
  await model.markRead(id);
  return { message: 'Marked as read' };
}

async function markAllRead(userId) {
  await model.markAllRead(userId);
  return { message: 'All marked as read' };
}

async function unreadCount(userId) {
  const count = await model.unreadCount(userId);
  return { count };
}

async function updateFcmToken(userId, { fcm_token }) {
  const authModel = require('../auth/auth.model');
  await authModel.updateFcmToken(userId, fcm_token);
  return { message: 'FCM token updated' };
}

module.exports = { list, markRead, markAllRead, unreadCount, updateFcmToken };
