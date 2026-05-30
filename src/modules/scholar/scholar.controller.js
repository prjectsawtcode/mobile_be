const ScholarService = require('./scholar.service');

exports.list = async (req, res, next) => {
  try {
    const result = await ScholarService.list(req.query);
    res.json(result);
  } catch (e) { next(e); }
};

exports.getById = async (req, res, next) => {
  try {
    const result = await ScholarService.getById(req.params.id);
    res.json(result);
  } catch (e) { next(e); }
};

exports.getSchedule = async (req, res, next) => {
  try {
    const result = await ScholarService.getSchedule(req.params.id);
    res.json(result);
  } catch (e) { next(e); }
};

exports.updateSchedule = async (req, res, next) => {
  try {
    const result = await ScholarService.updateSchedule(req.user.id, req.params.id, req.body.schedules);
    res.json(result);
  } catch (e) { next(e); }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const result = await ScholarService.updateStatus(req.user.id, req.params.id, req.body.status);
    res.json(result);
  } catch (e) { next(e); }
};

exports.verifyAadhar = async (req, res, next) => {
  try {
    const result = await ScholarService.verifyAadhar(req.params.id);
    res.json(result);
  } catch (e) { next(e); }
};
