const { randomUUID } = require('crypto');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const model = require('./certificate.model');
const notificationModel = require('../notification/notification.model');
const { sendSMSFast2SMS, shouldBypass } = require('../../utils/sms');
const b2 = require('../../utils/b2');
const { compressFile } = require('../../utils/file_compressor');
const documentModel = require('../document/document.model');
const { getCertificateFee } = require('../../config/certificate_fees');
const { getJamathBaseUrl } = require('../../config/jamaths');

async function sendCertificateNotification({ requestId, kathaNumber, mobile, status, remarks, certificateType }) {
  try {
    let targetPhone = mobile;
    let userId = null;
    let reqRecord = null;

    if (requestId) {
      reqRecord = await model.findById(requestId);
      if (reqRecord) {
        if (!targetPhone) targetPhone = reqRecord.mobile;
        userId = reqRecord.user_id;
        if (!kathaNumber) kathaNumber = reqRecord.katha_number;
        if (!certificateType) certificateType = reqRecord.certificate_type;
      }
    }

    if (!userId && (targetPhone || kathaNumber)) {
      try {
        const { pool } = require('../../config/db');
        if (targetPhone) {
          const [[uRow]] = await pool.query('SELECT id FROM users WHERE phone = ? LIMIT 1', [targetPhone]);
          if (uRow?.id) userId = uRow.id;
        }
      } catch (_) {}
    }

    const isApproved = String(status).toLowerCase() === 'approved';
    const certTitle = (certificateType === 'marriage' || certificateType === 'mrg_certificate') ? 'Marriage Certificate' : 'Member Certificate';
    const title = isApproved ? 'Certificate Approved' : 'Certificate Request Rejected';
    const bodyMsg = isApproved
      ? `Dear Member, your ${certTitle} request (Katha #${kathaNumber || ''}) has been approved by Badriya Sunni Jumma Masjid Thodar Committee. You can now download your official certificate.`
      : `Dear Member, your ${certTitle} request (Katha #${kathaNumber || ''}) was rejected by Badriya Sunni Jumma Masjid Thodar Committee.${remarks ? ' Reason: ' + remarks : ''}`;

    if (userId) {
      const notifId = randomUUID();
      await notificationModel.create({
        id: notifId,
        user_id: userId,
        title,
        body: bodyMsg,
        type: 'system',
        data: { request_id: requestId, status, remarks: remarks || '', certificate_type: certificateType },
      }).catch(err => console.warn('[CERT NOTIF CREATE WARN]', err.message));
      console.log(`[CERT NOTIF] In-app notification sent to user ${userId}`);
    }

    if (targetPhone) {
      const cleanMobile = String(targetPhone).replace(/\D/g, '').slice(-10);
      if (cleanMobile.length === 10) {
        if (shouldBypass()) {
          console.log(`[DEV BYPASS SMS NOTIFICATION] To: ${cleanMobile}, Msg: ${bodyMsg}`);
        } else {
          await sendSMSFast2SMS(cleanMobile, bodyMsg).catch(err => console.warn('[SMS NOTIF WARN]', err.message));
        }
      }
    }
  } catch (err) {
    console.error('[CERT NOTIFICATION ERROR]', err.message);
  }
}

