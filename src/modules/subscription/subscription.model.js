const db = require('../../config/db');

const SubscriptionModel = {
  async listPlans() {
    const [rows] = await db.query('SELECT * FROM subscription_plans WHERE active = 1 ORDER BY price');
    return rows;
  },

  async findPlan(id) {
    const [rows] = await db.query('SELECT * FROM subscription_plans WHERE id = ? AND active = 1', [id]);
    return rows[0];
  },

  async getUserSubscription(userId) {
    const [rows] = await db.query(
      `SELECT us.*, sp.name as plan_name, sp.label, sp.type 
       FROM user_subscriptions us 
       JOIN subscription_plans sp ON sp.id = us.plan_id 
       WHERE us.user_id = ? AND us.status IN ('active', 'cancelled')
       ORDER BY us.created_at DESC 
       LIMIT 1`,
      [userId]
    );
    return rows[0];
  },

  async createSubscription(data) {
    const [result] = await db.query('INSERT INTO user_subscriptions SET ?', data);
    return result.insertId;
  },

  async updateSubscription(id, data) {
    await db.query('UPDATE user_subscriptions SET ? WHERE id = ?', [data, id]);
  },

  async createTransaction(data) {
    await db.query('INSERT INTO payment_transactions SET ?', data);
  },

  async getHistory(userId) {
    const [rows] = await db.query(
      `SELECT pt.*, sp.name as plan_name 
       FROM payment_transactions pt 
       JOIN subscription_plans sp ON sp.id = pt.subscription_id 
       WHERE pt.user_id = ? 
       ORDER BY pt.created_at DESC`,
      [userId]
    );
    return rows;
  },
};

module.exports = SubscriptionModel;
