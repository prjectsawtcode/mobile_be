# SawtDeen API Documentation

**Base URL:** `http://<server>:3000/api/v1`

---

## 1. Auth Module

### POST /auth/register
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "9876543210",
    "password": "Test@123",
    "name": "Arshad",
    "email": "arshad@example.com",
    "gender": "male"
  }'
```
```json
{
  "message": "Registration successful. Verify OTP.",
  "user_id": "uuid-here"
}
```

### POST /auth/verify-otp
```bash
curl -X POST http://localhost:3000/api/v1/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "9876543210",
    "otp": "123456"
  }'
```
```json
{
  "message": "Phone verified successfully"
}
```

### POST /auth/login
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "9876543210",
    "password": "Test@123",
    "fcm_token": "optional-fcm-token"
  }'
```
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "uuid-refresh-token",
  "user": {
    "id": "uuid",
    "phone": "9876543210",
    "name": "Arshad",
    "email": "arshad@example.com",
    "gender": "male",
    "role": "user"
  }
}
```

### POST /auth/refresh
```bash
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "uuid-refresh-token"
  }'
```
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "new-uuid-refresh-token"
}
```

### POST /auth/logout
```bash
curl -X POST http://localhost:3000/api/v1/auth/logout \
  -H "Authorization: Bearer <access_token>"
```
```json
{
  "message": "Logged out successfully"
}
```

### POST /auth/forgot-password
```bash
curl -X POST http://localhost:3000/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "9876543210"
  }'
```
```json
{
  "message": "OTP sent for password reset"
}
```

### POST /auth/reset-password
```bash
curl -X POST http://localhost:3000/api/v1/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "9876543210",
    "otp": "123456",
    "password": "NewPass@123"
  }'
```
```json
{
  "message": "Password reset successfully"
}
```

---

## 2. User Profile Module

### GET /users/me
```bash
curl http://localhost:3000/api/v1/users/me \
  -H "Authorization: Bearer <access_token>"
```
```json
{
  "id": "uuid",
  "phone": "9876543210",
  "name": "Arshad",
  "email": "arshad@example.com",
  "gender": "male",
  "role": "user",
  "aadhar_verified": false,
  "created_at": "2024-01-01T00:00:00.000Z",
  "updated_at": "2024-01-01T00:00:00.000Z",
  "profile": {
    "avatar_url": null,
    "address": "Some address",
    "city": "Mangalore",
    "state": "Karnataka",
    "date_of_birth": "1990-01-01",
    "bio": "Bio text",
    "mosque_affiliation": "Masjid Name"
  },
  "profile_completion": 62
}
```

### PATCH /users/me
```bash
curl -X PATCH http://localhost:3000/api/v1/users/me \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Arshad Updated",
    "bio": "New bio",
    "city": "Mangalore",
    "state": "Karnataka"
  }'
```
```json
{
  "id": "uuid",
  "phone": "9876543210",
  "name": "Arshad Updated",
  "profile": { ... },
  "profile_completion": 75
}
```

### PUT /users/me/avatar
```bash
curl -X PUT http://localhost:3000/api/v1/users/me/avatar \
  -H "Authorization: Bearer <access_token>" \
  -F "avatar=@/path/to/image.jpg"
```
```json
{
  "avatar_url": "/uploads/uuid-image.jpg"
}
```

### GET /users/:id
```bash
curl http://localhost:3000/api/v1/users/uuid \
  -H "Authorization: Bearer <access_token>"
```
```json
{
  "id": "uuid",
  "phone": "9876543210",
  "name": "Arshad",
  "gender": "male",
  "role": "user",
  "profile": { ... }
}
```

### GET /users (Admin)
```bash
curl "http://localhost:3000/api/v1/users?page=1&limit=20&search=arshad" \
  -H "Authorization: Bearer <admin_token>"
```
```json
{
  "rows": [
    {
      "id": "uuid",
      "phone": "9876543210",
      "name": "Arshad",
      "email": "arshad@example.com",
      "gender": "male",
      "role": "user",
      "aadhar_verified": false,
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

### PATCH /users/:id/role (Admin)
```bash
curl -X PATCH http://localhost:3000/api/v1/users/uuid/role \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"role": "scholar"}'
```
```json
{
  "message": "Role updated"
}
```

---

## 3. Announcement Module

### GET /announcements
```bash
curl "http://localhost:3000/api/v1/announcements?category=events&privacy=everyone&page=1&limit=20&search=ramadan" \
  -H "Authorization: Bearer <access_token>"
