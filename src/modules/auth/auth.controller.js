const service = require('./auth.service');

exports.register = async (req, res, next) => {
  try {
    const result = await service.register(req.body);
    res.status(201).json(result);
  } catch (e) { next(e); }
};

exports.verifyOtp = async (req, res, next) => {
  try {
    const result = await service.verifyOtp(req.body);
    res.json(result);
  } catch (e) { next(e); }
};

exports.login = async (req, res, next) => {
  console.log('[LOGIN] Request body:', { ...req.body, password: '***' });
  try {
    const result = await service.login(req.body);
    console.log('[LOGIN] Success:', { id: result.user?.id, phone: result.user?.phone });
    res.json(result);
  } catch (e) {
    console.log('[LOGIN] Error:', e.message, 'Status:', e.status || 500);
    next(e);
  }
};

exports.refresh = async (req, res, next) => {
  try {
    const result = await service.refresh(req.body.refresh_token);
    res.json(result);
  } catch (e) { next(e); }
};

exports.logout = async (req, res, next) => {
  try {
    const result = await service.logout(req.user.id);
    res.json(result);
  } catch (e) { next(e); }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const result = await service.forgotPassword(req.body);
    res.json(result);
  } catch (e) { next(e); }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const result = await service.resetPassword(req.body);
    res.json(result);
  } catch (e) { next(e); }
};
