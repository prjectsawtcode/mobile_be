const { Router } = require('express');
const multer = require('multer');
const { authenticate, authorize } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const ctrl = require('./user.controller');
const schema = require('./user.validation');

const router = Router();
const upload = multer({ dest: process.env.UPLOAD_DIR || 'uploads/', limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/me', authenticate, ctrl.getMe);
router.patch('/me', authenticate, validate(schema.updateProfile), ctrl.updateProfile);
router.put('/me/avatar', authenticate, upload.single('avatar'), ctrl.updateAvatar);
router.get('/', authenticate, authorize('admin'), ctrl.list);
router.get('/:id', authenticate, ctrl.getPublicProfile);
router.patch('/:id/role', authenticate, authorize('admin'), validate(schema.updateRole), ctrl.updateRole);

module.exports = router;
