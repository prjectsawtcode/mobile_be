-- ============================================================
-- SawtDeen Database Schema
-- Run this on: u881127710_mobile_dev_be
-- ============================================================

-- 1. Users & Auth
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  phone VARCHAR(15) NOT NULL UNIQUE,
  name VARCHAR(50) NOT NULL,
  email VARCHAR(100) DEFAULT NULL,
  gender ENUM('male', 'female') NOT NULL,
  role ENUM('user', 'admin', 'scholar') DEFAULT 'user',
  password_hash VARCHAR(255) NOT NULL,
  aadhar_verified BOOLEAN DEFAULT FALSE,
  fcm_token TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  token VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 2. User Profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id VARCHAR(36) PRIMARY KEY,
  avatar_url TEXT DEFAULT NULL,
  address TEXT DEFAULT NULL,
  city VARCHAR(100) DEFAULT NULL,
  state VARCHAR(100) DEFAULT NULL,
  date_of_birth DATE DEFAULT NULL,
  bio TEXT DEFAULT NULL,
  mosque_affiliation VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Announcements
-- ============================================================
CREATE TABLE IF NOT EXISTS announcements (
  id VARCHAR(36) PRIMARY KEY,
  author_id VARCHAR(36) NOT NULL,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT DEFAULT NULL,
  voice_url TEXT DEFAULT NULL,
  category VARCHAR(50) NOT NULL,
  privacy ENUM('everyone', 'masjid') DEFAULT 'everyone',
  start_date DATE NOT NULL,
  end_date DATE DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
  FULLTEXT INDEX ft_announcements (title, content)
);

-- 4. Scholars
-- ============================================================
CREATE TABLE IF NOT EXISTS scholars (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  type ENUM('maleScholar', 'femaleScholar', 'shariyaTeacher') NOT NULL,
  title VARCHAR(100) DEFAULT NULL,
  specialization TEXT DEFAULT NULL,
  rating DECIMAL(2,1) DEFAULT 0.0,
  answered_count INT DEFAULT 0,
  is_verified BOOLEAN DEFAULT FALSE,
  is_aadhar_verified BOOLEAN DEFAULT FALSE,
  avatar_url TEXT DEFAULT NULL,
  status ENUM('available', 'busy', 'offline') DEFAULT 'offline',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS scholar_schedules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  scholar_id VARCHAR(36) NOT NULL,
  day_of_week TINYINT NOT NULL COMMENT '0=Sun, 1=Mon, ..., 6=Sat',
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
  FOREIGN KEY (scholar_id) REFERENCES scholars(id) ON DELETE CASCADE
);

