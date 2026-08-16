const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const documentModel = require('../modules/document/document.model');

async function authorize() {
  return true;
}

function getBaseUrl() {
  if (process.env.BACKEND_URL) return process.env.BACKEND_URL.replace(/\/+$/, '');
  const port = process.env.PORT || 4000;
  return `http://localhost:${port}`;
}

async function uploadBuffer(buffer, fileName, contentType = 'image/png') {
  const mimeType = contentType || 'image/png';
  const base64Str = buffer.toString('base64');
  const fileData = `data:${mimeType};base64,${base64Str}`;
  const fileUuid = randomUUID();
  const fileUrl = `${getBaseUrl()}/api/documents/${fileUuid}`;

  await documentModel.recordDocument({
    file_uuid: fileUuid,
    entity_type: 'general',
    entity_id: null,
    category: 'uploads',
    masjid_name: 'BSJM Thodar',
    original_name: path.basename(fileName || 'file'),
    mime_type: mimeType,
    original_size: buffer.length,
    compressed_size: buffer.length,
    b2_key: fileName,
    file_url: fileUrl,
    file_data: fileData,
  });

  return {
    fileId: fileUuid,
    fileName,
    url: fileUrl,
  };
}

async function uploadFile(filePath, fileName, contentType) {
  const buffer = fs.readFileSync(filePath);
  const ext = path.extname(filePath);
  const mime = contentType || (ext === '.pdf' ? 'application/pdf' : 'image/png');
  return uploadBuffer(buffer, fileName || path.basename(filePath), mime);
}

async function getDownloadUrl(fileNameOrUuid) {
  if (!fileNameOrUuid) return '';
  const doc = await documentModel.findByUuid(fileNameOrUuid);
  if (doc) return doc.file_url || doc.file_data || `/api/file-proxy?uuid=${doc.file_uuid}`;
  return `/api/file-proxy?key=${encodeURIComponent(fileNameOrUuid)}`;
}

async function deleteFile(fileName, fileId) {
  const uuid = fileId || fileName;
  if (uuid) {
    await documentModel.softDeleteDocument(uuid).catch(() => {});
  }
}

function buildB2Key({ masjidName, certificateType, folder, originalName }) {
  const root = 'sawtdeen';

  // 1. Masjid slug (e.g. thodar, bambila)
  let masjidSlug = 'thodar';
  const m = String(masjidName || '').toLowerCase();
  if (m.includes('thodar')) {
    masjidSlug = 'thodar';
  } else if (m.includes('bambila')) {
    masjidSlug = 'bambila';
  } else if (masjidName) {
    masjidSlug = String(masjidName)
      .toLowerCase()
      .replace(/bsjm\s*/gi, '')
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'thodar';
  }

  // 2. Certificate / category folder (e.g. mrg certificate, member certificate)
  let certFolder = 'mrg certificate';
  const c = String(certificateType || '').toLowerCase();
  if (c === 'marriage' || c === 'mrg_certificate' || c === 'marriage_certificate' || c.includes('mrg')) {
    certFolder = 'mrg certificate';
  } else if (c === 'member' || c === 'member_certificate' || c.includes('member')) {
    certFolder = 'member certificate';
  } else if (certificateType) {
    certFolder = String(certificateType).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }

  // 3. Subfolder (e.g. documents, photos, invitations, payment-proofs)
  let subFolder = 'documents';
  const f = String(folder || '').toLowerCase();
  if (f.includes('photo')) subFolder = 'photos';
  else if (f.includes('doc')) subFolder = 'documents';
  else if (f.includes('invitation')) subFolder = 'invitations';
  else if (f.includes('pay') || f.includes('screenshot')) subFolder = 'payment-proofs';
  else if (folder) subFolder = String(folder).toLowerCase().replace(/[^a-z0-9]+/g, '-');

  // 4. File name with timestamp and sanitized original name
  const ext = path.extname(originalName || '') || '.png';
  const base = path.basename(originalName || 'file', ext).replace(/[^a-zA-Z0-9._-]/g, '_');
  const fileName = `${Date.now()}_${base}${ext}`;

  return `${root}/${masjidSlug}/${certFolder}/${subFolder}/${fileName}`;
}

module.exports = { uploadFile, uploadBuffer, getDownloadUrl, deleteFile, authorize, buildB2Key };


