# Community Module

## Schema
- `community_posts` table: id (PK, UUID), author_id (FK), content, image_url, created_at, updated_at
- `community_comments` table: id, post_id (FK), author_id (FK), content, created_at
- `community_likes` table: id, post_id (FK), user_id (FK), UNIQUE(post_id, user_id)

## Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/v1/community/posts | Yes | List posts (paginated, latest first) |
| POST | /api/v1/community/posts | Yes | Create post |
| DELETE | /api/v1/community/posts/:id | Yes | Delete own post (or admin) |
| POST | /api/v1/community/posts/:id/like | Yes | Toggle like |
| GET | /api/v1/community/posts/:id/comments | Yes | Get comments for a post |
| POST | /api/v1/community/posts/:id/comments | Yes | Add comment |
| DELETE | /api/v1/community/comments/:id | Yes | Delete own comment |

## Caching
- Post list: cache page 1 (TTL 30s), invalidate on new post
- Comment list per post: cache (TTL 30s), invalidate on new comment
- Like count: use Redis sorted sets for real-time counts

## Business Logic
- No edit — posts are append-only (delete + repost if needed)
- Like: idempotent toggle (if liked → unlike, if unliked → like)
- Posts soft-deleted (is_deleted flag) to preserve comments
- Image: multer upload to local storage or S3
- Feed: paginated, 20 per page, ordered by `created_at DESC`

## Validation
- content: required, max 2000 chars
- image: optional, max 10MB, jpeg/png/webp