-- 5. Chat
-- ============================================================
CREATE TABLE IF NOT EXISTS chat_rooms (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  scholar_id VARCHAR(36) NOT NULL,
  language VARCHAR(50) NOT NULL,
  status ENUM('active', 'closed') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP NULL DEFAULT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (scholar_id) REFERENCES scholars(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id VARCHAR(36) PRIMARY KEY,
  room_id VARCHAR(36) NOT NULL,
  sender_id VARCHAR(36) NOT NULL,
  sender_type ENUM('user', 'scholar') NOT NULL,
  content TEXT,
  content_type ENUM('text', 'voice', 'image') DEFAULT 'text',
  is_bookmarked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE
);

-- 6. Fatwa Archive
-- ============================================================
CREATE TABLE IF NOT EXISTS fatwa_archive (
  id VARCHAR(36) PRIMARY KEY,
  scholar_id VARCHAR(36) NOT NULL,
  question TEXT NOT NULL,
  answer LONGTEXT NOT NULL,
  language VARCHAR(50) NOT NULL,
  category VARCHAR(50) NOT NULL,
  tags JSON DEFAULT NULL,
  view_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (scholar_id) REFERENCES scholars(id) ON DELETE CASCADE,
  FULLTEXT INDEX ft_fatwa (question, answer)
);

CREATE TABLE IF NOT EXISTS fatwa_bookmarks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  fatwa_id VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_fatwa (user_id, fatwa_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (fatwa_id) REFERENCES fatwa_archive(id) ON DELETE CASCADE
);

-- 7. Prayer
-- ============================================================
CREATE TABLE IF NOT EXISTS prayer_preferences (
  user_id VARCHAR(36) PRIMARY KEY,
  lat DECIMAL(10,7) NOT NULL,
  lng DECIMAL(10,7) NOT NULL,
  calculation_method INT DEFAULT 1,
  offsets JSON DEFAULT NULL,
  timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS prayer_cache (
  id INT AUTO_INCREMENT PRIMARY KEY,
  date DATE NOT NULL,
  lat DECIMAL(10,7) NOT NULL,
  lng DECIMAL(10,7) NOT NULL,
  method INT NOT NULL,
  data JSON NOT NULL,
  cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_prayer (date, lat, lng, method)
);

-- 8. Quran
-- ============================================================
CREATE TABLE IF NOT EXISTS quran_surahs (
  id INT PRIMARY KEY,
  name_arabic VARCHAR(100) NOT NULL,
  name_simple VARCHAR(100) NOT NULL,
  name_english VARCHAR(100) NOT NULL,
  revelation_type VARCHAR(20) NOT NULL,
  verse_count INT NOT NULL
);

CREATE TABLE IF NOT EXISTS quran_verses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  surah_id INT NOT NULL,
  verse_number INT NOT NULL,
  text_arabic TEXT NOT NULL,
  juz INT DEFAULT NULL,
  page INT DEFAULT NULL,
  FOREIGN KEY (surah_id) REFERENCES quran_surahs(id) ON DELETE CASCADE,
  INDEX idx_surah_verse (surah_id, verse_number)
);

CREATE TABLE IF NOT EXISTS quran_translations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  verse_id INT NOT NULL,
  language VARCHAR(10) NOT NULL,
  text TEXT NOT NULL,
  FOREIGN KEY (verse_id) REFERENCES quran_verses(id) ON DELETE CASCADE,
  INDEX idx_verse_lang (verse_id, language)
);

CREATE TABLE IF NOT EXISTS quran_bookmarks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  surah_id INT NOT NULL,
  verse_number INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (surah_id) REFERENCES quran_surahs(id) ON DELETE CASCADE,
  UNIQUE KEY uk_user_verse (user_id, surah_id, verse_number)
);

