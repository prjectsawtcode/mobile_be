const axios = require('axios');

const FAST2SMS_API_KEY = process.env.FAST2SMS_API_KEY;
const FAST2SMS_BASE = 'https://www.fast2sms.com/dev/bulkV2';
const SENDER_ID = process.env.FAST2SMS_SENDER_ID || 'SAWTDN';
const ENTITY_ID = process.env.FAST2SMS_ENTITY_ID;
const TEMPLATE_ID = process.env.FAST2SMS_TEMPLATE_ID;
const DEV_OTP = '1111';

function shouldBypass() {
  const isDev = process.env.NODE_ENV === 'development';
  const bypassConfig = process.env.BYPASS_SMS;
  if (bypassConfig === 'true') {
    return true;
  }
  if (bypassConfig === 'false') {
    return false;
  }
  return isDev;
}

async function sendOtp(phone, otp) {
  if (shouldBypass()) {
    const finalOtp = otp || DEV_OTP;
    console.log(`[BYPASS OTP] ${finalOtp} for ${phone}`);
    return {
      return: true,
      message: 'SMS sent successfully (bypassed)'
    };
  }

  if (!FAST2SMS_API_KEY) {
    console.warn('[SMS] FAST2SMS_API_KEY not configured — skipping SMS');
    return null;
  }

  if (!phone) return null;

  const message = `Your OTP for Sawtdeen is ${otp}. Do not share it with anyone. https://sawtdeen.com`;

  try {
    const payload = {
      route: 'dlt_manual',
      sender_id: SENDER_ID,
      entity_id: ENTITY_ID,
      template_id: TEMPLATE_ID,
      message,
      numbers: Array.isArray(phone) ? phone.join(',') : phone,
    };

    const { data } = await axios.post(FAST2SMS_BASE, payload, {
      headers: {
        authorization: FAST2SMS_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    console.log('[SMS] OTP sent to', phone, '—', data.message);
    return data;
  } catch (err) {
    console.error('[SMS] Failed:', err.response?.data || err.message);
    return null;
  }
}

function getDevOtp() {
  return DEV_OTP;
}

module.exports = { sendOtp, getDevOtp, shouldBypass };
