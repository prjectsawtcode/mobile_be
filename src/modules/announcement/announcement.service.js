const { randomUUID } = require('crypto');
const { delPattern } = require('../../config/cache');
const model = require('./announcement.model');

async function list(query) {
  return model.findAll({
    category: query.category,
    privacy: query.privacy,
    page: Number(query.page) || 1,
    limit: Number(query.limit) || 20,
    search: query.search,
  });
}

async function listExpired(query) {
  return model.findExpired({
    page: Number(query.page) || 1,
    limit: Number(query.limit) || 20,
  });
}

async function getById(id) {
  const ann = await model.findById(id);
  if (!ann) throw Object.assign(new Error('Not found'), { status: 404 });
  return ann;
}

async function create(authorId, data) {
  const ann = await model.create({
    id: randomUUID(),
    author_id: authorId,
    ...data,
  });
  await delPattern('announcements:*');
  return ann;
}

async function update(id, data) {
  const existing = await model.findById(id);
  if (!existing) throw Object.assign(new Error('Not found'), { status: 404 });
  const ann = await model.update(id, data);
  await delPattern('announcements:*');
  return ann;
}

async function remove(id) {
  const existing = await model.findById(id);
  if (!existing) throw Object.assign(new Error('Not found'), { status: 404 });
  await model.remove(id);
  await delPattern('announcements:*');
  return { message: 'Deleted' };
}

module.exports = { list, listExpired, getById, create, update, remove };
