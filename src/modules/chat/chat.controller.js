const ChatService = require('./chat.service');

exports.createRoom = async (req, res, next) => {
  try {
    const result = await ChatService.createRoom(req.user.id, req.body);
    res.status(201).json(result);
  } catch (e) { next(e); }
};

exports.listRooms = async (req, res, next) => {
  try {
    const result = await ChatService.listRooms(req.user.id);
    res.json(result);
  } catch (e) { next(e); }
};

exports.getRoom = async (req, res, next) => {
  try {
    const result = await ChatService.getRoom(req.user.id, req.params.id);
    res.json(result);
  } catch (e) { next(e); }
};

exports.sendMessage = async (req, res, next) => {
  try {
    const result = await ChatService.sendMessage(req.user.id, req.params.id, req.body);
    res.status(201).json(result);
  } catch (e) { next(e); }
};

exports.getMessages = async (req, res, next) => {
  try {
    const result = await ChatService.getMessages(req.user.id, req.params.id, req.query);
    res.json(result);
  } catch (e) { next(e); }
};

exports.toggleBookmark = async (req, res, next) => {
  try {
    const result = await ChatService.toggleBookmark(req.user.id, req.params.id);
    res.json(result);
  } catch (e) { next(e); }
};

exports.listBookmarks = async (req, res, next) => {
  try {
    const result = await ChatService.listBookmarks(req.user.id);
    res.json(result);
  } catch (e) { next(e); }
};

exports.closeRoom = async (req, res, next) => {
  try {
    const result = await ChatService.closeRoom(req.user.id, req.params.id);
    res.json(result);
  } catch (e) { next(e); }
};
