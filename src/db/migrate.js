require('dotenv').config();
const { pool } = require('../config/db');

/**
 * Helper to check if an index exists on a table in the current database
 */
async function indexExists(tableName, indexName) {
  try {
    const [rows] = await pool.query(
      `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1`,
      [tableName, indexName]
    );
    return rows.length > 0;
  } catch (err) {
    return false;
  }
}

/**
 * Helper to check if a column exists on a table
 */
async function columnExists(tableName, columnName) {
  try {
    const [rows] = await pool.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
      [tableName, columnName]
    );
    return rows.length > 0;
  } catch (err) {
    return false;
  }
}

/**
 * Helper to add column if it does not exist
 */
async function addColumnIfNotExists(tableName, columnName, columnDef) {
  const exists = await columnExists(tableName, columnName);
  if (!exists) {
    try {
      await pool.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${columnDef}`);
      console.log(`  + Added column \`${columnName}\` to table \`${tableName}\``);
    } catch (err) {
      console.warn(`  ! Warning adding column \`${columnName}\` to \`${tableName}\`:`, err.message);
    }
  }
}

/**
 * Helper to add index if it does not exist
 */
async function addIndexIfNotExists(tableName, indexName, indexDef) {
  const exists = await indexExists(tableName, indexName);
  if (!exists) {
    try {
      await pool.query(`ALTER TABLE \`${tableName}\` ADD ${indexDef}`);
      console.log(`  + Added index \`${indexName}\` to table \`${tableName}\``);
    } catch (err) {
      console.warn(`  ! Warning adding index \`${indexName}\` to \`${tableName}\`:`, err.message);
    }
  }
}

