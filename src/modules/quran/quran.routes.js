const { Router } = require('express');
const { authenticate } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const ctrl = require('./quran.controller');
const schema = require('./quran.validation');

const router = Router();

router.get('/surahs', authenticate, ctrl.listSurahs);
router.get('/surahs/:id', authenticate, ctrl.getSurah);
router.get('/verse/:key', authenticate, ctrl.getVerse);
router.get('/search', authenticate, ctrl.search);
router.post('/bookmarks', authenticate, validate(schema.bookmark), ctrl.addBookmark);
router.get('/bookmarks', authenticate, ctrl.listBookmarks);
router.delete('/bookmarks/:id', authenticate, ctrl.deleteBookmark);

module.exports = router;
