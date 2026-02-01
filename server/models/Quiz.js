const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  id: { type: String },
  text: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctOptionIndex: { type: Number, required: true }
});

const quizSchema = new mongoose.Schema({
  id: { type: String, required: true },
  chapterId: { type: String, required: true, ref: 'Chapter' },
  questions: [questionSchema]
});

module.exports = mongoose.model('Quiz', quizSchema);