const service = require('./upload.service');

exports.uploadImage = async (req, res, next) => {
  try { res.json(await service.uploadFile(req.user.id, req.file, 'image')); } catch (e) { next(e); }
};

exports.uploadVoice = async (req, res, next) => {
  try { res.json(await service.uploadFile(req.user.id, req.file, 'voice')); } catch (e) { next(e); }
};

exports.uploadDocument = async (req, res, next) => {
  try { res.json(await service.uploadFile(req.user.id, req.file, 'document')); } catch (e) { next(e); }
};

exports.delete = async (req, res, next) => {
  try { res.json(await service.deleteFile(req.user.id, req.params.id)); } catch (e) { next(e); }
};
