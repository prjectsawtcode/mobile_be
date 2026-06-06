const { Router } = require('express');
const { authenticate, authorize } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const controller = require('./announcement.controller');
const schema = require('./announcement.validation');

const router = Router();

router.get('/', authenticate, controller.list);
router.get('/expired', authenticate, controller.listExpired);
router.get('/:id', authenticate, controller.getById);
router.post('/', authenticate, authorize('admin', 'scholar'), validate(schema.create), controller.create);
router.patch('/:id', authenticate, authorize('admin', 'scholar'), validate(schema.update), controller.update);
router.delete('/:id', authenticate, authorize('admin', 'scholar'), controller.remove);

module.exports = router;
