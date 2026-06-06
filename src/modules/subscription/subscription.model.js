const { pool } = require('../../config/db');

const createPlansTable = `
  CREATE TABLE IF NOT EXISTS subscription_plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    label VARCHAR(100) NOT NULL,
    type ENUM('single_chat','monthly','yearly') NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    chat_limit INT,
    duration_days INT,
    active BOOLEAN DEFAULT TRUE
  )`;

const createSubscriptionsTable = `
  CREATE TABLE IF NOT EXISTS user_subscriptions (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    plan_id INT NOT NULL,
    status ENUM('active','expired','cancelled') DEFAULT 'active',
    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    remaining_chats INT,
    payment_ref VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
  )`;

const createTransactionsTable = `
  CREATE TABLE IF NOT EXISTS payment_transactions (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    subscription_id CHAR(36),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    gateway VARCHAR(20) DEFAULT 'upi',
    status ENUM('pending','success','failed') DEFAULT 'pending',
    gateway_ref VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`;

async function init() {
  await pool.query(createPlansTable);
  await pool.query(createSubscriptionsTable);
  await pool.query(createTransactionsTable);
}

async function getPlans() {
  const [rows] = await pool.query('SELECT * FROM subscription_plans WHERE active = TRUE');
  return rows;
}

async function getUserSubscription(userId) {
  const [rows] = await pool.query(
    `SELECT s.*, p.name as plan_name, p.label, p.type FROM user_subscriptions s
     JOIN subscription_plans p ON s.plan_id = p.id
     WHERE s.user_id = ? AND s.status = 'active' AND (s.expires_at IS NULL OR s.expires_at > NOW())
     ORDER BY s.created_at DESC LIMIT 1`, [userId]
  );
  return rows[0] || null;
}

async function createSubscription(data) {
  await pool.query(
    'INSERT INTO user_subscriptions (id, user_id, plan_id, status, expires_at, remaining_chats, payment_ref) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [data.id, data.user_id, data.plan_id, data.status, data.expires_at, data.remaining_chats, data.payment_ref]
  );
}

async function createTransaction(data) {
  await pool.query(
    'INSERT INTO payment_transactions (id, user_id, subscription_id, amount, gateway, status, gateway_ref) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [data.id, data.user_id, data.subscription_id, data.amount, data.gateway, data.status, data.gateway_ref]
  );
}

async function getHistory(userId) {
  const [rows] = await pool.query(
    `SELECT t.*, p.label as plan_name FROM payment_transactions t
     JOIN user_subscriptions s ON t.subscription_id = s.id
     JOIN subscription_plans p ON s.plan_id = p.id
     WHERE t.user_id = ? ORDER BY t.created_at DESC`, [userId]
  );
  return rows;
}

async function getPlanById(id) {
  const [rows] = await pool.query('SELECT * FROM subscription_plans WHERE id = ? AND active = TRUE', [id]);
  return rows[0];
}

module.exports = { init, getPlans, getUserSubscription, createSubscription, createTransaction, getHistory, getPlanById };
