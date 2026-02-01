
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: false }, // Password optional for Google users
  googleId: { type: String }, // Added for Social Login
  role: { type: String, enum: ['STUDENT', 'TEACHER'], default: 'STUDENT' },
  classLevel: { type: Number, enum: [11, 12] },
  isVerified: { type: Boolean, default: false },
  verificationCode: { type: String },
  verificationCodeExpires: { type: Date },
  purchasedChapterIds: [{ type: String }],
  purchasedCourseIds: [{ type: String }],
  progress: {
    type: Map,
    of: Boolean,
    default: {}
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
