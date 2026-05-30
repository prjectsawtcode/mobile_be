# Quran Module

## Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/v1/quran/surahs | Yes | List all surahs |
| GET | /api/v1/quran/surahs/:id | Yes | Get surah with verses |
| GET | /api/v1/quran/verse/:key | Yes | Get single verse (e.g., 2:255) |
| GET | /api/v1/quran/search | Yes | Search verses |
| POST | /api/v1/quran/bookmarks | Yes | Bookmark a verse |
| GET | /api/v1/quran/bookmarks | Yes | List user's bookmarked verses |
| DELETE | /api/v1/quran/bookmarks/:id | Yes | Remove bookmark |

## Query Params
- `q`: search query
- `translation`: language for translation (en/ml/ur/hi/ta/kn)
- `page`, `limit`: for search results

## Caching
- Surah list: cache permanently (never changes), invalidate only on update
- Surah content: cache per surah_id + translation (TTL: infinite — immutable data)
- Verse: cache per verse key (TTL: infinite)
- Search results: cache per query + translation (TTL 300s)
- Bookmarks: cache per user (TTL 30s)

## Business Logic
- Quran data is static — serve from cache aggressively
- Store Quran text + translations in MySQL (or seed from JSON files)
- Support multiple translations: English, Malayalam, Urdu, Hindi, Tamil, Kannada
- Verse key format: `surah:verse` (e.g., `2:255`)
- Audio URLs for each verse by reciter (optional)

## Schema
- `quran_surahs` table: id, name_arabic, name_simple, name_english, revelation_type, verse_count
- `quran_verses` table: id, surah_id, verse_number, text_arabic, juz, page
- `quran_translations` table: id, verse_id (FK), language, text
- `quran_bookmarks` table: id, user_id (FK), surah_id, verse_number, created_at

## Seeding
- Seed from open Quran JSON APIs (e.g., https://api.alquran.cloud)
- Add migration script in `src/modules/quran/seed.js`