async function uploadSingleFileToB2(file, folder, masjidName, certificateType, entityId = null) {
  if (!file) return null;
  try {
    // 1. Compress file (image/doc optimization) before local DB upload
    const compressed = await compressFile(file);
    if (!compressed || !compressed.buffer) return null;

    const originalName = file.originalname || 'file.png';
    const mimeType = compressed.mimeType || 'image/png';
    const base64Str = compressed.buffer.toString('base64');
    const fileData = `data:${mimeType};base64,${base64Str}`;
    const fileUuid = randomUUID();
    const fileName = b2.buildB2Key({
      masjidName,
      certificateType,
      folder,
      originalName,
    });

    const port = process.env.PORT || 4000;
    const baseUrl = process.env.BACKEND_URL ? process.env.BACKEND_URL.replace(/\/+$/, '') : `http://localhost:${port}`;
    const fileUrl = `${baseUrl}/api/documents/${fileUuid}`;

    // 2. Record document entry with Base64 data in uploaded_documents MySQL table
    await documentModel.recordDocument({
      file_uuid: fileUuid,
      entity_type: 'certificate',
      entity_id: entityId,
      category: folder,
      masjid_name: masjidName,
      original_name: originalName,
      mime_type: mimeType,
      original_size: compressed.originalSize || file.size || 0,
      compressed_size: compressed.compressedSize || compressed.buffer.length,
      b2_key: fileName,
      file_url: fileUrl,
      file_data: fileData,
    }).catch(err => console.warn('[DOCUMENT RECORD WARN]', err.message));

    return fileUrl; // Returns reference URL with ID to be saved in main table
  } catch (err) {
    console.error(`[LOCAL FILE UPLOAD ERROR] Failed to upload ${file.fieldname || 'file'} to ${folder}:`, err.stack || err.message);
    return null;
  }
}


