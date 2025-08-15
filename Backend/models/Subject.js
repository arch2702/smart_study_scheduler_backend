const mongoose = require('mongoose');

const { Schema } = mongoose;

const subjectSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  dailyHours: {
    type: Number,
    default: 1,
    min: 0
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Helpful compound index for faster per-user lookups by title
subjectSchema.index({ user: 1, title: 1 });

module.exports = mongoose.model('Subject', subjectSchema);
