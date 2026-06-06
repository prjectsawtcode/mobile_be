const service = require('./user.service');

exports.getMe = async (req, res, next) => {
  try { res.json(await service.getMe(req.user.id)); } catch (e) { next(e); }
};

exports.updateMe = async (req, res, next) => {
  try { res.json(await service.updateMe(req.user.id, req.body)); } catch (e) { next(e); }
};

exports.updateAvatar = async (req, res, next) => {
  try { res.json(await service.updateAvatar(req.user.id, req.file)); } catch (e) { next(e); }
};

exports.getById = async (req, res, next) => {
  try { res.json(await service.getPublicProfile(req.params.id)); } catch (e) { next(e); }
};

exports.list = async (req, res, next) => {
  try { res.json(await service.listUsers(req.query)); } catch (e) { next(e); }
};

exports.updateRole = async (req, res, next) => {
  try { res.json(await service.updateRole(req.params.id, req.body.role)); } catch (e) { next(e); }
};