async function submitRequest(data, user, files) {
  const {
    katha_number, applicant_name, mobile, certificate_type,
    masjid_name, details, witness_details,
  } = data;

  if (!katha_number) throw Object.assign(new Error('katha_number is required'), { status: 400 });
  if (!applicant_name) throw Object.assign(new Error('applicant_name is required'), { status: 400 });
  if (!certificate_type) throw Object.assign(new Error('certificate_type is required'), { status: 400 });

  const masjid = String(masjid_name || 'BSJM Thodar');
  const fee_amount = getCertificateFee(masjid);

  // 1. Normalize files input (whether array from upload.any() or object from upload.fields())
  const fileArray = Array.isArray(files) ? files : (files ? Object.values(files).flat() : []);

  let photoFile = fileArray.find(f => /photo|profile|user/i.test(f.fieldname));
  let docFile = fileArray.find(f => /doc|id_proof|aadhaar/i.test(f.fieldname));
  let invFile = fileArray.find(f => /invitation|card/i.test(f.fieldname));
  let payFile = fileArray.find(f => /pay|screenshot|proof|receipt/i.test(f.fieldname));

  // Ensure each category gets a distinct file object
  const usedFiles = new Set();
  const pickFile = (f) => {
    if (f && !usedFiles.has(f)) {
      usedFiles.add(f);
      return f;
    }
    return null;
  };

  const pFile = pickFile(photoFile);
  const dFile = pickFile(docFile);
  const iFile = pickFile(invFile);
  const pyFile = pickFile(payFile) || pickFile(fileArray.find(f => !usedFiles.has(f)));

  let photo_url = await uploadSingleFileToB2(pFile, 'certificate-photos', masjid, certificate_type);
  let document_url = await uploadSingleFileToB2(dFile, 'certificate-documents', masjid, certificate_type);
  let invitation_card_url = await uploadSingleFileToB2(iFile, 'certificate-invitations', masjid, certificate_type);
  let payment_screenshot_url = await uploadSingleFileToB2(pyFile, 'certificate-payments', masjid, certificate_type);

  // Safely clean up disk files AFTER all uploads are complete
  for (const f of fileArray) {
    if (f && f.path && fs.existsSync(f.path)) {
      fs.unlink(f.path, () => {});
    }
  }

  // Fallback to body strings (URL or Base64) if no file uploaded for that category
  if (!photo_url && (data.photo_url || data.photo)) photo_url = data.photo_url || data.photo;
  if (!document_url && (data.document_url || data.document)) document_url = data.document_url || data.document;
  if (!invitation_card_url && (data.invitation_card_url || data.invitation_url || data.invitation_card)) {
    invitation_card_url = data.invitation_card_url || data.invitation_url || data.invitation_card;
  }
  if (!payment_screenshot_url && (data.payment_screenshot_url || data.screenshot_url || data.payment_screenshot || data.screenshot)) {
    payment_screenshot_url = data.payment_screenshot_url || data.screenshot_url || data.payment_screenshot || data.screenshot;
  }

  // Handle Base64 strings for payment screenshot if passed in body
  if (payment_screenshot_url && payment_screenshot_url.startsWith('data:image')) {
    try {
      const matches = payment_screenshot_url.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const mimeType = matches[1];
        const buffer = Buffer.from(matches[2], 'base64');
        const fileName = b2.buildB2Key({
          masjidName: masjid,
          certificateType: certificate_type,
          folder: 'certificate-payments',
          originalName: 'screenshot.png',
        });
        const b2Res = await b2.uploadBuffer(buffer, fileName, mimeType);
        payment_screenshot_url = b2Res.url;
      }
    } catch (e) {
      console.warn('[BASE64 B2 UPLOAD WARN]', e.message);
    }
  }

  // 2. Parse details if string
  let parsedDetails = details;
  if (typeof details === 'string') {
    try { parsedDetails = JSON.parse(details); } catch { parsedDetails = { raw: details }; }
  }

  // Merge witness_details into details object
  if (witness_details) {
    parsedDetails = { ...(parsedDetails || {}), witness_details };
  }

  const payment_status = payment_screenshot_url ? 'pending_review' : 'pending_payment';

  // 3. Save to local mobile_be DB (tracking copy)
  const id = randomUUID();
  try {
    await model.createRequest({
      id,
      katha_number: String(katha_number),
      applicant_name: String(applicant_name),
      mobile: String(mobile || ''),
      certificate_type: String(certificate_type),
      masjid_name: masjid,
      details: parsedDetails,
      photo_url,
      document_url,
      invitation_card_url,
      payment_screenshot_url,
      fee_amount,
      payment_status,
      user_id: user?.id || user?.katha_number || null,
    });
    console.log(`[CERT LOCAL SAVE] Request ${id} saved to local DB`);
  } catch (err) {
    console.error('[CERT LOCAL SAVE ERROR]', err.message);
    // Non-blocking: still forward to jamath even if local save fails
  }

  // 4. Forward to thodar-sawtdeen-be (the source of truth for admin approval in sawtdeen-fe)
  const baseUrl = getJamathBaseUrl(masjid);
  if (baseUrl) {
    const externalUrl = `${baseUrl.replace(/\/+$/, '')}/api/certificates/request`;
    console.log(`[CERT FORWARD] Forwarding certificate request to: ${externalUrl}`);

    try {
      // Build multipart form to forward (thodar-sawtdeen-be expects multipart)
      const form = new FormData();
      form.append('katha_number', String(katha_number));
      form.append('applicant_name', String(applicant_name));
      form.append('certificate_type', String(certificate_type));
      form.append('mobile', String(mobile || ''));
      form.append('masjid_name', masjid);

      if (parsedDetails) {
        form.append('details', JSON.stringify(parsedDetails));
      }

      // Forward B2 URLs (thodar BE reads photo_url / document_url from body if no file)
      if (photo_url) form.append('photo_url', photo_url);
      if (document_url) form.append('document_url', document_url);
      if (invitation_card_url) form.append('invitation_card_url', invitation_card_url);
      if (payment_screenshot_url) form.append('payment_screenshot_url', payment_screenshot_url);
      if (witness_details) form.append('witness_details', String(witness_details));
      if (data.remarks) form.append('remarks', String(data.remarks));

      const response = await axios.post(externalUrl, form, {
        headers: {
          ...form.getHeaders(),
          'Accept': 'application/json',
        },
        timeout: 30000,
      });

      console.log('[CERT FORWARD SUCCESS] thodar-sawtdeen-be response:', response.data?.message);

      return {
        success: true,
        message: payment_screenshot_url
          ? 'Certificate request submitted successfully. Committee will review and approve.'
          : 'Certificate request saved. Please upload payment proof to complete submission.',
        request_id: id,
        external_id: response.data?.data?.id,
        fee_amount,
        payment_status,
      };
    } catch (err) {
      console.warn('[CERT FORWARD WARN] Could not forward to thodar-sawtdeen-be:', err.message);
      // Return success anyway — local save succeeded
    }
  }

  // Fallback if no external URL or forwarding failed
  return {
    success: true,
    message: payment_screenshot_url
      ? 'Certificate request submitted. Admin will review your request.'
      : 'Certificate request saved. Please upload payment proof to complete submission.',
    request_id: id,
    fee_amount,
    payment_status,
  };
}

