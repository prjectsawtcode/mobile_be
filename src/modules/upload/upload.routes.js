const { Router } = require('express');
const multer = require('multer');
const path = require('path');
const { authenticate } = require('../../middleware/auth');
const controller = require('./upload.controller');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/tmp';
    if (!require('fs').existsSync(dir)) require('fs').mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const images = ['.jpg', '.jpeg', '.png', '.webp'];
    const voices = ['.mp3', '.m4a', '.ogg'];
    const docs = ['.pdf'];
    const ext = path.extname(file.originalname).toLowerCase();
    if ([...images, ...voices, ...docs].includes(ext)) cb(null, true);
    else cb(new Error('Invalid file type'));
  },
});

const router = Router();

router.post('/image', upload.single('file'), controller.uploadImage);
router.post('/voice', upload.single('file'), controller.uploadVoice);
router.post('/document', upload.single('file'), controller.uploadDocument);
router.delete('/:id', authenticate, controller.delete);


module.exports = router;
