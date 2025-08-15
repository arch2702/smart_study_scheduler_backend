const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createSubject,
  getSubjects,
  getSubject,
  updateSubject,
  deleteSubject
} = require('../controllers/subjectsController');

// Secure all routes
router.use(protect);

router.post('/', createSubject);
router.get('/', getSubjects);
router.get('/:id', getSubject);
router.put('/:id', updateSubject);
router.delete('/:id', deleteSubject);

module.exports = router;
