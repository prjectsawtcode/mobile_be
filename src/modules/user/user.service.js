const { del, get, set, delPattern } = require('../../config/cache');
const UserModel = require('./user.model');

exports.getMe = async (userId) => {
  const cacheKey = `user:${userId}`;
  const cached = await get(cacheKey);
  if (cached) return cached;

  const user = await UserModel.findById(userId);
  if (!user) throw Object.assign(new Error('User not found'), { status: 404 });

  const profile = await UserModel.getProfile(userId);
  const result = { ...user, profile: profile || {} };

  const filled = Object.values(profile || {}).filter(v => v !== null && v !== undefined && v !== '').length;
  const totalFields = 8;
  result.profile_completion = Math.round((filled / totalFields) * 100);

  await set(cacheKey, result, 60);
  return result;
};

exports.updateProfile = async (userId, data) => {
  if (data.gender) throw Object.assign(new Error('Gender is immutable'), { status: 400 });

  await UserModel.upsertProfile(userId, data);
  await del(`user:${userId}`);

  return this.getMe(userId);
};

exports.updateAvatar = async (userId, avatar_url) => {
  await UserModel.updateAvatar(userId, avatar_url);
  await del(`user:${userId}`);
  return { avatar_url };
};

exports.getPublicProfile = async (id) => {
  const user = await UserModel.findById(id);
  if (!user) throw Object.assign(new Error('User not found'), { status: 404 });
  const profile = await UserModel.getProfile(id);
  return { ...user, profile: profile || {} };
};

exports.listUsers = async (query) => {
  const { page = 1, limit = 20, search } = query;
  const cacheKey = `users:list:${page}:${limit}:${search || ''}`;

  const cached = await get(cacheKey);
  if (cached) return cached;

  const result = await UserModel.list({ page: Number(page), limit: Number(limit), search });
  await set(cacheKey, result, 120);
  return result;
};

exports.updateRole = async (userId, role) => {
  await UserModel.updateUser(userId, { role });
  await del(`user:${userId}`);
  await delPattern('users:list:*');
  return { message: 'Role updated' };
};
