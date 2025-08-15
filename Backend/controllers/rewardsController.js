const User = require('../models/User');

// Get user's points and recent reward history
const getUserRewards = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId)
      .select('points rewardHistory')
      .lean();

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Get recent reward history (last 10 entries, sorted by timestamp)
    const recentRewards = user.rewardHistory
      ? user.rewardHistory
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
          .slice(0, 10)
      : [];

    // Calculate some basic stats
    const totalRewards = user.rewardHistory ? user.rewardHistory.length : 0;
    const totalPointsEarned = user.rewardHistory 
      ? user.rewardHistory.reduce((sum, reward) => sum + reward.points, 0)
      : 0;

    // Group rewards by action type
    const rewardsByAction = recentRewards.reduce((acc, reward) => {
      if (!acc[reward.action]) {
        acc[reward.action] = [];
      }
      acc[reward.action].push(reward);
      return acc;
    }, {});

    return res.json({
      success: true,
      data: {
        currentPoints: user.points || 0,
        totalPointsEarned,
        totalRewards,
        recentRewards,
        rewardsByAction,
        stats: {
          topicsCompleted: rewardsByAction.topic_completed?.length || 0,
          topicsReviewed: rewardsByAction.topic_reviewed?.length || 0,
          achievements: rewardsByAction.achievement?.length || 0,
          streakBonuses: rewardsByAction.streak_bonus?.length || 0
        }
      }
    });

  } catch (error) {
    console.error('getUserRewards error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch rewards' });
  }
};

module.exports = {
  getUserRewards
};
