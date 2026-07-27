const { Router } = require('express');
const validate = require('../../middleware/validate');
const { authenticate } = require('../../middleware/auth');
const controller = require('./auth.controller');
const schema = require('./auth.validation');

const router = Router();

router.post('/register', validate(schema.register), controller.register);
router.post('/verify-otp', controller.verifyOtp);
router.post('/login', validate(schema.login), controller.login);
router.post('/refresh', validate(schema.refresh), controller.refresh);
router.post('/refresh-token', validate(schema.refresh), controller.refresh);

router.post('/logout', authenticate, controller.logout);
router.post('/delete-account', authenticate, controller.deleteAccount);
router.delete('/delete-account', authenticate, controller.deleteAccount);
router.delete('/me', authenticate, controller.deleteAccount);
router.post('/forgot-password', validate(schema.forgotPassword), controller.forgotPassword);

router.post('/reset-password', validate(schema.resetPassword), controller.resetPassword);
router.post('/resend-otp', controller.resendOtp);

module.exports = router;
