const easebuzz = require('../../utils/easebuzz');
const { randomUUID } = require('crypto');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const model = require('./payment.model');
const notificationModel = require('../notification/notification.model');
const { sendSMS, sendSMSFast2SMS, shouldBypass, getDevOtp } = require('../../utils/sms');
const axios = require('axios');
const { getJamathBaseUrl } = require('../../config/jamaths');

function maskMobile(m) {
  if (!m) return '';
  const str = String(m).replace(/\D/g, '');
  if (str.length < 4) return str;
  return '*'.repeat(Math.max(0, str.length - 4)) + str.slice(-4);
}

async function createRequest(data, userId) {
  const id = randomUUID();
  return model.createRequest({ id, ...data, user_id: userId });
}

async function listRequests(query) {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 20;
  return model.findAllRequests({
    status: query.status,
    katha_number: query.katha_number,
    page,
    limit,
  });
}

async function getRequest(id) {
  const req = await model.findRequestById(id);
  if (!req) throw Object.assign(new Error('Payment request not found'), { status: 404 });
  return req;
}

async function updateStatus(id, status, adminId, remark, jamath) {
  const req = await model.findRequestById(id);
  if (!req) throw Object.assign(new Error('Payment request not found'), { status: 404 });
  
  const updated = await model.updateRequestStatus(id, status, adminId, remark);

  // Sync approval status to source Jamath database if configured
  const rawData = typeof req.raw_data === 'string' ? JSON.parse(req.raw_data || '{}') : (req.raw_data || {});
  const targetJamath = jamath || rawData.jamath || rawData.masjid_name || 'BSJM Thodar';
  const baseUrl = getJamathBaseUrl(targetJamath);
  if (baseUrl) {
    const externalUrl = `${baseUrl.replace(/\/+$/, '')}/api/payment/update-status`;
    try {
      await axiosPostWithRetry(externalUrl, {
        payment_id: id,
        katha_number: req.katha_number,
        khata_no: req.katha_number,
        khataNo: req.katha_number,
        status,
        remark,
        amount: req.amount,
        collection_type: req.payment_type,
        collectionType: req.payment_type,
        month: req.month,
        year: rawData.year || undefined,
        is_balance_payment: req.is_balance_payment,
        payment_mode: req.payment_mode,
        mobile: req.mobile,
        jamath: targetJamath,
      }, { timeout: 30000 }).catch((err) => {
        console.warn(`[EXTERNAL STATUS SYNC WARN] Update status call to ${externalUrl} notice:`, err.message);
      });
    } catch (_) {}
  }

  if (req.user_id) {
    const notifId = randomUUID();
    const title = status === 'approved' ? 'Payment Approved' : 'Payment Rejected';
    const body = status === 'approved'
      ? `Your ${req.payment_type} payment of Rs.${req.amount} has been approved.`
      : `Your ${req.payment_type} payment of Rs.${req.amount} has been rejected.${remark ? ' Remark: ' + remark : ''}`;
    await notificationModel.create({
      id: notifId,
      user_id: req.user_id,
      title,
      body,
      type: 'payment',
      data: { payment_id: id, status, remark },
    });

    // Send SMS notification
    try {
      const { pool } = require('../../config/db');
      const [[user]] = await pool.query('SELECT phone FROM users WHERE id = ?', [req.user_id]);
      if (user?.phone) {
        const smsMsg = status === 'approved'
          ? `Dear ${req.member_name}, your ${req.payment_type} payment of Rs.${req.amount} has been approved. - SawtDeen`
          : `Dear ${req.member_name}, your ${req.payment_type} payment of Rs.${req.amount} has been rejected.${remark ? ' Reason: ' + remark : ''} - SawtDeen`;
        await sendSMS({ numbers: [user.phone], message: smsMsg });
      }
    } catch (_) { /* SMS non-blocking */ }
  }

  return updated;
}

async function getMemberRequests(kathaNumber) {
  return model.findMemberRequests(kathaNumber);
}

async function getSettings() {
  return model.getSettings();
}

async function updateSettings(data) {
  return model.updateSettings(data);
}

