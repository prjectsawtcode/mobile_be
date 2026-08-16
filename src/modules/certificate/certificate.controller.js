const service = require('./certificate.service');

exports.submitRequest = async (req, res, next) => {
  try {
    // req.files is a map: { photo, document, invitation_card, payment_screenshot }
    const result = await service.submitRequest(req.body, req.user, req.files || {});
    res.status(201).json(result);
  } catch (e) { next(e); }
};

exports.getMyRequests = async (req, res, next) => {
  try {
    const katha_number = req.query.katha_number || req.user?.katha_number || req.user?.id;
    const result = await service.getMyRequests(katha_number);
    res.json(result);
  } catch (e) { next(e); }
};

exports.getCertificateFee = async (req, res, next) => {
  try {
    const masjid_name = req.query.masjid_name || req.query.masjid || 'BSJM Thodar';
    const result = await service.getCertificateFeeForMasjid(masjid_name);
    res.json(result);
  } catch (e) { next(e); }
};

exports.getAdminRequests = async (req, res, next) => {
  try {
    const result = await service.getAdminRequests(req.query);
    res.json(result);
  } catch (e) { next(e); }
};

exports.approveRequest = async (req, res, next) => {
  try {
    const result = await service.approveRequest(req.body, req.user);
    res.json(result);
  } catch (e) { next(e); }
};

exports.rejectRequest = async (req, res, next) => {
  try {
    const result = await service.rejectRequest(req.body, req.user);
    res.json(result);
  } catch (e) { next(e); }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const id = req.params.id || req.body.id;
    const result = await service.updateStatus(id, req.body, req.user);
    res.json(result);
  } catch (e) { next(e); }
};

exports.notifyApproval = async (req, res, next) => {
  try {
    const result = await service.notifyApproval(req.body);
    res.json(result);
  } catch (e) { next(e); }
};

exports.downloadPdf = async (req, res, next) => {
  try {
    const id = req.params.id;
    await service.downloadCertificatePdf(id, res);
  } catch (e) { next(e); }
};
