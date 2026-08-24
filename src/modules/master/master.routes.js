const { Router } = require('express');
const { authenticate } = require('../../middleware/auth');
const controller = require('./master.controller');

const router = Router();

router.get('/committee-config', authenticate, controller.getCommitteeConfig);

module.exports = router;
