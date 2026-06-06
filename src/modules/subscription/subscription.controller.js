const service = require('./subscription.service');

exports.getPlans = async (_req, res, next) => {
  try { res.json(await service.getPlans()); } catch (e) { next(e); }
};

exports.getMySubscription = async (req, res, next) => {
  try { res.json(await service.getMySubscription(req.user.id)); } catch (e) { next(e); }
};

exports.purchase = async (req, res, next) => {
  try { res.json(await service.purchase(req.user.id, req.body)); } catch (e) { next(e); }
};

exports.webhook = async (req, res, next) => {
  try { res.json(await service.webhook(req.body)); } catch (e) { next(e); }
};

exports.getHistory = async (req, res, next) => {
  try { res.json(await service.getHistory(req.user.id)); } catch (e) { next(e); }
};
