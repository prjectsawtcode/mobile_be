const { Router } = require('express');
const { authenticate } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const controller = require('./chat.controller');
const schema = require('./chat.validation');

const router = Router();

router.post('/rooms', authenticate, validate(schema.createRoom), controller.createRoom);
router.get('/rooms', authenticate, controller.listRooms);
router.get('/rooms/:id', authenticate, controller.getRoom);
router.post('/rooms/:id/messages', authenticate, validate(schema.sendMessage), controller.sendMessage);
router.get('/rooms/:id/messages', authenticate, controller.getMessages);
router.patch('/messages/:id/bookmark', authenticate, controller.toggleBookmark);
router.get('/bookmarks', authenticate, controller.listBookmarks);
router.post('/rooms/:id/close', authenticate, controller.closeRoom);

module.exports = router;