async function getMyRequests(katha_number) {
  if (!katha_number) throw Object.assign(new Error('katha_number is required'), { status: 400 });

  // Try to get from thodar-sawtdeen-be first (most up-to-date status)
  const baseUrl = getJamathBaseUrl('BSJM Thodar');
  if (baseUrl) {
    try {
      const externalUrl = `${baseUrl.replace(/\/+$/, '')}/api/certificates/my-requests?katha_number=${encodeURIComponent(katha_number)}`;
      const response = await axios.get(externalUrl, { timeout: 15000 });
      if (response.data?.success) {
        return response.data;
      }
    } catch (err) {
      console.warn('[CERT MY-REQUESTS] External fetch failed, falling back to local:', err.message);
    }
  }

  // Fallback to local DB
  const requests = await model.findByKathaNumber(katha_number);
  return {
    success: true,
    count: requests.length,
    data: requests,
  };
}

async function getCertificateFeeForMasjid(masjid_name) {
  const fee = getCertificateFee(masjid_name || 'BSJM Thodar');
  return {
    success: true,
    masjid_name: masjid_name || 'BSJM Thodar',
    fee_amount: fee,
  };
}

async function getAdminRequests(queryParams = {}) {
  const { page = 1, limit = 12, status = 'all', certificate_type, search, masjid_name } = queryParams;

  // Try local database first
  const { rows, total, page: curPage, limit: curLimit } = await model.getAdminRequests({
    page,
    limit,
    status,
    certificate_type,
    search,
    masjid_name,
  });

  // Also query external thodar-sawtdeen-be if local results are 0 or to complement
  if (rows.length === 0) {
    const baseUrl = getJamathBaseUrl(masjid_name || 'BSJM Thodar');
    if (baseUrl) {
      try {
        const externalUrl = `${baseUrl.replace(/\/+$/, '')}/api/certificates/admin/list?page=${page}&limit=${limit}&status=${encodeURIComponent(status)}`;
        console.log(`[CERT ADMIN LIST] Fetching from external: ${externalUrl}`);
        const response = await axios.get(externalUrl, { timeout: 15000 });
        if (response.data?.success) {
          return {
            success: true,
            data: response.data.data || [],
            total: response.data.total || 0,
            page: response.data.page || page,
            limit: response.data.limit || limit,
            totalPages: response.data.totalPages || 1,
          };
        }
      } catch (err) {
        console.warn('[CERT ADMIN LIST] External fetch failed:', err.message);
      }
    }
  }

  const parsedData = rows.map((row) => ({
    ...row,
    status: row.status || (row.payment_status === 'approved' ? 'approved' : (row.payment_status === 'rejected' ? 'rejected' : 'pending')),
    details: row.details ? (typeof row.details === 'string' ? (row.details.startsWith('{') ? JSON.parse(row.details) : row.details) : row.details) : null,
  }));

  const totalPages = Math.ceil(total / curLimit) || 1;

  return {
    success: true,
    data: parsedData,
    total,
    page: curPage,
    limit: curLimit,
    totalPages,
  };
}

