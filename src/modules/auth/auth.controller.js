const service = require('./auth.service');

// Register a new user — validates input, creates DB record, stores OTP in Redis
exports.register = async (req, res, next) => {
  try {
    const result = await service.register(req.body);
    res.status(201).json(result);
  } catch (e) { next(e); }
};

// Verify OTP — checks Redis for matching code, marks phone_verified in DB
exports.verifyOtp = async (req, res, next) => {
  try {
    const result = await service.verifyOtp(req.body);
    res.json(result);
  } catch (e) { next(e); }
};

// Authenticate user — validates credentials, returns JWT + refresh token + profile
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

// Refresh token — validates existing refresh token, issues new JWT pair
exports.refresh = async (req, res, next) => {
  try {
    const token = req.body.refresh_token || req.body.refreshToken;
    const result = await service.refresh(token);
    res.json(result);
  } catch (e) { next(e); }
};


// Logout — deletes all refresh tokens for the authenticated user
exports.logout = async (req, res, next) => {
  try {
    const result = await service.logout(req.user.id);
    res.json(result);
  } catch (e) { next(e); }
};

// Forgot password — sends OTP to phone (stored in Redis under otp:reset: prefix)
exports.forgotPassword = async (req, res, next) => {
  try {
    const result = await service.forgotPassword(req.body);
    res.json(result);
  } catch (e) { next(e); }
};

// Reset password — validates OTP, updates password hash in DB
exports.resetPassword = async (req, res, next) => {
  try {
    const result = await service.resetPassword(req.body);
    res.json(result);
  } catch (e) { next(e); }
};

// Resend OTP — generates new OTP, stores in Redis, sends SMS
exports.resendOtp = async (req, res, next) => {
  try {
    const result = await service.resendOtp(req.body);
    res.json(result);
  } catch (e) { next(e); }
};

// Delete Account — permanently deletes user record and stored refresh tokens
exports.deleteAccount = async (req, res, next) => {
  try {
    const result = await service.deleteAccount(req.user.id);
    res.json(result);
  } catch (e) { next(e); }
};

