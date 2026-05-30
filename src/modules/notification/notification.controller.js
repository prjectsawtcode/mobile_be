const NotificationService = require('./notification.service');

exports.list = async (req, res, next) => {
  try {
    const result = await NotificationService.list(req.user.id, req.query);
    res.json(result);
  } catch (e) { next(e); }
};

exports.markRead = async (req, res, next) => {
  try {
    await NotificationService.markRead(req.user.id, req.params.id);
    res.json({ message: 'Marked as read' });
  } catch (e) { next(e); }
};

exports.markAllRead = async (req, res, next) => {
  try {
    await NotificationService.markAllRead(req.user.id);
    res.json({ message: 'All marked as read' });
  } catch (e) { next(e); }
};

exports.unreadCount = async (req, res, next) => {
  try {
    const count = await NotificationService.unreadCount(req.user.id);
    res.json({ count });
  } catch (e) { next(e); }
};

exports.updateFcmToken = async (req, res, next) => {
  try {
    const result = await NotificationService.updateFcmToken(req.user.id, req.body.fcm_token);
    res.json(result);
  } catch (e) { next(e); }
};
