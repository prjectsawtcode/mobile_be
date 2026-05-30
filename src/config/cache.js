const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: null, retryStrategy: () => null });
redis.on('error', () => {});

const DEFAULT_TTL = 300;

async function get(key) {
  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch { return null; }
}

async function set(key, value, ttl = DEFAULT_TTL) {
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttl);
  } catch {}
}

async function del(key) {
  try { await redis.del(key); } catch {}
}

async function delPattern(pattern) {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length) await redis.del(keys);
  } catch {}
}

module.exports = { redis, get, set, del, delPattern };
