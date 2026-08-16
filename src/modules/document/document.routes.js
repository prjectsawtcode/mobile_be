const express = require('express');
const router = express.Router();
const controller = require('./document.controller');

// GET /api/documents/:id (Fetch document by reference ID)
router.get('/base64/:id', controller.getDocumentById);
router.get('/:id', controller.getDocumentById);

module.exports = router;
