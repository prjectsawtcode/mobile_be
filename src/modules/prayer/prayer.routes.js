const { Router } = require('express');
const { authenticate } = require('../../middleware/auth');
const controller = require('./prayer.controller');

const router = Router();

// ── Public (no auth required) ─────────────────────────────────────────────────
// GET /api/v1/prayer/public/times?lat=12.97&lng=77.59&method=1
router.get('/public/times', controller.getPublicTimes);

// ── Authenticated ─────────────────────────────────────────────────────────────
router.get('/times',              authenticate, controller.getTimes);
router.get('/month',              authenticate, controller.getMonth);
router.get('/preferences',        authenticate, controller.getPreferences);
router.patch('/preferences',      authenticate, controller.updatePreferences);

module.exports = router;
