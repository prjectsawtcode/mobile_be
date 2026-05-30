const AuthService = require('./auth.service');

exports.register = async (req, res, next) => {
  try {
    const result = await AuthService.register(req.body);
    res.status(201).json(result);
  } catch (e) { next(e); }
};

exports.verifyOtp = async (req, res, next) => {
  try {
    const result = await AuthService.verifyOtp(req.body);
    res.json(result);
  } catch (e) { next(e); }
};

exports.login = async (req, res, next) => {
  try {
    const result = await AuthService.login(req.body);
    res.json(result);
  } catch (e) { next(e); }
};

exports.refresh = async (req, res, next) => {
  try {
    const result = await AuthService.refresh(req.body.refresh_token);
    res.json(result);
  } catch (e) { next(e); }
};

exports.logout = async (req, res, next) => {
  try {
    const result = await AuthService.logout(req.user.id);
    res.json(result);
  } catch (e) { next(e); }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const result = await AuthService.forgotPassword(req.body);
    res.json(result);
  } catch (e) { next(e); }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const result = await AuthService.resetPassword(req.body);
    res.json(result);
  } catch (e) { next(e); }
};
