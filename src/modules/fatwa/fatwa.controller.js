const FatwaService = require('./fatwa.service');

exports.list = async (req, res, next) => {
  try {
    const result = await FatwaService.list(req.query);
    res.json(result);
  } catch (e) { next(e); }
};

exports.getById = async (req, res, next) => {
  try {
    const result = await FatwaService.getById(req.params.id);
    res.json(result);
  } catch (e) { next(e); }
};

exports.toggleBookmark = async (req, res, next) => {
  try {
    const result = await FatwaService.toggleBookmark(req.user.id, req.params.id);
    res.json(result);
  } catch (e) { next(e); }
};

exports.listBookmarks = async (req, res, next) => {
  try {
    const result = await FatwaService.listBookmarks(req.user.id);
    res.json(result);
  } catch (e) { next(e); }
};

exports.create = async (req, res, next) => {
  try {
    const result = await FatwaService.create(req.body);
    res.status(201).json(result);
  } catch (e) { next(e); }
};

exports.update = async (req, res, next) => {
  try {
    const result = await FatwaService.update(req.params.id, req.body);
    res.json(result);
  } catch (e) { next(e); }
};
