const sharp = require('sharp');
const fs = require('fs');

function isImageFile(fileInput) {
  if (!fileInput) return false;
  const mimeType = fileInput.mimetype || fileInput.mimeType || fileInput.type || '';
  const originalName = fileInput.originalname || fileInput.originalName || fileInput.name || fileInput.filename || '';
  return /^image\/(jpeg|jpg|png|webp|gif|avif)$/i.test(mimeType) || /\.(jpg|jpeg|png|webp|gif|avif)$/i.test(originalName);
}

/**
 * Compress image buffer or file using sharp.
 * Allows images only (JPEG, PNG, WebP, GIF, AVIF).
 */
async function compressFile(fileInput) {
  if (!fileInput) return null;

  let buffer;
  let mimeType = fileInput.mimetype || 'image/png';
  let originalName = fileInput.originalname || 'file.png';

  if (!isImageFile(fileInput)) {
    throw new Error(`Only image files (JPEG, PNG, WebP, GIF, AVIF) are allowed. Provided file: ${originalName} (${mimeType})`);
  }

  if (fileInput.buffer) {
    buffer = fileInput.buffer;
  } else if (fileInput.path && fs.existsSync(fileInput.path)) {
    try {
      buffer = fs.readFileSync(fileInput.path);
    } catch (err) {
      console.warn('[FILE COMPRESSION WARN] Could not read file path:', err.message);
      return null;
    }
  } else {
    return null;
  }

  const originalSize = buffer.length;
  const isImage = /^image\/(jpeg|jpg|png|webp|gif|avif)$/i.test(mimeType) || /\.(jpg|jpeg|png|webp)$/i.test(originalName);

  if (!isImage) {
    return {
      buffer,
      mimeType,
      originalSize,
      compressedSize: originalSize,
      isCompressed: false,
    };
  }

  try {
    let compressedBuffer;
    let newMimeType = mimeType;

    const pipeline = sharp(buffer).rotate(); // auto-rotate based on EXIF data

    const metadata = await pipeline.metadata();
    // Resize if dimensions exceed 2048px while preserving aspect ratio
    if (metadata.width > 2048 || metadata.height > 2048) {
      pipeline.resize(2048, 2048, { fit: 'inside', withoutEnlargement: true });
    }

    if (/png/i.test(mimeType)) {
      compressedBuffer = await pipeline
        .png({ quality: 80, compressionLevel: 8, palette: true })
        .toBuffer();
    } else if (/webp/i.test(mimeType)) {
      compressedBuffer = await pipeline
        .webp({ quality: 80 })
        .toBuffer();
    } else {
      // JPEG / default
      compressedBuffer = await pipeline
        .jpeg({ quality: 80, mozjpeg: true })
        .toBuffer();
      newMimeType = 'image/jpeg';
    }

    const compressedSize = compressedBuffer.length;
    const ratio = Math.round((1 - compressedSize / originalSize) * 100);
    console.log(`[FILE COMPRESSION SUCCESS] ${originalName}: ${originalSize} -> ${compressedSize} bytes (${ratio}% saved)`);

    return {
      buffer: compressedBuffer,
      mimeType: newMimeType,
      originalSize,
      compressedSize,
      isCompressed: true,
    };
  } catch (err) {
    console.warn('[FILE COMPRESSION WARN] Failed to compress image, keeping original:', err.message);
    return {
      buffer,
      mimeType,
      originalSize,
      compressedSize: originalSize,
      isCompressed: false,
    };
  }
}

module.exports = { compressFile, isImageFile };
