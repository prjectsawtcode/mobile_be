# Prayer Times Module

## Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/v1/prayer/times | Yes | Get today's prayer times (location-based) |
| GET | /api/v1/prayer/month | Yes | Get monthly schedule |
| PATCH | /api/v1/prayer/preferences | Yes | Save calculation method + offsets |
| GET | /api/v1/prayer/preferences | Yes | Get user's prayer preferences |

## Query Params
- `lat`, `lng`: coordinates (for GET times)
- `method`: calculation method (default: 1 = Karachi)
- `date`: specific date (default: today)
- `month`, `year`: for monthly view

## Caching
- Prayer times for a given (lat, lng, method, date): cache for 24h (they don't change)
- Monthly calendar: cache for 24h per (lat, lng, method, month)
- Invalidate only if user changes calculation method

## Business Logic
- Use a reliable third-party API (e.g., Aladhan API) as upstream fallback
- Cache results aggressively — prayer times are static per location
- Store user's default mosque location (lat/lng) in preferences
- Support manual offset adjustments (e.g., +2 min for Fajr)
- Notify users at prayer times via FCM (cron job checking current time)

## Schema
- `prayer_preferences` table: user_id (FK), lat, lng, calculation_method, offsets (JSON: {fajr: 0, dhuhr: 0, ...}), timezone, created_at, updated_at
- `prayer_cache` table: date, lat, lng, method, data (JSON), cached_at (UNIQUE on date+lat+lng+method)

## Third-party API
- Primary: Aladhan API (`https://api.aladhan.com/v1/timings`)
- Cache upstream responses in MySQL table as fallback when API is unreachable
