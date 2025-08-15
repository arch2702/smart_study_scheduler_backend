const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getUserNotifications,
  markNotificationRead
} = require('../controllers/notificationsController');

// All routes require authentication
router.use(protect);

// GET /api/notifications - Get all notifications for user
router.get('/', getUserNotifications);

// POST /api/notifications/:id/read - Mark notification as read
router.post('/:id/read', markNotificationRead);

module.exports = router;
