const service = require('./chat.service');

exports.createRoom = async (req, res, next) => {
  try { res.status(201).json(await service.createRoom(req.user.id, req.body)); } catch (e) { next(e); }
};

exports.listRooms = async (req, res, next) => {
  try { res.json(await service.listRooms(req.user.id)); } catch (e) { next(e); }
};

exports.getRoom = async (req, res, next) => {
  try { res.json(await service.getRoom(req.params.id)); } catch (e) { next(e); }
};

exports.sendMessage = async (req, res, next) => {
  try { res.status(201).json(await service.sendMessage(req.user.id, req.params.id, req.body)); } catch (e) { next(e); }
};

exports.getMessages = async (req, res, next) => {
  try { res.json(await service.getMessages(req.params.id, req.query)); } catch (e) { next(e); }
};

exports.toggleBookmark = async (req, res, next) => {
  try { res.json(await service.toggleBookmark(req.params.id)); } catch (e) { next(e); }
};

exports.listBookmarks = async (req, res, next) => {
  try { res.json(await service.listBookmarks(req.user.id)); } catch (e) { next(e); }
};

exports.closeRoom = async (req, res, next) => {
  try { res.json(await service.closeRoom(req.user.id, req.params.id)); } catch (e) { next(e); }
};
