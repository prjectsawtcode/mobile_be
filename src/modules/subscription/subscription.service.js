const { v4: uuidv4 } = require('uuid');
const { get, set, del } = require('../../config/cache');
const SubscriptionModel = require('./subscription.model');

exports.listPlans = async () => {
  const cacheKey = 'subscription:plans';
  const cached = await get(cacheKey);
  if (cached) return cached;

  const plans = await SubscriptionModel.listPlans();
  await set(cacheKey, plans, 3600);
  return plans;
};

exports.getMySubscription = async (userId) => {
  const cacheKey = `subscription:user:${userId}`;
  const cached = await get(cacheKey);
  if (cached) return cached;

  const sub = await SubscriptionModel.getUserSubscription(userId);
  if (!sub) return null;

  await set(cacheKey, sub, 60);
  return sub;
};

exports.purchase = async (userId, { plan_id, gateway }) => {
  const plan = await SubscriptionModel.findPlan(plan_id);
  if (!plan) throw Object.assign(new Error('Invalid plan'), { status: 400 });

  const subId = uuidv4();
  const now = new Date();
  const expiresAt = plan.duration_days
    ? new Date(now.getTime() + plan.duration_days * 86400000)
    : null;

  await SubscriptionModel.createSubscription({
    id: subId,
    user_id: userId,
    plan_id,
    status: 'active',
    purchased_at: now,
    expires_at: expiresAt,
    remaining_chats: plan.chat_limit || null,
  });

  await SubscriptionModel.createTransaction({
    id: uuidv4(),
    user_id: userId,
    subscription_id: subId,
    amount: plan.price,
    currency: 'INR',
    gateway,
    status: 'pending',
  });

  const upiIntent = `upi://pay?pa=${process.env.UPI_MERCHANT_ID}&pn=SawtDeen&am=${plan.price}&tr=${subId}`;

  await del(`subscription:user:${userId}`);
  return { subscription_id: subId, amount: plan.price, upi_intent: upiIntent };
};

exports.handleWebhook = async (payload) => {
  const { subscription_id, status, gateway_ref, signature } = payload;

  const expectedSig = 'hmac_sha256'; // placeholder — implement HMAC verification
  if (!signature) throw Object.assign(new Error('Invalid signature'), { status: 400 });

  if (status === 'success') {
    await SubscriptionModel.updateSubscription(subscription_id, { status: 'active' });
    await SubscriptionModel.createTransaction({
      id: uuidv4(),
      subscription_id,
      status: 'success',
      gateway_ref,
    });
  }

  return { message: 'Webhook processed' };
};

exports.getHistory = async (userId) => {
  return SubscriptionModel.getHistory(userId);
};