async function axiosPostWithRetry(url, data, config, retries = 1) {
  try {
    return await axios.post(url, data, config);
  } catch (err) {
    if (retries > 0 && (!err.response || err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT')) {
      console.warn(`[EXTERNAL API RETRY] Call to ${url} failed (${err.message}). Retrying in 1.5s for cold-start server...`);
      await new Promise(res => setTimeout(res, 1500));
      return await axios.post(url, data, config);
    }
    throw err;
  }
}

async function verifyMember(data) {
  const memberNumber = data.member_number || data.katha_number;
  const mobile = data.mobile;
  const jamath = data.jamath || data.masjid_name || data.jamath_name || 'BSJM Thodar';

  if (!memberNumber) {
    throw Object.assign(new Error('Member number (or katha_number) is required'), { status: 400 });
  }

  if (!mobile) {
    throw Object.assign(new Error('Mobile number is required'), { status: 400 });
  }

  const baseUrl = getJamathBaseUrl(jamath);
  if (!baseUrl) {
    throw Object.assign(new Error(`No external API configured for jamath: ${jamath}`), { status: 400 });
  }

  const externalUrl = `${baseUrl.replace(/\/+$/, '')}/api/payment/verify-member`;
  console.log(" verifyMember | externalUrl | ",externalUrl);
  

  try {
    const response = await axiosPostWithRetry(
      externalUrl,
      {
        katha_number: String(memberNumber),
        mobile: String(mobile),
        jamath: String(jamath),
        masjid_name: String(jamath),
        jamath_name: String(jamath),
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, */*',
        },
        timeout: 30000,
      }
    );

    return response.data;
  } catch (error) {
    console.error(`[VERIFY MEMBER ERROR] Failed to verify with external Jamath API at ${externalUrl}:`, error.message);
    if (error.response) {
      const errData = error.response.data;
      const msg = typeof errData?.error === 'string'
        ? errData.error
        : (errData?.error?.message || errData?.message || 'External member verification failed');
      throw Object.assign(
        new Error(msg),
        { status: error.response.status, data: typeof errData === 'object' ? errData : { error: msg } }
      );
    } else if (error.request) {
      throw Object.assign(new Error('External jamath service did not respond (timeout or server starting)'), { status: 502 });
    } else {
      throw Object.assign(new Error(error.message || 'Error verifying member externally'), { status: 500 });
    }
  }
}

async function sendOTP(data) {
  const katha_number = String(data.katha_number || data.member_number || '').trim();
  const rawMobile = String(data.mobile || '').trim();
  const cleanMobile = rawMobile.replace(/\D/g, '').slice(-10);

  if (!katha_number || !cleanMobile || cleanMobile.length !== 10) {
    throw Object.assign(new Error('Valid katha_number and 10-digit mobile number are required'), { status: 400 });
  }

  // Security Rate Limiting: Avoid continuous hits & malicious calls (60 second cooldown)
  const lastTime = await model.getLastOtpTime(katha_number, cleanMobile);
  if (lastTime) {
    const elapsedSeconds = (Date.now() - new Date(lastTime).getTime()) / 1000;
    if (elapsedSeconds < 60) {
      const waitTime = Math.ceil(60 - elapsedSeconds);
      throw Object.assign(new Error(`Please wait ${waitTime} seconds before requesting another OTP`), { status: 429 });
    }
  }

  // Expire previous unverified OTPs
  await model.expirePreviousOtps(katha_number, cleanMobile);

  // Generate 4-digit OTP
  const isDevBypass = shouldBypass();
  const otpCode = isDevBypass ? getDevOtp() : String(Math.floor(1000 + Math.random() * 9000));

  // Expiration time: 5 minutes from now
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  const id = randomUUID();

  // Save details in payment_verifications DB table
  await model.createOtpVerification({
    id,
    katha_number,
    mobile: cleanMobile,
    otp_code: otpCode,
    expires_at: expiresAt,
  });

  // Send OTP via Fast2SMS (or bypass in dev)
  if (isDevBypass) {
    console.log(`[DEV BYPASS OTP] Katha: ${katha_number}, Mobile: ${cleanMobile}, OTP: ${otpCode}`);
  } else {
    await sendSMSFast2SMS(cleanMobile, otpCode);
  }

  return {
    success: true,
    message: 'OTP sent successfully',
    mobile: maskMobile(cleanMobile),
  };
}

async function verifyOTP(data) {
  const katha_number = String(data.katha_number || data.member_number || '').trim();
  const rawMobile = String(data.mobile || '').trim();
  const cleanMobile = rawMobile.replace(/\D/g, '').slice(-10);
  const otpCode = String(data.otp || '').trim();

  if (!katha_number || !cleanMobile || !otpCode) {
    throw Object.assign(new Error('katha_number, mobile, and otp are required'), { status: 400 });
  }

  // Check locally in payment_verifications DB table (NO external API call!)
  const record = await model.findValidOtp({
    katha_number,
    mobile: cleanMobile,
    otp_code: otpCode,
  });

  if (!record) {
    throw Object.assign(new Error('Invalid or expired OTP'), { status: 401 });
  }

  // Mark OTP verified in table
  await model.markOtpVerified(record.id);

  // Generate authenticated JWT token for payment portal session
  const token = jwt.sign(
    { id: katha_number, katha_number, mobile: cleanMobile, role: 'member' },
    process.env.JWT_SECRET || 'sawtdeen-jwt-secret-2024',
    { expiresIn: '1d' }
  );

  return {
    success: true,
    message: 'OTP verified successfully',
    token,
    member: {
      katha_number,
      mobile: cleanMobile,
    },
  };
}

const path = require('path');
const b2 = require('../../utils/b2');

async function submitPayment(data, user, file, authHeader) {
  console.log('[PAYMENT SUBMIT INCOMING]', {
    katha_no: data.khata_no || data.katha_number,
    collectionType: data.collectionType || data.collection_type,
    amount: data.amount,
    month: data.month,
    year: data.year,
    user_id: user?.id,
  });
  let katha_number = String(
    data.khata_no ||
    data.khataNo ||
    data.katha_number ||
    data.member_number ||
    data.rawFields?.khataNo ||
    data.rawFields?.khata_no ||
    ''
  ).trim();

  if (!katha_number && user?.katha_number && user.katha_number !== 'portal-admin') {
    katha_number = String(user.katha_number).trim();
  }
  if (!katha_number && user?.id && user.id !== 'portal-admin') {
    katha_number = String(user.id).trim();
  }
  if (!katha_number) katha_number = '501';

  let member_name = data.member_name || data.memberData?.member_name || user?.name;
  if (!member_name || member_name === 'Portal Admin') {
    member_name = `Member ${katha_number}`;
  }

  const mobile = String(data.mobile || data.rawFields?.mobile || user?.mobile || '').trim();
  const jamath = String(data.jamath || user?.jamath || 'BSJM Thodar').trim();
  const collection_type = data.collectionType || data.collection_type || data.payment_type || 'payment';
  const amount = data.amount || data.rawFields?.amount;
  const month = data.month || data.rawFields?.month || '';
  const year = data.year || data.rawFields?.year || '';
  const remarks = data.remarks || data.rawFields?.remarks || '';
  const payment_mode = data.payment_mode || data.paymentMode || data.rawFields?.payment_mode || data.rawFields?.paymentMode || 'Cash';
  const utr = data.transaction_id || data.utr || null;

  const cleanType = String(collection_type || '').toLowerCase().trim();
  const cleanCategory = String(data.category || '').toLowerCase().trim();
  const cleanPaymentMode = String(payment_mode || '').toLowerCase().trim();

  const balanceKeys = [
    'balance_ustad_salary',
    'balance_vanthige',
    'balance_uroose',
    'balance_moulid',
    'balance_ratheeb',
    'balance_tharaveeh',
    'balance_bakreed',
    'balance_tiffin',
    'balance_water',
    'balance_electricity',
    'balance_maintenance',
    'balance_donation',
    'balance_special',
    'balance_salary',
  ];

  const isFromBalanceKeys = balanceKeys.some((k) => k === cleanType);

  const rawIsBalance = data.is_balance_payment !== undefined ? data.is_balance_payment : data.rawFields?.is_balance_payment;
  const isRequestedBalance = rawIsBalance === 1 || rawIsBalance === '1' || rawIsBalance === true || rawIsBalance === 'true';
  const isBoolTrue = (val) => val === true || val === 'true' || val === 1 || val === '1';

  // If Outstanding Balances then is_balance_payment = 1 else 0
  const isOutstanding =
    cleanType.startsWith('balance_') ||
    isFromBalanceKeys ||
    isRequestedBalance ||
    isBoolTrue(data.isCardSelected) ||
    isBoolTrue(data.isOutstandingPayment) ||
    isBoolTrue(data.balanceAmountMode) ||
    cleanCategory.includes('outstanding') ||
    cleanCategory.includes('balance') ||
    cleanPaymentMode === 'dues';

  const is_balance_payment = isOutstanding ? 1 : 0;

  if (!amount) {
    throw Object.assign(new Error('amount is required'), { status: 400 });
  }

  let screenshot_url = '';

  const { compressFile } = require('../../utils/file_compressor');
  const documentModel = require('../document/document.model');

  // 1. Upload screenshot file to local database (uploaded_documents)
  if (file) {
    try {
      const compressed = await compressFile(file);
      if (compressed && compressed.buffer) {
        const originalName = file.originalname || 'screenshot.png';
        const mimeType = compressed.mimeType || 'image/png';
        const base64Str = compressed.buffer.toString('base64');
        const fileData = `data:${mimeType};base64,${base64Str}`;
        const fileUuid = randomUUID();
        const fileName = b2.buildB2Key({
          masjidName: data.masjid_name || 'BSJM Thodar',
          certificateType: 'payment',
          folder: 'payment-proofs',
          originalName,
        });

        const port = process.env.PORT || 4000;
        const baseUrl = process.env.BACKEND_URL ? process.env.BACKEND_URL.replace(/\/+$/, '') : `http://localhost:${port}`;
        const fileUrl = `${baseUrl}/api/documents/${fileUuid}`;

        await documentModel.recordDocument({
          file_uuid: fileUuid,
          entity_type: 'payment',
          category: 'payment-proofs',
          masjid_name: data.masjid_name || 'BSJM Thodar',
          original_name: originalName,
          mime_type: mimeType,
          original_size: compressed.originalSize || file.size || 0,
          compressed_size: compressed.compressedSize || compressed.buffer.length,
          b2_key: fileName,
          file_url: fileUrl,
          file_data: fileData,
        }).catch(err => console.warn('[PAYMENT DOC RECORD WARN]', err.message));

        screenshot_url = fileUrl; // Reference URL stored in main table
      }
    } catch (err) {
      console.warn('Payment screenshot upload to DB failed:', err.message);
    } finally {
      if (file.path && fs.existsSync(file.path)) {
        fs.unlink(file.path, () => {});
      }
    }
  }

  // 2. Handle base64 / URL screenshot
  if (!screenshot_url && data.screenshot) {
    if (typeof data.screenshot === 'string') {
      if (data.screenshot.startsWith('http://') || data.screenshot.startsWith('https://')) {
        screenshot_url = data.screenshot;
      } else if (data.screenshot.startsWith('data:image')) {
        try {
          const matches = data.screenshot.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
          if (matches && matches.length === 3) {
            const mimeType = matches[1];
            const buffer = Buffer.from(matches[2], 'base64');
            const fileName = `payment-screenshots/${Date.now()}-${randomUUID()}.png`;
            const b2Res = await b2.uploadBuffer(buffer, fileName, mimeType);
            screenshot_url = b2Res.url;
          } else {
            screenshot_url = data.screenshot;
          }
        } catch (e) {
          console.warn('Failed to parse base64 screenshot:', e.message);
          screenshot_url = data.screenshot;
        }
      }
    } else if (typeof data.screenshot_url === 'string') {
      screenshot_url = data.screenshot_url;
    }
  }

  // 3. Save locally in mobile_be payment_requests table
  const paymentId = randomUUID();
  try {
    await model.createRequest({
      id: paymentId,
      katha_number,
      mobile,
      member_name,
      payment_type: collection_type,
      amount: Number(amount),
      payment_mode,
      month: month ? `${month} ${year}`.trim() : (year || 'N/A'),
      remarks,
      category: data.category || null,
      collection_id: data.collectionId || null,
      is_balance_payment,
      raw_data: data,
      upi_id: data.upi_id || null,
      screenshot_url: screenshot_url || null,
      utr,
      user_id: user?.id || null,
    });
    console.log(`[PAYMENT SUBMIT LOCAL SUCCESS] Stored payment request ID: ${paymentId} in local DB`);
  } catch (err) {
    console.error(`[PAYMENT SUBMIT LOCAL ERROR] Failed to store payment request in local DB: ${err.message}`, err);
    throw Object.assign(new Error(`Failed to save payment request: ${err.message}`), { status: 500 });
  }

  // 4. Forward to external Jamath API
  const baseUrl = getJamathBaseUrl(jamath);
  if (baseUrl) {
    const externalUrl = `${baseUrl.replace(/\/+$/, '')}/api/payment/submit`;
    try {
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json, */*',
      };
      if (authHeader) {
        headers['Authorization'] = authHeader;
      }

      const payload = {
        ...data,
        katha_number: String(katha_number),
        khata_no: String(katha_number),
        khataNo: String(katha_number),
        mobile: mobile || undefined,
        collection_type,
        collectionType: collection_type,
        amount: String(amount),
        month: month || undefined,
        year: year || undefined,
        remarks: remarks || undefined,
        payment_mode,
        paymentMode: payment_mode,
        is_balance_payment: is_balance_payment !== undefined ? is_balance_payment : undefined,
        transaction_id: utr || undefined,
        screenshot: screenshot_url || undefined,
        screenshot_url: screenshot_url || undefined,
        jamath: String(jamath),
        masjid_name: String(jamath),
        jamath_name: String(jamath),
      };

      const response = await axiosPostWithRetry(externalUrl, payload, { headers, timeout: 30000 });
      return {
        success: true,
        message: response.data?.message || 'Payment submitted successfully',
        payment_id: paymentId,
        external_payment_id: response.data?.payment_id || undefined,
        screenshot_url,
        data: response.data,
      };
    } catch (error) {
      console.warn('External Jamath submit API response warning:', error.response?.data || error.message);
    }
  }

  return {
    success: true,
    message: 'Payment submitted successfully',
    payment_id: paymentId,
    screenshot_url,
  };
}


async function notifyApproval(data) {
  const paymentId = data.payment_id || data.id;
  const kathaNumber = data.katha_number || data.member_number;
  const mobile = data.mobile;
  const status = data.status || 'approved';
  const amount = data.amount || '';
  const collectionType = data.collection_type || data.payment_type || 'payment';

  if (!kathaNumber && !mobile && !paymentId) {
    throw Object.assign(new Error('payment_id, katha_number, or mobile is required'), { status: 400 });
  }

  const isApproved = String(status).toLowerCase() === 'approved';
  const title = isApproved ? 'Payment Approved' : 'Payment Rejected';
  const customMsg = data.message || (isApproved
    ? `Dear member, your ${collectionType} payment of Rs.${amount} has been approved.`
    : `Dear member, your ${collectionType} payment of Rs.${amount} has been rejected.${data.remark ? ' Reason: ' + data.remark : ''}`);

  let targetPhone = mobile;
  let userId = null;

  if (paymentId) {
    try {
      const reqRecord = await model.findRequestById(paymentId);
      if (reqRecord) {
        userId = reqRecord.user_id;
        if (!targetPhone) targetPhone = reqRecord.mobile;
      }
    } catch (_) {}
  }

  if (!userId && targetPhone) {
    try {
      const { pool } = require('../../config/db');
      const [[uRow]] = await pool.query('SELECT id FROM users WHERE phone = ? LIMIT 1', [targetPhone]);
      if (uRow?.id) userId = uRow.id;
    } catch (_) {}
  }

  if (userId) {
    const notifId = randomUUID();
    await notificationModel.create({
      id: notifId,
      user_id: userId,
      title,
      body: customMsg,
      type: 'payment',
      data: { payment_id: paymentId, status, remark: data.remark || '' },
    }).catch(() => {});
  }

  let smsResult = null;
  if (targetPhone) {
    const cleanMobile = String(targetPhone).replace(/\D/g, '').slice(-10);
    if (cleanMobile.length === 10) {
      if (shouldBypass()) {
        console.log(`[DEV BYPASS SMS NOTIFICATION] Mobile: ${cleanMobile}, Msg: ${customMsg}`);
        smsResult = { return: true, message: 'SMS bypassed in dev' };
      } else {
        try {
          smsResult = await sendSMSFast2SMS(cleanMobile, customMsg);
        } catch (smsErr) {
          console.warn('Fast2SMS notification warning:', smsErr.message);
          smsResult = { return: false, error: smsErr.message };
        }
      }
    }
  }

  return {
    success: true,
    message: 'User notified successfully',
    notification: {
      title,
      body: customMsg,
      mobile: targetPhone ? maskMobile(targetPhone) : null,
      sms_sent: Boolean(smsResult),
    },
  };
}


function trimTrailingSlash(str) {
  if (!str) return '';
  let s = String(str).trim();
  while (s.endsWith('/')) {
    s = s.slice(0, -1);
  }
  return s;
}

async function initiateEasebuzzPayment(data, user) {
  let katha_number = String(
    data.khata_no ||
    data.khataNo ||
    data.katha_number ||
    data.member_number ||
    data.rawFields?.khataNo ||
    data.rawFields?.khata_no ||
    ''
  ).trim();
  if (!katha_number && user?.katha_number && user.katha_number !== 'portal-admin') {
    katha_number = String(user.katha_number).trim();
  }
  if (!katha_number) katha_number = '501';

  let member_name = data.member_name || data.memberData?.member_name || user?.name || ('Member ' + katha_number);
  const mobile = String(data.mobile || data.rawFields?.mobile || user?.mobile || '9448348128').trim();
  const jamath = String(data.jamath || user?.jamath || 'BSJM Thodar').trim();
  const collection_type = data.collectionType || data.collection_type || data.payment_type || 'ustad_salary';
  const amount = data.amount || data.rawFields?.amount;
  const month = data.month || data.rawFields?.month || '';
  const year = data.year || data.rawFields?.year || '';
  const category = data.category || 'member-collection';
  const is_balance_payment = data.is_balance_payment !== undefined ? data.is_balance_payment : 0;

  if (!amount || Number(amount) <= 0) {
    throw Object.assign(new Error('Valid amount is required to initiate online payment'), { status: 400 });
  }

  const jamathSlug = String(jamath).replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8) || 'BSJM';
  const txnid = 'TXN_' + jamathSlug + '_' + Date.now() + '_' + Math.floor(1000 + Math.random() * 9000);

  const port = process.env.PORT || 4000;
  const rawBackend = process.env.BACKEND_URL || ('http://localhost:' + port);
  const backendUrl = trimTrailingSlash(rawBackend);
  const surl = backendUrl + '/api/payment/easebuzz/response';
  const furl = backendUrl + '/api/payment/easebuzz/response';

  const config = easebuzz.getConfig(jamath);

  function sanitizeUdf(val) {
    if (!val) return '';
    return String(val).replace(new RegExp('[^a-zA-Z0-9 -]', 'g'), ' ').replace(new RegExp('\s+', 'g'), ' ').trim().substring(0, 100);
  }

  const initiatePayload = {
    txnid,
    amount: String(amount),
    productinfo: sanitizeUdf(collection_type) || 'payment',
    firstname: sanitizeUdf(member_name) || 'Member',
    email: katha_number + '@sawtdeen.com',
    phone: mobile.replace(new RegExp('\D', 'g'), '').slice(-10) || '9448348128',
    surl,
    furl,
    udf1: sanitizeUdf(katha_number),
    udf2: sanitizeUdf(jamath),
    udf3: sanitizeUdf(collection_type),
    udf4: sanitizeUdf(month),
    udf5: sanitizeUdf(year),
    udf6: sanitizeUdf(is_balance_payment ? '1' : '0'),
    udf7: sanitizeUdf(category),
  };

  const easeRes = await easebuzz.callInitiatePaymentAPI(initiatePayload, config.merchantKey, config.salt, config.env);

  if (easeRes.status !== 1 || !easeRes.access_key) {
    throw Object.assign(new Error(easeRes.error || 'Failed to initiate payment with Easebuzz'), { status: 500 });
  }

  const onlineTxnId = randomUUID();
  await model.createOnlineTransaction({
    id: onlineTxnId,
    txnid,
    katha_number,
    mobile,
    amount: Number(amount),
    jamath,
    collection_type,
    month,
    year,
    access_key: easeRes.access_key,
    status: 'INITIATED',
    request_payload: data,
  });

  return {
    success: true,
    txnid,
    access_key: easeRes.access_key,
    url: easeRes.url,
  };
}

