const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const UploadModel = require('./upload.model');
const { redis } = require('../../config/cache');

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';

async function checkRateLimit(userId) {
  const key = `upload_rate:${userId}`;
  const count = await redis.get(key);
  if (count && Number(count) >= 10) {
    throw Object.assign(new Error('Upload limit reached. Try again later.'), { status: 429 });
  }
  await redis.incr(key);
  if (!count) await redis.expire(key, 3600);
}

exports.uploadFile = async (userId, file, type) => {
  await checkRateLimit(userId);

  const ext = path.extname(file.originalname).toLowerCase();
  const filename = `${uuidv4()}${ext}`;
  const destPath = path.join(UPLOAD_DIR, filename);

  fs.renameSync(file.path, destPath);

  const allowedImages = ['.jpeg', '.jpg', '.png', '.webp'];
  const allowedVoice = ['.mp3', '.m4a', '.ogg'];
  const allowedDocs = ['.pdf'];

  if (type === 'image' && !allowedImages.includes(ext)) {
    fs.unlinkSync(destPath);
    throw Object.assign(new Error('Invalid image format'), { status: 400 });
  }
  if (type === 'voice' && !allowedVoice.includes(ext)) {
    fs.unlinkSync(destPath);
    throw Object.assign(new Error('Invalid audio format'), { status: 400 });
  }
  if (type === 'document' && !allowedDocs.includes(ext)) {
    fs.unlinkSync(destPath);
    throw Object.assign(new Error('Only PDF allowed'), { status: 400 });
  }

  const url = `/uploads/${filename}`;
  const record = {
    id: uuidv4(),
    user_id: userId,
    original_name: file.originalname,
    mime_type: file.mimetype,
    size: file.size,
    url,
    path: destPath,
    type,
  };

  await UploadModel.save(record);
  return { id: record.id, url, original_name: file.originalname, size: file.size, type };
};

exports.delete = async (userId, id) => {
  const file = await UploadModel.findById(id);
  if (!file) throw Object.assign(new Error('File not found'), { status: 404 });
  if (file.user_id !== userId) throw Object.assign(new Error('Forbidden'), { status: 403 });

  if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
  await UploadModel.delete(id);
  return { message: 'File deleted' };
};
