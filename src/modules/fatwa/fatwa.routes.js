const { Router } = require('express');
const { authenticate, authorize } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const controller = require('./fatwa.controller');
const schema = require('./fatwa.validation');

const router = Router();

router.get('/', authenticate, controller.list);
router.get('/bookmarks', authenticate, controller.listBookmarks);
router.get('/:id', authenticate, controller.getById);
router.post('/:id/bookmark', authenticate, controller.toggleBookmark);
router.post('/', authenticate, authorize('scholar', 'admin'), validate(schema.create), controller.create);
router.patch('/:id', authenticate, authorize('scholar', 'admin'), validate(schema.update), controller.update);

module.exports = router;
