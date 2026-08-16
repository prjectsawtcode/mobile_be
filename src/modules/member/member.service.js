const axios = require('axios');
const { getJamathBaseUrl } = require('../../config/jamaths');
const { pool } = require('../../config/db');

async function axiosGetWithRetry(url, config, retries = 1) {
  try {
    return await axios.get(url, config);
  } catch (err) {
    if (retries > 0 && (!err.response || err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT')) {
      console.warn(`[EXTERNAL API RETRY] GET ${url} failed (${err.message}). Retrying in 1.5s for cold-start server...`);
      await new Promise((res) => setTimeout(res, 1500));
      return await axios.get(url, config);
    }
    throw err;
  }
}

function getBalanceKey(type) {
  if (!type) return null;
  let clean = String(type).toLowerCase().trim();
  if (clean.startsWith('balance_')) return clean;
  if (clean === 'salary' || clean === 'ustad_salary' || clean === 'ustad salary') return 'balance_ustad_salary';
  if (clean === 'uroos' || clean === 'uroose') return 'balance_uroose';
  return `balance_${clean}`;
}

async function getMemberBalanceDetails(query, user) {
  const kathaNumber = query.katha_number || user?.katha_number || user?.id;
  const jamath = query.jamath || user?.jamath || 'BSJM Thodar';

  if (!kathaNumber) {
    throw Object.assign(new Error('katha_number query parameter is required'), { status: 400 });
  }

  const baseUrl = getJamathBaseUrl(jamath);
  if (!baseUrl) {
    throw Object.assign(new Error(`No external API configured for jamath: ${jamath}`), { status: 400 });
  }

  const externalUrl = `${baseUrl.replace(/\/+$/, '')}/api/members/getMemberBalanceDetails`;

  let responseData;
  try {
    const response = await axiosGetWithRetry(externalUrl, {
      params: { katha_number: String(kathaNumber) },
      headers: {
        'Accept': 'application/json, */*',
      },
      timeout: 30000,
    });
    responseData = response.data;
  } catch (error) {
    if (error.response) {
      const errData = error.response.data;
      const msg = typeof errData?.error === 'string'
        ? errData.error
        : (errData?.error?.message || errData?.message || 'Failed to fetch member balance details');
      throw Object.assign(
        new Error(msg),
        { status: error.response.status, data: errData }
      );
    } else if (error.request) {
      throw Object.assign(new Error('External jamath service did not respond (timeout or server starting)'), { status: 502 });
    } else {
      throw Object.assign(new Error(error.message || 'Error fetching member balance details externally'), { status: 500 });
    }
  }

  // Adjust external balances with locally approved payments in payment_requests
  try {
    const [approvedPayments] = await pool.query(
      `SELECT payment_type, amount, is_balance_payment FROM payment_requests 
       WHERE katha_number = ? AND status = 'approved'`,
      [String(kathaNumber)]
    );

    const items = Array.isArray(responseData)
      ? responseData
      : (Array.isArray(responseData?.data) ? responseData.data : null);

    if (items && approvedPayments.length > 0) {
      const paidTotals = {};
      for (const p of approvedPayments) {
        const key = getBalanceKey(p.payment_type);
        if (key) {
          paidTotals[key] = (paidTotals[key] || 0) + Number(p.amount || 0);
        }
      }

      const updatedItems = items.map((item) => {
        const updatedItem = { ...item };
        for (const [bKey, paidAmt] of Object.entries(paidTotals)) {
          if (updatedItem[bKey] !== undefined && updatedItem[bKey] !== null) {
            const currentBal = Number(updatedItem[bKey]) || 0;
            const newBal = Math.max(0, currentBal - paidAmt);
            updatedItem[bKey] = newBal.toFixed(2);
          }
        }
        return updatedItem;
      });

      if (Array.isArray(responseData)) {
        responseData = updatedItems;
      } else if (Array.isArray(responseData?.data)) {
        responseData.data = updatedItems;
      }
    }
  } catch (dbErr) {
    console.warn('[MEMBER BALANCE DB DEDUCTION WARN] Failed to apply local approved payments deduction:', dbErr.message);
  }

  return responseData;
}

module.exports = {
  getMemberBalanceDetails,
};
