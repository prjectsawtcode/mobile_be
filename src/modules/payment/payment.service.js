const { randomUUID } = require('crypto');
const model = require('./payment.model');
const notificationModel = require('../notification/notification.model');
const { sendSMS } = require('../../utils/sms');

async function createRequest(data, userId) {
  const id = randomUUID();
  return model.createRequest({ id, ...data, user_id: userId });
}

async function listRequests(query) {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 20;
  return model.findAllRequests({
    status: query.status,
    katha_number: query.katha_number,
    page,
    limit,
  });
}

async function getRequest(id) {
  const req = await model.findRequestById(id);
  if (!req) throw Object.assign(new Error('Payment request not found'), { status: 404 });
  return req;
}

async function updateStatus(id, status, adminId, remark) {
  const req = await model.findRequestById(id);
  if (!req) throw Object.assign(new Error('Payment request not found'), { status: 404 });
  if (req.status !== 'pending') {
    throw Object.assign(new Error('Only pending requests can be updated'), { status: 400 });
  }
  const updated = await model.updateRequestStatus(id, status, adminId, remark);

  if (req.user_id) {
    const notifId = randomUUID();
    const title = status === 'approved' ? 'Payment Approved' : 'Payment Rejected';
    const body = status === 'approved'
      ? `Your ${req.payment_type} payment of Rs.${req.amount} has been approved.`
      : `Your ${req.payment_type} payment of Rs.${req.amount} has been rejected.${remark ? ' Remark: ' + remark : ''}`;
    await notificationModel.create({
      id: notifId,
      user_id: req.user_id,
      title,
      body,
      type: 'payment',
      data: { payment_id: id, status, remark },
    });

    // Send SMS notification
    try {
      const { pool } = require('../../config/db');
      const [[user]] = await pool.query('SELECT phone FROM users WHERE id = ?', [req.user_id]);
      if (user?.phone) {
        const smsMsg = status === 'approved'
          ? `Dear ${req.member_name}, your ${req.payment_type} payment of Rs.${req.amount} has been approved. - SawtDeen`
          : `Dear ${req.member_name}, your ${req.payment_type} payment of Rs.${req.amount} has been rejected.${remark ? ' Reason: ' + remark : ''} - SawtDeen`;
        // sendSMS({ numbers: [user.phone], message: smsMsg });
      }
    } catch (_) { /* SMS non-blocking */ }
  }

  return updated;
}

async function getMemberRequests(kathaNumber) {
  return model.findMemberRequests(kathaNumber);
}

async function getSettings() {
  return model.getSettings();
}

async function updateSettings(data) {
  return model.updateSettings(data);
}

module.exports = {
  createRequest,
  listRequests,
  getRequest,
  updateStatus,
  getMemberRequests,
  getSettings,
  updateSettings,
};
