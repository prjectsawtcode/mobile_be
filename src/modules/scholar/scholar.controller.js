const service = require('./scholar.service');

exports.list = async (req, res, next) => {
  try { res.json(await service.list(req.query)); } catch (e) { next(e); }
};

exports.getById = async (req, res, next) => {
  try { res.json(await service.getById(req.params.id)); } catch (e) { next(e); }
};

exports.getSchedule = async (req, res, next) => {
  try { res.json(await service.getSchedule(req.params.id)); } catch (e) { next(e); }
};

exports.updateSchedule = async (req, res, next) => {
  try { res.json(await service.updateSchedule(req.user.id, req.body)); } catch (e) { next(e); }
};

exports.updateStatus = async (req, res, next) => {
  try { res.json(await service.updateStatus(req.user.id, req.body)); } catch (e) { next(e); }
};

exports.verifyAadhar = async (req, res, next) => {
  try { res.json(await service.verifyAadhar(req.user.id)); } catch (e) { next(e); }
};
