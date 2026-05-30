const { get, set, delPattern } = require('../../config/cache');
const ScholarModel = require('./scholar.model');

exports.list = async (query) => {
  const { type, page = 1, limit = 20 } = query;
  const cacheKey = `scholars:list:${type || 'all'}:${page}:${limit}`;

  const cached = await get(cacheKey);
  if (cached) return cached;

  const result = await ScholarModel.list({ type, page: Number(page), limit: Number(limit) });
  await set(cacheKey, result, 120);
  return result;
};

exports.getById = async (id) => {
  const cacheKey = `scholar:${id}`;
  const cached = await get(cacheKey);
  if (cached) return cached;

  const scholar = await ScholarModel.findById(id);
  if (!scholar) throw Object.assign(new Error('Scholar not found'), { status: 404 });

  await set(cacheKey, scholar, 300);
  return scholar;
};

exports.getSchedule = async (scholarId) => {
  const cacheKey = `scholar:${scholarId}:schedule`;
  const cached = await get(cacheKey);
  if (cached) return cached;

  const schedule = await ScholarModel.getSchedule(scholarId);
  await set(cacheKey, schedule, 300);
  return schedule;
};

exports.updateSchedule = async (userId, scholarId, schedules) => {
  const scholar = await ScholarModel.findById(scholarId);
  if (!scholar) throw Object.assign(new Error('Scholar not found'), { status: 404 });
  if (scholar.user_id !== userId) throw Object.assign(new Error('Forbidden'), { status: 403 });

  await ScholarModel.saveSchedule(scholarId, schedules);
  await delPattern(`scholar:${scholarId}:*`);
  return { message: 'Schedule updated' };
};

exports.updateStatus = async (userId, scholarId, status) => {
  const scholar = await ScholarModel.findById(scholarId);
  if (!scholar) throw Object.assign(new Error('Scholar not found'), { status: 404 });
  if (scholar.user_id !== userId) throw Object.assign(new Error('Forbidden'), { status: 403 });

  await ScholarModel.updateStatus(scholarId, status);
  await delPattern(`scholar:${scholarId}:*`);
  return { message: 'Status updated' };
};

exports.verifyAadhar = async (scholarId) => {
  const scholar = await ScholarModel.findById(scholarId);
  if (!scholar) throw Object.assign(new Error('Scholar not found'), { status: 404 });

  await ScholarModel.updateStatus(scholarId, status);
  await delPattern(`scholar:${scholarId}:*`);
  return { message: 'Aadhar submitted for verification' };
};
