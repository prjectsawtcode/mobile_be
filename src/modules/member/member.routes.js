const { Router } = require('express');
const { authenticate } = require('../../middleware/auth');
const controller = require('./member.controller');

const router = Router();

router.get('/getMemberBalanceDetails', authenticate, controller.getMemberBalanceDetails);

module.exports = router;