```
```json
{
  "rows": [
    {
      "id": "uuid",
      "author_id": "uuid",
      "author_name": "Admin",
      "title": "Ramadan Mubarak",
      "content": "Announcement content...",
      "image_url": null,
      "voice_url": null,
      "category": "events",
      "privacy": "everyone",
      "start_date": "2024-03-10T00:00:00.000Z",
      "end_date": "2024-04-10T00:00:00.000Z",
      "created_at": "2024-03-01T00:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

### GET /announcements/expired
```bash
curl http://localhost:3000/api/v1/announcements/expired?page=1&limit=20 \
  -H "Authorization: Bearer <access_token>"
```
```json
{
  "rows": [ ... ],
  "total": 5,
  "page": 1,
  "limit": 20
}
```

### GET /announcements/:id
```bash
curl http://localhost:3000/api/v1/announcements/uuid \
  -H "Authorization: Bearer <access_token>"
```
```json
{
  "id": "uuid",
  "author_id": "uuid",
  "author_name": "Admin",
  "title": "Ramadan Mubarak",
  "content": "Full announcement content...",
  "image_url": null,
  "voice_url": null,
  "category": "events",
  "privacy": "everyone",
  "start_date": "2024-03-10T00:00:00.000Z",
  "end_date": "2024-04-10T00:00:00.000Z",
  "created_at": "2024-03-01T00:00:00.000Z",
  "updated_at": null
}
```

### POST /announcements (Admin/Scholar)
```bash
curl -X POST http://localhost:3000/api/v1/announcements \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Juma Prayer Timing Change",
    "content": "Starting this Friday, Juma prayer will be at 1:30 PM.",
    "category": "prayer",
    "privacy": "masjid",
    "start_date": "2024-01-01",
    "end_date": "2024-12-31"
  }'
```
```json
{
  "id": "new-uuid",
  "author_id": "admin-uuid",
  "title": "Juma Prayer Timing Change",
  "content": "Starting this Friday, Juma prayer will be at 1:30 PM.",
  "category": "prayer",
  "privacy": "masjid",
  "start_date": "2024-01-01T00:00:00.000Z",
  "end_date": "2024-12-31T00:00:00.000Z"
}
```

### PATCH /announcements/:id (Admin/Scholar)
```bash
curl -X PATCH http://localhost:3000/api/v1/announcements/uuid \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"title": "Updated Title"}'
```
```json
{
  "id": "uuid",
  "title": "Updated Title",
  "content": "...",
  "category": "prayer",
  ...
}
```

### DELETE /announcements/:id (Admin/Scholar)
```bash
curl -X DELETE http://localhost:3000/api/v1/announcements/uuid \
  -H "Authorization: Bearer <admin_token>"
```
```json
{
  "message": "Deleted"
}
```

---

## 4. Scholar Module

### GET /scholars
```bash
curl "http://localhost:3000/api/v1/scholars?type=maleScholar&page=1&limit=20" \
  -H "Authorization: Bearer <access_token>"
```
```json
{
  "rows": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "name": "Dr. Muhammad",
      "email": "muhammed@example.com",
      "gender": "male",
      "type": "maleScholar",
      "title": "Islamic Scholar",
      "specialization": "Fiqh",
      "rating": 4.5,
      "answered_count": 150,
      "is_verified": true,
      "is_aadhar_verified": true,
      "avatar_url": "/uploads/scholar-avatar.jpg",
      "status": "available",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

### GET /scholars/:id
```bash
curl http://localhost:3000/api/v1/scholars/uuid \
  -H "Authorization: Bearer <access_token>"
```
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "name": "Dr. Muhammad",
  "email": "muhammed@example.com",
  "gender": "male",
  "type": "maleScholar",
  "title": "Islamic Scholar",
  "specialization": "Fiqh",
  "rating": 4.5,
  "answered_count": 150,
  "is_verified": true,
  "avatar_url": "/uploads/scholar-avatar.jpg",
  "status": "available"
}
```

### GET /scholars/:id/schedule
```bash
curl http://localhost:3000/api/v1/scholars/uuid/schedule \
  -H "Authorization: Bearer <access_token>"
```
```json
[
  {
    "id": 1,
    "scholar_id": "uuid",
    "day_of_week": 1,
    "start_time": "09:00",
    "end_time": "17:00",
    "timezone": "Asia/Kolkata"
  },
  {
    "id": 2,
    "scholar_id": "uuid",
    "day_of_week": 3,
    "start_time": "10:00",
    "end_time": "16:00",
    "timezone": "Asia/Kolkata"
  }
]
```

### PATCH /scholars/:id/schedule (Scholar/Owner)
```bash
curl -X PATCH http://localhost:3000/api/v1/scholars/uuid/schedule \
  -H "Authorization: Bearer <scholar_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "schedules": [
      {"day_of_week": 1, "start_time": "10:00", "end_time": "18:00"},
      {"day_of_week": 3, "start_time": "10:00", "end_time": "16:00"}
    ]
  }'
```
```json
{
  "message": "Schedule updated"
}
```

### PATCH /scholars/:id/status (Scholar/Owner)
```bash
curl -X PATCH http://localhost:3000/api/v1/scholars/uuid/status \
  -H "Authorization: Bearer <scholar_token>" \
  -H "Content-Type: application/json" \
  -d '{"status": "available"}'
```
```json
{
  "message": "Status updated"
}
```

### POST /scholars/:id/verify-aadhar
```bash
curl -X POST http://localhost:3000/api/v1/scholars/uuid/verify-aadhar \
  -H "Authorization: Bearer <scholar_token>"
```
```json
{
  "message": "Aadhar submitted for verification"
}
```

---

## 5. Chat Module

### POST /chat/rooms
```bash
curl -X POST http://localhost:3000/api/v1/chat/rooms \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "scholar_id": "scholar-uuid",
    "language": "Malayalam"
  }'
```
```json
{
  "id": "room-uuid",
  "user_id": "user-uuid",
  "scholar_id": "scholar-uuid",
  "language": "Malayalam",
  "status": "active"
}
```

### GET /chat/rooms
```bash
curl http://localhost:3000/api/v1/chat/rooms \
  -H "Authorization: Bearer <access_token>"
```
```json
[
  {
    "id": "room-uuid",
    "user_id": "user-uuid",
    "scholar_id": "scholar-uuid",
    "language": "Malayalam",
    "status": "active",
    "scholar_name": "Dr. Muhammad",
    "scholar_avatar": "/uploads/avatar.jpg",
    "last_message": "Wa alaikum assalam",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
]
```

### GET /chat/rooms/:id
```bash
curl http://localhost:3000/api/v1/chat/rooms/uuid \
  -H "Authorization: Bearer <access_token>"
```
```json
{
  "id": "room-uuid",
  "user_id": "user-uuid",
  "scholar_id": "scholar-uuid",
  "language": "Malayalam",
  "status": "active",
  "messages": [
    {
      "id": "msg-uuid",
      "room_id": "room-uuid",
      "sender_id": "user-uuid",
      "sender_type": "user",
      "content": "Assalamu Alaikum",
      "content_type": "text",
      "is_bookmarked": false,
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### POST /chat/rooms/:id/messages
```bash
curl -X POST http://localhost:3000/api/v1/chat/rooms/room-uuid/messages \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Assalamu Alaikum, I have a question about...",
    "content_type": "text"
  }'
```
```json
{
  "id": "msg-uuid",
  "room_id": "room-uuid",
  "sender_id": "user-uuid",
  "sender_type": "user",
  "content": "Assalamu Alaikum, I have a question about...",
  "content_type": "text"
}
```

### GET /chat/rooms/:id/messages
```bash
curl "http://localhost:3000/api/v1/chat/rooms/room-uuid/messages?page=1&limit=50" \
  -H "Authorization: Bearer <access_token>"
```
```json
{
  "rows": [
    {
      "id": "msg-uuid",
      "room_id": "room-uuid",
      "sender_id": "user-uuid",
      "sender_type": "user",
      "content": "Assalamu Alaikum",
      "content_type": "text",
      "is_bookmarked": false,
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 2,
  "page": 1,
  "limit": 50
}
```

### PATCH /chat/messages/:id/bookmark
```bash
curl -X PATCH http://localhost:3000/api/v1/chat/messages/msg-uuid/bookmark \
  -H "Authorization: Bearer <access_token>"
```
```json
{
  "is_bookmarked": true
}
```

### GET /chat/bookmarks
```bash
curl http://localhost:3000/api/v1/chat/bookmarks \
  -H "Authorization: Bearer <access_token>"
```
```json
[
  {
    "id": "msg-uuid",
    "room_id": "room-uuid",
    "content": "Important answer from scholar...",
    "content_type": "text",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
]
```

### POST /chat/rooms/:id/close
```bash
curl -X POST http://localhost:3000/api/v1/chat/rooms/room-uuid/close \
  -H "Authorization: Bearer <access_token>"
```
```json
{
  "message": "Room closed"
}
```

---

## 6. Fatwa Module

### GET /fatwa
```bash
curl "http://localhost:3000/api/v1/fatwa?category=fiqh&language=English&search=zakat&page=1&limit=20" \
  -H "Authorization: Bearer <access_token>"
```
```json
{
  "rows": [
    {
      "id": "fatwa-uuid",
      "question": "How to calculate zakat on savings?",
      "language": "English",
      "category": "fiqh",
      "tags": ["zakat", "finance"],
      "view_count": 245,
      "created_at": "2024-01-01T00:00:00.000Z",
      "scholar_name": "Dr. Muhammad"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

### GET /fatwa/:id
```bash
curl http://localhost:3000/api/v1/fatwa/fatwa-uuid \
  -H "Authorization: Bearer <access_token>"
```
```json
{
  "id": "fatwa-uuid",
  "scholar_id": "scholar-uuid",
  "scholar_name": "Dr. Muhammad",
  "question": "How to calculate zakat on savings?",
  "answer": "Zakat is calculated as 2.5% of your savings held for one lunar year...",
  "language": "English",
  "category": "fiqh",
  "tags": ["zakat", "finance"],
  "view_count": 246,
  "created_at": "2024-01-01T00:00:00.000Z"
}
```

### POST /fatwa/:id/bookmark
```bash
curl -X POST http://localhost:3000/api/v1/fatwa/fatwa-uuid/bookmark \
  -H "Authorization: Bearer <access_token>"
```
```json
{
  "bookmarked": true
}
```
*(Toggle — send again to unbookmark)*
```json
{
  "bookmarked": false
}
```

### GET /fatwa/bookmarks
```bash
curl http://localhost:3000/api/v1/fatwa/bookmarks \
  -H "Authorization: Bearer <access_token>"
```
```json
[
  {
    "id": "fatwa-uuid",
    "question": "How to calculate zakat?",
    "answer": "Zakat is calculated...",
    "language": "English",
    "category": "fiqh",
    "bookmarked_at": "2024-01-01T00:00:00.000Z"
  }
]
```

### POST /fatwa (Scholar/Admin)
```bash
curl -X POST http://localhost:3000/api/v1/fatwa \
  -H "Authorization: Bearer <scholar_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "scholar_id": "scholar-uuid",
    "question": "Is it permissible to invest in stocks?",
    "answer": "Investing in Shariah-compliant stocks is permissible...",
    "language": "English",
    "category": "finance",
    "tags": ["stocks", "investment"]
  }'
```
```json
{
  "id": "new-fatwa-uuid",
  "scholar_id": "scholar-uuid",
  "question": "Is it permissible to invest in stocks?",
  "answer": "Investing in Shariah-compliant stocks is permissible...",
  "language": "English",
  "category": "finance",
  "tags": "[\"stocks\",\"investment\"]"
}
```

### PATCH /fatwa/:id (Scholar/Admin)
```bash
curl -X PATCH http://localhost:3000/api/v1/fatwa/fatwa-uuid \
  -H "Authorization: Bearer <scholar_token>" \
  -H "Content-Type: application/json" \
  -d '{"answer": "Updated answer content..."}'
```
```json
{
  "id": "fatwa-uuid",
  "scholar_id": "scholar-uuid",
  "question": "...",
  "answer": "Updated answer content..."
}
```

---

## 7. Prayer Module

### GET /prayer/times
```bash
curl "http://localhost:3000/api/v1/prayer/times?lat=12.91&lng=74.85&method=1" \
  -H "Authorization: Bearer <access_token>"
```
```json
{
  "Fajr": "05:12",
  "Dhuhr": "12:30",
  "Asr": "15:45",
  "Maghrib": "18:15",
  "Isha": "19:30"
}
```
*(If user has saved preferences, lat/lng can be omitted)*

### GET /prayer/month
```bash
curl "http://localhost:3000/api/v1/prayer/month?lat=12.91&lng=74.85&method=1&month=3&year=2024" \
  -H "Authorization: Bearer <access_token>"
```
```json
[
  {
    "date": "2024-03-01",
    "timings": {
      "Fajr": "05:12",
      "Dhuhr": "12:30",
      "Asr": "15:45",
      "Maghrib": "18:15",
      "Isha": "19:30"
    }
  },
  {
    "date": "2024-03-02",
    "timings": { ... }
  }
]
```

### GET /prayer/preferences
```bash
curl http://localhost:3000/api/v1/prayer/preferences \
  -H "Authorization: Bearer <access_token>"
```
```json
{
  "user_id": "uuid",
  "lat": 12.91,
  "lng": 74.85,
  "calculation_method": 1,
  "timezone": "Asia/Kolkata",
  "offsets": {
    "fajr": 0,
    "dhuhr": 0,
    "asr": 0,
    "maghrib": 0,
    "isha": 0
  }
}
```

### PATCH /prayer/preferences
```bash
curl -X PATCH http://localhost:3000/api/v1/prayer/preferences \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "lat": 12.91,
    "lng": 74.85,
    "calculation_method": 2,
    "timezone": "Asia/Kolkata",
    "offsets": {
      "fajr": 2,
      "maghrib": 1
    }
  }'
```
```json
{
  "user_id": "uuid",
  "lat": 12.91,
  "lng": 74.85,
  "calculation_method": 2,
  "timezone": "Asia/Kolkata",
  "offsets": {
    "fajr": 2,
    "dhuhr": 0,
    "asr": 0,
    "maghrib": 1,
    "isha": 0
  }
}
```

---

## 8. Quran Module

### GET /quran/surahs
```bash
curl http://localhost:3000/api/v1/quran/surahs \
  -H "Authorization: Bearer <access_token>"
```
```json
[
  {
    "id": 1,
    "name_arabic": "الفاتحة",
    "name_simple": "Al-Fatiha",
    "name_english": "The Opening",
    "revelation_type": "Meccan",
    "verse_count": 7
  },
  {
    "id": 2,
    "name_arabic": "البقرة",
    "name_simple": "Al-Baqarah",
    "name_english": "The Cow",
    "revelation_type": "Medinan",
    "verse_count": 286
  }
]
```

### GET /quran/surahs/:id
```bash
curl "http://localhost:3000/api/v1/quran/surahs/1?translation=en" \
  -H "Authorization: Bearer <access_token>"
```
```json
{
  "id": 1,
  "name_arabic": "الفاتحة",
  "name_simple": "Al-Fatiha",
  "name_english": "The Opening",
  "revelation_type": "Meccan",
  "verse_count": 7,
  "verses": [
    {
      "id": 1,
      "surah_id": 1,
      "verse_number": 1,
      "text_arabic": "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
      "juz": 1,
      "page": 1,
      "translation": "In the name of Allah, the Most Gracious, the Most Merciful"
    }
  ]
}
```

### GET /quran/verse/:key
```bash
curl "http://localhost:3000/api/v1/quran/verse/2:255?translation=en" \
  -H "Authorization: Bearer <access_token>"
```
```json
{
  "id": 255,
  "surah_id": 2,
  "verse_number": 255,
  "text_arabic": "اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ...",
  "juz": 3,
  "page": 42,
  "name_arabic": "البقرة",
  "name_english": "The Cow"
}
```

### GET /quran/search
```bash
curl "http://localhost:3000/api/v1/quran/search?q=mercy&translation=en&page=1&limit=20" \
  -H "Authorization: Bearer <access_token>"
```
```json
{
  "rows": [
    {
      "id": 123,
      "surah_id": 6,
      "verse_number": 12,
      "text_arabic": "...",
      "translation": "Your Lord has prescribed mercy for Himself...",
      "surah_name": "Al-An'am"
    }
  ],
  "total": 15,
  "page": 1,
  "limit": 20
}
```

### POST /quran/bookmarks
```bash
curl -X POST http://localhost:3000/api/v1/quran/bookmarks \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "surah_id": 36,
    "verse_number": 1
  }'
```
```json
{
  "message": "Bookmarked"
}
```

### GET /quran/bookmarks
```bash
curl http://localhost:3000/api/v1/quran/bookmarks \
  -H "Authorization: Bearer <access_token>"
```
```json
[
  {
    "id": 1,
    "user_id": "uuid",
    "surah_id": 36,
    "verse_number": 1,
    "surah_name": "Ya-Sin",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
]
```

### DELETE /quran/bookmarks/:id
```bash
curl -X DELETE http://localhost:3000/api/v1/quran/bookmarks/1 \
  -H "Authorization: Bearer <access_token>"
```
```json
{
  "message": "Bookmark removed"
}
```

---

## 9. Community Module

### GET /community/posts
```bash
curl "http://localhost:3000/api/v1/community/posts?page=1&limit=20" \
  -H "Authorization: Bearer <access_token>"
```
```json
{
  "rows": [
    {
      "id": "post-uuid",
      "author_id": "user-uuid",
      "author_name": "Arshad",
      "content": "Assalamu Alaikum everyone!",
      "image_url": null,
      "like_count": 5,
      "comment_count": 2,
      "is_deleted": 0,
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 10,
  "page": 1,
  "limit": 20
}
```

### POST /community/posts
```bash
curl -X POST http://localhost:3000/api/v1/community/posts \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Juma Mubarak! May Allah accept our prayers."
  }'
```
```json
{
  "id": "new-post-uuid",
  "author_id": "user-uuid",
  "content": "Juma Mubarak! May Allah accept our prayers."
}
```

### DELETE /community/posts/:id
```bash
curl -X DELETE http://localhost:3000/api/v1/community/posts/post-uuid \
  -H "Authorization: Bearer <access_token>"
```
```json
{
  "message": "Post deleted"
}
```

### POST /community/posts/:id/like
```bash
curl -X POST http://localhost:3000/api/v1/community/posts/post-uuid/like \
  -H "Authorization: Bearer <access_token>"
```
```json
{
  "liked": true
}
```
*(Toggle — send again to unlike)*
```json
{
  "liked": false
}
```

### GET /community/posts/:id/comments
```bash
curl http://localhost:3000/api/v1/community/posts/post-uuid/comments \
  -H "Authorization: Bearer <access_token>"
```
```json
[
  {
    "id": "comment-uuid",
    "post_id": "post-uuid",
    "author_id": "user-uuid",
    "author_name": "Fathima",
    "content": "Wa Alaikum Assalaam!",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
]
```

### POST /community/posts/:id/comments
```bash
curl -X POST http://localhost:3000/api/v1/community/posts/post-uuid/comments \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Ameen! Jazakallahukhair."
  }'
```
```json
{
  "id": "new-comment-uuid",
  "post_id": "post-uuid",
  "author_id": "user-uuid",
  "content": "Ameen! Jazakallahukhair."
}
```

### DELETE /community/comments/:id
```bash
curl -X DELETE http://localhost:3000/api/v1/community/comments/comment-uuid \
  -H "Authorization: Bearer <access_token>"
```
```json
{
  "message": "Comment deleted"
}
```

---

## 10. Subscription Module

### GET /subscriptions/plans (No Auth)
```bash
curl http://localhost:3000/api/v1/subscriptions/plans
```
```json
[
  {
    "id": 1,
    "name": "single_chat",
    "label": "Single Chat",
    "type": "single_chat",
    "price": "49.00",
    "chat_limit": 1,
    "duration_days": null,
    "active": 1
  },
  {
    "id": 2,
    "name": "monthly",
    "label": "Monthly Plan",
    "type": "monthly",
    "price": "199.00",
    "chat_limit": null,
    "duration_days": 30,
    "active": 1
  },
  {
    "id": 3,
    "name": "yearly",
    "label": "Yearly Plan",
    "type": "yearly",
    "price": "999.00",
    "chat_limit": null,
    "duration_days": 365,
    "active": 1
  }
]
```

### GET /subscriptions/my
```bash
curl http://localhost:3000/api/v1/subscriptions/my \
  -H "Authorization: Bearer <access_token>"
```
```json
{
  "id": "sub-uuid",
  "user_id": "user-uuid",
  "plan_id": 2,
  "plan_name": "monthly",
  "label": "Monthly Plan",
  "type": "monthly",
  "status": "active",
  "purchased_at": "2024-01-01T00:00:00.000Z",
  "expires_at": "2024-01-31T00:00:00.000Z",
  "remaining_chats": null
}
```
*(Returns `null` if no active subscription)*

### POST /subscriptions/purchase
```bash
curl -X POST http://localhost:3000/api/v1/subscriptions/purchase \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "plan_id": 2,
    "gateway": "upi"
  }'
```
```json
{
  "subscription_id": "new-sub-uuid",
  "amount": 199.00,
  "upi_intent": "upi://pay?pa=merchant@upi&pn=SawtDeen&am=199.00&tr=sub-uuid"
}
```

### POST /subscriptions/webhook (Signed)
```bash
curl -X POST http://localhost:3000/api/v1/subscriptions/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "subscription_id": "sub-uuid",
    "status": "success",
    "gateway_ref": "gateway-txn-id",
    "signature": "hmac-signature"
  }'
```
```json
{
  "message": "Webhook processed"
}
```

### GET /subscriptions/history
```bash
curl http://localhost:3000/api/v1/subscriptions/history \
  -H "Authorization: Bearer <access_token>"
```
```json
[
  {
    "id": "txn-uuid",
    "user_id": "user-uuid",
    "subscription_id": "sub-uuid",
    "plan_name": "Monthly Plan",
    "amount": "199.00",
    "currency": "INR",
    "gateway": "upi",
    "status": "success",
    "gateway_ref": "gateway-txn-id",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
]
```

---

## 11. Notification Module

### GET /notifications
```bash
curl "http://localhost:3000/api/v1/notifications?page=1&limit=20" \
  -H "Authorization: Bearer <access_token>"
```
```json
{
  "rows": [
    {
      "id": "notif-uuid",
      "user_id": "user-uuid",
      "title": "New Fatwa Available",
      "body": "Dr. Muhammad answered your question about Zakat.",
      "type": "fatwa",
      "data": {"fatwa_id": "uuid"},
      "is_read": 0,
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 5,
  "page": 1,
  "limit": 20
}
```

### PATCH /notifications/:id/read
```bash
curl -X PATCH http://localhost:3000/api/v1/notifications/notif-uuid/read \
  -H "Authorization: Bearer <access_token>"
```
```json
{
  "message": "Marked as read"
}
```

### PATCH /notifications/read-all
```bash
curl -X PATCH http://localhost:3000/api/v1/notifications/read-all \
  -H "Authorization: Bearer <access_token>"
```
```json
{
  "message": "All marked as read"
}
```

### GET /notifications/unread-count
```bash
curl http://localhost:3000/api/v1/notifications/unread-count \
  -H "Authorization: Bearer <access_token>"
```
```json
{
  "count": 3
}
```

### PUT /notifications/fcm-token
```bash
curl -X PUT http://localhost:3000/api/v1/notifications/fcm-token \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "fcm_token": "firebase-cloud-messaging-token-here"
  }'
```
```json
{
  "message": "FCM token updated"
}
```

---

## 12. Upload Module

### POST /uploads/image
```bash
curl -X POST http://localhost:3000/api/v1/uploads/image \
  -H "Authorization: Bearer <access_token>" \
  -F "file=@/path/to/photo.jpg"
```
```json
{
  "id": "file-uuid",
  "url": "/uploads/uuid-filename.jpg",
  "original_name": "photo.jpg",
  "size": 2048576,
  "type": "image"
}
```

### POST /uploads/voice
```bash
curl -X POST http://localhost:3000/api/v1/uploads/voice \
  -H "Authorization: Bearer <access_token>" \
  -F "file=@/path/to/voice-note.mp3"
```
```json
{
  "id": "file-uuid",
  "url": "/uploads/uuid-filename.mp3",
  "original_name": "voice-note.mp3",
  "size": 1048576,
  "type": "voice"
}
```

### POST /uploads/document
```bash
curl -X POST http://localhost:3000/api/v1/uploads/document \
  -H "Authorization: Bearer <access_token>" \
  -F "file=@/path/to/aadhar.pdf"
```
```json
{
  "id": "file-uuid",
  "url": "/uploads/uuid-filename.pdf",
  "original_name": "aadhar.pdf",
  "size": 512000,
  "type": "document"
}
```

### DELETE /uploads/:id
```bash
curl -X DELETE http://localhost:3000/api/v1/uploads/file-uuid \
  -H "Authorization: Bearer <access_token>"
```
```json
{
  "message": "File deleted"
}
```

---

## Error Responses

All endpoints return consistent error format:

```json
{
  "error": "Error message here"
}
```

| Status | Meaning |
|--------|---------|
| 400 | Validation error / Bad request |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (insufficient role) |
| 404 | Resource not found |
| 409 | Conflict (e.g., phone already registered) |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

---

## Auth Header

All authenticated endpoints require:
```
Authorization: Bearer <access_token>
```

Access tokens expire in **15 minutes**. Use `POST /auth/refresh` to get new tokens.
