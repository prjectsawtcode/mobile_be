const crypto = require('crypto');
const axios = require('axios');

function sha512(str) {
  return crypto.createHash('sha512').update(str).digest('hex');
}

function getConfig(jamath) {
  return {
    merchantKey: process.env.EASEBUZZ_MERCHANT_KEY || 'T83A19RB4',
    salt: process.env.EASEBUZZ_SALT || 'O8U8WLM5Z',
    env: process.env.EASEBUZZ_ENV || process.env.ENV || 'test',
  };
}

function fetchBaseUrl(env, apiName = 'dashboard') {
  if (apiName === 'initiate_api') {
    return env === 'prod'
      ? 'https://pay.easebuzz.in/'
      : 'https://testpay.easebuzz.in/';
  }
  return env === 'prod'
    ? 'https://dashboard.easebuzz.in/'
    : 'https://testdashboard.easebuzz.in/';
}

function generateHashValue(params, salt, apiName = 'initiate_payment') {
  let hashSequence = '';

  if (apiName === 'initiate_payment') {
    hashSequence = [
      params.key || '',
      params.txnid || '',
      params.amount || '',
      params.productinfo || '',
      params.firstname || '',
      params.email || '',
      params.udf1 || '',
      params.udf2 || '',
      params.udf3 || '',
      params.udf4 || '',
      params.udf5 || '',
      params.udf6 || '',
      params.udf7 || '',
      params.udf8 || '',
      params.udf9 || '',
      params.udf10 || '',
      salt || '',
    ].join('|');
  } else if (apiName === 'transaction') {
    hashSequence = [params.key || '', params.txnid || '', salt || ''].join('|');
  }

  return sha512(hashSequence).toLowerCase();
}

function getReverseHashKey(responseArray, salt) {
  const hashSequence = [
    salt || '',
    responseArray.status || '',
    responseArray.udf10 || '',
    responseArray.udf9 || '',
    responseArray.udf8 || '',
    responseArray.udf7 || '',
    responseArray.udf6 || '',
    responseArray.udf5 || '',
    responseArray.udf4 || '',
    responseArray.udf3 || '',
    responseArray.udf2 || '',
    responseArray.udf1 || '',
    responseArray.email || '',
    responseArray.firstname || '',
    responseArray.productinfo || '',
    responseArray.amount || '',
    responseArray.txnid || '',
    responseArray.key || '',
  ].join('|');

  return sha512(hashSequence).toLowerCase();
}

function sanitizeParams(params) {
  const sanitized = {};
  const MAX_FIELD_LENGTH = 500;
  for (const key in params) {
    if (typeof params[key] === 'string') {
      sanitized[key] = params[key].trim().substring(0, MAX_FIELD_LENGTH);
    } else {
      sanitized[key] = params[key];
    }
  }
  return sanitized;
}

async function curlCallForm(url, params) {
  try {
    const formData = new URLSearchParams();
    for (const key in params) {
      if (params[key] !== '' && params[key] !== undefined && params[key] !== null) {
        formData.append(key, params[key]);
      }
    }
    const response = await axios.post(url, formData.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      maxRedirects: 0,
      validateStatus: () => true,
      timeout: 30000,
    });
    if (typeof response.data === 'string') {
      try {
        return JSON.parse(response.data);
      } catch (e) {
        return { status: 0, data: response.data };
      }
    }
    return response.data;
  } catch (error) {
    throw new Error(error.message || 'HTTP request to Easebuzz failed');
  }
}

async function callInitiatePaymentAPI(postData, merchantKey, salt, env) {
  const params = sanitizeParams(postData);

  const paymentParams = {
    key: merchantKey,
    txnid: params.txnid,
    amount: params.amount,
    productinfo: params.productinfo,
    firstname: params.firstname,
    email: params.email,
    phone: params.phone,
    surl: params.surl,
    furl: params.furl,
    udf1: params.udf1 || '',
    udf2: params.udf2 || '',
    udf3: params.udf3 || '',
    udf4: params.udf4 || '',
    udf5: params.udf5 || '',
    udf6: params.udf6 || '',
    udf7: params.udf7 || '',
  };

  const optionalFields = [
    'address1',
    'address2',
    'city',
    'state',
    'country',
    'zipcode',
    'sub_merchant_id',
    'unique_id',
    'split_payments',
    'show_payment_mode',
  ];
  optionalFields.forEach((field) => {
    if (params[field] && String(params[field]).trim() !== '') {
      paymentParams[field] = params[field];
    }
  });

  const hashData = { ...paymentParams, udf8: '', udf9: '', udf10: '' };
  paymentParams.hash = generateHashValue(hashData, salt, 'initiate_payment');

  const baseUrl = fetchBaseUrl(env, 'initiate_api');
  const callUrl = baseUrl + 'payment/initiateLink';

  const response = await curlCallForm(callUrl, paymentParams);
  const redirectBase = env === 'prod' ? 'https://pay.easebuzz.in/pay/' : 'https://testpay.easebuzz.in/pay/';

  if (response && response.status === 1 && response.data) {
    return {
      status: 1,
      access_key: response.data,
      url: redirectBase + encodeURIComponent(response.data),
      raw_response: response,
    };
  } else {
    const errorMsg = (response && response.error_desc) || (response && response.data) || 'Initiate payment failed';
    return { status: 0, error: errorMsg, raw_response: response };
  }
}

async function callTransactionAPI(txnid, merchantKey, salt, env) {
  const requestParams = {
    key: merchantKey,
    txnid: txnid,
  };
  requestParams.hash = generateHashValue(requestParams, salt, 'transaction');

  const baseUrl = fetchBaseUrl(env, 'dashboard');
  const callUrl = baseUrl + 'transaction/v2/retrieve';
  return await curlCallForm(callUrl, requestParams);
}

module.exports = {
  sha512,
  getConfig,
  fetchBaseUrl,
  generateHashValue,
  getReverseHashKey,
  sanitizeParams,
  callInitiatePaymentAPI,
  callTransactionAPI,
};
