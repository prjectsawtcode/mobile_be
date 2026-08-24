// Certificate fee configuration per masjid
// Add more masjids as needed

const DEFAULT_FEE = 200;

const CERTIFICATE_FEES = {
  'bsjm thodar': 100,
  'thodar': 100,
  'bsjm': 100,
};

function normalizeName(name) {
  if (!name) return '';
  return String(name).trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Get certificate fee for a given masjid name
 * @param {string} masjidName
 * @returns {number}
 */
function getCertificateFee(masjidName) {
  if (!masjidName) return DEFAULT_FEE;
  const key = normalizeName(masjidName);

  if (CERTIFICATE_FEES[key] !== undefined) {
    return CERTIFICATE_FEES[key];
  }

  for (const [k, fee] of Object.entries(CERTIFICATE_FEES)) {
    if (key.includes(k) || k.includes(key)) {
      return fee;
    }
  }

  return DEFAULT_FEE;
}

module.exports = { CERTIFICATE_FEES, DEFAULT_FEE, getCertificateFee };
