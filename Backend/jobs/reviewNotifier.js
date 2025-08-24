const cron = require('node-cron');
const Topic = require('../models/Topic');
const Subject = require('../models/Subject');
const Notification = require('../models/Notification');

/**
 * Review Notifier Cron Job
 * Runs every hour to check for topics due for review and create notifications
 */

const createReviewNotification = async (topic, subject) => {
  try {
    // Check if notification already exists for this topic
    const existingNotification = await Notification.findOne({
      user: subject.user,
      topic: topic._id,
      read: false
    });

    if (existingNotification) {
      // console.log(`Notification already exists for topic: ${topic.title}`);
      return;
    }

    // Create new notification
    const notification = await Notification.create({
      user: subject.user,
      topic: topic._id,
      title: `Review Due: ${topic.title}`,
      message: `It's time to review "${topic.title}" from "${subject.title}". This will help reinforce your learning!`
    });

    console.log(`Created review notification for topic: ${topic.title} (User: ${subject.user})`);
    return notification;
  } catch (error) {
    console.error(`Error creating notification for topic ${topic._id}:`, error.message);
  }
};

const checkDueReviews = async () => {
  try {
    console.log(`[${new Date().toISOString()}] Starting due review check...`);
    
    const now = new Date();
    
    // Find all topics that are due for review
    const dueTopics = await Topic.find({
      completed: true,
      nextReview: { $lte: now }
    }).populate('subject', 'user title');

    if (dueTopics.length === 0) {
      console.log('No topics due for review');
      return;
    }

    // console.log(`Found ${dueTopics.length} topics due for review`);

    // Group topics by user for batch processing
    const topicsByUser = {};
    dueTopics.forEach(topic => {
      if (topic.subject && topic.subject.user) {
        const userId = topic.subject.user.toString();
        if (!topicsByUser[userId]) {
          topicsByUser[userId] = [];
        }
        topicsByUser[userId].push({ topic, subject: topic.subject });
      }
    });

    // Create notifications for each user
    let totalNotifications = 0;
    for (const [userId, userTopics] of Object.entries(topicsByUser)) {
      console.log(`Processing ${userTopics.length} due topics for user: ${userId}`);
      
      for (const { topic, subject } of userTopics) {
        const notification = await createReviewNotification(topic, subject);
        if (notification) {
          totalNotifications++;
        }
      }
    }

    console.log(`Review check completed. Created ${totalNotifications} notifications.`);
    
  } catch (error) {
    console.error('Error in due review check:', error);
  }
};

// Schedule the cron job
const scheduleReviewNotifier = () => {
  // Run every hour in production
  const cronSchedule = process.env.NODE_ENV === 'development' 
    ? '*/15 * * * *'  // Every 15 minutes in development
    : '0 * * * *';    // Every hour in production

  console.log(`Scheduling review notifier with cron: ${cronSchedule}`);
  
  const job = cron.schedule(cronSchedule, checkDueReviews, {
    scheduled: true,
    timezone: "UTC"
  });

  // Log when job starts
  console.log('Review notifier cron job scheduled successfully');
  
  // Run initial check after 30 seconds (to avoid startup delay)
  setTimeout(() => {
    console.log('Running initial due review check...');
    checkDueReviews();
  }, 30000);

  return job;
};

// Export for manual testing
const runManualCheck = () => {
  console.log('Running manual due review check...');
  return checkDueReviews();
};

module.exports = {
  scheduleReviewNotifier,
  checkDueReviews,
  runManualCheck
};
