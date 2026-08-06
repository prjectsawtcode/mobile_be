const service = require('./notification.service');

exports.list = async (req, res, next) => {
  try { res.json(await service.list(req.user.id, req.query)); } catch (e) { next(e); }
};

exports.markRead = async (req, res, next) => {
  try { res.json(await service.markRead(req.user.id, req.params.id)); } catch (e) { next(e); }
};

exports.markAllRead = async (req, res, next) => {
  try { res.json(await service.markAllRead(req.user.id)); } catch (e) { next(e); }
};

exports.unreadCount = async (req, res, next) => {
  try { res.json(await service.unreadCount(req.user.id)); } catch (e) { next(e); }
};

exports.updateFcmToken = async (req, res, next) => {
  try { res.json(await service.updateFcmToken(req.user.id, req.body)); } catch (e) { next(e); }
};

exports.createReminder = async (req, res, next) => {
  try { res.json(await service.createReminder(req.user.id, req.body)); } catch (e) { next(e); }
};

exports.sendBroadcast = async (req, res, next) => {
  try { res.json(await service.sendBroadcastNotification(req.body)); } catch (e) { next(e); }
};

exports.sendAnnouncement = async (req, res, next) => {
  try { res.json(await service.sendAnnouncementNotification(req.body)); } catch (e) { next(e); }
};

exports.sendPrayerAlert = async (req, res, next) => {
  try { res.json(await service.sendPrayerAlertNotification(req.body)); } catch (e) { next(e); }
};

exports.sendBillPayment = async (req, res, next) => {
  try { res.json(await service.sendBillPaymentNotification(req.body)); } catch (e) { next(e); }
};

