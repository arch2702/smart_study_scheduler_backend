const Subject = require('../models/Subject');
const Topic = require('../models/Topic');

// Create a subject linked to the authenticated user
const createSubject = async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, startDate, endDate, dailyHours, difficulty } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }

    const subject = await Subject.create({
      user: userId,
      title: title.trim(),
      startDate,
      endDate,
      dailyHours,
      difficulty
    });

    return res.status(201).json({ success: true, subject });
  } catch (error) {
    console.error('createSubject error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create subject' });
  }
};

// Get all subjects for the authenticated user
const getSubjects = async (req, res) => {
  try {
    const userId = req.user.id;
    const subjects = await Subject.find({ user: userId }).sort({ createdAt: -1 });
    return res.json({ success: true, subjects });
  } catch (error) {
    console.error('getSubjects error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch subjects' });
  }
};

// Get a single subject with its topics (populate manually)
const getSubject = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const subject = await Subject.findById(id);
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }
    if (subject.user.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const topics = await Topic.find({ subject: subject._id }).sort({ createdAt: -1 });

    return res.json({ success: true, subject, topics });
  } catch (error) {
    console.error('getSubject error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch subject' });
  }
};

// Update a subject (owner only)
const updateSubject = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const subject = await Subject.findById(id);
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }
    if (subject.user.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const allowed = ['title', 'startDate', 'endDate', 'dailyHours', 'difficulty'];
    for (const key of allowed) {
      if (key in req.body) {
        subject[key] = req.body[key];
      }
    }

    await subject.save();
    return res.json({ success: true, subject });
  } catch (error) {
    console.error('updateSubject error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update subject' });
  }
};

// Delete a subject (owner only) and cascade delete topics
const deleteSubject = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const subject = await Subject.findById(id);
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }
    if (subject.user.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Delete related topics
    await Topic.deleteMany({ subject: subject._id });

    // Delete subject
    await subject.deleteOne();

    return res.json({ success: true, message: 'Subject deleted' });
  } catch (error) {
    console.error('deleteSubject error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete subject' });
  }
};

module.exports = {
  createSubject,
  getSubjects,
  getSubject,
  updateSubject,
  deleteSubject
};
