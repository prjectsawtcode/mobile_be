const { Router } = require('express');
const { authenticate, authorize } = require('../../middleware/auth');
const controller = require('./notification.controller');

const router = Router();

router.get('/', authenticate, controller.list);
router.patch('/:id/read', authenticate, controller.markRead);
router.patch('/read-all', authenticate, controller.markAllRead);
router.get('/unread-count', authenticate, controller.unreadCount);
router.put('/fcm-token', authenticate, controller.updateFcmToken);
router.post('/reminder', authenticate, controller.createReminder);
// These fan out to every member's phone, so they are admin-only.
router.post('/send-broadcast', authenticate, authorize('admin'), controller.sendBroadcast);
router.post('/send-announcement', authenticate, authorize('admin'), controller.sendAnnouncement);
router.post('/send-prayer', authenticate, authorize('admin'), controller.sendPrayerAlert);
router.post('/send-bill', authenticate, authorize('admin'), controller.sendBillPayment);

module.exports = router;

