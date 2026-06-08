const { randomUUID } = require('crypto');
const model = require('./fatwa.model');

async function list(query) {
  return model.findAll({
    category: query.category, language: query.language, search: query.search,
    page: Number(query.page) || 1, limit: Number(query.limit) || 20,
  });
}

async function getById(id) {
  const fatwa = await model.findById(id);
  if (!fatwa) throw Object.assign(new Error('Not found'), { status: 404 });
  await model.incrementView(id);
  fatwa.view_count = (fatwa.view_count || 0) + 1;
  return fatwa;
}

async function create(scholarId, data) {
  const fatwa = await model.create({ id: randomUUID(), scholar_id: scholarId, ...data });
  return fatwa;
}

async function update(id, data) {
  const existing = await model.findById(id);
  if (!existing) throw Object.assign(new Error('Not found'), { status: 404 });
  return model.update(id, data);
}

async function toggleBookmark(userId, fatwaId) {
  const existing = await model.findById(fatwaId);
  if (!existing) throw Object.assign(new Error('Not found'), { status: 404 });
  return model.toggleBookmark(userId, fatwaId);
}

async function listBookmarks(userId) {
  return model.findBookmarks(userId);
}

module.exports = { list, getById, create, update, toggleBookmark, listBookmarks };
