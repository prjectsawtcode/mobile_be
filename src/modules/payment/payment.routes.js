const { Router } = require('express');
const multer = require('multer');
const path = require('path');
const { authenticate, authorize } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const controller = require('./payment.controller');
const schema = require('./payment.validation');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/qr';
    if (!require('fs').existsSync(dir)) require('fs').mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only image files allowed'));
  },
});

const router = Router();

router.post('/verify-member', validate(schema.verifyMember), controller.verifyMember);
router.post('/send-otp', validate(schema.sendOTP), controller.sendOTP);
router.post('/verify-otp', validate(schema.verifyOTP), controller.verifyOTP);
router.post('/submit', authenticate, upload.single('screenshot'), controller.submitPayment);
router.post('/create', authenticate, validate(schema.createRequest), controller.createRequest);
router.get('/submitted-requests', authenticate, controller.listRequests);
router.get('/', authenticate, controller.listRequests);
router.get('/member/:kathaNumber', authenticate, controller.getMemberRequests);
router.get('/settings', controller.getSettings);
router.get('/:id', authenticate, controller.getRequest);
router.patch('/:id/status', authenticate, validate(schema.updateStatus), controller.updateStatus);
router.post('/notify-approval', authenticate, controller.notifyApproval);
router.post('/notifyapproval', authenticate, controller.notifyApproval);
router.patch('/settings', authenticate, authorize('admin'), validate(schema.updateSettings), controller.updateSettings);
router.post('/settings/qr', authenticate, authorize('admin'), upload.single('qr'), controller.uploadQr);

module.exports = router;

