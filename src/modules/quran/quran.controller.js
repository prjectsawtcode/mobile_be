const service = require('./quran.service');

exports.listSurahs = async (req, res, next) => {
  try { res.json(await service.listSurahs()); } catch (e) { next(e); }
};

exports.getSurah = async (req, res, next) => {
  try { res.json(await service.getSurah(Number(req.params.id), req.query.translation)); } catch (e) { next(e); }
};

exports.getVerse = async (req, res, next) => {
  try { res.json(await service.getVerse(req.params.key, req.query.translation)); } catch (e) { next(e); }
};

exports.search = async (req, res, next) => {
  try { res.json(await service.search(req.query.q, req.query.translation, req.query.page, req.query.limit)); } catch (e) { next(e); }
};

exports.addBookmark = async (req, res, next) => {
  try { res.json(await service.addBookmark(req.user.id, req.body)); } catch (e) { next(e); }
};

exports.listBookmarks = async (req, res, next) => {
  try { res.json(await service.listBookmarks(req.user.id)); } catch (e) { next(e); }
};

exports.removeBookmark = async (req, res, next) => {
  try { res.json(await service.removeBookmark(Number(req.params.id))); } catch (e) { next(e); }
};
