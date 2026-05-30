const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { redis } = require('../../config/cache');
const AuthModel = require('./auth.model');

function generateAccessToken(user) {
  return jwt.sign(
    { id: user.id, phone: user.phone, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
}

async function generateRefreshToken(userId) {
  const token = uuidv4();
  const expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await AuthModel.saveRefreshToken({ id: uuidv4(), user_id: userId, token, expires_at });
  return token;
}

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function storeOtp(phone, otp) {
  await redis.set(`otp:${phone}`, otp, 'EX', 300);
}

async function getOtp(phone) {
  return redis.get(`otp:${phone}`);
}

async function checkOtpRateLimit(phone) {
  const key = `otp_rate:${phone}`;
  const exists = await redis.get(key);
  if (exists) throw Object.assign(new Error('Too many requests. Try again later.'), { status: 429 });
  await redis.set(key, '1', 'EX', 60);
}

exports.register = async ({ phone, password, name, email, gender }) => {
  const existing = await AuthModel.findByPhone(phone);
  if (existing) throw Object.assign(new Error('Phone already registered'), { status: 409 });

  const password_hash = await bcrypt.hash(password, 12);
  const id = uuidv4();
  await AuthModel.create({ id, phone, name, email, gender, password_hash });

  const otp = generateOtp();
  await checkOtpRateLimit(phone);
  await storeOtp(phone, otp);
  console.log(`OTP for ${phone}: ${otp}`);

  return { message: 'Registration successful. Verify OTP.', user_id: id };
};

exports.verifyOtp = async ({ phone, otp }) => {
  const stored = await getOtp(phone);
  if (!stored || stored !== otp) {
    throw Object.assign(new Error('Invalid or expired OTP'), { status: 400 });
  }
  await redis.del(`otp:${phone}`);
  return { message: 'Phone verified successfully' };
};

exports.login = async ({ phone, password, fcm_token }) => {
  const user = await AuthModel.findByPhone(phone);
  if (!user) throw Object.assign(new Error('Invalid credentials'), { status: 401 });

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) throw Object.assign(new Error('Invalid credentials'), { status: 401 });

  if (fcm_token) {
    await AuthModel.updateFcmToken(user.id, fcm_token);
  }

  const access_token = generateAccessToken(user);
  const refresh_token = await generateRefreshToken(user.id);

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
};

exports.refresh = async (refreshToken) => {
  const stored = await AuthModel.findRefreshToken(refreshToken);
  if (!stored) throw Object.assign(new Error('Invalid refresh token'), { status: 401 });

  await AuthModel.deleteRefreshToken(refreshToken);

  const user = await AuthModel.findById(stored.user_id);
  if (!user) throw Object.assign(new Error('User not found'), { status: 401 });

  const access_token = generateAccessToken(user);
  const new_refresh_token = await generateRefreshToken(user.id);

  return { access_token, refresh_token: new_refresh_token };
};

exports.logout = async (userId) => {
  await AuthModel.deleteUserRefreshTokens(userId);
  return { message: 'Logged out successfully' };
};

exports.forgotPassword = async ({ phone }) => {
  const user = await AuthModel.findByPhone(phone);
  if (!user) throw Object.assign(new Error('Phone not registered'), { status: 404 });

  const otp = generateOtp();
  await checkOtpRateLimit(phone);
  await storeOtp(phone, otp);
  console.log(`OTP for password reset ${phone}: ${otp}`);

  return { message: 'OTP sent for password reset' };
};

exports.resetPassword = async ({ phone, otp, password }) => {
  const stored = await getOtp(phone);
  if (!stored || stored !== otp) {
    throw Object.assign(new Error('Invalid or expired OTP'), { status: 400 });
  }

  const password_hash = await bcrypt.hash(password, 12);
  await AuthModel.updatePassword(phone, password_hash);
  await redis.del(`otp:${phone}`);

  return { message: 'Password reset successfully' };
};
