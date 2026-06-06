const service = require('./tour_package.service');

exports.list = async (req, res, next) => {
  try { res.json(await service.list(req.query)); } catch (e) { next(e); }
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
  try {
    res.json(await service.update(req.params.id, req.user.id, req.user.role, req.body));
  } catch (e) { next(e); }
};

exports.remove = async (req, res, next) => {
  try {
    res.json(await service.remove(req.params.id, req.user.id, req.user.role));
  } catch (e) { next(e); }
};

exports.listMy = async (req, res, next) => {
  try { res.json(await service.listMy(req.user.id)); } catch (e) { next(e); }
};
