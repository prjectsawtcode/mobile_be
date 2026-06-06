const service = require('./announcement.service');

exports.list = async (req, res, next) => {
  try { res.json(await service.list(req.query)); } catch (e) { next(e); }
};

exports.listExpired = async (req, res, next) => {
  try { res.json(await service.listExpired(req.query)); } catch (e) { next(e); }
};

exports.getById = async (req, res, next) => {
  try { res.json(await service.getById(req.params.id)); } catch (e) { next(e); }
};

exports.create = async (req, res, next) => {
  try {
    const result = await service.create(req.user.id, req.body);
    res.status(201).json(result);
  } catch (e) { next(e); }
};

exports.update = async (req, res, next) => {
  try { res.json(await service.update(req.params.id, req.body)); } catch (e) { next(e); }
};

exports.remove = async (req, res, next) => {
  try { res.json(await service.remove(req.params.id)); } catch (e) { next(e); }
};
