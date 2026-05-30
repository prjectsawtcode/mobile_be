const { Router } = require('express');
const { authenticate } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const ctrl = require('./subscription.controller');
const schema = require('./subscription.validation');

const router = Router();

router.get('/plans', ctrl.listPlans);
router.get('/my', authenticate, ctrl.getMySubscription);
router.post('/purchase', authenticate, validate(schema.purchase), ctrl.purchase);
router.post('/webhook', ctrl.webhook);
router.get('/history', authenticate, ctrl.getHistory);

module.exports = router;
