const { Router } = require('express');
const { authenticate } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const ctrl = require('./auth.controller');
const schema = require('./auth.validation');

const router = Router();

router.post('/register', validate(schema.register), ctrl.register);
router.post('/verify-otp', validate(schema.verifyOtp), ctrl.verifyOtp);
router.post('/login', validate(schema.login), ctrl.login);
router.post('/refresh', validate(schema.refresh), ctrl.refresh);
router.post('/logout', authenticate, ctrl.logout);
router.post('/forgot-password', validate(schema.forgotPassword), ctrl.forgotPassword);
router.post('/reset-password', validate(schema.resetPassword), ctrl.resetPassword);

module.exports = router;
