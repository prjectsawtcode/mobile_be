# Database Tables & API Endpoint Index

## Overview
- **Database Engine:** MySQL 8.x
- **Driver / Query Interface:** `mysql2/promise` (Native connection pool with parameterized raw SQL queries).
- **ORM / Query Builder:** **No Knex or ORM is used.** All queries are raw SQL executed via `src/config/db.js`.
- **Migration System:** Custom idempotent raw SQL runner at [`src/db/migrate.js`](file:///Users/arshad/projects/mobile_be/src/db/migrate.js) runnable via `npm run migrate`.

---

## Part 1: Database Tables & Performance Indexes

| # | Table Name | Purpose / Module | Primary Key | Foreign Keys | Performance Indexes & Constraints |
|---|---|---|---|---|---|
| 1 | `users` | Core user accounts, auth, roles | `id` (VARCHAR 36) | - | `UNIQUE (phone)`, `INDEX idx_users_role (role)`, `INDEX idx_users_email (email)` |
| 2 | `refresh_tokens` | JWT refresh tokens | `id` (VARCHAR 36) | `user_id` -> `users(id)` | `INDEX idx_tokens_token (token)`, `INDEX idx_tokens_expires (expires_at)` |
| 3 | `user_profiles` | Extended profile info | `user_id` (VARCHAR 36) | `user_id` -> `users(id)` | PK is FK on `user_id` |
| 4 | `announcements` | Mosque & community notices | `id` (VARCHAR 36) | `author_id` -> `users(id)` | `FULLTEXT ft_announcements (title, content)`, `INDEX idx_announcements_dates (start_date, end_date)`, `INDEX idx_announcements_cat (category, privacy)` |
| 5 | `scholars` | Verified Islamic scholars & teachers | `id` (VARCHAR 36) | `user_id` -> `users(id)` | `UNIQUE (user_id)`, `INDEX idx_scholars_type_status (type, status, is_verified)` |
| 6 | `scholar_schedules` | Weekly scholar availability slots | `id` (INT Auto) | `scholar_id` -> `scholars(id)` | `INDEX idx_schedule_day (scholar_id, day_of_week)` |
| 7 | `chat_rooms` | 1-on-1 Q&A sessions | `id` (VARCHAR 36) | `user_id` -> `users(id)`, `scholar_id` -> `scholars(id)` | `INDEX idx_chat_user_status (user_id, status)`, `INDEX idx_chat_scholar_status (scholar_id, status)` |
| 8 | `chat_messages` | Real-time messages (text/voice/img) | `id` (VARCHAR 36) | `room_id` -> `chat_rooms(id)` | `INDEX idx_messages_room_time (room_id, created_at)` |
| 9 | `fatwa_archive` | Public archive of verified rulings | `id` (VARCHAR 36) | `scholar_id` -> `scholars(id)` | `FULLTEXT ft_fatwa (question, answer)`, `INDEX idx_fatwa_cat_lang (category, language)` |
| 10 | `fatwa_bookmarks` | User-saved fatwas | `id` (INT Auto) | `user_id` -> `users(id)`, `fatwa_id` -> `fatwa_archive(id)` | `UNIQUE KEY uk_user_fatwa (user_id, fatwa_id)` |
| 11 | `prayer_preferences` | User prayer calculation settings | `user_id` (VARCHAR 36) | `user_id` -> `users(id)` | PK on `user_id` |
| 12 | `prayer_cache` | Cached prayer timings by geo/date | `id` (INT Auto) | - | `UNIQUE KEY uk_prayer (date, lat, lng, method)` |
| 13 | `quran_surahs` | Quran chapters (114) | `id` (INT) | - | PK on Surah number (1..114) |
| 14 | `quran_verses` | Surah verses with Arabic text | `id` (INT Auto) | `surah_id` -> `quran_surahs(id)` | `INDEX idx_surah_verse (surah_id, verse_number)` |
| 15 | `quran_translations` | Verse translations by language | `id` (INT Auto) | `verse_id` -> `quran_verses(id)` | `INDEX idx_verse_lang (verse_id, language)` |
| 16 | `quran_bookmarks` | User bookmarked verses | `id` (INT Auto) | `user_id` -> `users(id)`, `surah_id` -> `quran_surahs(id)` | `UNIQUE KEY uk_user_verse (user_id, surah_id, verse_number)` |
| 17 | `community_posts` | Feed posts and media | `id` (VARCHAR 36) | `author_id` -> `users(id)` | `INDEX idx_posts_active_time (is_deleted, created_at)` |
| 18 | `community_comments` | Discussion comments on posts | `id` (VARCHAR 36) | `post_id` -> `community_posts(id)`, `author_id` -> `users(id)` | `INDEX idx_comments_post_time (post_id, is_deleted, created_at)` |
| 19 | `community_likes` | User likes on community posts | `id` (INT Auto) | `post_id` -> `community_posts(id)`, `user_id` -> `users(id)` | `UNIQUE KEY uk_post_user (post_id, user_id)` |
| 20 | `subscription_plans` | Pricing tiers & chat quotas | `id` (INT Auto) | - | PK on `id` |
| 21 | `user_subscriptions` | Purchased active user plans | `id` (VARCHAR 36) | `user_id` -> `users(id)`, `plan_id` -> `subscription_plans(id)` | `INDEX idx_user_sub_status (user_id, status)` |
| 22 | `payment_transactions` | Gateway transaction logs | `id` (VARCHAR 36) | `user_id` -> `users(id)`, `subscription_id` -> `user_subscriptions(id)` | PK on `id`, FK on `user_id` |
| 23 | `notifications` | User push/in-app notifications | `id` (VARCHAR 36) | `user_id` -> `users(id)` | `INDEX idx_user_read (user_id, is_read)`, `INDEX idx_notif_time (user_id, created_at)` |
| 24 | `uploads` | Legacy file upload catalog | `id` (VARCHAR 36) | `user_id` -> `users(id)` | PK on `id` |
| 25 | `payment_requests` | Masjid member payments & receipts | `id` (CHAR 36) | `admin_id` -> `users(id)`, `user_id` -> `users(id)` | `INDEX idx_pr_katha (katha_number)`, `INDEX idx_pr_status (status)`, `INDEX idx_pr_user (user_id)`, `INDEX idx_pr_created (created_at)` |
| 26 | `masjid_settings` | Mosque UPI & bank info | `id` (INT) | - | Singleton record (`id=1`) |
| 27 | `payment_verifications` | Katha + Mobile OTP verification | `id` (CHAR 36) | - | `INDEX idx_katha_mobile (katha_number, mobile)` |
| 28 | `shopping_products` | Islamic marketplace catalog | `id` (CHAR 36) | `provider_id` -> `users(id)` | `INDEX idx_shop_category (category, is_active)`, `INDEX idx_shop_active (is_active, created_at)` |
| 29 | `tour_packages` | Hajj/Umrah travel packages | `id` (CHAR 36) | `provider_id` -> `users(id)` | `INDEX idx_tours_cat_active (category, is_active)`, `INDEX idx_tours_active (is_active, created_at)` |
| 30 | `food_categories` | Halal food vendor categories | `id` (CHAR 36) | `provider_id` -> `users(id)` | `INDEX idx_food_cat_sort (provider_id, is_active, sort_order)` |
| 31 | `food_menu_items` | Halal food menu items & pricing | `id` (CHAR 36) | `category_id` -> `food_categories(id)`, `provider_id` -> `users(id)` | `INDEX idx_food_item_cat (category_id, is_active, subcategory)` |
| 32 | `certificate_requests` | Marriage/Birth/NOC certificates | `id` (BIGINT Auto) | - | `INDEX idx_katha (katha_number)`, `INDEX idx_status (payment_status)`, `INDEX idx_cert_type (certificate_type, created_at)`, `INDEX idx_cert_masjid (masjid_name, created_at)` |
| 33 | `uploaded_documents` | Base64/Compressed file storage | `id` (BIGINT Auto) | - | `INDEX idx_uuid (file_uuid)`, `INDEX idx_entity (entity_type, entity_id)`, `INDEX idx_deleted (is_deleted)`, `INDEX idx_doc_active_entity (entity_type, entity_id, is_deleted)` |

---

## Part 2: API Endpoints to Database Tables Mapping

### 1. Authentication (`/api/v1/auth`)
| Method | Endpoint | Auth Required | Description | Tables Used |
|---|---|---|---|---|
| `POST` | `/api/v1/auth/register` | No | Register new user account | `users` |
| `POST` | `/api/v1/auth/verify-otp` | No | Verify phone OTP | `users` |
| `POST` | `/api/v1/auth/login` | No | Login with phone & password | `users`, `refresh_tokens` |
| `POST` | `/api/v1/auth/refresh` | No | Refresh JWT access token | `refresh_tokens`, `users` |
| `POST` | `/api/v1/auth/logout` | Yes | Invalidate refresh token & logout | `refresh_tokens` |
| `POST` | `/api/v1/auth/forgot-password` | No | Request password reset OTP | `users` |
| `POST` | `/api/v1/auth/reset-password` | No | Reset password with OTP | `users` |
| `POST/DEL` | `/api/v1/auth/delete-account` | Yes | Delete own account & cascade data | `users` (cascades all related) |

### 2. User Management (`/api/v1/users` & `/api/v1/user`)
| Method | Endpoint | Auth Required | Description | Tables Used |
|---|---|---|---|---|
| `GET` | `/api/v1/users/me` | Yes | Get authenticated user profile | `users`, `user_profiles` |
| `PATCH` | `/api/v1/users/me` | Yes | Update profile details | `users`, `user_profiles` |
| `PUT` | `/api/v1/users/me/avatar` | Yes | Upload/update profile photo | `user_profiles`, `uploads` |
| `GET` | `/api/v1/users/:id` | Yes | Get user profile by ID | `users`, `user_profiles` |
| `GET` | `/api/v1/users` | Admin | List all registered users | `users`, `user_profiles` |
| `PATCH` | `/api/v1/users/:id/role` | Admin | Update user role | `users` |

### 3. Masjid Payments & Katha Accounts (`/api/v1/payments`, `/mobile-be/payment`, `/api/payment`)
| Method | Endpoint | Auth Required | Description | Tables Used |
|---|---|---|---|---|
| `POST` | `/submit` | Yes | Submit payment with screenshot | `payment_requests`, `uploaded_documents` |
| `POST` | `/create` | Yes | Create payment receipt record | `payment_requests`, `users` |
| `POST` | `/verify-member` | No | Verify Katha number with mobile | `payment_verifications` |
| `POST` | `/send-otp` | No | Send OTP for Katha payment | `payment_verifications` |
| `POST` | `/verify-otp` | No | Validate OTP for Katha | `payment_verifications` |
| `GET` | `/submitted-requests`, `/` | Yes | List payment requests (Admin/User) | `payment_requests`, `users` |
| `GET` | `/member/:kathaNumber` | Yes | Member payment transaction history | `payment_requests` |
| `GET` | `/settings` | No | Get Masjid UPI & Bank info | `masjid_settings` |
| `GET` | `/:id` | Yes | Get payment request details | `payment_requests` |
| `PATCH` | `/:id/status` | Yes | Approve/Reject payment request | `payment_requests`, `users` |
| `POST` | `/notify-approval` | Yes | Trigger WhatsApp/SMS approval notice | `payment_requests` |
| `PATCH` | `/settings` | Admin | Update Masjid bank/UPI settings | `masjid_settings` |
| `POST` | `/settings/qr` | Admin | Upload Masjid QR Code image | `masjid_settings`, `uploads` |

### 4. Certificate Requests (`/api/v1/certificates`, `/mobile-be/certificates`)
| Method | Endpoint | Auth Required | Description | Tables Used |
|---|---|---|---|---|
| `GET` | `/fee` | No | Get certificate fee structure | Config / `certificate_fees` |
| `POST` | `/request` | Yes | Submit certificate request with docs | `certificate_requests`, `uploaded_documents` |
| `GET` | `/my-requests` | Yes | Get logged-in user requests | `certificate_requests` |
| `GET` | `/admin/list` | No / Admin | Filter & list certificate requests | `certificate_requests` |
| `POST` | `/admin/approve` | No / Admin | Approve certificate & generate PDF | `certificate_requests` |
| `POST` | `/admin/reject` | No / Admin | Reject certificate request | `certificate_requests` |
| `PATCH` | `/admin/:id/status`, `/:id/status` | No / Admin | Update request status & remarks | `certificate_requests` |
| `POST` | `/notify-approval` | No | Trigger approval notification | `certificate_requests` |
| `GET` | `/download/:id` | No | Download generated certificate PDF | `certificate_requests` |

### 5. Document & File Proxy Storage (`/api/v1/documents`, `/api/file-proxy`)
| Method | Endpoint | Auth Required | Description | Tables Used |
|---|---|---|---|---|
| `GET` | `/api/file-proxy` | No | Retrieve image/PDF directly from DB | `uploaded_documents`, `uploads` |
| `GET` | `/documents/base64/:id` | No | Get raw Base64 document payload | `uploaded_documents` |
| `GET` | `/documents/:id` | No | Get document metadata by ID/UUID | `uploaded_documents` |

### 6. Announcements (`/api/v1/announcements`)
| Method | Endpoint | Auth Required | Description | Tables Used |
|---|---|---|---|---|
| `GET` | `/` | Yes | List active announcements (search/filter) | `announcements`, `users` |
| `GET` | `/expired` | Yes | List past/expired announcements | `announcements`, `users` |
| `GET` | `/:id` | Yes | Get announcement details | `announcements`, `users` |
| `POST` | `/` | Admin/Scholar | Create announcement notice | `announcements` |
| `PATCH` | `/:id` | Admin/Scholar | Edit announcement | `announcements` |
| `DELETE` | `/:id` | Admin/Scholar | Delete announcement | `announcements` |

### 7. Scholars & Consultations (`/api/v1/scholars`)
| Method | Endpoint | Auth Required | Description | Tables Used |
|---|---|---|---|---|
| `GET` | `/` | Yes | Search/filter available scholars | `scholars`, `users` |
| `GET` | `/:id` | Yes | Scholar profile with stats | `scholars`, `users` |
| `GET` | `/:id/schedule` | Yes | Scholar weekly consultation schedule | `scholar_schedules` |
| `PATCH` | `/:id/schedule` | Yes | Update consultation schedule | `scholar_schedules` |
| `PATCH` | `/:id/status` | Yes | Update availability (`available`/`busy`/`offline`) | `scholars` |
| `POST` | `/:id/verify-aadhar` | Yes | Verify scholar identity | `scholars`, `users` |

### 8. Real-Time Chat & Consultation (`/api/v1/chat`)
| Method | Endpoint | Auth Required | Description | Tables Used |
|---|---|---|---|---|
| `POST` | `/rooms` | Yes | Open consultation room | `chat_rooms`, `user_subscriptions` |
| `GET` | `/rooms` | Yes | List user's active/past chat rooms | `chat_rooms`, `scholars`, `users` |
| `GET` | `/rooms/:id/messages` | Yes | Paged chat history in room | `chat_messages` |
| `POST` | `/rooms/:id/messages` | Yes | Send message (text/voice/image) | `chat_messages` |
| `PATCH` | `/rooms/:id/close` | Yes | Close consultation session | `chat_rooms` |

### 9. Fatwa Archive (`/api/v1/fatwa`)
| Method | Endpoint | Auth Required | Description | Tables Used |
|---|---|---|---|---|
| `GET` | `/` | Yes | Search & browse fatwa rulings | `fatwa_archive`, `scholars` |
| `GET` | `/bookmarks` | Yes | List user's bookmarked fatwas | `fatwa_bookmarks`, `fatwa_archive` |
| `GET` | `/:id` | Yes | View fatwa details & increment view count | `fatwa_archive`, `scholars` |
| `POST` | `/` | Scholar | Publish new fatwa | `fatwa_archive` |
| `POST` | `/:id/bookmark` | Yes | Toggle bookmark on fatwa | `fatwa_bookmarks` |

### 10. Quran (`/api/v1/quran`)
| Method | Endpoint | Auth Required | Description | Tables Used |
|---|---|---|---|---|
| `GET` | `/surahs` | No | List all 114 Quran surahs | `quran_surahs` |
| `GET` | `/surahs/:id` | No | Get Surah info & verses | `quran_surahs`, `quran_verses` |
| `GET` | `/verses/:surahId` | No | Paged Arabic verses & translations | `quran_verses`, `quran_translations` |
| `GET` | `/bookmarks` | Yes | List bookmarked Ayahs | `quran_bookmarks`, `quran_surahs` |
| `POST` | `/bookmarks` | Yes | Toggle bookmark on Ayah | `quran_bookmarks` |

### 11. Prayer Times (`/api/v1/prayer`)
| Method | Endpoint | Auth Required | Description | Tables Used |
|---|---|---|---|---|
| `GET` | `/timings` | Yes | Calculate/Fetch daily prayer times | `prayer_preferences`, `prayer_cache` |
| `GET` | `/preferences` | Yes | Get user calculation preferences | `prayer_preferences` |
| `PUT` | `/preferences` | Yes | Update calculation method & offsets | `prayer_preferences` |

### 12. Community Feed (`/api/v1/community`)
| Method | Endpoint | Auth Required | Description | Tables Used |
|---|---|---|---|---|
| `GET` | `/posts` | Yes | Feed of active community posts | `community_posts`, `community_likes`, `community_comments`, `users` |
| `POST` | `/posts` | Yes | Create community post | `community_posts` |
| `DELETE` | `/posts/:id` | Yes | Soft-delete post | `community_posts` |
| `POST` | `/posts/:id/like` | Yes | Toggle like on post | `community_likes` |
| `GET` | `/posts/:id/comments` | Yes | Get comments for post | `community_comments`, `users` |
| `POST` | `/posts/:id/comments` | Yes | Post comment | `community_comments` |
| `DELETE` | `/comments/:id` | Yes | Soft-delete comment | `community_comments` |

### 13. Shopping Marketplace (`/api/v1/shopping`)
| Method | Endpoint | Auth Required | Description | Tables Used |
|---|---|---|---|---|
| `GET` | `/` | No | List marketplace products | `shopping_products` |
| `GET` | `/my` | Yes | Vendor's own products | `shopping_products` |
| `GET` | `/:id` | No | Product details | `shopping_products` |
| `POST` | `/` | Admin/Subscriber | Create product listing | `shopping_products` |
| `PATCH` | `/:id` | Admin/Subscriber | Update product listing | `shopping_products` |
| `DELETE` | `/:id` | Admin/Subscriber | Delete product listing | `shopping_products` |

### 14. Tour Packages (`/api/v1/tour-packages`)
| Method | Endpoint | Auth Required | Description | Tables Used |
|---|---|---|---|---|
| `GET` | `/` | No | List Hajj/Umrah travel packages | `tour_packages` |
| `GET` | `/my` | Yes | Vendor's own packages | `tour_packages` |
| `GET` | `/:id` | No | Tour package details | `tour_packages` |
| `POST` | `/` | Admin/Subscriber | Create travel package | `tour_packages` |
| `PATCH` | `/:id` | Admin/Subscriber | Update travel package | `tour_packages` |
| `DELETE` | `/:id` | Admin/Subscriber | Delete travel package | `tour_packages` |

### 15. Food Ordering (`/api/v1/food-orders`)
| Method | Endpoint | Auth Required | Description | Tables Used |
|---|---|---|---|---|
| `GET` | `/menu` | Yes | Get full nested food menu | `food_categories`, `food_menu_items` |
| `GET` | `/categories` | Yes | List food categories | `food_categories` |
| `POST` | `/categories` | Admin/Subscriber | Create food category | `food_categories` |
| `PATCH` | `/categories/:id` | Admin/Subscriber | Update food category | `food_categories` |
| `DELETE` | `/categories/:id` | Admin/Subscriber | Delete food category | `food_categories` |
| `GET` | `/categories/:categoryId/items` | Yes | Get category menu items | `food_menu_items` |
| `POST` | `/items` | Admin/Subscriber | Add menu item | `food_menu_items` |
| `PATCH` | `/items/:id` | Admin/Subscriber | Update menu item | `food_menu_items` |
| `DELETE` | `/items/:id` | Admin/Subscriber | Delete menu item | `food_menu_items` |

### 16. Subscriptions & Plans (`/api/v1/subscriptions`)
| Method | Endpoint | Auth Required | Description | Tables Used |
|---|---|---|---|---|
| `GET` | `/plans` | No | List active subscription plans | `subscription_plans` |
| `GET` | `/current` | Yes | User active subscription & remaining chats | `user_subscriptions`, `subscription_plans` |
| `POST` | `/purchase` | Yes | Purchase plan / record payment | `user_subscriptions`, `payment_transactions` |

### 17. Notifications (`/api/v1/notifications`)
| Method | Endpoint | Auth Required | Description | Tables Used |
|---|---|---|---|---|
| `GET` | `/` | Yes | List user notifications | `notifications` |
| `PATCH` | `/:id/read` | Yes | Mark notification as read | `notifications` |
| `PATCH` | `/read-all` | Yes | Mark all notifications as read | `notifications` |

### 18. Member Jamath Portal Integration (`/api/v1/members`, `/mobile-be/members`)
| Method | Endpoint | Auth Required | Description | Tables Used |
|---|---|---|---|---|
| `GET` | `/getMemberBalanceDetails` | Yes | Proxy live balance from remote Jamath ERP | Remote Jamath API + `payment_requests` |

---

## Part 3: How to Run Migrations

To apply or update all database schemas, missing columns, indexes, and seed data:

```bash
npm run migrate
```