async function handleEasebuzzResponse(postData) {
  console.log('[EASEBUZZ CALLBACK RECEIVED]', postData);
  const jamath = postData.udf2 || 'BSJM Thodar';
  const config = easebuzz.getConfig(jamath);

  const generatedHash = easebuzz.getReverseHashKey(postData, config.salt);
  const receivedHash = postData.hash || '';

  let hashMatch = false;
  try {
    const crypto = require('crypto');
    hashMatch = crypto.timingSafeEqual(
      Buffer.from(generatedHash, 'utf8'),
      Buffer.from(receivedHash, 'utf8')
    );
  } catch (e) {
    hashMatch = false;
  }

  const txnid = postData.txnid;
  if (!txnid) {
    throw Object.assign(new Error('Invalid callback data: missing txnid'), { status: 400 });
  }

  const existingTxn = await model.findOnlineTransactionByTxnId(txnid);
  const reqPayload = existingTxn && existingTxn.request_payload ? (typeof existingTxn.request_payload === 'string' ? JSON.parse(existingTxn.request_payload) : existingTxn.request_payload) : {};

  const isSuccess = hashMatch && postData.status === 'success';
  const statusStr = isSuccess ? 'SUCCESS' : 'FAILED';

  await model.updateOnlineTransactionStatus(
    txnid,
    statusStr,
    postData,
    postData.easebuzz_id,
    postData.bank_ref_num
  );

  const kathaNo = postData.udf1 || existingTxn?.katha_number || reqPayload.khata_no || reqPayload.katha_number || '501';
  const mobile = postData.phone || existingTxn?.mobile || reqPayload.mobile || '9448348128';
  const amount = postData.amount || existingTxn?.amount || reqPayload.amount || '451';
  const collectionType = postData.udf3 || existingTxn?.collection_type || reqPayload.collectionType || reqPayload.collection_type || 'ustad_salary';
  const month = postData.udf4 || existingTxn?.month || reqPayload.month || 'April';
  const year = postData.udf5 || existingTxn?.year || reqPayload.year || '2025-2026';
  const isBalancePayment = (postData.udf6 === '1' || reqPayload.is_balance_payment === 1 || reqPayload.is_balance_payment === '1') ? 1 : 0;
  const category = postData.udf7 || reqPayload.category || 'member-collection';
  const nowIso = new Date().toISOString();

  if (isSuccess) {
    try {
      const paymentId = randomUUID();
      await model.createRequest({
        id: paymentId,
        katha_number: kathaNo,
        mobile,
        member_name: reqPayload.member_name || ('Member ' + kathaNo),
        payment_type: collectionType,
        amount: Number(amount),
        payment_mode: 'Online',
        month: month ? (month + ' ' + year).trim() : (year || 'N/A'),
        remarks: reqPayload.remarks || ('Online Easebuzz Txn: ' + txnid),
        category,
        collection_id: reqPayload.collectionId || (collectionType + '-form'),
        is_balance_payment: isBalancePayment,
        raw_data: { ...reqPayload, easebuzz_response: postData },
        upi_id: postData.bank_ref_num || null,
        screenshot_url: null,
        utr: postData.easebuzz_id || txnid,
        user_id: null,
      });
      await model.updateRequestStatus(paymentId, 'approved', null, 'Approved automatically via Easebuzz');
      console.log('[ONLINE PAYMENT SUCCESS] Created approved payment_request ID: ' + paymentId);
    } catch (err) {
      console.error('[ONLINE PAYMENT LOCAL RECORD ERROR] ' + err.message);
    }

    const targetJamath = postData.udf2 || existingTxn?.jamath || 'BSJM Thodar';
    const baseUrl = getJamathBaseUrl(targetJamath);
    if (baseUrl) {
      // 1. Sync to standard form submit endpoint
      const externalUrl = trimTrailingSlash(baseUrl) + '/api/form/submit';
      const submitPayload = {
        khataNo: String(kathaNo),
        khata_no: String(kathaNo),
        katha_number: String(kathaNo),
        mobile: String(mobile),
        amount: String(amount),
        use_wallet: false,
        wallet_amount_used: 0,
        paymentMode: 'dues',
        payment_mode: 'dues',
        month: String(month),
        year: String(year),
        remarks: reqPayload.remarks || '',
        rawFields: reqPayload.rawFields || {
          khataNo: String(kathaNo),
          mobile: String(mobile),
          amount: String(amount),
          use_wallet: false,
          wallet_amount_used: 0,
          paymentMode: 'dues',
          payment_mode: 'dues',
          month: String(month),
          year: String(year),
          remarks: reqPayload.remarks || ''
        },
        category: String(category),
        collectionType: String(collectionType),
        collection_type: String(collectionType),
        collectionId: collectionType + '-form',
        memberData: null,
        formVariant: 'standard',
        hasFiles: false,
        fileMetadata: [],
        is_balance_payment: isBalancePayment,
        balanceAmountMode: false,
        submittedAt: nowIso,
        member_name: reqPayload.member_name || ('Member ' + kathaNo),
        utr: postData.easebuzz_id || txnid,
        approved_by: 'Super Admin',
        approvedBy: 'Super Admin',
        collected_by: 'Super Admin',
        collectedBy: 'Super Admin',
        date: nowIso,
        collection_mode: 'Online',
        collectionMode: 'Online',
        admin_remarks: 'Online Payment Success',
        status: 'APPROVED'
      };

      try {
        await axiosPostWithRetry(
          externalUrl,
          submitPayload,
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': '65bede072aec',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
            },
            timeout: 30000,
          }
        );
        console.log('[EXTERNAL JAMATH SUBMIT SUCCESS] Posted to ' + externalUrl);
      } catch (extErr) {
        console.error('[EXTERNAL JAMATH SUBMIT ERROR] Failed posting to ' + externalUrl + ':', extErr.message);
      }

      // 2. Sync to online payment balance deduction endpoint
      const syncOnlineUrl = trimTrailingSlash(baseUrl) + '/api/payment/sync-online-payment';
      try {
        await axiosPostWithRetry(
          syncOnlineUrl,
          {
            katha_number: String(kathaNo),
            khata_no: String(kathaNo),
            collection_type: String(collectionType),
            amount: Number(amount),
            is_balance_payment: isBalancePayment,
            transaction_id: txnid,
            receipt_no: postData.easebuzz_id || txnid,
            payment_mode: 'Online',
            month: String(month),
            year: String(year),
            mobile: String(mobile),
            jamath: targetJamath,
          },
          { timeout: 30000 }
        );
        console.log('[EXTERNAL ONLINE DEDUCTION SYNC SUCCESS] Posted to ' + syncOnlineUrl);
      } catch (syncErr) {
        console.warn('[EXTERNAL ONLINE DEDUCTION SYNC WARN] Notice posting to ' + syncOnlineUrl + ':', syncErr.message);
      }
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return {
      status: 'SUCCESS',
      redirect_url: frontendUrl + '/payment/verify?status=success&txnid=' + txnid + '&amount=' + amount,
      data: postData,
    };
  } else {
    const targetJamath = postData.udf2 || existingTxn?.jamath || 'BSJM Thodar';
    const baseUrl = getJamathBaseUrl(targetJamath);
    if (baseUrl) {
      const externalUrl = trimTrailingSlash(baseUrl) + '/api/form/submit';
      const rejectPayload = {
        category: String(collectionType),
        collectionType: String(collectionType),
        khata_no: String(kathaNo),
        status: 'REJECTED',
        admin_remarks: postData.error_Message || 'Online Payment Failed',
        submittedAt: nowIso
      };

      try {
        await axiosPostWithRetry(
          externalUrl,
          rejectPayload,
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': '65bede072aec',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
            },
            timeout: 30000,
          }
        );
        console.log('[EXTERNAL JAMATH REJECT SUCCESS] Posted to ' + externalUrl);
      } catch (extErr) {
        console.error('[EXTERNAL JAMATH REJECT ERROR] Failed posting to ' + externalUrl + ':', extErr.message);
      }
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return {
      status: 'FAILED',
      redirect_url: frontendUrl + '/payment/verify?status=failed&txnid=' + txnid + '&error=' + encodeURIComponent(postData.error_Message || 'Payment Failed'),
      data: postData,
    };
  }
}

