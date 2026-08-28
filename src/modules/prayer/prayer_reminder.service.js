const { pool } = require('../../config/db');
const prayerService = require('./prayer.service');
const notificationService = require('../notification/notification.service');

/**
 * Pushes a reminder shortly before each prayer.
 *
 * Every member in India shares one timing, so the schedule is computed once
 * for a configured location rather than per user. Driven by a cron hitting
 * /api/v1/prayer/cron/reminders — serverless has nowhere to keep a timer.
 */

const PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

// Minutes before the prayer to send. LEAD is the intent; WINDOW is how late a
// tick may run and still fire, so a cron that drifts or runs every few minutes
// does not skip a prayer entirely.
const LEAD_MINUTES = Number(process.env.PRAYER_LEAD_MINUTES || 1);
const WINDOW_MINUTES = Number(process.env.PRAYER_WINDOW_MINUTES || 5);

// Mangalore by default — the jamaths this serves. Override per deployment.
const LAT = process.env.PRAYER_LAT || '12.9141';
const LNG = process.env.PRAYER_LNG || '74.8560';
const METHOD = Number(process.env.PRAYER_METHOD || 1);

// India is a single offset, so the day boundary and "now" are read in IST
// regardless of where the function happens to run.
const TZ = process.env.PRAYER_TZ || 'Asia/Kolkata';

function nowInTz() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date()).reduce((a, p) => (a[p.type] = p.value, a), {});

  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

/** "05:34" or "05:34 (IST)" or "5:34 PM" → minutes since midnight. */
function toMinutes(raw) {
  const text = String(raw || '').trim().toUpperCase();
  const m = text.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?/);
  if (!m) return null;
  let hour = Number(m[1]);
  const minute = Number(m[2]);
  if (Number.isNaN(hour) || Number.isNaN(minute) || minute > 59) return null;
  if (m[3] === 'PM' && hour !== 12) hour += 12;
  if (m[3] === 'AM' && hour === 12) hour = 0;
  if (hour > 23) return null;
  return hour * 60 + minute;
}

/**
 * Has this prayer already gone out today?
 *
 * The check is the notifications table rather than the cache: Redis is
 * optional here and its fallback is an in-process Map, which does not survive
 * between serverless invocations — exactly the case this must be right for.
 */
async function alreadySent(date, prayer) {
  const [[row]] = await pool.query(
    `SELECT 1 AS hit
       FROM notifications
      WHERE type = 'prayer'
        AND DATE(created_at) = ?
        AND JSON_UNQUOTE(JSON_EXTRACT(data, '$.prayer_name')) = ?
      LIMIT 1`,
    [date, prayer]
  );
  return Boolean(row);
}

/**
 * One cron tick. Sends any prayer whose reminder moment has arrived and has
 * not already been sent today. Never throws: a bad tick must not take the
 * endpoint down and stop later prayers.
 */
async function runTick() {
  const { date, minutes: nowMin } = nowInTz();

  let times;
  try {
    times = await prayerService.getPublicTimes(LAT, LNG, METHOD);
  } catch (e) {
    console.error('[prayer-cron] could not fetch times:', e.message);
    return { date, checked: 0, sent: [], error: e.message };
  }

  const sent = [];
  const skipped = [];

  for (const prayer of PRAYERS) {
    // getPublicTimes returns { prayers: { fajr, dhuhr, ... } } in 12-hour form.
    const raw = times?.prayers?.[prayer.toLowerCase()];
    const at = toMinutes(raw);
    if (at === null) { skipped.push(`${prayer}:unparsed`); continue; }

    const fireAt = at - LEAD_MINUTES;
    const late = nowMin - fireAt;
    if (late < 0 || late > WINDOW_MINUTES) { skipped.push(`${prayer}:not-due`); continue; }

    if (await alreadySent(date, prayer)) { skipped.push(`${prayer}:already-sent`); continue; }

    try {
      const res = await notificationService.sendPrayerAlertNotification({
        prayer_name: prayer,
        title: `${prayer} in ${LEAD_MINUTES} minute${LEAD_MINUTES === 1 ? '' : 's'}`,
        body: `${prayer} at ${raw} · ${times.location || 'your area'}`,
        url: '/prayer',
      });
      sent.push({ prayer, recipients: res.recipients, devices: res.push?.sent ?? 0 });
      console.log(`[prayer-cron] ${date} ${prayer} sent to ${res.push?.sent ?? 0} device(s)`);
    } catch (e) {
      console.error(`[prayer-cron] ${prayer} send failed:`, e.message);
      skipped.push(`${prayer}:send-failed`);
    }
  }

  return { date, now: nowMin, checked: PRAYERS.length, sent, skipped };
}

module.exports = { runTick, toMinutes, nowInTz };
