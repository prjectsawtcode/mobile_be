const { Router } = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { authenticate, authorize } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const controller = require('./user.controller');
const schema = require('./user.validation');

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `avatar-${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only jpeg/png/webp images allowed'));
  },
});

const router = Router();

router.get('/me', authenticate, controller.getMe);
router.patch('/me', authenticate, validate(schema.updateMe), controller.updateMe);
router.put('/me/avatar', authenticate, upload.single('avatar'), controller.updateAvatar);
router.get('/:id', authenticate, controller.getById);
router.get('/', authenticate, authorize('admin'), controller.list);
router.patch('/:id/role', authenticate, authorize('admin'), validate(schema.updateRole), controller.updateRole);

module.exports = router;
