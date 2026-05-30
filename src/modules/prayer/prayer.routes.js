const { Router } = require('express');
const { authenticate } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const ctrl = require('./prayer.controller');
const schema = require('./prayer.validation');

const router = Router();

router.get('/times', authenticate, ctrl.getTimes);
router.get('/month', authenticate, ctrl.getMonth);
router.get('/preferences', authenticate, ctrl.getPreferences);
router.patch('/preferences', authenticate, validate(schema.preferences), ctrl.savePreferences);

module.exports = router;
