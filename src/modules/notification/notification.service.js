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

async function createReminder(userId, { type, title, body, data }) {
  const { randomUUID } = require('crypto');
  const id = randomUUID();
  await model.create({ id, user_id: userId, title: title || 'Reminder', body: body || '', type: type || 'system', data: data || {} });
  return { message: 'Reminder created', id };
}

async function sendAnnouncementNotification({ title, body, announcement_id }) {
  const { pool } = require('../../config/db');
  const { randomUUID } = require('crypto');
  const [users] = await pool.query('SELECT id FROM users');
  
  for (const user of users) {
    await model.create({
      id: randomUUID(),
      user_id: user.id,
      title: title || '📢 New Jamaath Announcement',
      body: body || 'A new announcement has been published by your Jamaath.',
      type: 'announcement',
      data: { announcement_id },
    });
  }
  return { message: `Announcement notification sent to ${users.length} members` };
}

async function sendPrayerAlertNotification({ prayer_name, title, body }) {
  const { pool } = require('../../config/db');
  const { randomUUID } = require('crypto');
  const [users] = await pool.query('SELECT id FROM users');

  for (const user of users) {
    await model.create({
      id: randomUUID(),
      user_id: user.id,
      title: title || `🕌 Prayer Time Alert - ${prayer_name || 'Salat'}`,
      body: body || `It is now time for ${prayer_name || 'prayer'}. May Allah accept your prayers.`,
      type: 'prayer',
      data: { prayer_name },
    });
  }
  return { message: `Prayer alert notification sent to ${users.length} members` };
}

async function sendBillPaymentNotification({ userId, user_id, amount, bill_title, receipt_no, body }) {
  const { randomUUID } = require('crypto');
  const targetUserId = userId || user_id;
  const id = randomUUID();
  const title = receipt_no ? '🧾 Payment Receipt Issued' : '💳 New Jamaath Bill Generated';
  const desc = body || (receipt_no 
    ? `Payment receipt #${receipt_no} for ₹${amount || 0} has been collected successfully.` 
    : `New bill "${bill_title || 'Monthly Dues'}" of ₹${amount || 0} has been generated for your account.`);

  if (targetUserId) {
    await model.create({
      id,
      user_id: targetUserId,
      title,
      body: desc,
      type: 'payment',
      data: { amount, bill_title, receipt_no },
    });
    return { message: 'Bill/Payment notification sent to member' };
  } else {
    const { pool } = require('../../config/db');
    const [users] = await pool.query('SELECT id FROM users');
    for (const u of users) {
      await model.create({
        id: randomUUID(),
        user_id: u.id,
        title,
        body: desc,
        type: 'payment',
        data: { amount, bill_title, receipt_no },
      });
    }
    return { message: `Bill/Payment notification broadcast to ${users.length} members` };
  }
}

module.exports = {
  list,
  markRead,
  markAllRead,
  unreadCount,
  updateFcmToken,
  createReminder,
  sendAnnouncementNotification,
  sendPrayerAlertNotification,
  sendBillPaymentNotification,
};

