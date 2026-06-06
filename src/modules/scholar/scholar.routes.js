const { Router } = require('express');
const { authenticate, authorize } = require('../../middleware/auth');
const controller = require('./scholar.controller');

const router = Router();

router.get('/', authenticate, controller.list);
router.get('/:id', authenticate, controller.getById);
router.get('/:id/schedule', authenticate, controller.getSchedule);
router.patch('/:id/schedule', authenticate, controller.updateSchedule);
router.patch('/:id/status', authenticate, controller.updateStatus);
router.post('/:id/verify-aadhar', authenticate, controller.verifyAadhar);

module.exports = router;
