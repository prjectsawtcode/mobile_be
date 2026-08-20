const { randomUUID } = require("crypto");
const path = require("path");
const fs = require("fs");
const zlib = require("zlib");
const model = require("./upload.model");
const b2 = require("../../utils/b2");
const { compressFile, isImageFile } = require("../../utils/file_compressor");

async function uploadFile(userId, file, type) {
  if (!file) throw Object.assign(new Error("No file provided"), { status: 400 });

  let validUserId = userId;
  if (!validUserId || validUserId === "guest") {
    try {
      const { pool } = require("../../config/db");
      const [uRows] = await pool.query("SELECT id FROM users LIMIT 1");
      if (uRows.length > 0) validUserId = uRows[0].id;
    } catch (_) {}
  }

  const ext = path.extname(file.originalname);
  const fileIdStr = randomUUID();
  const filename = `${type}/${fileIdStr}${ext}`;

  try {
    let fileBuffer = null;
    let mimeType = file.mimetype || "application/octet-stream";

    if (isImageFile(file)) {
      try {
        const compressed = await compressFile(file);
        if (compressed && compressed.buffer) {
          fileBuffer = compressed.buffer;
          mimeType = compressed.mimeType || mimeType;
        }
      } catch (_) {}
    }

    if (!fileBuffer) {
      if (file.buffer) {
        fileBuffer = file.buffer;
      } else if (file.path && fs.existsSync(file.path)) {
        fileBuffer = fs.readFileSync(file.path);
      }
    }

    let fileData = null;
    if (fileBuffer) {
      const gzippedBuffer = zlib.gzipSync(fileBuffer);
      fileData = `gz:data:${mimeType};base64,${gzippedBuffer.toString("base64")}`;
    }

    const port = process.env.PORT || 4000;
    const baseUrl = process.env.BACKEND_URL ? process.env.BACKEND_URL.replace(/\/+$/, "") : `http://localhost:${port}`;
    const downloadUrl = `${baseUrl}/api/file-proxy?uuid=${fileIdStr}`;

    return model.create({
      id: fileIdStr,
      user_id: validUserId,
      original_name: file.originalname,
      mime_type: mimeType,
      size: file.size || (fileBuffer ? fileBuffer.length : 0),
      url: downloadUrl,
      path: filename,
      type,
      file_id: fileIdStr,
      file_data: fileData,
    });
  } finally {
    if (file.path && fs.existsSync(file.path)) {
      fs.unlink(file.path, () => {});
    }
  }
}

async function deleteFile(userId, id) {
  const file = await model.remove(id);
  if (!file) throw Object.assign(new Error("File not found"), { status: 404 });
  if (file.user_id !== userId && userId !== "admin") throw Object.assign(new Error("Forbidden"), { status: 403 });
  await b2.deleteFile(file.path, file.file_id || id).catch(() => {});
  return { message: "File soft deleted successfully", id };
}

module.exports = { uploadFile, deleteFile };
