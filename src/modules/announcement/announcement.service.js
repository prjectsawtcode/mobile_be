const { v4: uuidv4 } = require('uuid');
const { get, set, delPattern } = require('../../config/cache');
const AnnouncementModel = require('./announcement.model');

exports.list = async (query) => {
  const { category, privacy, search, page = 1, limit = 20 } = query;
  const cacheKey = `announcements:list:${category || ''}:${privacy || ''}:${search || ''}:${page}:${limit}`;

  const cached = await get(cacheKey);
  if (cached) return cached;

  const result = await AnnouncementModel.list({
    category, privacy, search,
    page: Number(page), limit: Number(limit),
  });
  await set(cacheKey, result, 60);
  return result;
};

exports.listExpired = async (query) => {
  const { page = 1, limit = 20 } = query;
  return AnnouncementModel.listExpired({ page: Number(page), limit: Number(limit) });
};

exports.getById = async (id) => {
  const cacheKey = `announcement:${id}`;
  const cached = await get(cacheKey);
  if (cached) return cached;

  const ann = await AnnouncementModel.findById(id);
  if (!ann) throw Object.assign(new Error('Announcement not found'), { status: 404 });

  await set(cacheKey, ann, 120);
  return ann;
};

exports.create = async (authorId, data) => {
  const announcement = {
    id: uuidv4(),
    author_id: authorId,
    ...data,
  };
  await AnnouncementModel.create(announcement);
  await delPattern('announcements:*');
  return announcement;
};

exports.update = async (id, data) => {
  const ann = await AnnouncementModel.findById(id);
  if (!ann) throw Object.assign(new Error('Announcement not found'), { status: 404 });

  await AnnouncementModel.update(id, data);
  await delPattern('announcements:*');
  return { ...ann, ...data };
};

exports.delete = async (id) => {
  const ann = await AnnouncementModel.findById(id);
  if (!ann) throw Object.assign(new Error('Announcement not found'), { status: 404 });

  await AnnouncementModel.delete(id);
  await delPattern('announcements:*');
  return { message: 'Deleted' };
};
