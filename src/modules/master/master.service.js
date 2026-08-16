const axios = require('axios');
const { getJamathBaseUrl } = require('../../config/jamaths');

async function getCommitteeConfig(query, user) {
  const jamath = query.jamath || user?.jamath || 'BSJM Thodar';

  const baseUrl = getJamathBaseUrl(jamath);
  if (!baseUrl) {
    throw Object.assign(new Error(`No external API configured for jamath: ${jamath}`), { status: 400 });
  }

  const externalUrl = `${baseUrl.replace(/\/+$/, '')}/api/master/committee-config`;

  try {
    const response = await axios.get(externalUrl, {
      headers: {
        'Accept': 'application/json, */*',
      },
      timeout: 15000,
    });

    return response.data;
  } catch (error) {
    if (error.response) {
      const errData = error.response.data;
      const msg = typeof errData?.error === 'string'
        ? errData.error
        : (errData?.error?.message || errData?.message || 'Failed to fetch committee config');
      throw Object.assign(
        new Error(msg),
        { status: error.response.status, data: errData }
      );
    } else if (error.request) {
      throw Object.assign(new Error('External jamath service did not respond'), { status: 502 });
    } else {
      throw Object.assign(new Error(error.message || 'Error fetching committee config externally'), { status: 500 });
    }
  }
}

module.exports = {
  getCommitteeConfig,
};
