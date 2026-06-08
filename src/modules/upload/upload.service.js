const { randomUUID } = require('crypto');
const path = require('path');
const fs = require('fs');
const model = require('./upload.model');
const b2 = require('../../utils/b2');

async function uploadFile(userId, file, type) {
  if (!file) throw Object.assign(new Error('No file provided'), { status: 400 });

  const ext = path.extname(file.originalname);
  const filename = `${type}/${randomUUID()}${ext}`;

  try {
    const { fileId } = await b2.uploadFile(file.path, filename, file.mimetype);
    const downloadUrl = await b2.getDownloadUrl(filename);

    return model.create({
      id: randomUUID(),
      user_id: userId,
      original_name: file.originalname,
      mime_type: file.mimetype,
      size: file.size,
      url: downloadUrl,
      path: filename,
      type,
      file_id: fileId,
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
