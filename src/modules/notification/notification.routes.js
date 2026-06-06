const { Router } = require('express');
const { authenticate } = require('../../middleware/auth');
const controller = require('./notification.controller');

const router = Router();

router.get('/', authenticate, controller.list);
router.patch('/:id/read', authenticate, controller.markRead);
router.patch('/read-all', authenticate, controller.markAllRead);
router.get('/unread-count', authenticate, controller.unreadCount);
router.put('/fcm-token', authenticate, controller.updateFcmToken);

module.exports = router;
