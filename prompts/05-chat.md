# Chat / Ask a Scholar Module

## Schema
- `chat_rooms` table: id (PK, UUID), user_id (FK), scholar_id (FK), language, status (active/closed), created_at, closed_at
- `chat_messages` table: id (PK, UUID), room_id (FK), sender_id (FK), sender_type (user/scholar), content, content_type (text/voice/image), is_bookmarked, created_at

## Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/v1/chat/rooms | Yes | Create new chat room |
| GET | /api/v1/chat/rooms | Yes | List user's chat rooms |
| GET | /api/v1/chat/rooms/:id | Yes | Get room details + messages |
| POST | /api/v1/chat/rooms/:id/messages | Yes | Send message |
| GET | /api/v1/chat/rooms/:id/messages | Yes | Get messages (paginated) |
| PATCH | /api/v1/chat/messages/:id/bookmark | Yes | Toggle bookmark |
| GET | /api/v1/chat/bookmarks | Yes | List bookmarked messages |
| POST | /api/v1/chat/rooms/:id/close | Yes | Close chat |

## Caching
- Room list per user: cache (TTL 30s), invalidate on new message
- Message pagination: cache page 1 (TTL 10s), don't cache deeper pages
- Bookmark list: cache per user (TTL 60s), invalidate on toggle

## Business Logic
- Chat is anonymous — user identity not revealed to scholar (use internal user_id mapping)
- Messages sent to scholar are queued if scholar offline
- Language stored per room to inform scholar
- Rate limit: max 1 message per 2 seconds per user
- Auto-close room after 24h of inactivity
- Voice messages stored as files, referenced by URL

## Validation
- content: max 2000 chars
- supported languages: English, Byari, Manglish, Kanglish, Urdu, Hindi, Tamil, Arabic, Malayalam, Kannada
- content_type: enum [text, voice, image]

## Real-time (WebSocket)
- `chat:${roomId}` channel for live message delivery
- Scholar gets `newChat:${scholarId}` notification when assigned
