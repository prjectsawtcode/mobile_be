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

function stripWalletFields(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(stripWalletFields);
  }
  const walletKeyRegex = /^(wallet|wallet_.*|.*_wallet|walletAmount|walletBalance)$/i;
  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    if (!walletKeyRegex.test(k)) {
      result[k] = (v && typeof v === 'object') ? stripWalletFields(v) : v;
    }
  }
  return result;
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
  let paidTotals = {};
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

  // Strip wallet amount fields so they are never exposed/shown
  return buildCleanMemberBalanceResponse(responseData, kathaNumber, jamath, paidTotals);
}

function formatBalanceTitle(key) {
  if (!key) return '';
  const clean = String(key).replace(/^balance_/i, '');
  return clean
    .split(/[\s_]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function buildCleanMemberBalanceResponse(responseData, kathaNumber, jamath, paidTotals = {}) {
  const cleanData = stripWalletFields(responseData);
  const remainingPaidTotals = { ...paidTotals };

  let rawItems = [];
  if (Array.isArray(cleanData)) {
    rawItems = cleanData;
  } else if (cleanData && typeof cleanData === 'object') {
    if (Array.isArray(cleanData.data)) {
      rawItems = cleanData.data;
    } else if (cleanData.data && typeof cleanData.data === 'object') {
      rawItems = [cleanData.data];
    } else {
      rawItems = [cleanData];
    }
  }

  const allPendingBalances = [];
  const processedKeys = new Set();
  let totalOutstanding = 0;

  // 1. Collect pending unpaid bills (payment_status === 0)
  rawItems.forEach((item, index) => {
    if (!item || typeof item !== 'object') return;

    let isUnpaidBill = item.payment_status === 0 || item.payment_status === '0';
    let numAmt = Number(item.amount) || 0;

    // Check if local approved payments cover this unpaid bill
    if (isUnpaidBill && numAmt > 0) {
      const colType = item.collection_type || 'member_collection';
      const bKey = getBalanceKey(colType);
      const availablePaid = remainingPaidTotals[bKey] || 0;

      if (availablePaid >= numAmt) {
        remainingPaidTotals[bKey] = availablePaid - numAmt;
        isUnpaidBill = false;
        item.payment_status = 1;
      }
    }

    if (isUnpaidBill && numAmt > 0) {
      totalOutstanding += numAmt;
      const colType = item.collection_type || 'member_collection';
      const cleanType = colType.replace(/^balance_/i, '');

      allPendingBalances.push({
        id: item.collection_id || item.id || item.receipt_no || `bill-${index}`,
        key: colType.startsWith('balance_') ? colType : `balance_${colType}`,
        collection_type: cleanType,
        title: formatBalanceTitle(colType) + (item.month ? ` (${item.month})` : ''),
        amount: numAmt.toFixed(2),
        month: item.month || '',
        year: item.year || '',
        is_balance_payment: item.is_balance_payment ?? 0,
        payment_status: 0, // 0 = unpaid (enables Pay Now)
        can_pay: true,
        collection_id: item.collection_id || item.id || null,
        receipt_no: item.receipt_no || null,
        remarks: item.remarks || '',
      });
    }

    // 2. Check for non-zero balance_* fields on member records
    for (const [key, val] of Object.entries(item)) {
      if (key.toLowerCase().startsWith('balance_')) {
        const numVal = Number(val);
        const cleanType = key.replace(/^balance_/i, '');
        if (!isNaN(numVal) && numVal !== 0 && !processedKeys.has(cleanType)) {
          processedKeys.add(cleanType);
          totalOutstanding += numVal;
          allPendingBalances.push({
            id: `bal-${cleanType}`,
            key: key,
            collection_type: cleanType,
            title: formatBalanceTitle(key),
            amount: numVal.toFixed(2),
            month: '',
            year: item.year || '',
            is_balance_payment: 1,
            payment_status: 0,
            can_pay: true,
          });
        }
      }
    }
  });

  const formattedItems = rawItems.map((item) => {
    if (!item || typeof item !== 'object') return item;

    const itemKatha = item.katha_number || item.katha_no || item.khata_no || item.khataNo || item.kathaNo || kathaNumber;
    const isUnpaid = item.payment_status === 0 || item.payment_status === '0';

    return {
      ...item,
      katha_number: String(itemKatha),
      outstanding_balance: totalOutstanding.toFixed(2),
      is_balance_payment: item.is_balance_payment ?? (totalOutstanding > 0 ? 1 : 0),
      payment_status: isUnpaid ? 0 : item.payment_status,
      can_pay: isUnpaid || totalOutstanding > 0,
    };
  });

  const finalOutstanding = totalOutstanding.toFixed(2);
  const rootPaymentStatus = totalOutstanding > 0 ? 0 : 1;
  const firstItem = formattedItems[0] || {};

  return {
    success: true,
    jamath,
    katha_number: String(kathaNumber),
    member_name: firstItem.member_name || firstItem.name || firstItem.member_name_en || null,
    mobile: firstItem.mobile || firstItem.phone || firstItem.mobile_no || null,
    outstanding_balance: finalOutstanding,
    is_balance_payment: totalOutstanding > 0 ? 1 : 0,
    payment_status: rootPaymentStatus,
    can_pay: totalOutstanding > 0,
    balances: allPendingBalances,
    data: formattedItems,
    items: formattedItems,
  };
}

module.exports = {
  getMemberBalanceDetails,
};
