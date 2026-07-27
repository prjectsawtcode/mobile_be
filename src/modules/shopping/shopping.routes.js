const { Router } = require('express');
const { authenticate, authorize } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const controller = require('./shopping.controller');
const schema = require('./shopping.validation');

const router = Router();

router.get('/', controller.list);
router.get('/my', authenticate, controller.listMy);
router.get('/:id', controller.getById);

router.post('/', authenticate, authorize('admin', 'subscriber', 'vendor'), validate(schema.create), controller.create);
router.patch('/:id', authenticate, authorize('admin', 'subscriber', 'vendor'), validate(schema.update), controller.update);
router.delete('/:id', authenticate, authorize('admin', 'subscriber', 'vendor'), controller.remove);


module.exports = router;
