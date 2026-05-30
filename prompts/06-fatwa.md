# Fatwa Archive Module

## Schema
- `fatwa_archive` table: id (PK, UUID), scholar_id (FK), question, answer, language, category, tags (JSON), view_count, created_at, updated_at
- `fatwa_bookmarks` table: id, user_id (FK), fatwa_id (FK), created_at

## Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/v1/fatwa | Yes | List fatwas (paginated, filterable) |
| GET | /api/v1/fatwa/:id | Yes | Get single fatwa with full Q&A |
| POST | /api/v1/fatwa/:id/bookmark | Yes | Toggle bookmark |
| GET | /api/v1/fatwa/bookmarks | Yes | User's bookmarked fatwas |
| POST | /api/v1/fatwa | Yes* | Create fatwa entry (scholar only) |
| PATCH | /api/v1/fatwa/:id | Yes* | Update fatwa |

*Scholar or admin

## Query Params (GET list)
- `category`: filter
- `language`: filter
- `search`: full-text in question/answer
- `page`, `limit`

## Caching
- Fatwa list: cache per filter/page (TTL 300s)
- Single fatwa: cache (TTL 600s), increment view_count without invalidating cache (batch update)
- User bookmarks: cache (TTL 60s)

## Business Logic
- View count: increment in Redis, flush to DB every 5min via cron
- Fatwas auto-created from chat answers when scholar marks "save as fatwa"
- Search: MySQL FULLTEXT index on question + answer columns
- Archived fatwas visible to all authenticated users

## Validation
- question: required, max 2000 chars
- answer: required, max 10000 chars
- language: must be from supported list
