const { Router } = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticate } = require('../../middleware/auth');
const controller = require('./certificate.controller');

// Multer disk storage — save to uploads/certificates/
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = 'uploads/certificates';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const allowedExt = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExt.includes(ext)) cb(null, true);
  else cb(new Error('Only image files (JPG, PNG, WEBP) and PDF are allowed'));
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter,
});

// Accept any optional file fields (photo, document, invitation_card, payment_screenshot, screenshot, etc.)
const uploadFields = upload.any();

const router = Router();

// GET /api/certificates/fee?masjid_name=BSJM Thodar
router.get('/fee', controller.getCertificateFee);

// Citizen Endpoints
// POST /api/certificates/request — submit certificate request with files
router.post('/request', authenticate, uploadFields, controller.submitRequest);

// GET /api/certificates/my-requests?katha_number=501
router.get('/my-requests', authenticate, controller.getMyRequests);

// Admin Endpoints
// GET /api/certificates/admin/list?page=1&limit=12&status=all
router.get('/admin/list', controller.getAdminRequests);

// POST /api/certificates/admin/approve
router.post('/admin/approve', controller.approveRequest);

// POST /api/certificates/admin/reject
router.post('/admin/reject', controller.rejectRequest);

// Notify Approval
router.post('/notify-approval', controller.notifyApproval);
router.post('/notifyapproval', controller.notifyApproval);

// PATCH /api/certificates/admin/:id/status
router.patch('/admin/:id/status', controller.updateStatus);
router.patch('/:id/status', controller.updateStatus);

// Download PDF
router.get('/download/:id', controller.downloadPdf);

module.exports = router;