async function approveRequest(data, adminUser) {
  const { id, admin_remarks, approved_by } = data;
  if (!id) throw Object.assign(new Error('Certificate request ID is required'), { status: 400 });

  const adminName = approved_by || adminUser?.name || 'BSJM Admin';

  // 1. Update local database record
  let reqRecord = await model.findById(id);
  if (reqRecord) {
    reqRecord = await model.updateStatus(id, 'approved', admin_remarks, adminName);
  } else {
    // Attempt to fetch from external thodar-sawtdeen-be if not in local DB
    const masjid = data.masjid_name || 'BSJM Thodar';
    const baseUrl = getJamathBaseUrl(masjid);
    if (baseUrl) {
      try {
        const extListUrl = `${baseUrl.replace(/\/+$/, '')}/api/certificates/admin/list?status=all`;
        const res = await axios.get(extListUrl, { timeout: 10000 });
        if (res.data?.success && Array.isArray(res.data.data)) {
          const match = res.data.data.find(r => String(r.id) === String(id));
          if (match) reqRecord = match;
        }
      } catch (err) {
        console.warn(`[CERT APPROVE] External fetch fallback notice: ${err.message}`);
      }
    }
  }

  const masjid = reqRecord?.masjid_name || data.masjid_name || 'BSJM Thodar';
  const baseUrl = getJamathBaseUrl(masjid);

  // 2. Forward approval to source level (thodar-sawtdeen-be)
  if (baseUrl) {
    const externalUrl = `${baseUrl.replace(/\/+$/, '')}/api/certificates/admin/approve`;
    try {
      await axios.post(externalUrl, {
        id,
        admin_remarks: admin_remarks || 'Approved by Admin',
        approved_by: adminName,
      }, { timeout: 15000 });
      console.log(`[CERT APPROVE SUCCESS] Forwarded approval for request ${id} to thodar-sawtdeen-be`);
    } catch (err) {
      console.warn(`[CERT APPROVE WARN] Could not forward approval to thodar-sawtdeen-be: ${err.message}`);
    }
  }

  // 3. Submit payment collection record (100rs fee for marriage certificate)
  try {
    const paymentService = require('../payment/payment.service');
    const rawCertType = String(reqRecord?.certificate_type || data.certificate_type || '').toLowerCase().trim();
    const isMarriage = !rawCertType || rawCertType === 'marriage' || rawCertType === 'mrg_certificate' || rawCertType === 'marriage_certificate' || rawCertType === 'marriage_certification' || rawCertType.includes('marge') || rawCertType.includes('marriag');

    const collectionType = isMarriage ? 'marriage_certification' : (reqRecord?.certificate_type || data.certificate_type || 'marriage_certification');
    const category = 'masjid-collection';
    const amount = isMarriage ? 100 : (Number(reqRecord?.fee_amount) || 100);

    const paymentPayload = {
      katha_number: String(reqRecord?.katha_number || data.katha_number || ''),
      khata_no: String(reqRecord?.katha_number || data.katha_number || ''),
      khataNo: String(reqRecord?.katha_number || data.katha_number || ''),
      applicant_name: reqRecord?.applicant_name || data.applicant_name,
      member_name: reqRecord?.applicant_name || data.applicant_name || `Member ${reqRecord?.katha_number || data.katha_number || ''}`,
      mobile: reqRecord?.mobile || data.mobile || '',
      collection_type: collectionType,
      collectionType: collectionType,
      category: category,
      amount: amount,
      payment_mode: 'online',
      paymentMode: 'online',
      masjid_name: masjid,
      jamath: masjid,
      remarks: `Certificate Approved (${collectionType}) - ${id}`,
      is_balance_payment: 0,
    };

    await paymentService.submitPayment(paymentPayload, adminUser).catch(err => {
      console.warn(`[CERT APPROVE PAYMENT SUBMIT WARN] submitPayment notice: ${err.message}`);
    });
  } catch (err) {
    console.warn(`[CERT APPROVE PAYMENT SUBMIT WARN] ${err.message}`);
  }

  // Send in-app and SMS notification to citizen
  await sendCertificateNotification({
    requestId: id,
    kathaNumber: reqRecord?.katha_number || data.katha_number,
    mobile: reqRecord?.mobile || data.mobile,
    status: 'approved',
    remarks: admin_remarks,
    certificateType: reqRecord?.certificate_type || data.certificate_type,
  });

  return {
    success: true,
    message: 'Certificate request approved successfully.',
    data: reqRecord,
  };
}