-- 9. Community
-- ============================================================
CREATE TABLE IF NOT EXISTS community_posts (
  id VARCHAR(36) PRIMARY KEY,
  author_id VARCHAR(36) NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT DEFAULT NULL,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS community_comments (
  id VARCHAR(36) PRIMARY KEY,
  post_id VARCHAR(36) NOT NULL,
  author_id VARCHAR(36) NOT NULL,
  content TEXT NOT NULL,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS community_likes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_post_user (post_id, user_id),
  FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 10. Subscription / Payments
-- ============================================================
CREATE TABLE IF NOT EXISTS subscription_plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  label VARCHAR(100) NOT NULL,
  type ENUM('single_chat', 'monthly', 'yearly') NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  chat_limit INT DEFAULT NULL,
  duration_days INT DEFAULT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_subscriptions (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  plan_id INT NOT NULL,
  status ENUM('active', 'expired', 'cancelled') DEFAULT 'active',
  purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL DEFAULT NULL,
  remaining_chats INT DEFAULT NULL,
  payment_ref VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS payment_transactions (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  subscription_id VARCHAR(36) DEFAULT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'INR',
  gateway VARCHAR(50) DEFAULT NULL,
  status ENUM('pending', 'success', 'failed') DEFAULT 'pending',
  gateway_ref VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (subscription_id) REFERENCES user_subscriptions(id) ON DELETE SET NULL
);

-- 11. Notifications
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT DEFAULT NULL,
  type ENUM('prayer', 'chat', 'fatwa', 'announcement', 'system') NOT NULL,
  data JSON DEFAULT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_read (user_id, is_read)
);

-- 12. Uploads
-- ============================================================
CREATE TABLE IF NOT EXISTS uploads (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size INT NOT NULL COMMENT 'size in bytes',
  url TEXT NOT NULL,
  path TEXT NOT NULL,
  type ENUM('image', 'voice', 'document') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 13. Payment Requests, Masjid Settings & Verifications
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_requests (
  id CHAR(36) PRIMARY KEY,
  katha_number VARCHAR(50) NOT NULL,
  member_name VARCHAR(100) NOT NULL,
  payment_type VARCHAR(100) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  month VARCHAR(20) NOT NULL,
  upi_id VARCHAR(100) DEFAULT NULL,
  screenshot_url TEXT DEFAULT NULL,
  utr VARCHAR(100) DEFAULT NULL,
  status ENUM('pending','approved','rejected') DEFAULT 'pending',
  admin_remark TEXT DEFAULT NULL,
  admin_id CHAR(36) DEFAULT NULL,
  user_id CHAR(36) DEFAULT NULL,
  mobile VARCHAR(20) DEFAULT NULL,
  payment_mode VARCHAR(50) DEFAULT 'Cash',
  remarks TEXT DEFAULT NULL,
  category VARCHAR(100) DEFAULT NULL,
  collection_id VARCHAR(100) DEFAULT NULL,
  is_balance_payment BOOLEAN DEFAULT FALSE,
  raw_data JSON DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_pr_katha (katha_number),
  INDEX idx_pr_status (status),
  INDEX idx_pr_user (user_id),
  INDEX idx_pr_created (created_at)
);

CREATE TABLE IF NOT EXISTS masjid_settings (
  id INT PRIMARY KEY DEFAULT 1,
  masjid_name VARCHAR(200) NOT NULL DEFAULT 'BSJM Thodar',
  qr_code_url TEXT DEFAULT NULL,
  upi_id VARCHAR(100) DEFAULT NULL,
  account_number VARCHAR(50) DEFAULT NULL,
  ifsc_code VARCHAR(20) DEFAULT NULL,
  bank_name VARCHAR(100) DEFAULT NULL,
  account_holder VARCHAR(100) DEFAULT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payment_verifications (
  id CHAR(36) PRIMARY KEY,
  katha_number VARCHAR(50) NOT NULL,
  mobile VARCHAR(20) NOT NULL,
  otp_code VARCHAR(10) NOT NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_katha_mobile (katha_number, mobile)
);

-- 14. Shopping Products
-- ============================================================
CREATE TABLE IF NOT EXISTS shopping_products (
  id CHAR(36) PRIMARY KEY,
  provider_id CHAR(36) NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT DEFAULT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  category VARCHAR(100) NOT NULL,
  provider_name VARCHAR(200) NOT NULL,
  whatsapp_number VARCHAR(20) NOT NULL,
  logo_url TEXT DEFAULT NULL,
  image_url TEXT DEFAULT NULL,
  about TEXT DEFAULT NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_shop_category (category, is_active),
  INDEX idx_shop_active (is_active, created_at)
);

-- 15. Tour Packages
-- ============================================================
CREATE TABLE IF NOT EXISTS tour_packages (
  id CHAR(36) PRIMARY KEY,
  provider_id CHAR(36) NOT NULL,
  provider_name VARCHAR(200) NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT DEFAULT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  duration VARCHAR(50) DEFAULT '14 Days',
  category VARCHAR(50) NOT NULL DEFAULT 'Umrah',
  contact_whatsapp VARCHAR(20) DEFAULT NULL,
  website VARCHAR(200) DEFAULT NULL,
  image_url TEXT DEFAULT NULL,
  logo_url TEXT DEFAULT NULL,
  about TEXT DEFAULT NULL,
  total_slots INT DEFAULT 0,
  booked_slots INT DEFAULT 0,
  start_date DATE DEFAULT NULL,
  end_date DATE DEFAULT NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_tours_cat_active (category, is_active),
  INDEX idx_tours_active (is_active, created_at)
);

-- 16. Food Orders & Menu
-- ============================================================
CREATE TABLE IF NOT EXISTS food_categories (
  id CHAR(36) PRIMARY KEY,
  provider_id CHAR(36) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT DEFAULT NULL,
  logo_url TEXT DEFAULT NULL,
  sort_order INT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_food_cat_sort (provider_id, is_active, sort_order)
);

CREATE TABLE IF NOT EXISTS food_menu_items (
  id CHAR(36) PRIMARY KEY,
  category_id CHAR(36) NOT NULL,
  provider_id CHAR(36) NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT DEFAULT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  subcategory VARCHAR(100) DEFAULT NULL,
  image_url TEXT DEFAULT NULL,
  whatsapp_number VARCHAR(20) DEFAULT NULL,
  is_available TINYINT(1) DEFAULT 1,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES food_categories(id) ON DELETE CASCADE,
  FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_food_item_cat (category_id, is_active, subcategory)
);

-- 17. Certificate Requests
-- ============================================================
CREATE TABLE IF NOT EXISTS certificate_requests (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  katha_number VARCHAR(50) NOT NULL,
  applicant_name VARCHAR(200) NOT NULL,
  mobile VARCHAR(20) NOT NULL DEFAULT '',
  certificate_type VARCHAR(50) NOT NULL,
  masjid_name VARCHAR(200) NOT NULL DEFAULT 'BSJM Thodar',
  details JSON DEFAULT NULL,
  photo_url LONGTEXT DEFAULT NULL,
  document_url LONGTEXT DEFAULT NULL,
  invitation_card_url LONGTEXT DEFAULT NULL,
  payment_screenshot_url LONGTEXT DEFAULT NULL,
  fee_amount DECIMAL(10,2) DEFAULT 0.00,
  payment_status ENUM('pending_payment', 'pending_review', 'approved', 'rejected') DEFAULT 'pending_payment',
  status VARCHAR(50) DEFAULT 'pending',
  admin_remarks TEXT DEFAULT NULL,
  approved_by VARCHAR(100) DEFAULT NULL,
  approved_at TIMESTAMP NULL DEFAULT NULL,
  user_id VARCHAR(100) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_katha (katha_number),
  INDEX idx_status (payment_status),
  INDEX idx_cert_type (certificate_type, created_at),
  INDEX idx_cert_masjid (masjid_name, created_at)
);

-- 18. Uploaded Documents (Local DB & Base64 Storage)
-- ============================================================
CREATE TABLE IF NOT EXISTS uploaded_documents (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  file_uuid VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL DEFAULT 'certificate',
  entity_id VARCHAR(100) DEFAULT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'documents',
  masjid_name VARCHAR(100) DEFAULT 'BSJM Thodar',
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  original_size INT UNSIGNED DEFAULT 0,
  compressed_size INT UNSIGNED DEFAULT 0,
  b2_key VARCHAR(500) DEFAULT NULL,
  file_url LONGTEXT DEFAULT NULL,
  file_data LONGTEXT DEFAULT NULL,
  is_deleted TINYINT(1) DEFAULT 0,
  deleted_at DATETIME DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_entity (entity_type, entity_id),
  INDEX idx_uuid (file_uuid),
  INDEX idx_deleted (is_deleted),
  INDEX idx_doc_active_entity (entity_type, entity_id, is_deleted)
);

-- ============================================================
-- Seed: Default Data
-- ============================================================
INSERT IGNORE INTO subscription_plans (id, name, label, type, price, chat_limit, duration_days) VALUES
(1, 'single_chat', 'Single Chat', 'single_chat', 49.00, 1, NULL),
(2, 'monthly', 'Monthly Plan', 'monthly', 199.00, NULL, 30),
(3, 'yearly', 'Yearly Plan', 'yearly', 999.00, NULL, 365);

INSERT IGNORE INTO masjid_settings (id, masjid_name, upi_id) VALUES
(1, 'BSJM Thodar', 'merchant@upi');
