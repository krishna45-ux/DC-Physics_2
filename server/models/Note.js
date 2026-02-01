
const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String }, // Text content
  url: { type: String }, // For PDF
  type: { type: String, enum: ['TEXT', 'PDF'], default: 'TEXT' },
  classLevel: { type: Number, required: true },
  chapterId: { type: String }, // Optional: Link note to a specific chapter
  date: { type: Date, default: Date.now },
  authorId: { type: String },
  authorName: { type: String }
});

module.exports = mongoose.model('Note', noteSchema);
