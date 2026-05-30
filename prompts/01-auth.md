# Auth Module

## Schema
- `users` table: id (PK, UUID), phone (unique), name, email, gender (male/female), role (user/admin/scholar), password_hash, aadhar_verified (bool), fcm_token, created_at, updated_at
- `refresh_tokens` table: id, user_id (FK), token, expires_at, created_at

## Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/v1/auth/register | No | Register with phone + password |
| POST | /api/v1/auth/verify-otp | No | Verify phone via OTP |
| POST | /api/v1/auth/login | No | Login → access + refresh tokens |
| POST | /api/v1/auth/refresh | No | Rotate refresh token |
| POST | /api/v1/auth/logout | Yes | Invalidate refresh token |
| POST | /api/v1/auth/forgot-password | No | Send OTP for reset |
| POST | /api/v1/auth/reset-password | No | Reset with OTP |

## Caching
- Blacklist revoked tokens in Redis (TTL = token expiry)
- Rate-limit OTP: 1 per 60s per phone (Redis)

## Business Logic
- OTP: generate 6-digit, store in Redis with 5min TTL (in production use SMS gateway)
- Password: bcrypt hash with 12 rounds
- Access token: JWT, 15min expiry
- Refresh token: opaque UUID, 30day DB persistence, rotation on use
- Gender set at registration — cannot be changed (matters for scholar matching)

## Validation
- phone: Indian mobile regex (`^[6-9]\d{9}$`)
- password: min 8 chars, 1 upper, 1 number
- gender: enum [male, female]

## Errors
- 409: Phone already registered
- 429: OTP rate limit
- 401: Invalid credentials / expired token
