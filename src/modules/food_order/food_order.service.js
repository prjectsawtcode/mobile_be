const { randomUUID } = require('crypto');
const model = require('./food_order.model');

async function getMenu(providerId) {
  if (providerId) return model.getFullMenu(providerId);
  const categories = await model.findAllCategories();
  const menu = [];
  for (const cat of categories) {
    const items = await model.findMenuItemsByCategory(cat.id);
    menu.push({ ...cat, items });
  }
  return menu;
}

async function getCategories(providerId) {
  return model.findAllCategories(providerId);
}

async function getCategoryById(id) {
  const cat = await model.findCategoryById(id);
  if (!cat) throw Object.assign(new Error('Category not found'), { status: 404 });
  return cat;
}

async function createCategory(providerId, data) {
  return model.createCategory({
    id: randomUUID(),
    provider_id: providerId,
    ...data,
  });
}

async function updateCategory(id, userId, role, data) {
  const existing = await model.findCategoryById(id);
  if (!existing) throw Object.assign(new Error('Category not found'), { status: 404 });
  if (role !== 'admin' && existing.provider_id !== userId) {
    throw Object.assign(new Error('Forbidden'), { status: 403 });
  }
  return model.updateCategory(id, data);
}

async function removeCategory(id, userId, role) {
  const existing = await model.findCategoryById(id);
  if (!existing) throw Object.assign(new Error('Category not found'), { status: 404 });
  if (role !== 'admin' && existing.provider_id !== userId) {
    throw Object.assign(new Error('Forbidden'), { status: 403 });
  }
  await model.removeCategory(id);
  return { message: 'Deleted' };
}

async function getMenuItems(categoryId) {
  return model.findMenuItemsByCategory(categoryId);
}

async function createMenuItem(providerId, data) {
  return model.createMenuItem({
    id: randomUUID(),
    provider_id: providerId,
    ...data,
  });
}

async function updateMenuItem(id, userId, role, data) {
  const existing = await model.findMenuItemById(id);
  if (!existing) throw Object.assign(new Error('Menu item not found'), { status: 404 });
  if (role !== 'admin' && existing.provider_id !== userId) {
    throw Object.assign(new Error('Forbidden'), { status: 403 });
  }
  return model.updateMenuItem(id, data);
}

async function removeMenuItem(id, userId, role) {
  const existing = await model.findMenuItemById(id);
  if (!existing) throw Object.assign(new Error('Menu item not found'), { status: 404 });
  if (role !== 'admin' && existing.provider_id !== userId) {
    throw Object.assign(new Error('Forbidden'), { status: 403 });
  }
  await model.removeMenuItem(id);
  return { message: 'Deleted' };
}

async function listMyMenu(userId) {
  return model.getFullMenu(userId);
}

module.exports = {
  getMenu, getCategories, getCategoryById, createCategory, updateCategory, removeCategory,
  getMenuItems, createMenuItem, updateMenuItem, removeMenuItem, listMyMenu,
};
