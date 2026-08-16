const service = require('./member.service');

exports.getMemberBalanceDetails = async (req, res, next) => {
  try {
    const result = await service.getMemberBalanceDetails(req.query, req.user);
    res.json(result);
  } catch (e) {
    next(e);
  }
};
