# User / Profile Module

## Schema
- `user_profiles` table: user_id (FK), avatar_url, address, city, state, date_of_birth, bio, mosque_affiliation, created_at, updated_at

## Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/v1/users/me | Yes | Get own profile |
| PATCH | /api/v1/users/me | Yes | Update own profile |
| PUT | /api/v1/users/me/avatar | Yes | Upload avatar image |
| GET | /api/v1/users/:id | Yes | Get public profile |
| GET | /api/v1/users | Admin | List users (paginated) |
| PATCH | /api/v1/users/:id/role | Admin | Change user role |

## Caching
- Cache `GET /me` in Redis (TTL 60s), invalidate on PATCH
- Cache user list for admin (TTL 120s), invalidate on role change

## Business Logic
- Avatar: multer upload → local dir / S3 → store URL
- Gender is immutable after registration
- Aadhar verification status returned but Aadhar number never exposed
- Profile is 70% complete threshold for badge

## Validation
- avatar: image only (jpeg/png/webp), max 5MB
- name: 2-50 chars
- bio: max 500 chars

## Cache Invalidation
- On profile update: `del('user:${userId}')`
- On role change: `delPattern('users:list:*')`
