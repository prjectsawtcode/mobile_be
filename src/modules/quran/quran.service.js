const model = require('./quran.model');
const { get, set } = require('../../config/cache');

async function listSurahs() {
  let cached = await get('quran:surahs');
  if (cached) return cached;
  const surahs = await model.getSurahs();
  await set('quran:surahs', surahs, 86400);
  return surahs;
}

async function getSurah(id, translation) {
  const key = `quran:surah:${id}:${translation || 'ar'}`;
  let cached = await get(key);
  if (cached) return cached;
  const surah = await model.getSurah(id, translation);
  if (!surah) throw Object.assign(new Error('Surah not found'), { status: 404 });
  await set(key, surah, 86400);
  return surah;
}

async function getVerse(key, translation) {
  const [surahNum, verseNum] = key.split(':').map(Number);
  const cacheKey = `quran:verse:${key}:${translation || 'ar'}`;
  let cached = await get(cacheKey);
  if (cached) return cached;
  const verse = await model.getVerse(surahNum, verseNum, translation);
  if (!verse) throw Object.assign(new Error('Verse not found'), { status: 404 });
  await set(cacheKey, verse, 86400);
  return verse;
}

async function search(q, translation, page, limit) {
  return model.searchVerses(q, translation || 'en', Number(page) || 1, Number(limit) || 20);
}

async function addBookmark(userId, { surah_id, verse_number }) {
  return model.addBookmark(userId, surah_id, verse_number);
}

async function listBookmarks(userId) {
  return model.getBookmarks(userId);
}

async function removeBookmark(id) {
  return model.removeBookmark(id);
}

module.exports = { listSurahs, getSurah, getVerse, search, addBookmark, listBookmarks, removeBookmark };