async function runMigrations() {
  console.log('====================================================');
  console.log('  SawtDeen Database Migration Runner (Raw MySQL2)');
  console.log('====================================================\n');

  try {
    // ----------------------------------------------------
    // 1. Users & Authentication
    // ----------------------------------------------------
    console.log('[1/18] Migrating Users & Auth tables...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        phone VARCHAR(15) NOT NULL UNIQUE,
        name VARCHAR(50) NOT NULL,
        email VARCHAR(100) DEFAULT NULL,
        gender ENUM('male', 'female') NOT NULL,
        role ENUM('user', 'admin', 'scholar', 'subscriber', 'vendor') DEFAULT 'user',
        password_hash VARCHAR(255) NOT NULL,
        aadhar_verified BOOLEAN DEFAULT FALSE,
        fcm_token TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        token VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await addIndexIfNotExists('users', 'idx_users_role', 'INDEX idx_users_role (role)');
    await addIndexIfNotExists('users', 'idx_users_email', 'INDEX idx_users_email (email)');
    await addIndexIfNotExists('refresh_tokens', 'idx_tokens_token', 'INDEX idx_tokens_token (token)');
    await addIndexIfNotExists('refresh_tokens', 'idx_tokens_expires', 'INDEX idx_tokens_expires (expires_at)');

    // ----------------------------------------------------
    // 2. User Profiles
    // ----------------------------------------------------
    console.log('[2/18] Migrating User Profiles...');
    await pool.query(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // ----------------------------------------------------
    // 3. Announcements
    // ----------------------------------------------------
    console.log('[3/18] Migrating Announcements...');
    await pool.query(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await addIndexIfNotExists('announcements', 'idx_announcements_dates', 'INDEX idx_announcements_dates (start_date, end_date)');
    await addIndexIfNotExists('announcements', 'idx_announcements_cat', 'INDEX idx_announcements_cat (category, privacy)');

    // ----------------------------------------------------
    // 4. Scholars & Schedules
    // ----------------------------------------------------
    console.log('[4/18] Migrating Scholars & Schedules...');
    await pool.query(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS scholar_schedules (
        id INT AUTO_INCREMENT PRIMARY KEY,
        scholar_id VARCHAR(36) NOT NULL,
        day_of_week TINYINT NOT NULL COMMENT '0=Sun, 1=Mon, ..., 6=Sat',
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
        FOREIGN KEY (scholar_id) REFERENCES scholars(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await addIndexIfNotExists('scholars', 'idx_scholars_type_status', 'INDEX idx_scholars_type_status (type, status, is_verified)');
    await addIndexIfNotExists('scholar_schedules', 'idx_schedule_day', 'INDEX idx_schedule_day (scholar_id, day_of_week)');

    // ----------------------------------------------------
    // 5. Chat Rooms & Messages
    // ----------------------------------------------------
    console.log('[5/18] Migrating Chat tables...');
    await pool.query(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await addIndexIfNotExists('chat_rooms', 'idx_chat_user_status', 'INDEX idx_chat_user_status (user_id, status)');
    await addIndexIfNotExists('chat_rooms', 'idx_chat_scholar_status', 'INDEX idx_chat_scholar_status (scholar_id, status)');
    await addIndexIfNotExists('chat_messages', 'idx_messages_room_time', 'INDEX idx_messages_room_time (room_id, created_at)');

    // ----------------------------------------------------
    // 6. Fatwa Archive & Bookmarks
    // ----------------------------------------------------
    console.log('[6/18] Migrating Fatwa tables...');
    await pool.query(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS fatwa_bookmarks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        fatwa_id VARCHAR(36) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_user_fatwa (user_id, fatwa_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (fatwa_id) REFERENCES fatwa_archive(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await addIndexIfNotExists('fatwa_archive', 'idx_fatwa_cat_lang', 'INDEX idx_fatwa_cat_lang (category, language)');

    // ----------------------------------------------------
    // 7. Prayer Preferences & Cache
    // ----------------------------------------------------
    console.log('[7/18] Migrating Prayer tables...');
    await pool.query(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS prayer_cache (
        id INT AUTO_INCREMENT PRIMARY KEY,
        date DATE NOT NULL,
        lat DECIMAL(10,7) NOT NULL,
        lng DECIMAL(10,7) NOT NULL,
        method INT NOT NULL,
        data JSON NOT NULL,
        cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_prayer (date, lat, lng, method)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // ----------------------------------------------------
    // 8. Quran Surahs, Verses, Translations & Bookmarks
    // ----------------------------------------------------
    console.log('[8/18] Migrating Quran tables...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS quran_surahs (
        id INT PRIMARY KEY,
        name_arabic VARCHAR(100) NOT NULL,
        name_simple VARCHAR(100) NOT NULL,
        name_english VARCHAR(100) NOT NULL,
        revelation_type VARCHAR(20) NOT NULL,
        verse_count INT NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS quran_verses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        surah_id INT NOT NULL,
        verse_number INT NOT NULL,
        text_arabic TEXT NOT NULL,
        juz INT DEFAULT NULL,
        page INT DEFAULT NULL,
        FOREIGN KEY (surah_id) REFERENCES quran_surahs(id) ON DELETE CASCADE,
        INDEX idx_surah_verse (surah_id, verse_number)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS quran_translations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        verse_id INT NOT NULL,
        language VARCHAR(10) NOT NULL,
        text TEXT NOT NULL,
        FOREIGN KEY (verse_id) REFERENCES quran_verses(id) ON DELETE CASCADE,
        INDEX idx_verse_lang (verse_id, language)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS quran_bookmarks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        surah_id INT NOT NULL,
        verse_number INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (surah_id) REFERENCES quran_surahs(id) ON DELETE CASCADE,
        UNIQUE KEY uk_user_verse (user_id, surah_id, verse_number)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // ----------------------------------------------------
    // 9. Community Posts, Comments & Likes
    // ----------------------------------------------------
    console.log('[9/18] Migrating Community tables...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS community_posts (
        id VARCHAR(36) PRIMARY KEY,
        author_id VARCHAR(36) NOT NULL,
        content TEXT NOT NULL,
        image_url TEXT DEFAULT NULL,
        is_deleted BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS community_comments (
        id VARCHAR(36) PRIMARY KEY,
        post_id VARCHAR(36) NOT NULL,
        author_id VARCHAR(36) NOT NULL,
        content TEXT NOT NULL,
        is_deleted BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE,
        FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS community_likes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        post_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_post_user (post_id, user_id),
        FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await addIndexIfNotExists('community_posts', 'idx_posts_active_time', 'INDEX idx_posts_active_time (is_deleted, created_at)');
    await addIndexIfNotExists('community_comments', 'idx_comments_post_time', 'INDEX idx_comments_post_time (post_id, is_deleted, created_at)');

    // ----------------------------------------------------
    // 10. Subscriptions & Transactions
    // ----------------------------------------------------
    console.log('[10/18] Migrating Subscriptions & Transactions...');
    await pool.query(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await addIndexIfNotExists('user_subscriptions', 'idx_user_sub_status', 'INDEX idx_user_sub_status (user_id, status)');

    // ----------------------------------------------------
    // 11. Notifications
    // ----------------------------------------------------
    console.log('[11/18] Migrating Notifications...');
    await pool.query(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await addIndexIfNotExists('notifications', 'idx_notif_time', 'INDEX idx_notif_time (user_id, created_at)');

    // ----------------------------------------------------
    // 12. Uploads
    // ----------------------------------------------------
    console.log('[12/18] Migrating Uploads...');
    await pool.query(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // ----------------------------------------------------
    // 13. Payment Requests, Masjid Settings & Verifications
    // ----------------------------------------------------
    console.log('[13/18] Migrating Payment Requests & Masjid Settings...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payment_requests (
        id CHAR(36) PRIMARY KEY,
        katha_number VARCHAR(50) NOT NULL,
        member_name VARCHAR(100) NOT NULL,
        payment_type VARCHAR(100) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        month VARCHAR(20) NOT NULL,
        upi_id VARCHAR(100),
        screenshot_url TEXT,
        utr VARCHAR(100),
        status ENUM('pending','approved','rejected') DEFAULT 'pending',
        admin_remark TEXT,
        admin_id CHAR(36),
        user_id CHAR(36),
        mobile VARCHAR(20),
        payment_mode VARCHAR(50) DEFAULT 'Cash',
        remarks TEXT,
        category VARCHAR(100),
        collection_id VARCHAR(100),
        is_balance_payment BOOLEAN DEFAULT FALSE,
        raw_data JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS masjid_settings (
        id INT PRIMARY KEY DEFAULT 1,
        masjid_name VARCHAR(200) NOT NULL DEFAULT 'Masjid',
        qr_code_url TEXT,
        upi_id VARCHAR(100),
        account_number VARCHAR(50),
        ifsc_code VARCHAR(20),
        bank_name VARCHAR(100),
        account_holder VARCHAR(100),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Ensure columns in payment_requests
    await addColumnIfNotExists('payment_requests', 'mobile', 'VARCHAR(20)');
    await addColumnIfNotExists('payment_requests', 'payment_mode', "VARCHAR(50) DEFAULT 'Cash'");
    await addColumnIfNotExists('payment_requests', 'remarks', 'TEXT');
    await addColumnIfNotExists('payment_requests', 'category', 'VARCHAR(100)');
    await addColumnIfNotExists('payment_requests', 'collection_id', 'VARCHAR(100)');
    await addColumnIfNotExists('payment_requests', 'is_balance_payment', 'BOOLEAN DEFAULT FALSE');
    await addColumnIfNotExists('payment_requests', 'raw_data', 'JSON');
    await addColumnIfNotExists('payment_requests', 'user_id', 'CHAR(36)');

    await addIndexIfNotExists('payment_requests', 'idx_pr_katha', 'INDEX idx_pr_katha (katha_number)');
    await addIndexIfNotExists('payment_requests', 'idx_pr_status', 'INDEX idx_pr_status (status)');
    await addIndexIfNotExists('payment_requests', 'idx_pr_user', 'INDEX idx_pr_user (user_id)');
    await addIndexIfNotExists('payment_requests', 'idx_pr_created', 'INDEX idx_pr_created (created_at)');

    // ----------------------------------------------------
    // 14. Shopping Products
    // ----------------------------------------------------
    console.log('[14/18] Migrating Shopping Products...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS shopping_products (
        id CHAR(36) PRIMARY KEY,
        provider_id CHAR(36) NOT NULL,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL DEFAULT 0,
        category VARCHAR(100) NOT NULL,
        provider_name VARCHAR(200) NOT NULL,
        whatsapp_number VARCHAR(20) NOT NULL,
        logo_url TEXT,
        image_url TEXT,
        about TEXT,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await addIndexIfNotExists('shopping_products', 'idx_shop_category', 'INDEX idx_shop_category (category, is_active)');
    await addIndexIfNotExists('shopping_products', 'idx_shop_active', 'INDEX idx_shop_active (is_active, created_at)');

    // ----------------------------------------------------
    // 15. Tour Packages
    // ----------------------------------------------------
    console.log('[15/18] Migrating Tour Packages...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tour_packages (
        id CHAR(36) PRIMARY KEY,
        provider_id CHAR(36) NOT NULL,
        provider_name VARCHAR(200) NOT NULL,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL DEFAULT 0,
        duration VARCHAR(50),
        category VARCHAR(50) NOT NULL DEFAULT 'Umrah',
        contact_whatsapp VARCHAR(20),
        website VARCHAR(200),
        image_url TEXT,
        logo_url TEXT,
        about TEXT,
        total_slots INT DEFAULT 0,
        booked_slots INT DEFAULT 0,
        start_date DATE,
        end_date DATE,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await addIndexIfNotExists('tour_packages', 'idx_tours_cat_active', 'INDEX idx_tours_cat_active (category, is_active)');
    await addIndexIfNotExists('tour_packages', 'idx_tours_active', 'INDEX idx_tours_active (is_active, created_at)');

    // ----------------------------------------------------
    // 16. Food Orders & Menu Items
    // ----------------------------------------------------
    console.log('[16/18] Migrating Food Categories & Menu Items...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS food_categories (
        id CHAR(36) PRIMARY KEY,
        provider_id CHAR(36) NOT NULL,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        logo_url TEXT,
        sort_order INT DEFAULT 0,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS food_menu_items (
        id CHAR(36) PRIMARY KEY,
        category_id CHAR(36) NOT NULL,
        provider_id CHAR(36) NOT NULL,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL DEFAULT 0,
        subcategory VARCHAR(100),
        image_url TEXT,
        whatsapp_number VARCHAR(20),
        is_available TINYINT(1) DEFAULT 1,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES food_categories(id) ON DELETE CASCADE,
        FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await addIndexIfNotExists('food_categories', 'idx_food_cat_sort', 'INDEX idx_food_cat_sort (provider_id, is_active, sort_order)');
    await addIndexIfNotExists('food_menu_items', 'idx_food_item_cat', 'INDEX idx_food_item_cat (category_id, is_active, subcategory)');

    // ----------------------------------------------------
    // 17. Certificate Requests
    // ----------------------------------------------------
    console.log('[17/18] Migrating Certificate Requests...');
    await pool.query(`
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
        fee_amount DECIMAL(10,2) DEFAULT 0,
        payment_status ENUM('pending_payment', 'pending_review', 'approved', 'rejected') DEFAULT 'pending_payment',
        status VARCHAR(50) DEFAULT 'pending',
        admin_remarks TEXT DEFAULT NULL,
        approved_by VARCHAR(100) DEFAULT NULL,
        approved_at TIMESTAMP NULL DEFAULT NULL,
        user_id VARCHAR(100) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_katha (katha_number),
        INDEX idx_status (payment_status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Ensure columns and LONGTEXT types
    await pool.query('ALTER TABLE certificate_requests MODIFY COLUMN photo_url LONGTEXT DEFAULT NULL').catch(() => {});
    await pool.query('ALTER TABLE certificate_requests MODIFY COLUMN document_url LONGTEXT DEFAULT NULL').catch(() => {});
    await pool.query('ALTER TABLE certificate_requests MODIFY COLUMN invitation_card_url LONGTEXT DEFAULT NULL').catch(() => {});
    await pool.query('ALTER TABLE certificate_requests MODIFY COLUMN payment_screenshot_url LONGTEXT DEFAULT NULL').catch(() => {});
    await addColumnIfNotExists('certificate_requests', 'status', "VARCHAR(50) DEFAULT 'pending'");
    await addColumnIfNotExists('certificate_requests', 'mobile', "VARCHAR(20) NOT NULL DEFAULT ''");
    await addColumnIfNotExists('certificate_requests', 'fee_amount', 'DECIMAL(10,2) DEFAULT 0');
    await addColumnIfNotExists('certificate_requests', 'payment_status', "ENUM('pending_payment','pending_review','approved','rejected') DEFAULT 'pending_payment'");
    await addColumnIfNotExists('certificate_requests', 'admin_remarks', 'TEXT DEFAULT NULL');
    await addColumnIfNotExists('certificate_requests', 'user_id', 'VARCHAR(100) DEFAULT NULL');
    await addIndexIfNotExists('certificate_requests', 'idx_cert_type', 'INDEX idx_cert_type (certificate_type, created_at)');
    await addIndexIfNotExists('certificate_requests', 'idx_cert_masjid', 'INDEX idx_cert_masjid (masjid_name, created_at)');

    // ----------------------------------------------------
    // 18. Uploaded Documents
    // ----------------------------------------------------
    console.log('[18/18] Migrating Uploaded Documents...');
    await pool.query(`
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
        INDEX idx_deleted (is_deleted)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query('ALTER TABLE uploaded_documents MODIFY COLUMN file_url LONGTEXT DEFAULT NULL').catch(() => {});
    await addColumnIfNotExists('uploaded_documents', 'file_data', 'LONGTEXT DEFAULT NULL');
    await addColumnIfNotExists('uploaded_documents', 'is_deleted', 'TINYINT(1) DEFAULT 0');
    await addColumnIfNotExists('uploaded_documents', 'deleted_at', 'DATETIME DEFAULT NULL');
    await pool.query('ALTER TABLE uploaded_documents MODIFY b2_key VARCHAR(500) NULL').catch(() => {});
    await addIndexIfNotExists('uploaded_documents', 'idx_doc_active_entity', 'INDEX idx_doc_active_entity (entity_type, entity_id, is_deleted)');

    // ----------------------------------------------------
    // Default Seed Data
    // ----------------------------------------------------
    console.log('\nChecking default seed records...');

    // Seed default subscription plans
    const [plans] = await pool.query('SELECT COUNT(*) as c FROM subscription_plans');
    if (plans[0].c === 0) {
      await pool.query(`INSERT INTO subscription_plans (name, label, type, price, chat_limit, duration_days) VALUES
        ('single_chat', 'Single Chat', 'single_chat', 49.00, 1, NULL),
        ('monthly', 'Monthly Plan', 'monthly', 199.00, NULL, 30),
        ('yearly', 'Yearly Plan', 'yearly', 999.00, NULL, 365)`);
      console.log('  + Seeded default subscription plans');
    }

    // Seed default masjid settings
    const [masjidRows] = await pool.query('SELECT COUNT(*) as c FROM masjid_settings');
    if (masjidRows[0].c === 0) {
      await pool.query(
        `INSERT INTO masjid_settings (id, masjid_name, upi_id) VALUES (1, 'BSJM Thodar', 'merchant@upi')`
      );
      console.log('  + Seeded default masjid settings');
    }

    console.log('\n====================================================');
    console.log('  All migrations and indexes applied successfully!');
    console.log('====================================================\n');
  } catch (err) {
    console.error('\n[MIGRATION ERROR]', err);
    process.exit(1);
  }
}

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Fatal migration error:', err);
      process.exit(1);
    });
}

module.exports = { runMigrations };
