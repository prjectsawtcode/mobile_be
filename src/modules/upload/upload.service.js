const { randomUUID } = require('crypto');
const path = require('path');
const fs = require('fs');
const model = require('./upload.model');
const b2 = require('../../utils/b2');

async function uploadFile(userId, file, type) {
  if (!file) throw Object.assign(new Error('No file provided'), { status: 400 });

  let validUserId = userId;
  if (!validUserId || validUserId === 'guest') {
    try {
      const { pool } = require('../../config/db');
      const [uRows] = await pool.query('SELECT id FROM users LIMIT 1');
      if (uRows.length > 0) validUserId = uRows[0].id;
    } catch (_) {}
  }

  const ext = path.extname(file.originalname);
  const fileIdStr = randomUUID();
  const filename = `${type}/${fileIdStr}${ext}`;


  try {
    let downloadUrl = '';
    let b2FileId = null;

    if (process.env.B2_KEY_ID && process.env.B2_APP_KEY) {
      try {
        const { fileId } = await b2.uploadFile(file.path, filename, file.mimetype);
        downloadUrl = await b2.getDownloadUrl(filename);
        b2FileId = fileId;
      } catch (err) {
        console.warn('B2 Upload failed, falling back to local file storage:', err.message);
      }
    }

    if (!downloadUrl) {
      const destDir = path.join(__dirname, '../../..', 'uploads', type);
      if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
      const localDest = path.join(destDir, `${fileIdStr}${ext}`);
      fs.copyFileSync(file.path, localDest);
      const port = process.env.PORT || 4000;
      downloadUrl = `http://localhost:${port}/uploads/${type}/${fileIdStr}${ext}`;
    }

    return model.create({
      id: fileIdStr,
      user_id: validUserId,
      original_name: file.originalname,

      mime_type: file.mimetype,
      size: file.size,
      url: downloadUrl,
      path: filename,
      type,
      file_id: b2FileId,
    });
  } finally {
    fs.unlink(file.path, () => {});
  }
}


async function deleteFile(userId, id) {
  const file = await model.remove(id);
  if (!file) throw Object.assign(new Error('File not found'), { status: 404 });
  if (file.user_id !== userId) throw Object.assign(new Error('Forbidden'), { status: 403 });
  if (file.file_id) {
    await b2.deleteFile(file.path, file.file_id).catch(() => {});
  }
  return { message: 'File deleted' };
}

module.exports = { uploadFile, deleteFile };
