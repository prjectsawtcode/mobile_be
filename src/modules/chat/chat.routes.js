const { Router } = require('express');
const { authenticate } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const ctrl = require('./chat.controller');
const schema = require('./chat.validation');

const router = Router();

router.post('/rooms', authenticate, validate(schema.createRoom), ctrl.createRoom);
router.get('/rooms', authenticate, ctrl.listRooms);
router.get('/rooms/:id', authenticate, ctrl.getRoom);
router.post('/rooms/:id/messages', authenticate, validate(schema.sendMessage), ctrl.sendMessage);
router.get('/rooms/:id/messages', authenticate, ctrl.getMessages);
router.patch('/messages/:id/bookmark', authenticate, ctrl.toggleBookmark);
router.get('/bookmarks', authenticate, ctrl.listBookmarks);
router.post('/rooms/:id/close', authenticate, ctrl.closeRoom);

module.exports = router;
