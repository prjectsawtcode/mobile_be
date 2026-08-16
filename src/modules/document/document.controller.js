const documentModel = require('./document.model');
const uploadModel = require('../upload/upload.model');

/**
 * GET /api/documents/:id
 * GET /api/documents/base64/:id
 * Fetches file by reference ID (file_uuid) from local MySQL DB.
 * Returns Base64 JSON payload when format=json or /base64/ endpoint is called.
 * Returns streamed binary image when format=binary or standard image request.
 */
async function getDocumentById(req, res) {
  try {
    const referenceId = req.params.id || req.query.uuid || req.query.id;
    if (!referenceId) {
      return res.status(400).json({ success: false, message: 'Reference ID is required' });
    }

    let doc = await documentModel.findByUuid(referenceId);
    if (!doc) {
      doc = await uploadModel.findById(referenceId);
    }

    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found for reference ID' });
    }

    const fileDataStr = doc.file_data || doc.url || doc.file_url;
    if (!fileDataStr) {
      return res.status(404).json({ success: false, message: 'No image content data found for reference ID' });
    }

    let mimeType = doc.mime_type || 'image/png';
    let base64Content = fileDataStr;
    let dataUrl = fileDataStr;

    if (fileDataStr.startsWith('data:')) {
      const matches = fileDataStr.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        mimeType = matches[1];
        base64Content = matches[2];
        dataUrl = fileDataStr;
      }
    } else {
      dataUrl = `data:${mimeType};base64,${fileDataStr}`;
    }

    const wantsJson = req.path.includes('/base64') ||
                      req.query.format === 'json' ||
                      (req.headers.accept && req.headers.accept.includes('application/json'));

    if (wantsJson) {
      return res.json({
        success: true,
        reference_id: doc.file_uuid || doc.id || referenceId,
        original_name: doc.original_name || 'file.png',
        mime_type: mimeType,
        data_url: dataUrl,
        base64: base64Content,
      });
    }

    // Default binary streaming for direct <img src="..." /> view
    const buffer = Buffer.from(base64Content, 'base64');
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.send(buffer);

  } catch (err) {
    console.error('[GET DOCUMENT ERROR]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to retrieve document by reference ID' });
  }
}

module.exports = { getDocumentById };
