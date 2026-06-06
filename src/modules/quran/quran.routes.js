const { Router } = require('express');
const { authenticate } = require('../../middleware/auth');
const controller = require('./quran.controller');

const router = Router();

router.get('/surahs', authenticate, controller.listSurahs);
router.get('/surahs/:id', authenticate, controller.getSurah);
router.get('/verse/:key', authenticate, controller.getVerse);
router.get('/search', authenticate, controller.search);
router.post('/bookmarks', authenticate, controller.addBookmark);
router.get('/bookmarks', authenticate, controller.listBookmarks);
router.delete('/bookmarks/:id', authenticate, controller.removeBookmark);

module.exports = router;
