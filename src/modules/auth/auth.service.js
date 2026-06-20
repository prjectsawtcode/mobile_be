const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');
const { get: cacheGet, set: cacheSet, del: cacheDel } = require('../../config/cache');
const { sendOtp, getDevOtp } = require('../../utils/sms');
const model = require('./auth.model');

// Create a short-lived JWT (15 min) containing user id, phone, and role
function generateAccessToken(user) {
  return jwt.sign(
    { id: user.id, phone: user.phone, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
}

// Register: check duplicate, hash password, create user in DB, store OTP in Redis
async function register({ phone, password, name, email, gender }) {
  const existing = await model.findByPhone(phone);
  if (existing) throw Object.assign(new Error('Phone already registered'), { status: 409 });

  const id = randomUUID();
  const password_hash = await bcrypt.hash(password, 12);
  try {
    await model.create({ id, phone, name, email, gender, password_hash });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      throw Object.assign(new Error('Phone already registered'), { status: 409 });
    }
    throw err;
  }

  const otp = process.env.NODE_ENV === 'development' ? getDevOtp() : String(Math.floor(100000 + Math.random() * 900000));
  await cacheSet(`otp:${phone}`, otp, 300);
  await sendOtp(phone, otp);
  return { message: 'Registration successful. Verify OTP.', user_id: id };
}

// Verify OTP: match against Redis value, mark phone_verified in DB, delete OTP
async function verifyOtp({ phone, otp }) {
  const stored = await cacheGet(`otp:${phone}`);
  if (!stored || stored !== otp) throw Object.assign(new Error('Invalid or expired OTP'), { status: 400 });
  await cacheDel(`otp:${phone}`);
  await model.markPhoneVerified(phone);
  return { message: 'Phone verified successfully' };
}

// Login: find user, check verification, compare password, return tokens + profile
async function login({ phone, password, fcm_token }) {
  console.log('[LOGIN:SERVICE] Finding user by phone:', phone);
  const user = await model.findByPhone(phone);
  if (!user) {
    console.log('[LOGIN:SERVICE] User not found for phone:', phone);
    throw Object.assign(new Error('Invalid credentials'), { status: 401 });
  }
  console.log('[LOGIN:SERVICE] User found:', { id: user.id, phone: user.phone, role: user.role, phone_verified: user.phone_verified });

  if (!user.phone_verified) {
    console.log('[LOGIN:SERVICE] Phone not verified:', phone);
    throw Object.assign(new Error('Please verify your phone via OTP first'), { status: 403 });
  }

  console.log('[LOGIN:SERVICE] Comparing password');
  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    console.log('[LOGIN:SERVICE] Password mismatch for phone:', phone);
    throw Object.assign(new Error('Invalid credentials'), { status: 401 });
  }
  console.log('[LOGIN:SERVICE] Password matched');

  if (fcm_token) {
    console.log('[LOGIN:SERVICE] Updating FCM token');
    await model.updateFcmToken(user.id, fcm_token);
  }

  const access_token = generateAccessToken(user);
  const refresh_token = randomUUID();
  console.log('[LOGIN:SERVICE] Saving refresh token');
  await model.saveRefreshToken(randomUUID(), user.id, refresh_token, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

  console.log('[LOGIN:SERVICE] Login complete for user:', user.id);
  return {
    access_token,
    refresh_token,
    user: {
      id: user.id,
      phone: user.phone,
      name: user.name,
      email: user.email,
      gender: user.gender,
      role: user.role,
    },
  };
}

// Refresh: validate existing refresh token, delete it, issue a new JWT pair
async function refresh(refreshToken) {
  const stored = await model.findRefreshToken(refreshToken);
  if (!stored) throw Object.assign(new Error('Invalid refresh token'), { status: 401 });

  await model.deleteRefreshToken(refreshToken);

  const user = await model.findById(stored.user_id);
  if (!user) throw Object.assign(new Error('User not found'), { status: 404 });

  const access_token = generateAccessToken(user);
  const new_refresh_token = randomUUID();
  await model.saveRefreshToken(randomUUID(), user.id, new_refresh_token, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

  return { access_token, refresh_token: new_refresh_token };
}

// Logout: delete all stored refresh tokens for the user
async function logout(userId) {
  await model.deleteUserRefreshTokens(userId);
  return { message: 'Logged out successfully' };
}

// Forgot password: store reset OTP in Redis (silently succeeds even if phone is unknown)
async function forgotPassword({ phone }) {
  const user = await model.findByPhone(phone);
  if (!user) return { message: 'OTP sent for password reset' };

  const otp = process.env.NODE_ENV === 'development' ? getDevOtp() : String(Math.floor(100000 + Math.random() * 900000));
  await cacheSet(`otp:reset:${phone}`, otp, 300);
  await sendOtp(phone, otp);
  return { message: 'OTP sent for password reset' };
}

async function resetPassword({ phone, otp, password }) {
  const stored = await cacheGet(`otp:reset:${phone}`);
  if (!stored || stored !== otp) throw Object.assign(new Error('Invalid or expired OTP'), { status: 400 });

  const password_hash = await bcrypt.hash(password, 12);
  await model.updatePassword(phone, password_hash);
  await cacheDel(`otp:reset:${phone}`);
  return { message: 'Password reset successfully' };
}

// Resend OTP — generates new OTP for registration or password reset
async function resendOtp({ phone, type }) {
  if (type === 'reset') {
    const user = await model.findByPhone(phone);
    if (!user) return { message: 'OTP sent' };
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    await cacheSet(`otp:reset:${phone}`, otp, 300);
    await sendOtp(phone, otp);
    return { message: 'OTP resent for password reset' };
  }

  // Default: registration OTP resend (no user check — just overwrite)
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  await cacheSet(`otp:${phone}`, otp, 300);
  await sendOtp(phone, otp);
  return { message: 'OTP resent successfully' };
}

module.exports = { register, verifyOtp, login, refresh, logout, forgotPassword, resetPassword, resendOtp };
