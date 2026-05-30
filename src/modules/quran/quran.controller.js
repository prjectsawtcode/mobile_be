const QuranService = require('./quran.service');

exports.listSurahs = async (req, res, next) => {
  try {
    const result = await QuranService.listSurahs();
    res.json(result);
  } catch (e) { next(e); }
};

exports.getSurah = async (req, res, next) => {
  try {
    const translation = req.query.translation || 'en';
    const result = await QuranService.getSurah(Number(req.params.id), translation);
    res.json(result);
  } catch (e) { next(e); }
};

exports.getVerse = async (req, res, next) => {
  try {
    const translation = req.query.translation || 'en';
    const result = await QuranService.getVerse(req.params.key, translation);
    res.json(result);
  } catch (e) { next(e); }
};

exports.search = async (req, res, next) => {
  try {
    const result = await QuranService.search(req.query);
    res.json(result);
  } catch (e) { next(e); }
};

exports.addBookmark = async (req, res, next) => {
  try {
    const result = await QuranService.addBookmark(req.user.id, req.body);
    res.json(result);
  } catch (e) { next(e); }
};

exports.listBookmarks = async (req, res, next) => {
  try {
    const result = await QuranService.listBookmarks(req.user.id);
    res.json(result);
  } catch (e) { next(e); }
};

exports.deleteBookmark = async (req, res, next) => {
  try {
    const result = await QuranService.deleteBookmark(req.user.id, req.params.id);
    res.json(result);
  } catch (e) { next(e); }
};
