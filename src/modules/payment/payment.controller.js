const service = require('./payment.service');

exports.createRequest = async (req, res, next) => {
  try { res.status(201).json(await service.createRequest(req.body, req.user.id)); } catch (e) { next(e); }
};

exports.listRequests = async (req, res, next) => {
  try { res.json(await service.listRequests(req.query)); } catch (e) { next(e); }
};

exports.getRequest = async (req, res, next) => {
  try { res.json(await service.getRequest(req.params.id)); } catch (e) { next(e); }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const result = await service.updateStatus(
      req.params.id, req.body.status, req.user.id, req.body.remark
    );
    res.json(result);
  } catch (e) { next(e); }
};

exports.getMemberRequests = async (req, res, next) => {
  try { res.json(await service.getMemberRequests(req.params.kathaNumber)); } catch (e) { next(e); }
};

exports.getSettings = async (_req, res, next) => {
  try { res.json(await service.getSettings()); } catch (e) { next(e); }
};

exports.updateSettings = async (req, res, next) => {
  try { res.json(await service.updateSettings(req.body)); } catch (e) { next(e); }
};

exports.uploadQr = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const url = `/uploads/qr/${req.file.filename}`;
    const result = await service.updateSettings({ qr_code_url: url });
    res.json(result);
  } catch (e) { next(e); }
};
