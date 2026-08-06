const { getMessaging, isEnabled } = require('../../config/firebase');
const { pool } = require('../../config/db');

// FCM caps a multicast at 500 tokens per request.
const BATCH_SIZE = 500;

// A token that FCM reports as dead will never work again — stop storing it.
const DEAD_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
]);

// FCM rejects the whole message unless every data value is a string.
function stringifyData(data = {}) {
  const out = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) continue;
    out[key] = typeof value === 'string' ? value : JSON.stringify(value);
  }
  return out;
}

async function pruneTokens(tokens) {
  if (!tokens.length) return;
  const placeholders = tokens.map(() => '?').join(',');
  await pool.query(`UPDATE users SET fcm_token = NULL WHERE fcm_token IN (${placeholders})`, tokens);
  console.warn(`[FCM] Cleared ${tokens.length} dead token(s).`);
}

/**
 * Delivers a push to the given device tokens.
 * Returns { enabled, sent, failed, pruned } and never throws — a delivery
 * failure must not roll back the in-app notification that was already stored.
 */
async function sendToTokens(tokens, { title, body, data = {}, url } = {}) {
  const unique = [...new Set((tokens || []).filter(Boolean))];
  if (!unique.length) return { enabled: isEnabled(), sent: 0, failed: 0, pruned: 0 };

  const messaging = getMessaging();
  if (!messaging) return { enabled: false, sent: 0, failed: 0, pruned: 0 };

  const payload = stringifyData({ ...data, ...(url ? { url } : {}) });
  let sent = 0;
  let failed = 0;
  const dead = [];

  for (let i = 0; i < unique.length; i += BATCH_SIZE) {
    const batch = unique.slice(i, i + BATCH_SIZE);
    try {
      const res = await messaging.sendEachForMulticast({
        tokens: batch,
        // `notification` makes Android/iOS render it while the app is backgrounded or killed.
        notification: { title, body },
        data: payload,
        android: { priority: 'high', notification: { sound: 'default' } },
        apns: { payload: { aps: { sound: 'default' } } },
      });

      sent += res.successCount;
      failed += res.failureCount;

      res.responses.forEach((r, idx) => {
        if (r.success) return;
        const code = r.error?.code;
        if (DEAD_TOKEN_CODES.has(code)) dead.push(batch[idx]);
        else console.error(`[FCM] Delivery failed (${code}): ${r.error?.message}`);
      });
    } catch (e) {
      failed += batch.length;
      console.error('[FCM] Batch send failed:', e.message);
    }
  }

  if (dead.length) {
    try {
      await pruneTokens(dead);
    } catch (e) {
      console.error('[FCM] Token cleanup failed:', e.message);
    }
  }

  return { enabled: true, sent, failed, pruned: dead.length };
}

async function sendToUsers(userIds, message) {
  const ids = [...new Set((userIds || []).filter(Boolean))];
  if (!ids.length) return { enabled: isEnabled(), sent: 0, failed: 0, pruned: 0 };

  const placeholders = ids.map(() => '?').join(',');
  const [rows] = await pool.query(
    `SELECT fcm_token FROM users WHERE id IN (${placeholders}) AND fcm_token IS NOT NULL`,
    ids
  );
  return sendToTokens(rows.map((r) => r.fcm_token), message);
}

async function sendToAllUsers(message) {
  const [rows] = await pool.query('SELECT fcm_token FROM users WHERE fcm_token IS NOT NULL');
  return sendToTokens(rows.map((r) => r.fcm_token), message);
}

module.exports = { sendToTokens, sendToUsers, sendToAllUsers };
