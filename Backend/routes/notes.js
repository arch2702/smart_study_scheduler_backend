const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

const {
  createNote,
  getNotes,
  getNote,
  updateNote,
  deleteNote,
  uploadPDF
} = require('../controllers/notesController');

// Secure all routes
router.use(protect);

router.post('/', createNote);
router.post('/upload', upload.single('file'), uploadPDF);
router.get('/', getNotes);
router.get('/:id', getNote);
router.put('/:id', updateNote);
router.delete('/:id', deleteNote);

module.exports = router;
