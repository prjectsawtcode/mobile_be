const service = require('./food_order.service');

exports.getMenu = async (req, res, next) => {
  try { res.json(await service.getMenu(req.query.provider_id)); } catch (e) { next(e); }
};

exports.getCategories = async (req, res, next) => {
  try { res.json(await service.getCategories(req.query.provider_id)); } catch (e) { next(e); }
};

exports.getCategoryById = async (req, res, next) => {
  try { res.json(await service.getCategoryById(req.params.id)); } catch (e) { next(e); }
};

exports.createCategory = async (req, res, next) => {
  try {
    const result = await service.createCategory(req.user.id, req.body);
    res.status(201).json(result);
  } catch (e) { next(e); }
};

exports.updateCategory = async (req, res, next) => {
  try {
    res.json(await service.updateCategory(req.params.id, req.user.id, req.user.role, req.body));
  } catch (e) { next(e); }
};

exports.removeCategory = async (req, res, next) => {
  try {
    res.json(await service.removeCategory(req.params.id, req.user.id, req.user.role));
  } catch (e) { next(e); }
};

exports.getMenuItems = async (req, res, next) => {
  try { res.json(await service.getMenuItems(req.params.categoryId)); } catch (e) { next(e); }
};

exports.createMenuItem = async (req, res, next) => {
  try {
    const result = await service.createMenuItem(req.user.id, req.body);
    res.status(201).json(result);
  } catch (e) { next(e); }
};

exports.updateMenuItem = async (req, res, next) => {
  try {
    res.json(await service.updateMenuItem(req.params.id, req.user.id, req.user.role, req.body));
  } catch (e) { next(e); }
};

exports.removeMenuItem = async (req, res, next) => {
  try {
    res.json(await service.removeMenuItem(req.params.id, req.user.id, req.user.role));
  } catch (e) { next(e); }
};

exports.listMyMenu = async (req, res, next) => {
  try { res.json(await service.listMyMenu(req.user.id)); } catch (e) { next(e); }
};
