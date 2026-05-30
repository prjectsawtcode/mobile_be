const AnnouncementService = require('./announcement.service');

exports.list = async (req, res, next) => {
  try {
    const result = await AnnouncementService.list(req.query);
    res.json(result);
  } catch (e) { next(e); }
};

exports.listExpired = async (req, res, next) => {
  try {
    const result = await AnnouncementService.listExpired(req.query);
    res.json(result);
  } catch (e) { next(e); }
};

exports.getById = async (req, res, next) => {
  try {
    const result = await AnnouncementService.getById(req.params.id);
    res.json(result);
  } catch (e) { next(e); }
};

exports.create = async (req, res, next) => {
  try {
    const result = await AnnouncementService.create(req.user.id, req.body);
    res.status(201).json(result);
  } catch (e) { next(e); }
};

exports.update = async (req, res, next) => {
  try {
    const result = await AnnouncementService.update(req.params.id, req.body);
    res.json(result);
  } catch (e) { next(e); }
};

exports.delete = async (req, res, next) => {
  try {
    const result = await AnnouncementService.delete(req.params.id);
    res.json(result);
  } catch (e) { next(e); }
};
