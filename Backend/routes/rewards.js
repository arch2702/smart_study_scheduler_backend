const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getUserRewards } = require('../controllers/rewardsController');

// All routes require authentication
router.use(protect);

// GET /api/rewards - Get user's points and reward history
router.get('/', getUserRewards);

module.exports = router;
