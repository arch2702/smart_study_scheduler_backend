const Subject = require('../models/Subject');
const Topic = require('../models/Topic');
const User = require('../models/User');
const { getDefaultInterval, getReviewPoints } = require('../utils/spacedRepetition');

// Ensure subject belongs to current user
const ensureSubjectOwnership = async (subjectId, userId) => {
  const subject = await Subject.findById(subjectId);
  if (!subject) {
    return { ok: false, status: 404, message: 'Subject not found' };
  }
  if (subject.user.toString() !== userId) {
    return { ok: false, status: 403, message: 'Not authorized' };
  }
  return { ok: true, subject };
};

// Create a topic under a subject (ownership check)
const createTopic = async (req, res) => {
  try {
    const userId = req.user.id;
    const { subject: subjectId, title, difficulty, notes } = req.body;

    if (!subjectId) {
      return res.status(400).json({ success: false, message: 'subject is required' });
    }
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'title is required' });
    }

    const own = await ensureSubjectOwnership(subjectId, userId);
    if (!own.ok) return res.status(own.status).json({ success: false, message: own.message });

    const topic = await Topic.create({ subject: subjectId, title: title.trim(), difficulty, notes });
    return res.status(201).json({ success: true, topic });
  } catch (error) {
    console.error('createTopic error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create topic' });
  }
};

// Get topics by subject (ownership check)
const getTopicsBySubject = async (req, res) => {
  try {
    const userId = req.user.id;
    const { subjectId } = req.params;

    const own = await ensureSubjectOwnership(subjectId, userId);
    if (!own.ok) return res.status(own.status).json({ success: false, message: own.message });

    const topics = await Topic.find({ subject: subjectId }).sort({ createdAt: -1 });
    return res.json({ success: true, topics });
  } catch (error) {
    console.error('getTopicsBySubject error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch topics' });
  }
};

// Update topic (notes, difficulty, title, etc.) with subject ownership check
const updateTopic = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const topic = await Topic.findById(id);
    if (!topic) {
      return res.status(404).json({ success: false, message: 'Topic not found' });
    }

    // Ensure subject ownership
    const own = await ensureSubjectOwnership(topic.subject, userId);
    if (!own.ok) return res.status(own.status).json({ success: false, message: own.message });

    const allowed = ['title', 'difficulty', 'notes', 'completed', 'points', 'lastReviewed', 'nextReview'];
    for (const key of allowed) {
      if (key in req.body) {
        topic[key] = req.body[key];
      }
    }

    await topic.save();
    return res.json({ success: true, topic });
  } catch (error) {
    console.error('updateTopic error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update topic' });
  }
};

// Mark complete: set completed=true, increment user points, set spaced repetition values
const markComplete = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const topic = await Topic.findById(id);
    if (!topic) {
      return res.status(404).json({ success: false, message: 'Topic not found' });
    }

    // Ensure subject ownership
    const own = await ensureSubjectOwnership(topic.subject, userId);
    if (!own.ok) return res.status(own.status).json({ success: false, message: own.message });

    // Mark complete
    topic.completed = true;
    topic.intervalDays = 1; // start with 1 day
    // Track completion timestamp for daily achievements
    topic.completedAt = new Date();

    // Set next review date using spaced repetition logic
    const today = new Date();
    const defaultInterval = getDefaultInterval(topic.difficulty);
    topic.nextReview = new Date(today);
    topic.nextReview.setDate(today.getDate() + defaultInterval);
    topic.lastReviewed = today;

    // Calculate points based on difficulty
    let pointsEarned = 0;
    switch (topic.difficulty) {
      case 'easy':
        pointsEarned = 5;
        break;
      case 'medium':
        pointsEarned = 10;
        break;
      case 'hard':
        pointsEarned = 15;
        break;
      default:
        pointsEarned = 10; // fallback for medium
    }
    // Persist points on topic so UI can reflect earned points
    topic.points = pointsEarned;

    await topic.save();

    // Update user points and add to reward history
    const user = await User.findByIdAndUpdate(
      userId, 
      { 
        $inc: { points: pointsEarned },
        $push: {
          rewardHistory: {
            action: 'topic_completed',
            points: pointsEarned,
            description: `Completed topic: ${topic.title} (${topic.difficulty})`,
            timestamp: new Date()
          }
        }
      },
      { new: true, select: 'points' }
    );

    return res.json({ 
      success: true, 
      topic,
      pointsEarned,
      newTotalPoints: user.points
    });
  } catch (error) {
    console.error('markComplete error:', error);
    return res.status(500).json({ success: false, message: 'Failed to mark topic complete' });
  }
};

// Record a review: grow interval and set next review
const recordReview = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const topic = await Topic.findById(id);
    if (!topic) {
      return res.status(404).json({ success: false, message: 'Topic not found' });
    }

    // Ensure subject ownership
    const own = await ensureSubjectOwnership(topic.subject, userId);
    if (!own.ok) return res.status(own.status).json({ success: false, message: own.message });

    // Simple spaced repetition growth
    const current = topic.intervalDays || 0;
    topic.intervalDays = Math.max(1, current * 2);

    const today = new Date();
    topic.lastReviewed = today;
    topic.nextReview = new Date(today);
    topic.nextReview.setDate(today.getDate() + topic.intervalDays);

    await topic.save();

    // Award review points and add to reward history
    const reviewPoints = getReviewPoints(topic.difficulty);
    const user = await User.findByIdAndUpdate(
      userId,
      {
        $inc: { points: reviewPoints },
        $push: {
          rewardHistory: {
            action: 'topic_reviewed',
            points: reviewPoints,
            description: `Reviewed topic: ${topic.title} (${topic.difficulty})`,
            timestamp: new Date()
          }
        }
      },
      { new: true, select: 'points' }
    );

    return res.json({ 
      success: true, 
      topic,
      reviewPointsEarned: reviewPoints,
      newTotalPoints: user.points
    });
  } catch (error) {
    console.error('recordReview error:', error);
    return res.status(500).json({ success: false, message: 'Failed to record review' });
  }
};

module.exports = {
  createTopic,
  getTopicsBySubject,
  updateTopic,
  markComplete,
  recordReview
};
