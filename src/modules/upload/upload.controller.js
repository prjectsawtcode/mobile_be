const UploadService = require('./upload.service');

exports.uploadImage = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const result = await UploadService.uploadFile(req.user.id, req.file, 'image');
    res.status(201).json(result);
  } catch (e) { next(e); }
};

exports.uploadVoice = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const result = await UploadService.uploadFile(req.user.id, req.file, 'voice');
    res.status(201).json(result);
  } catch (e) { next(e); }
};

exports.uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const result = await UploadService.uploadFile(req.user.id, req.file, 'document');
    res.status(201).json(result);
  } catch (e) { next(e); }
};

exports.delete = async (req, res, next) => {
  try {
    const result = await UploadService.delete(req.user.id, req.params.id);
    res.json(result);
  } catch (e) { next(e); }
};
