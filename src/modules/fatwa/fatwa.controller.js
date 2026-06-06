const service = require('./fatwa.service');

exports.list = async (req, res, next) => {
  try { res.json(await service.list(req.query)); } catch (e) { next(e); }
};

exports.getById = async (req, res, next) => {
  try { res.json(await service.getById(req.params.id)); } catch (e) { next(e); }
};

exports.create = async (req, res, next) => {
  try { res.status(201).json(await service.create(req.user.id, req.body)); } catch (e) { next(e); }
};

exports.update = async (req, res, next) => {
  try { res.json(await service.update(req.params.id, req.body)); } catch (e) { next(e); }
};

exports.toggleBookmark = async (req, res, next) => {
  try { res.json(await service.toggleBookmark(req.user.id, req.params.id)); } catch (e) { next(e); }
};

exports.listBookmarks = async (req, res, next) => {
  try { res.json(await service.listBookmarks(req.user.id)); } catch (e) { next(e); }
};
