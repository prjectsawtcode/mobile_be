const { Router } = require('express');
const { authenticate } = require('../../middleware/auth');
const controller = require('./subscription.controller');

const router = Router();

router.get('/plans', controller.getPlans);
router.get('/my', authenticate, controller.getMySubscription);
router.post('/purchase', authenticate, controller.purchase);
router.post('/webhook', controller.webhook);
router.get('/history', authenticate, controller.getHistory);

module.exports = router;
