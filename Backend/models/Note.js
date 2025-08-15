const mongoose = require('mongoose');

const { Schema } = mongoose;

const noteSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    subject: {
      type: Schema.Types.ObjectId,
      ref: 'Subject',
      default: null,
      index: true
    },
    topic: {
      type: Schema.Types.ObjectId,
      ref: 'Topic',
      default: null,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    content: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// Useful compound index to speed up listing user's notes by recent creation
noteSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Note', noteSchema);
