const model = require('./scholar.model');

async function list(query) {
  return model.findAll({
    type: query.type,
    page: Number(query.page) || 1,
    limit: Number(query.limit) || 20,
  });
}

async function getById(id) {
  const scholar = await model.findById(id);
  if (!scholar) throw Object.assign(new Error('Not found'), { status: 404 });
  return scholar;
}

async function getSchedule(scholarId) {
  const scholar = await model.findById(scholarId);
  if (!scholar) throw Object.assign(new Error('Scholar not found'), { status: 404 });
  return model.getSchedule(scholarId);
}

async function updateSchedule(userId, { schedules }) {
  const scholar = await model.findByUserId(userId);
  if (!scholar) throw Object.assign(new Error('Scholar profile not found'), { status: 404 });
  await model.replaceSchedule(scholar.id, schedules);
  return { message: 'Schedule updated' };
}

async function updateStatus(userId, { status }) {
  const scholar = await model.findByUserId(userId);
  if (!scholar) throw Object.assign(new Error('Scholar profile not found'), { status: 404 });
  await model.updateStatus(scholar.id, status);
  return { message: 'Status updated' };
}

async function verifyAadhar(userId) {
  const scholar = await model.findByUserId(userId);
  if (!scholar) throw Object.assign(new Error('Scholar profile not found'), { status: 404 });
  await model.updateAadharVerification(scholar.id);
  return { message: 'Aadhar submitted for verification' };
}

module.exports = { list, getById, getSchedule, updateSchedule, updateStatus, verifyAadhar };
