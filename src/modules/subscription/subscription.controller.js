const SubscriptionService = require('./subscription.service');

exports.listPlans = async (req, res, next) => {
  try {
    const result = await SubscriptionService.listPlans();
    res.json(result);
  } catch (e) { next(e); }
};

exports.getMySubscription = async (req, res, next) => {
  try {
    const result = await SubscriptionService.getMySubscription(req.user.id);
    res.json(result);
  } catch (e) { next(e); }
};

exports.purchase = async (req, res, next) => {
  try {
    const result = await SubscriptionService.purchase(req.user.id, req.body);
    res.json(result);
  } catch (e) { next(e); }
};

exports.webhook = async (req, res, next) => {
  try {
    const result = await SubscriptionService.handleWebhook(req.body);
    res.json(result);
  } catch (e) { next(e); }
};

exports.getHistory = async (req, res, next) => {
  try {
    const result = await SubscriptionService.getHistory(req.user.id);
    res.json(result);
  } catch (e) { next(e); }
};
