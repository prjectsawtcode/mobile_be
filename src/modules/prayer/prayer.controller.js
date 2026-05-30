const PrayerService = require('./prayer.service');

exports.getTimes = async (req, res, next) => {
  try {
    const result = await PrayerService.getTimes(req.user.id, req.query);
    res.json(result);
  } catch (e) { next(e); }
};

exports.getMonth = async (req, res, next) => {
  try {
    const result = await PrayerService.getMonth(req.user.id, req.query);
    res.json(result);
  } catch (e) { next(e); }
};

exports.getPreferences = async (req, res, next) => {
  try {
    const result = await PrayerService.getPreferences(req.user.id);
    res.json(result);
  } catch (e) { next(e); }
};

exports.savePreferences = async (req, res, next) => {
  try {
    const result = await PrayerService.savePreferences(req.user.id, req.body);
    res.json(result);
  } catch (e) { next(e); }
};