async function getEasebuzzStatus(txnid) {
  const existingTxn = await model.findOnlineTransactionByTxnId(txnid);
  if (!existingTxn) {
    throw Object.assign(new Error('Transaction not found for txnid: ' + txnid), { status: 404 });
  }

  let currentStatus = existingTxn.status;

  try {
    const jamath = existingTxn.jamath || 'BSJM Thodar';
    const config = easebuzz.getConfig(jamath);
    const statusRes = await easebuzz.callTransactionAPI(txnid, config.merchantKey, config.salt, config.env);
    if (statusRes && statusRes.status && statusRes.msg) {
      if (statusRes.msg.status === 'success') {
        currentStatus = 'SUCCESS';
        await model.updateOnlineTransactionStatus(txnid, 'SUCCESS', statusRes, statusRes.msg.easepayid, statusRes.msg.bank_ref_num);
      } else if (statusRes.msg.status === 'userCancelled') {
        currentStatus = 'FAILED';
        await model.updateOnlineTransactionStatus(txnid, 'FAILED', statusRes);
      } else if (statusRes.msg.status === 'failure') {
        const ageMs = Date.now() - new Date(existingTxn.created_at || Date.now()).getTime();
        if (ageMs > 10 * 60 * 1000) {
          currentStatus = 'FAILED';
          await model.updateOnlineTransactionStatus(txnid, 'FAILED', statusRes);
        }
      }
    }
  } catch (err) {
    console.error('[STATUS API REFRESH ERROR]', err.message);
  }

  return {
    success: true,
    status: currentStatus,
    amount: existingTxn.amount,
    txnid: existingTxn.txnid,
    local_transaction: existingTxn,
  };
}

