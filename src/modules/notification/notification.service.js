const { randomUUID } = require('crypto');
const model = require('./notification.model');
const push = require('./push.service');
const { pool } = require('../../config/db');

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

async function createReminder(userId, { type, title, body, data }) {
  const id = randomUUID();
  const payload = {
    id,
    user_id: userId,
    title: title || 'Reminder',
    body: body || '',
    type: type || 'system',
    data: data || {},
  };
  await model.create(payload);
  const result = await push.sendToUsers([userId], {
    title: payload.title,
    body: payload.body,
    data: { type: payload.type, notification_id: id, ...payload.data },
  });
  return { message: 'Reminder created', id, push: result };
}

/**
 * Stores an in-app notification for every user and pushes it to their phones.
 * The DB write is the source of truth — if push fails or is unconfigured, the
 * notification still shows inside the app.
 */
async function broadcast({ title, body, type, data = {}, url }) {
  const [users] = await pool.query('SELECT id, fcm_token FROM users');
  if (!users.length) {
    return { recipients: 0, push: { enabled: false, sent: 0, failed: 0, pruned: 0 } };
  }

  const rows = users.map((u) => ({
    id: randomUUID(),
    user_id: u.id,
    title,
    body,
    type,
    data,
  }));
  await model.createMany(rows);

  const tokens = users.map((u) => u.fcm_token).filter(Boolean);
  const result = await push.sendToTokens(tokens, {
    title,
    body,
    data: { type, ...data },
    url,
  });

  return { recipients: users.length, devices: tokens.length, push: result };
}

async function sendToOneUser(userId, { title, body, type, data = {}, url }) {
  const id = randomUUID();
  await model.create({ id, user_id: userId, title, body, type, data });
  const result = await push.sendToUsers([userId], {
    title,
    body,
    data: { type, notification_id: id, ...data },
    url,
  });
  return { id, push: result };
}

// Generic broadcast — used by the admin "notify everyone" endpoint.
async function sendBroadcastNotification({ title, body, type, data, url }) {
  const res = await broadcast({
    title: title || '📢 Sawtdeen',
    body: body || '',
    type: type || 'system',
    data: data || {},
    url,
  });
  return {
    message: `Notification sent to ${res.recipients} members (${res.push.sent} device(s) reached)`,
    ...res,
  };
}

async function sendAnnouncementNotification({ title, body, announcement_id, url }) {
  const res = await broadcast({
    title: title || '📢 New Jamaath Announcement',
    body: body || 'A new announcement has been published by your Jamaath.',
    type: 'announcement',
    data: { announcement_id },
    url,
  });
  return {
    message: `Announcement notification sent to ${res.recipients} members (${res.push.sent} device(s) reached)`,
    ...res,
  };
}

async function sendPrayerAlertNotification({ prayer_name, title, body, url }) {
  const res = await broadcast({
    title: title || `🕌 Prayer Time Alert - ${prayer_name || 'Salat'}`,
    body: body || `It is now time for ${prayer_name || 'prayer'}. May Allah accept your prayers.`,
    type: 'prayer',
    data: { prayer_name },
    url,
  });
  return {
    message: `Prayer alert notification sent to ${res.recipients} members (${res.push.sent} device(s) reached)`,
    ...res,
  };
}

async function sendBillPaymentNotification({ userId, user_id, amount, bill_title, receipt_no, body, url }) {
  const targetUserId = userId || user_id;
  const title = receipt_no ? '🧾 Payment Receipt Issued' : '💳 New Jamaath Bill Generated';
  const desc = body || (receipt_no
    ? `Payment receipt #${receipt_no} for ₹${amount || 0} has been collected successfully.`
    : `New bill "${bill_title || 'Monthly Dues'}" of ₹${amount || 0} has been generated for your account.`);
  const data = { amount, bill_title, receipt_no };

  if (targetUserId) {
    const res = await sendToOneUser(targetUserId, { title, body: desc, type: 'payment', data, url });
    return { message: 'Bill/Payment notification sent to member', ...res };
  }

  const res = await broadcast({ title, body: desc, type: 'payment', data, url });
  return {
    message: `Bill/Payment notification broadcast to ${res.recipients} members (${res.push.sent} device(s) reached)`,
    ...res,
  };
}

module.exports = {
  list,
  markRead,
  markAllRead,
  unreadCount,
  updateFcmToken,
  createReminder,
  broadcast,
  sendToOneUser,
  sendBroadcastNotification,
  sendAnnouncementNotification,
  sendPrayerAlertNotification,
  sendBillPaymentNotification,
};
