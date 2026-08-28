const service = require('./prayer.service');
const reminderService = require('./prayer_reminder.service');

exports.getPublicTimes = async (req, res, next) => {
  try {
    const { lat, lng, method } = req.query;
    res.json(await service.getPublicTimes(Number(lat), Number(lng), Number(method) || 1));
  } catch (e) { next(e); }
};

exports.getTimes = async (req, res, next) => {
  try { res.json(await service.getTimes(req.user.id, req.query)); } catch (e) { next(e); }
};

exports.getMonth = async (req, res, next) => {
  try { res.json(await service.getMonth(req.user.id, req.query)); } catch (e) { next(e); }
};

exports.getPreferences = async (req, res, next) => {
  try { res.json(await service.getPreferences(req.user.id)); } catch (e) { next(e); }
};

exports.updatePreferences = async (req, res, next) => {
  try { res.json(await service.updatePreferences(req.user.id, req.body)); } catch (e) { next(e); }
};

// Cron-driven prayer reminders. Guarded by a shared secret rather than a user
// token: the caller is a scheduler, not a person. Vercel's own cron sends
// `Authorization: Bearer $CRON_SECRET`, and a plain `x-cron-secret` header is
// accepted so an external scheduler can drive it too.
exports.runReminderCron = async (req, res, next) => {
  try {
    const expected = process.env.CRON_SECRET;
    if (!expected) {
      return res.status(503).json({ error: 'CRON_SECRET is not configured' });
    }
    const supplied =
      req.get('x-cron-secret') ||
      (req.get('authorization') || '').replace(/^Bearer\s+/i, '');

    if (supplied !== expected) return res.status(401).json({ error: 'Unauthorized' });

    res.json(await reminderService.runTick());
  } catch (e) { next(e); }
};
