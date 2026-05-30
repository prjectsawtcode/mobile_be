const { Router } = require('express');
const { authenticate, authorize } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const ctrl = require('./scholar.controller');
const schema = require('./scholar.validation');

const router = Router();

router.get('/', authenticate, ctrl.list);
router.get('/:id', authenticate, ctrl.getById);
router.get('/:id/schedule', authenticate, ctrl.getSchedule);
router.patch('/:id/schedule', authenticate, validate(schema.updateSchedule), ctrl.updateSchedule);
router.patch('/:id/status', authenticate, validate(schema.updateStatus), ctrl.updateStatus);
router.post('/:id/verify-aadhar', authenticate, ctrl.verifyAadhar);

module.exports = router;
