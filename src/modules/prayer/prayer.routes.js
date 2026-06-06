const { Router } = require('express');
const { authenticate } = require('../../middleware/auth');
const controller = require('./prayer.controller');

const router = Router();

router.get('/times', authenticate, controller.getTimes);
router.get('/month', authenticate, controller.getMonth);
router.get('/preferences', authenticate, controller.getPreferences);
router.patch('/preferences', authenticate, controller.updatePreferences);

module.exports = router;
