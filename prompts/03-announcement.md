# Announcement Module

## Schema
- `announcements` table: id (PK, UUID), author_id (FK), title, content, image_url, voice_url, category, privacy (everyone/masjid), start_date, end_date, created_at, updated_at

## Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/v1/announcements | Yes | List active announcements (paginated, filterable) |
| GET | /api/v1/announcements/expired | Yes | List expired announcements |
| GET | /api/v1/announcements/:id | Yes | Get single announcement |
| POST | /api/v1/announcements | Yes* | Create announcement (admin/scholar) |
| PATCH | /api/v1/announcements/:id | Yes* | Update announcement |
| DELETE | /api/v1/announcements/:id | Yes* | Delete announcement |

*Requires admin or scholar role

## Query Params (GET list)
- `category`: filter by category
- `privacy`: everyone | masjid
- `page`, `limit`: pagination (default 20)
- `search`: full-text search in title/content

## Caching
- Cache active list per filter combination (TTL 60s)
- Cache single announcement (TTL 120s)
- Invalidate on create/update/delete: `delPattern('announcements:*')`

## Business Logic
- `isExpired` derived: `end_date < NOW()` — not stored
- Privacy filter: `everyone` posts visible to all; `masjid` posts only visible to authenticated users
- Soft delete not needed — hard delete for announcements
- Expired announcements separate section (as in Flutter app)

## Validation
- title: required, 5-200 chars
- content: required, max 5000 chars
- start_date, end_date: ISO dates, end_date must be after start_date
- privacy: enum [everyone, masjid]
- category: from allowed list
