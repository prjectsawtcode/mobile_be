const { Router } = require('express');
const multer = require('multer');
const { authenticate, authorize } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const controller = require('./user.controller');
const schema = require('./user.validation');

const upload = multer({ dest: 'uploads/', limits: { fileSize: 5 * 1024 * 1024 } });

const router = Router();

router.get('/me', authenticate, controller.getMe);
router.patch('/me', authenticate, validate(schema.updateMe), controller.updateMe);
router.put('/me/avatar', authenticate, upload.single('avatar'), controller.updateAvatar);
router.get('/:id', authenticate, controller.getById);
router.get('/', authenticate, authorize('admin'), controller.list);
router.patch('/:id/role', authenticate, authorize('admin'), validate(schema.updateRole), controller.updateRole);

module.exports = router;
