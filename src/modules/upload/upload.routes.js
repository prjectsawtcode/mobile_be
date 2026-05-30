const { Router } = require('express');
const multer = require('multer');
const { authenticate } = require('../../middleware/auth');
const ctrl = require('./upload.controller');

const router = Router();
const upload = multer({ dest: process.env.UPLOAD_DIR || 'uploads/', limits: { fileSize: 20 * 1024 * 1024 } });

router.post('/image', authenticate, upload.single('file'), ctrl.uploadImage);
router.post('/voice', authenticate, upload.single('file'), ctrl.uploadVoice);
router.post('/document', authenticate, upload.single('file'), ctrl.uploadDocument);
router.delete('/:id', authenticate, ctrl.delete);

module.exports = router;
