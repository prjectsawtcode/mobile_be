const { Router } = require('express');
const { authenticate } = require('../../middleware/auth');
const controller = require('./notification.controller');

const router = Router();

router.get('/', authenticate, controller.list);
router.patch('/:id/read', authenticate, controller.markRead);
router.patch('/read-all', authenticate, controller.markAllRead);
router.get('/unread-count', authenticate, controller.unreadCount);
router.put('/fcm-token', authenticate, controller.updateFcmToken);
router.post('/reminder', authenticate, controller.createReminder);
router.post('/send-announcement', authenticate, controller.sendAnnouncement);
router.post('/send-prayer', authenticate, controller.sendPrayerAlert);
router.post('/send-bill', authenticate, controller.sendBillPayment);

module.exports = router;