async function getReceiptDetails(receiptNo) {
  const { pool } = require('../../config/db');
  const [rows] = await pool.query(
    'SELECT * FROM payment_requests WHERE id = ? OR utr = ? OR id LIKE ? ORDER BY created_at DESC LIMIT 1',
    [receiptNo, receiptNo, `%${receiptNo}%`]
  );

  if (rows && rows.length > 0) {
    const r = rows[0];
    const rawData = typeof r.raw_data === 'string' ? JSON.parse(r.raw_data || '{}') : (r.raw_data || {});
    return {
      success: true,
      receipt: {
        receipt_no: r.id,
        transaction_id: r.utr || r.id,
        katha_number: r.katha_number,
        member_name: r.member_name || ('Member ' + r.katha_number),
        mobile: r.mobile,
        collection_type: r.payment_type,
        amount: r.amount,
        payment_mode: r.payment_mode || 'Online',
        payment_done_at: r.created_at,
        is_balance_payment: r.is_balance_payment || 0,
        month: r.month,
        remarks: r.remarks,
        jamath: rawData.jamath || 'BSJM Thodar',
      },
    };
  }

  const baseUrl = getJamathBaseUrl('BSJM Thodar');
  if (baseUrl) {
    try {
      const extUrl = trimTrailingSlash(baseUrl) + '/api/payment/receipt/' + encodeURIComponent(receiptNo);
      const extRes = await axiosGetWithRetry(extUrl, { timeout: 15000 });
      if (extRes?.data?.success) {
        return extRes.data;
      }
    } catch (_) {}
  }

  throw Object.assign(new Error('Receipt not found'), { status: 404 });
}

module.exports = {
  createRequest,
  listRequests,
  getRequest,
  updateStatus,
  getMemberRequests,
  getSettings,
  updateSettings,
  verifyMember,
  sendOTP,
  verifyOTP,
  submitPayment,
  notifyApproval,
  initiateEasebuzzPayment,
  handleEasebuzzResponse,
  getEasebuzzStatus,
  getReceiptDetails,
};





