const UserService = require('./user.service');

exports.getMe = async (req, res, next) => {
  try {
    const result = await UserService.getMe(req.user.id);
    res.json(result);
  } catch (e) { next(e); }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const result = await UserService.updateProfile(req.user.id, req.body);
    res.json(result);
  } catch (e) { next(e); }
};

exports.updateAvatar = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const avatar_url = `/uploads/${req.file.filename}`;
    const result = await UserService.updateAvatar(req.user.id, avatar_url);
    res.json(result);
  } catch (e) { next(e); }
};

exports.getPublicProfile = async (req, res, next) => {
  try {
    const result = await UserService.getPublicProfile(req.params.id);
    res.json(result);
  } catch (e) { next(e); }
};

exports.list = async (req, res, next) => {
  try {
    const result = await UserService.listUsers(req.query);
    res.json(result);
  } catch (e) { next(e); }
};

exports.updateRole = async (req, res, next) => {
  try {
    const result = await UserService.updateRole(req.params.id, req.body.role);
    res.json(result);
  } catch (e) { next(e); }
};
