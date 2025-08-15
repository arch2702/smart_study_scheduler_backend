const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createTopic,
  getTopicsBySubject,
  updateTopic,
  markComplete,
  recordReview
} = require('../controllers/topicsController');

// Secure all routes
router.use(protect);

router.post('/', createTopic);
router.get('/subject/:subjectId', getTopicsBySubject);
router.put('/:id', updateTopic);
router.post('/:id/complete', markComplete);
router.post('/:id/review', recordReview);

module.exports = router;
