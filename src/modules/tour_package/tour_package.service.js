const { v4: uuidv4 } = require('uuid');
const model = require('./tour_package.model');

async function list(query) {
  return model.findAll({
    category: query.category,
    page: Number(query.page) || 1,
    limit: Number(query.limit) || 20,
    search: query.search,
    activeOnly: query.activeOnly !== 'false',
  });
}

async function getById(id) {
  const pkg = await model.findById(id);
  if (!pkg) throw Object.assign(new Error('Package not found'), { status: 404 });
  return pkg;
}

async function create(providerId, data) {
  return model.create({
    id: uuidv4(),
    provider_id: providerId,
    ...data,
  });
}

async function update(id, userId, role, data) {
  const existing = await model.findById(id);
  if (!existing) throw Object.assign(new Error('Package not found'), { status: 404 });
  if (role !== 'admin' && existing.provider_id !== userId) {
    throw Object.assign(new Error('Forbidden'), { status: 403 });
  }
  return model.update(id, data);
}

async function remove(id, userId, role) {
  const existing = await model.findById(id);
  if (!existing) throw Object.assign(new Error('Package not found'), { status: 404 });
  if (role !== 'admin' && existing.provider_id !== userId) {
    throw Object.assign(new Error('Forbidden'), { status: 403 });
  }
  await model.remove(id);
  return { message: 'Deleted' };
}

async function listMy(userId) {
  return model.findByProvider(userId);
}

module.exports = { list, getById, create, update, remove, listMy };
