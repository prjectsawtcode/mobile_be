require('dotenv').config();
const app = require('../src/app');
const db = require('../src/db/init');

let initialized = false;

async function ensureDb() {
  if (!initialized) {
    try {
      await db.init();
      await db.seed();
      initialized = true;
    } catch (err) {
      console.error('DB init failed:', err.message);
    }
  }
}

module.exports = async (req, res) => {
  await ensureDb();
  return app(req, res);
};
