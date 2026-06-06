const Redis = require('ioredis');

const DEFAULT_TTL = 300;
const memoryCache = new Map();

let redis;
let useRedis = false;

if (process.env.REDIS_URL) {
  redis = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
    retryStrategy: () => null,
    lazyConnect: true,
  });
  redis.on('error', () => { useRedis = false; });
  redis.connect().then(() => { useRedis = true; }).catch(() => { useRedis = false; });
}

async function get(key) {
  if (useRedis) {
    try {
      const data = await redis.get(key);
      if (data) return JSON.parse(data);
    } catch {}
  }
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (entry.expiry && Date.now() > entry.expiry) {
    memoryCache.delete(key);
    return null;
  }
  return entry.value;
}

async function set(key, value, ttl = DEFAULT_TTL) {
  if (useRedis) {
    try {
      await redis.set(key, JSON.stringify(value), 'EX', ttl);
      return;
    } catch {}
  }
  memoryCache.set(key, { value, expiry: Date.now() + ttl * 1000 });
}

async function del(key) {
  if (useRedis) {
    try { await redis.del(key); } catch {}
  }
  memoryCache.delete(key);
}

async function delPattern(pattern) {
  if (useRedis) {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length) await redis.del(keys);
    } catch {}
  }
  const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
  for (const key of memoryCache.keys()) {
    if (regex.test(key)) memoryCache.delete(key);
  }
}

module.exports = { redis, get, set, del, delPattern };
