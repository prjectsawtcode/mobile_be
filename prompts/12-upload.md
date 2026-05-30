# Upload Module

## Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/v1/uploads/image | Yes | Upload image (jpeg/png/webp) |
| POST | /api/v1/uploads/voice | Yes | Upload voice note (mp3/m4a/ogg) |
| POST | /api/v1/uploads/document | Yes | Upload document (pdf only, for Aadhar) |
| DELETE | /api/v1/uploads/:id | Yes | Delete uploaded file |

## Business Logic
- Files stored in `UPLOAD_DIR` (configurable, can be S3)
- Return public URL after upload
- Image: auto-compress, max 10MB, resize to max 1920px width
- Voice: max 20MB, retain original format
- Aadhar: encrypted at rest, max 5MB, only PDF
- File names: UUID-based to prevent collisions
- Cleanup cron: delete orphaned uploads (not referenced by any record after 24h)

## Schema
- `uploads` table: id (PK, UUID), user_id (FK), original_name, mime_type, size (bytes), url, path, type (image/voice/document), created_at

## Validation
- Check file extension + MIME type (don't trust extension alone)
- Scan for malware (optional: ClamAV integration)
- Rate limit: 10 uploads per hour per user

## Cache
- No caching needed — files served directly or via CDN
