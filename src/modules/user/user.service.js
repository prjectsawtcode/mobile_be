const { randomUUID } = require('crypto');
const model = require('./user.model');
const authModel = require('../auth/auth.model');
const { pool } = require('../../config/db');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

function resolveUrl(url) {
  if (!url || url.startsWith('http')) return url;
  return `${BASE_URL}${url}`;
}

function calcCompletion(profile) {
  if (!profile) return 0;
  const fields = [profile.avatar_url, profile.address, profile.city, profile.state,
    profile.date_of_birth, profile.bio, profile.mosque_affiliation];
  const filled = fields.filter(Boolean).length;
  return Math.round((filled / fields.length) * 100);
}

async function getMe(userId) {
  const user = await authModel.findById(userId);
  if (!user) throw Object.assign(new Error('User not found'), { status: 404 });
  const profile = await model.findById(userId);
  if (profile) profile.avatar_url = resolveUrl(profile.avatar_url);
  return { ...user, profile: profile || {}, profile_completion: calcCompletion(profile) };
}

async function updateMe(userId, data) {
  const { name, email, bio, city, state, address, date_of_birth, mosque_affiliation, avatar_url } = data;
  
  const userUpdates = [];
  const userParams = [];
  if (name) { userUpdates.push('name = ?'); userParams.push(name); }
  if (email !== undefined) { userUpdates.push('email = ?'); userParams.push(email); }
  if (userUpdates.length) {
    userParams.push(userId);
    await pool.query(`UPDATE users SET ${userUpdates.join(', ')} WHERE id = ?`, userParams);
  }

  const profileData = {};
  if (bio !== undefined) profileData.bio = bio;
  if (city !== undefined) profileData.city = city;
  if (state !== undefined) profileData.state = state;
  if (address !== undefined) profileData.address = address;
  if (date_of_birth !== undefined) profileData.date_of_birth = date_of_birth;
  if (mosque_affiliation !== undefined) profileData.mosque_affiliation = mosque_affiliation;
  if (avatar_url !== undefined) profileData.avatar_url = avatar_url;

  if (Object.keys(profileData).length) await model.upsert(userId, profileData);
  return getMe(userId);
}


async function updateAvatar(userId, file) {
  if (!file) throw Object.assign(new Error('No file uploaded'), { status: 400 });
  const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
  const url = `${BASE_URL}/uploads/${file.filename}`;
  await model.updateAvatar(userId, url);
  return { avatar_url: url };
}

async function getPublicProfile(id) {
  const user = await authModel.findById(id);
  if (!user) throw Object.assign(new Error('User not found'), { status: 404 });
  const profile = await model.findById(id);
  if (profile) profile.avatar_url = resolveUrl(profile.avatar_url);
  delete user.phone;
  return { ...user, profile: profile || {} };
}

async function listUsers({ page = 1, limit = 20, search }) {
  return model.findAll({ page: Number(page), limit: Number(limit), search });
}

async function updateRole(userId, role) {
  const valid = ['user', 'admin', 'scholar'];
  if (!valid.includes(role)) throw Object.assign(new Error('Invalid role'), { status: 400 });
  await model.updateRole(userId, role);
  return { message: 'Role updated' };
}

module.exports = { getMe, updateMe, updateAvatar, getPublicProfile, listUsers, updateRole };
