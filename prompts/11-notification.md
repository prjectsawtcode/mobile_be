# Notification Module

## Schema
- `notifications` table: id (PK, UUID), user_id (FK), title, body, type (prayer/chat/fatwa/announcement/system), data (JSON), is_read (bool), created_at

## Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/v1/notifications | Yes | List user's notifications (paginated) |
| PATCH | /api/v1/notifications/:id/read | Yes | Mark as read |
| PATCH | /api/v1/notifications/read-all | Yes | Mark all as read |
| GET | /api/v1/notifications/unread-count | Yes | Get unread count |
| PUT | /api/v1/notifications/fcm-token | Yes | Register/update FCM token |

## Caching
- Unread count: Redis counter per user, increment on new notification, decrement on read
- Notification list: cache page 1 (TTL 30s), invalidate on new notification or read

## Business Logic
- Push via Firebase Cloud Messaging (FCM) using stored `fcm_token`
- In-app notifications stored in MySQL for history
- Types trigger different actions in Flutter app (deep linking)
- Batch send for announcement-type notifications (fan-out)
- Cron: prayer time notifications (check current time vs prayer times)

## Validation
- fcm_token: required, non-empty string on PUT
- Types: enum [prayer, chat, fatwa, announcement, system]

## Triggers (not endpoint-based)
- New chat message → notify scholar
- Scholar replies → notify user
- Prayer time → cron-based batch notify
- New announcement → batch notify all users with `fcm_token`
- Subscription expiring → notify 3 days before
