/**
 * Spaced Repetition Utility Functions
 * Handles calculation of next review dates and due status for topics
 */

/**
 * Compute the next review date for a topic based on difficulty and current interval
 * @param {Object} topic - Topic object with difficulty and intervalDays
 * @returns {Date} Next review date
 */
const computeNextReview = (topic) => {
  const today = new Date();
  let intervalDays = topic.intervalDays || 0;
  
  // If no interval set, use difficulty-based default
  if (intervalDays === 0) {
    switch (topic.difficulty) {
      case 'easy':
        intervalDays = 15;
        break;
      case 'medium':
        intervalDays = 10;
        break;
      case 'hard':
        intervalDays = 7;
        break;
      default:
        intervalDays = 10; // fallback to medium
    }
  } else {
    // Double the interval for spaced repetition growth
    intervalDays = intervalDays * 2;
  }
  
  // Calculate next review date
  const nextReview = new Date(today);
  nextReview.setDate(today.getDate() + intervalDays);
  
  return nextReview;
};

/**
 * Check if a topic is due for review
 * @param {Object} topic - Topic object with nextReview date
 * @returns {boolean} True if topic is due for review
 */
const isDue = (topic) => {
  if (!topic.nextReview) {
    return false;
  }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to start of day
  
  const nextReview = new Date(topic.nextReview);
  nextReview.setHours(0, 0, 0, 0); // Reset time to start of day
  
  return nextReview <= today;
};

/**
 * Get the default interval for a difficulty level
 * @param {string} difficulty - Topic difficulty (easy, medium, hard)
 * @returns {number} Default interval in days
 */
const getDefaultInterval = (difficulty) => {
  switch (difficulty) {
    case 'easy':
      return 15;
    case 'medium':
      return 10;
    case 'hard':
      return 7;
    default:
      return 10;
  }
};

/**
 * Calculate review score bonus points based on difficulty
 * @param {string} difficulty - Topic difficulty
 * @returns {number} Points to award for review
 */
const getReviewPoints = (difficulty) => {
  switch (difficulty) {
    case 'easy':
      return 1;
    case 'medium':
      return 2;
    case 'hard':
      return 3;
    default:
      return 2;
  }
};

module.exports = {
  computeNextReview,
  isDue,
  getDefaultInterval,
  getReviewPoints
};
