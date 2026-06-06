const { v4: uuidv4 } = require('uuid');
const model = require('./subscription.model');

async function getPlans() {
  return model.getPlans();
}

async function getMySubscription(userId) {
  return model.getUserSubscription(userId);
}

async function purchase(userId, { plan_id, gateway }) {
  const plan = await model.getPlanById(plan_id);
  if (!plan) throw Object.assign(new Error('Invalid plan'), { status: 400 });

  const subId = uuidv4();
  const expiresAt = plan.duration_days
    ? new Date(Date.now() + plan.duration_days * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ')
    : null;

  await model.createSubscription({
    id: subId,
    user_id: userId,
    plan_id,
    status: 'pending',
    expires_at: expiresAt,
    remaining_chats: plan.chat_limit,
    payment_ref: `SUB-${subId.slice(0, 8)}`,
  });

  const txnId = uuidv4();
  await model.createTransaction({
    id: txnId,
    user_id: userId,
    subscription_id: subId,
    amount: plan.price,
    gateway: gateway || 'upi',
    status: 'pending',
    gateway_ref: null,
  });

  const upiIntent = `upi://pay?pa=merchant@upi&pn=SawtDeen&am=${plan.price}&tr=${subId}`;

  return {
    subscription_id: subId,
    amount: parseFloat(plan.price),
    upi_intent: upiIntent,
  };
}

async function webhook(body) {
  const { subscription_id, status, gateway_ref } = body;
  const { pool } = require('../../config/db');
  await pool.query('UPDATE user_subscriptions SET status = ?, payment_ref = ? WHERE id = ?',
    [status === 'success' ? 'active' : 'expired', gateway_ref, subscription_id]);
  await pool.query(
    'UPDATE payment_transactions SET status = ?, gateway_ref = ? WHERE subscription_id = ? ORDER BY created_at DESC LIMIT 1',
    [status, gateway_ref, subscription_id]
  );
  return { message: 'Webhook processed' };
}

async function getHistory(userId) {
  return model.getHistory(userId);
}

module.exports = { getPlans, getMySubscription, purchase, webhook, getHistory };
