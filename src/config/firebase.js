const fs = require('fs');
const path = require('path');
const { initializeApp, getApps, getApp, cert, applicationDefault } = require('firebase-admin/app');
const { getMessaging: getAdminMessaging } = require('firebase-admin/messaging');

let messaging = null;

// Accepts the service account as raw JSON (best for Vercel/CI) or as a file path
// (best for local dev). Falls back to GOOGLE_APPLICATION_CREDENTIALS if set.
function loadCredential() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (raw && raw.trim()) {
    try {
      return cert(JSON.parse(raw));
    } catch (e) {
      console.error('[FCM] FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON:', e.message);
      return null;
    }
  }

  const file = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (file && file.trim()) {
    const resolved = path.isAbsolute(file) ? file : path.join(__dirname, '..', '..', file);
    if (!fs.existsSync(resolved)) {
      console.error(`[FCM] Service account file not found: ${resolved}`);
      return null;
    }
    try {
      return cert(JSON.parse(fs.readFileSync(resolved, 'utf8')));
    } catch (e) {
      console.error('[FCM] Could not read service account file:', e.message);
      return null;
    }
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    try {
      return applicationDefault();
    } catch (e) {
      console.error('[FCM] applicationDefault() failed:', e.message);
    }
  }

  return null;
}

// Push is optional infrastructure: a missing/broken service account must never stop
// the API from booting, it just disables delivery to phones.
function init() {
  if (messaging) return messaging;

  const credential = loadCredential();
  if (!credential) {
    console.warn('[FCM] No service account configured — push to phones is DISABLED. In-app notifications still work.');
    return null;
  }

  try {
    const app = getApps().length ? getApp() : initializeApp({ credential });
    messaging = getAdminMessaging(app);
    console.log(`[FCM] Firebase Admin initialized (project: ${app.options.credential?.projectId || 'unknown'}) — push to phones is ENABLED.`);
    return messaging;
  } catch (e) {
    console.error('[FCM] Firebase Admin init failed:', e.message);
    return null;
  }
}

function getMessaging() {
  return messaging || init();
}

function isEnabled() {
  return Boolean(getMessaging());
}

module.exports = { init, getMessaging, isEnabled };
