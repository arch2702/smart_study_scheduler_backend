const Note = require('../models/Note');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');

// Create a note for the authenticated user
const createNote = async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, content, subject, topic } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }

    // Safely handle optional refs: only set if valid ObjectId
    const subjectId = subject && mongoose.Types.ObjectId.isValid(subject) ? subject : null;
    const topicId = topic && mongoose.Types.ObjectId.isValid(topic) ? topic : null;

    const note = await Note.create({
      user: userId,
      title: title.trim(),
      content: content || '',
      subject: subjectId,
      topic: topicId
    });

    return res.status(201).json({ success: true, note });
  } catch (error) {
    console.error('createNote error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create note' });
  }
};

// Get notes for the authenticated user (optionally filter by subject or topic)
const getNotes = async (req, res) => {
  try {
    const userId = req.user.id;
    const { subject, topic } = req.query;

    const filter = { user: userId };
    if (subject && mongoose.Types.ObjectId.isValid(subject)) filter.subject = subject;
    if (topic && mongoose.Types.ObjectId.isValid(topic)) filter.topic = topic;

    const notes = await Note.find(filter).sort({ createdAt: -1 });
    return res.json({ success: true, notes });
  } catch (error) {
    console.error('getNotes error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch notes' });
  }
};

// Get a single note (ownership check)
const getNote = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const note = await Note.findById(id);
    if (!note) {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }
    if (note.user.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    return res.json({ success: true, note });
  } catch (error) {
    console.error('getNote error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch note' });
  }
};

// Update a note (ownership check)
const updateNote = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const note = await Note.findById(id);
    if (!note) {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }
    if (note.user.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const allowed = ['title', 'content', 'subject', 'topic'];
    for (const key of allowed) {
      if (key in req.body) {
        if ((key === 'subject' || key === 'topic')) {
          const val = req.body[key];
          note[key] = val && mongoose.Types.ObjectId.isValid(val) ? val : null;
        } else {
          note[key] = req.body[key];
        }
      }
    }

    await note.save();
    return res.json({ success: true, note });
  } catch (error) {
    console.error('updateNote error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update note' });
  }
};

// Delete a note (ownership check)
const deleteNote = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const note = await Note.findById(id);
    if (!note) {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }
    if (note.user.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await note.deleteOne();
    return res.json({ success: true, message: 'Note deleted' });
  } catch (error) {
    console.error('deleteNote error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete note' });
  }
};

// Upload PDF and extract text
const uploadPDF = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No PDF file uploaded' });
    }

    const filePath = req.file.path;
    
    try {
      // Read the PDF file
      const dataBuffer = fs.readFileSync(filePath);
      
      // Parse PDF and extract text
      const data = await pdfParse(dataBuffer);
      
      // Delete the uploaded file after extraction
      fs.unlinkSync(filePath);
      
      return res.json({
        success: true,
        message: 'PDF processed successfully',
        extractedText: data.text,
        pageCount: data.numpages,
        info: {
          title: data.info.Title || 'Untitled',
          author: data.info.Author || 'Unknown',
          subject: data.info.Subject || '',
          creator: data.info.Creator || ''
        }
      });
    } catch (parseError) {
      // Clean up file if parsing fails
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      throw parseError;
    }
  } catch (error) {
    console.error('uploadPDF error:', error);
    
    // Clean up file if any error occurs
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to process PDF file',
      error: error.message 
    });
  }
};

module.exports = {
  createNote,
  getNotes,
  getNote,
  updateNote,
  deleteNote,
  uploadPDF
};
