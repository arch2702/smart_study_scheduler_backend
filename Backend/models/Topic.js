const mongoose = require('mongoose');

const { Schema } = mongoose;

const topicSchema = new Schema({
  subject: {
    type: Schema.Types.ObjectId,
    ref: 'Subject',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  notes: {
    type: String,
    default: ''
  },
  completed: {
    type: Boolean,
    default: false
  },
  points: {
    type: Number,
    default: 0,
    min: 0
  },
  lastReviewed: {
    type: Date,
    default: null
  },
  nextReview: {
    type: Date,
    default: null
  },
  intervalDays: {
    type: Number,
    default: 0,
    min: 0
  },
  completedAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes
// Single-field index already added on subject for quick lookups by subject
// Also add compound index to speed up common queries (subject + completion)
topicSchema.index({ subject: 1, completed: 1 });

module.exports = mongoose.model('Topic', topicSchema);
