# Subscription / Payment Module

## Schema
- `subscription_plans` table: id (PK), name, label, type (single_chat/monthly/yearly), price (DECIMAL 10,2), chat_limit (INT nullable), duration_days (INT nullable), active (bool)
- `user_subscriptions` table: id (PK, UUID), user_id (FK), plan_id (FK), status (active/expired/cancelled), purchased_at, expires_at, remaining_chats, payment_ref, created_at, updated_at
- `payment_transactions` table: id (PK, UUID), user_id (FK), subscription_id (FK), amount, currency, gateway (upi/phonepe/googlepay), status (pending/success/failed), gateway_ref, created_at

## Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/v1/subscriptions/plans | No | List available plans |
| GET | /api/v1/subscriptions/my | Yes | Get current subscription |
| POST | /api/v1/subscriptions/purchase | Yes | Initiate purchase → get UPI intent |
| POST | /api/v1/subscriptions/webhook | No (signed) | Payment gateway webhook |
| GET | /api/v1/subscriptions/history | Yes | Payment history |

## Caching
- Plans list: cache (TTL 3600s), invalidate on plan update
- User subscription: cache (TTL 60s), invalidate on purchase/expiry

## Business Logic
- Plans: Single Chat (₹X, 1 chat), Monthly (₹Y, unlimited, 30d), Yearly (₹Z, unlimited, 365d)
- UPI integration: generate UPI deep link intent string
- Webhook: verify gateway signature; on `payment.success` → activate subscription
- Expiry: cron job daily to mark expired subscriptions
- Chat limit: decrement `remaining_chats` on each chat room creation; block if 0

## Validation
- plan_id: must exist and be active
- payment gateway response: verify signature before processing

## Security
- Webhook endpoint: validate HMAC signature from payment gateway
- Never expose full UPI address or merchant keys in responses
- All transactions logged for audit
