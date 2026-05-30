# Scholar Module

## Schema
- `scholars` table: id (PK, UUID), user_id (FK), name, type (maleScholar/femaleScholar/shariyaTeacher), title, specialization, rating (DECIMAL 2,1), answered_count, is_verified, is_aadhar_verified, avatar_url, status (available/busy/offline), created_at, updated_at
- `scholar_schedules` table: id, scholar_id (FK), day_of_week, start_time, end_time, timezone

## Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/v1/scholars | Yes | List scholars (filterable by type) |
| GET | /api/v1/scholars/:id | Yes | Get scholar profile |
| GET | /api/v1/scholars/:id/schedule | Yes | Get availability schedule |
| PATCH | /api/v1/scholars/:id/schedule | Yes* | Update schedule (scholar only) |
| PATCH | /api/v1/scholars/:id/status | Yes* | Toggle online/offline |
| POST | /api/v1/scholars/:id/verify-aadhar | Yes | Upload Aadhar for verification |

*Scholar role or admin

## Caching
- Cache scholar list per type (TTL 120s)
- Cache individual scholar profile (TTL 300s)
- Invalidate on schedule/status/verification change

## Business Logic
- Matching logic: `gender === male` → `maleScholar`; `gender === female` → can choose `femaleScholar` or `shariyaTeacher`
- Rating: auto-calculated from chat feedback (AVG)
- Aadhar verification: store encrypted, status only (not document) exposed via API
- Status auto-set to `offline` if no activity in 30min

## Validation
- scholar type: enum [maleScholar, femaleScholar, shariyaTeacher]
- schedule times: must be valid HH:MM, end > start
