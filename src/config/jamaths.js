// Jamath / Masjid external API base URL mapping

const DEFAULT_JAMATH_URL = process.env.JAMATH_API_URL || 'https://thodar-sawtdeen-be.onrender.com';

const JAMATH_ENDPOINTS = {
  'bsjm thodar': DEFAULT_JAMATH_URL,
  'thodar': DEFAULT_JAMATH_URL,
  'bsjm': DEFAULT_JAMATH_URL,
};

function normalizeName(name) {
  if (!name) return '';
  return String(name).trim().toLowerCase().replace(/\s+/g, ' ');
}

function getJamathBaseUrl(jamathName) {
  if (!jamathName) return DEFAULT_JAMATH_URL;
  const key = normalizeName(jamathName);

  if (JAMATH_ENDPOINTS[key]) {
    return JAMATH_ENDPOINTS[key];
  }

  for (const [k, url] of Object.entries(JAMATH_ENDPOINTS)) {
    if (key.includes(k) || k.includes(key)) {
      return url;
    }
  }

  return DEFAULT_JAMATH_URL;
}

module.exports = {
  JAMATH_ENDPOINTS,
  DEFAULT_JAMATH_URL,
  getJamathBaseUrl,
};

