const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(morgan('short'));
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/v1/auth', require('./modules/auth/auth.routes'));
app.use('/api/v1/users', require('./modules/user/user.routes'));
app.use('/api/v1/user', require('./modules/user/user.routes'));


app.use('/api/v1/announcements', require('./modules/announcement/announcement.routes'));
app.use('/api/v1/scholars', require('./modules/scholar/scholar.routes'));
app.use('/api/v1/chat', require('./modules/chat/chat.routes'));
app.use('/api/v1/fatwa', require('./modules/fatwa/fatwa.routes'));
app.use('/api/v1/prayer', require('./modules/prayer/prayer.routes'));
app.use('/api/v1/quran', require('./modules/quran/quran.routes'));
app.use('/api/v1/community', require('./modules/community/community.routes'));
app.use('/api/v1/subscriptions', require('./modules/subscription/subscription.routes'));
app.use('/api/v1/notifications', require('./modules/notification/notification.routes'));
app.use('/api/v1/uploads', require('./modules/upload/upload.routes'));
app.use('/api/v1/payments', require('./modules/payment/payment.routes'));
app.use('/api/v1/payment', require('./modules/payment/payment.routes'));
app.use('/api/payment', require('./modules/payment/payment.routes'));
app.use('/api/payments', require('./modules/payment/payment.routes'));
app.use('/mobile-be/payment', require('./modules/payment/payment.routes'));
app.use('/mobile-be/payments', require('./modules/payment/payment.routes'));
app.use('/api/mobile-be/payment', require('./modules/payment/payment.routes'));
app.use('/api/mobile-be/payments', require('./modules/payment/payment.routes'));

app.use('/api/v1/members', require('./modules/member/member.routes'));
app.use('/api/members', require('./modules/member/member.routes'));
app.use('/mobile-be/members', require('./modules/member/member.routes'));
app.use('/api/mobile-be/members', require('./modules/member/member.routes'));

app.use('/api/v1/master', require('./modules/master/master.routes'));
app.use('/api/master', require('./modules/master/master.routes'));
app.use('/mobile-be/master', require('./modules/master/master.routes'));
app.use('/api/mobile-be/master', require('./modules/master/master.routes'));

app.post('/mobile-be/notifyapproval', require('./middleware/auth').authenticate, require('./modules/payment/payment.controller').notifyApproval);
app.post('/mobile-be/notify-approval', require('./middleware/auth').authenticate, require('./modules/payment/payment.controller').notifyApproval);
app.post('/api/mobile-be/notifyapproval', require('./middleware/auth').authenticate, require('./modules/payment/payment.controller').notifyApproval);
app.post('/api/mobile-be/notify-approval', require('./middleware/auth').authenticate, require('./modules/payment/payment.controller').notifyApproval);

app.use('/api/v1/certificates', require('./modules/certificate/certificate.routes'));
app.use('/api/certificates', require('./modules/certificate/certificate.routes'));
app.use('/mobile-be/certificates', require('./modules/certificate/certificate.routes'));
app.use('/api/mobile-be/certificates', require('./modules/certificate/certificate.routes'));

app.use('/api/v1/documents', require('./modules/document/document.routes'));
app.use('/api/documents', require('./modules/document/document.routes'));
app.use('/mobile-be/documents', require('./modules/document/document.routes'));
app.use('/api/mobile-be/documents', require('./modules/document/document.routes'));

app.get(['/mobile-be/file-proxy', '/api/mobile-be/file-proxy', '/api/file-proxy'], async (req, res, next) => {
  try {
    const targetUuid = req.query.uuid || req.query.id;
    const rawKeyOrUrl = req.query.key || req.query.url || req.query.file;

    const documentModel = require('./modules/document/document.model');
    const uploadModel = require('./modules/upload/upload.model');

    let doc = null;
    if (targetUuid) {
      doc = await documentModel.findByUuid(targetUuid);
      if (!doc) {
        doc = await uploadModel.findById(targetUuid);
      }
    }

    if (!doc && rawKeyOrUrl) {
      const searchKey = String(rawKeyOrUrl);
      doc = await documentModel.findByUuid(searchKey);
      if (!doc) doc = await uploadModel.findById(searchKey);
      if (!doc) {
        const { pool } = require('./config/db');
        const [[dRow]] = await pool.query(
          'SELECT * FROM uploaded_documents WHERE (b2_key = ? OR file_url = ?) AND is_deleted = 0 LIMIT 1',
          [searchKey, searchKey]
        );
        doc = dRow || null;
      }
    }

    if (!doc) {
      return res.status(404).json({ success: false, message: 'File not found in local database' });
    }

    const fileDataStr = doc.file_data || doc.url || doc.file_url;
    if (!fileDataStr) {
      return res.status(404).json({ success: false, message: 'File content data unavailable' });
    }

    let mimeType = doc.mime_type || 'image/png';
    let base64Content = fileDataStr;
    let dataUrl = fileDataStr;

    if (fileDataStr.startsWith('data:')) {
      const matches = fileDataStr.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        mimeType = matches[1];
        base64Content = matches[2];
        dataUrl = fileDataStr;
      }
    } else {
      dataUrl = `data:${mimeType};base64,${fileDataStr}`;
    }

    const wantsJson = req.query.format === 'json' || (req.headers.accept && req.headers.accept.includes('application/json'));

    if (wantsJson) {
      return res.json({
        success: true,
        reference_id: doc.file_uuid || doc.id || targetUuid,
        original_name: doc.original_name || 'file.png',
        mime_type: mimeType,
        data_url: dataUrl,
        base64: base64Content,
      });
    }

    const buffer = Buffer.from(base64Content, 'base64');
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.send(buffer);

    if (doc.file_data && !doc.file_data.startsWith('http')) {
      const buffer = Buffer.from(doc.file_data, 'base64');
      res.setHeader('Content-Type', doc.mime_type || 'image/png');
      res.setHeader('Content-Length', buffer.length);
      return res.send(buffer);
    }

    if (doc.file_url && doc.file_url.startsWith('http')) {
      return res.redirect(doc.file_url);
    }

    return res.status(404).json({ success: false, message: 'File content data unavailable' });
  } catch (err) {
    console.error('[FILE PROXY ERROR]', err.message);
    res.status(500).json({ success: false, message: 'Failed to retrieve file from local database' });
  }
});

app.use(errorHandler);

module.exports = app;
