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
      req.params.id, req.body.status, req.user?.id, req.body.remark, req.body.jamath
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

exports.verifyMember = async (req, res, next) => {
  try {
    const result = await service.verifyMember(req.body);
    res.json(result);
  } catch (e) { next(e); }
};

exports.sendOTP = async (req, res, next) => {
  try {
    const result = await service.sendOTP(req.body);
    res.json(result);
  } catch (e) { next(e); }
};

exports.verifyOTP = async (req, res, next) => {
  try {
    const result = await service.verifyOTP(req.body);
    res.json(result);
  } catch (e) { next(e); }
};

exports.submitPayment = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const result = await service.submitPayment(req.body, req.user, req.file, authHeader);
    res.json(result);
  } catch (e) { next(e); }
};

exports.notifyApproval = async (req, res, next) => {
  try {
    const result = await service.notifyApproval(req.body);
    res.json(result);
  } catch (e) { next(e); }
};






exports.initiateEasebuzzPayment = async (req, res, next) => {
  try {
    const result = await service.initiateEasebuzzPayment(req.body, req.user);
    res.json(result);
  } catch (e) { next(e); }
};

exports.handleEasebuzzResponse = async (req, res, next) => {
  try {
    const result = await service.handleEasebuzzResponse(req.body);
    if (result.redirect_url) {
      return res.redirect(result.redirect_url);
    }
    res.json(result);
  } catch (e) { next(e); }
};

exports.getEasebuzzStatus = async (req, res, next) => {
  try {
    const result = await service.getEasebuzzStatus(req.params.txnid);
    res.json(result);
  } catch (e) { next(e); }
};

exports.getReceiptDetails = async (req, res, next) => {
  try {
    const result = await service.getReceiptDetails(req.params.receipt_no);
    res.json(result);
  } catch (e) { next(e); }
};
