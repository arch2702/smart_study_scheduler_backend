const Notification = require('../models/Notification');

// Get all notifications for the current user
const getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    const notifications = await Notification.find({ user: userId })
      .populate('topic', 'title')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: {
        notifications,
        count: notifications.length,
        unreadCount: notifications.filter(n => !n.read).length
      }
    });

  } catch (error) {
    console.error('getUserNotifications error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
};

// Mark a notification as read
const markNotificationRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, user: userId },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    return res.json({
      success: true,
      message: 'Notification marked as read',
      notification
    });

  } catch (error) {
    console.error('markNotificationRead error:', error);
    return res.status(500).json({ success: false, message: 'Failed to mark notification as read' });
  }
};

module.exports = {
  getUserNotifications,
  markNotificationRead
};
