const service = require('./prayer.service');

exports.getTimes = async (req, res, next) => {
  try { res.json(await service.getTimes(req.user.id, req.query)); } catch (e) { next(e); }
};

exports.getMonth = async (req, res, next) => {
  try { res.json(await service.getMonth(req.user.id, req.query)); } catch (e) { next(e); }
};

exports.getPreferences = async (req, res, next) => {
  try { res.json(await service.getPreferences(req.user.id)); } catch (e) { next(e); }
};

exports.updatePreferences = async (req, res, next) => {
  try { res.json(await service.updatePreferences(req.user.id, req.body)); } catch (e) { next(e); }
};
