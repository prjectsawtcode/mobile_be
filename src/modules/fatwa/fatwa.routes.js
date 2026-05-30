const { Router } = require('express');
const { authenticate, authorize } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const ctrl = require('./fatwa.controller');
const schema = require('./fatwa.validation');

const router = Router();

router.get('/', authenticate, ctrl.list);
router.get('/bookmarks', authenticate, ctrl.listBookmarks);
router.get('/:id', authenticate, ctrl.getById);
router.post('/:id/bookmark', authenticate, ctrl.toggleBookmark);
router.post('/', authenticate, authorize('scholar', 'admin'), validate(schema.create), ctrl.create);
router.patch('/:id', authenticate, authorize('scholar', 'admin'), validate(schema.update), ctrl.update);

module.exports = router;
