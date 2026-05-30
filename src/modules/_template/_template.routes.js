const { Router } = require('express');
const { authenticate, authorize } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const controller = require('./template.controller');
const schema = require('./template.validation');

const router = Router();

// router.get('/', authenticate, controller.list);
// router.post('/', authenticate, authorize('admin'), validate(schema.create), controller.create);

module.exports = router;
