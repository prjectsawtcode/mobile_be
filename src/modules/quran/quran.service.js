const { get, set, del } = require('../../config/cache');
const QuranModel = require('./quran.model');

exports.listSurahs = async () => {
  const cacheKey = 'quran:surahs';
  const cached = await get(cacheKey);
  if (cached) return cached;

  const surahs = await QuranModel.listSurahs();
  await set(cacheKey, surahs);
  return surahs;
};

exports.getSurah = async (id, translation = 'en') => {
  const cacheKey = `quran:surah:${id}:${translation}`;
  const cached = await get(cacheKey);
  if (cached) return cached;

  const surah = await QuranModel.getSurah(id);
  if (!surah) throw Object.assign(new Error('Surah not found'), { status: 404 });

  await set(cacheKey, surah);
  return surah;
};

exports.getVerse = async (verseKey, translation = 'en') => {
  const [surahNum, verseNum] = verseKey.split(':').map(Number);
  if (!surahNum || !verseNum) throw Object.assign(new Error('Invalid verse key. Use surah:verse format'), { status: 400 });

  const cacheKey = `quran:verse:${verseKey}:${translation}`;
  const cached = await get(cacheKey);
  if (cached) return cached;

  const verse = await QuranModel.getVerse(surahNum, verseNum);
  if (!verse) throw Object.assign(new Error('Verse not found'), { status: 404 });

  await set(cacheKey, verse);
  return verse;
};

exports.search = async (query) => {
  const { q, translation = 'en', page = 1, limit = 20 } = query;
  const cacheKey = `quran:search:${q}:${translation}:${page}:${limit}`;

  const cached = await get(cacheKey);
  if (cached) return cached;

  const result = await QuranModel.searchVerses(q, translation, Number(page), Number(limit));
  await set(cacheKey, result, 300);
  return result;
};

exports.addBookmark = async (userId, data) => {
  await QuranModel.addBookmark(userId, data.surah_id, data.verse_number);
  await del(`quran:bookmarks:${userId}`);
  return { message: 'Bookmarked' };
};

exports.listBookmarks = async (userId) => {
  const cacheKey = `quran:bookmarks:${userId}`;
  const cached = await get(cacheKey);
  if (cached) return cached;

  const bookmarks = await QuranModel.listBookmarks(userId);
  await set(cacheKey, bookmarks, 30);
  return bookmarks;
};

exports.deleteBookmark = async (userId, id) => {
  await QuranModel.deleteBookmark(id, userId);
  await del(`quran:bookmarks:${userId}`);
  return { message: 'Bookmark removed' };
};
