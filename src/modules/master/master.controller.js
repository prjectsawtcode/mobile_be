const service = require('./master.service');

exports.getCommitteeConfig = async (req, res, next) => {
  try {
    const result = await service.getCommitteeConfig(req.query, req.user);
    res.json(result);
  } catch (e) {
    next(e);
  }
};
