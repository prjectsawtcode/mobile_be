const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const model = require('./upload.model');

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function uploadFile(userId, file, type) {
  if (!file) throw Object.assign(new Error('No file provided'), { status: 400 });

  const ext = path.extname(file.originalname);
  const filename = `${uuidv4()}${ext}`;
  const destDir = path.join(UPLOAD_DIR, type);
  ensureDir(destDir);
  const destPath = path.join(destDir, filename);

  fs.renameSync(file.path, destPath);

  const url = `/uploads/${type}/${filename}`;
  return model.create({
    id: uuidv4(),
    user_id: userId,
    original_name: file.originalname,
    mime_type: file.mimetype,
    size: file.size,
    url,
    path: destPath,
    type,
  });
}

async function deleteFile(userId, id) {
  const file = await model.remove(id);
  if (!file) throw Object.assign(new Error('File not found'), { status: 404 });
  if (file.user_id !== userId) throw Object.assign(new Error('Forbidden'), { status: 403 });
  if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
  return { message: 'File deleted' };
}

module.exports = { uploadFile, deleteFile };
