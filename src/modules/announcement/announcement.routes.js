const { Router } = require('express');
const { authenticate, authorize } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const ctrl = require('./announcement.controller');
const schema = require('./announcement.validation');

const router = Router();

router.get('/', authenticate, ctrl.list);
router.get('/expired', authenticate, ctrl.listExpired);
router.get('/:id', authenticate, ctrl.getById);
router.post('/', authenticate, authorize('admin', 'scholar'), validate(schema.create), ctrl.create);
router.patch('/:id', authenticate, authorize('admin', 'scholar'), validate(schema.update), ctrl.update);
router.delete('/:id', authenticate, authorize('admin', 'scholar'), ctrl.delete);

module.exports = router;
