const { Router } = require('express');
const { authenticate } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const ctrl = require('./notification.controller');
const schema = require('./notification.validation');

const router = Router();

router.get('/', authenticate, ctrl.list);
router.patch('/:id/read', authenticate, ctrl.markRead);
router.patch('/read-all', authenticate, ctrl.markAllRead);
router.get('/unread-count', authenticate, ctrl.unreadCount);
router.put('/fcm-token', authenticate, validate(schema.fcmToken), ctrl.updateFcmToken);

module.exports = router;