async function rejectRequest(data, adminUser) {
  const { id, rejection_reason, admin_remarks } = data;
  if (!id) throw Object.assign(new Error('Certificate request ID is required'), { status: 400 });

  const reason = rejection_reason || admin_remarks || 'Requirements not met';
  const adminName = adminUser?.name || 'BSJM Admin';

  // 1. Update local database record
  let reqRecord = await model.findById(id);
  if (reqRecord) {
    reqRecord = await model.updateStatus(id, 'rejected', reason, adminName);
  }

  const masjid = reqRecord?.masjid_name || data.masjid_name || 'BSJM Thodar';
  const baseUrl = getJamathBaseUrl(masjid);

  // 2. Forward rejection to source level (thodar-sawtdeen-be)
  if (baseUrl) {
    const externalUrl = `${baseUrl.replace(/\/+$/, '')}/api/certificates/admin/reject`;
    try {
      await axios.post(externalUrl, {
        id,
        rejection_reason: reason,
        approved_by: adminName,
      }, { timeout: 15000 });
      console.log(`[CERT REJECT SUCCESS] Forwarded rejection for request ${id} to thodar-sawtdeen-be`);
    } catch (err) {
      console.warn(`[CERT REJECT WARN] Could not forward rejection to thodar-sawtdeen-be: ${err.message}`);
    }
  }

  // Send in-app and SMS notification to citizen
  await sendCertificateNotification({
    requestId: id,
    kathaNumber: reqRecord?.katha_number || data.katha_number,
    mobile: reqRecord?.mobile || data.mobile,
    status: 'rejected',
    remarks: reason,
    certificateType: reqRecord?.certificate_type || data.certificate_type,
  });

  return {
    success: true,
    message: 'Certificate request rejected.',
    data: reqRecord,
  };
}

async function notifyApproval(data) {
  const requestId = data.request_id || data.id || data.payment_id;
  const status = data.status || 'approved';
  const remarks = data.admin_remarks || data.rejection_reason || data.remarks || '';
  const kathaNumber = data.katha_number;
  const mobile = data.mobile;
  const certificateType = data.certificate_type;

  await sendCertificateNotification({
    requestId,
    kathaNumber,
    mobile,
    status,
    remarks,
    certificateType,
  });

  return {
    success: true,
    message: 'Certificate approval notification processed.',
  };
}

async function updateStatus(id, data, adminUser) {
  const status = String(data.status || data.payment_status || 'approved').toLowerCase();
  if (status === 'approved') {
    return approveRequest({ id, ...data }, adminUser);
  } else if (status === 'rejected') {
    return rejectRequest({ id, ...data }, adminUser);
  } else {
    const reqRecord = await model.updateStatus(id, status, data.admin_remarks, adminUser?.name);
    return {
      success: true,
      message: `Certificate request status updated to ${status}.`,
      data: reqRecord,
    };
  }
}

async function downloadCertificatePdf(id, res) {
  const baseUrl = getJamathBaseUrl('BSJM Thodar');
  if (baseUrl) {
    try {
      const externalUrl = `${baseUrl.replace(/\/+$/, '')}/api/certificates/download/${id}`;
      const response = await axios.get(externalUrl, { responseType: 'stream', timeout: 20000 });
      res.setHeader('Content-Type', response.headers['content-type'] || 'application/pdf');
      if (response.headers['content-disposition']) {
        res.setHeader('Content-Disposition', response.headers['content-disposition']);
      }
      return response.data.pipe(res);
    } catch (err) {
      console.warn(`[CERT DOWNLOAD PDF WARN] Could not fetch PDF from thodar-sawtdeen-be: ${err.message}`);
    }
  }
  return res.status(404).send('Certificate PDF download not available');
}

module.exports = {
  submitRequest,
  getMyRequests,
  getCertificateFeeForMasjid,
  getAdminRequests,
  approveRequest,
  rejectRequest,
  updateStatus,
  notifyApproval,
  downloadCertificatePdf,
};
