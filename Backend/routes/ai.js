const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { summarizeText, summarizePdf } = require('../controllers/aiController');

router.use(protect);

// JSON: { text, summary_length }
router.post('/summarize', summarizeText);

// Multipart/form-data: file (PDF)
router.post('/summarize/pdf', upload.single('file'), summarizePdf);

module.exports = router;
