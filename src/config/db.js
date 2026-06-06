const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
});

pool.on('connection', (conn) => {
  conn.on('error', () => {});
});

// Wrapper that auto-retries once on connection loss
async function query(sql, params) {
  try {
    const [rows] = await pool.query(sql, params);
    return rows;
  } catch (err) {
    if (err.message && err.message.includes('Connection is closed')) {
      const [rows] = await pool.query(sql, params);
      return rows;
    }
    throw err;
  }
}

module.exports = { pool, query };
