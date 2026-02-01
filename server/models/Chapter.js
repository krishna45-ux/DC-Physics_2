const mongoose = require('mongoose');

const topicSchema = new mongoose.Schema({
  id: { type: String, required: true }, // Keeping string ID to match frontend types
  title: { type: String, required: true },
  videoUrl: { type: String, required: true },
  duration: { type: String, required: true }
});

const chapterSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, // Custom ID like 'c12-1'
  title: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true },
  classLevel: { type: Number, required: true },
  duration: { type: String },
  topics: [topicSchema]
});

module.exports = mongoose.model('Chapter', chapterSchema);