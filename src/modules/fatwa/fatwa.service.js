const { v4: uuidv4 } = require('uuid');
const { get, set, del } = require('../../config/cache');
const FatwaModel = require('./fatwa.model');

exports.list = async (query) => {
  const { category, language, search, page = 1, limit = 20 } = query;
  const cacheKey = `fatwa:list:${category || ''}:${language || ''}:${search || ''}:${page}:${limit}`;

  const cached = await get(cacheKey);
  if (cached) return cached;

  const result = await FatwaModel.list({
    category, language, search,
    page: Number(page), limit: Number(limit),
  });
  await set(cacheKey, result, 300);
  return result;
};

exports.getById = async (id) => {
  const cacheKey = `fatwa:${id}`;
  const cached = await get(cacheKey);
  if (cached) {
    FatwaModel.incrementView(id).catch(() => {});
    return cached;
  }

  const fatwa = await FatwaModel.findById(id);
  if (!fatwa) throw Object.assign(new Error('Fatwa not found'), { status: 404 });

  await set(cacheKey, fatwa, 600);
  FatwaModel.incrementView(id).catch(() => {});
  return fatwa;
};

exports.toggleBookmark = async (userId, fatwaId) => {
  const result = await FatwaModel.toggleBookmark(userId, fatwaId);
  await del(`fatwa:bookmarks:${userId}`);
  return result;
};

exports.listBookmarks = async (userId) => {
  const cacheKey = `fatwa:bookmarks:${userId}`;
  const cached = await get(cacheKey);
  if (cached) return cached;

  const bookmarks = await FatwaModel.listBookmarks(userId);
  await set(cacheKey, bookmarks, 60);
  return bookmarks;
};

exports.create = async (data) => {
  const fatwa = { id: uuidv4(), ...data, tags: JSON.stringify(data.tags || []) };
  await FatwaModel.create(fatwa);
  return fatwa;
};

exports.update = async (id, data) => {
  const fatwa = await FatwaModel.findById(id);
  if (!fatwa) throw Object.assign(new Error('Fatwa not found'), { status: 404 });

  if (data.tags) data.tags = JSON.stringify(data.tags);
  await FatwaModel.update(id, data);
  await del(`fatwa:${id}`);
  return { ...fatwa, ...data };
};
