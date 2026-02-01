
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

const User = require('./models/User');
const Chapter = require('./models/Chapter');
const Quiz = require('./models/Quiz');
const Note = require('./models/Note');
const { CHAPTERS, QUIZZES } = require('./seedData');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());

// --- Database Connection ---
// NOTE: Ensure your .env file has the correct MONGO_URI
const DB_URI = process.env.MONGO_URI || 'mongodb+srv://Krishna_DC_PHYSICS:<db_password>@cluster1.bmaichl.mongodb.net/dcphysics?appName=Cluster1';

mongoose.connect(DB_URI, {
  serverSelectionTimeoutMS: 5000
})
  .then(() => console.log('MongoDB Connected Successfully'))
  .catch(err => {
    console.error('MongoDB Connection Error:', err);
  });

// --- Razorpay Setup ---
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_temporary_key_123',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'temporary_secret_456'
});

// --- HELPERS ---

const EMAIL_USER = process.env.EMAIL_USER || 'dcacademy905@gmail.com';
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'secret123', { expiresIn: '30d' });
};

// Middleware to protect routes
const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret123');
      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) {
        throw new Error("User not found");
      }
      next();
    } catch (error) {
      console.error("Auth Middleware Error:", error.message);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// --- ROUTES ---

// 1. Authentication Routes

app.post('/api/auth/signup', async (req, res) => {
  const { name, email, password, role, classLevel } = req.body;
  try {
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Allow role to be set to TEACHER or STUDENT. Default is STUDENT if not provided.
    const userRole = (role === 'TEACHER' || role === 'STUDENT') ? role : 'STUDENT';

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: userRole,
      classLevel,
      verificationCode,
      verificationCodeExpires: Date.now() + 10 * 60 * 1000 // 10 mins
    });

    // Send Verification Email
    if (process.env.EMAIL_PASS) {
      try {
        await transporter.sendMail({
          from: EMAIL_USER,
          to: email,
          subject: 'Verify your D C Physics Account',
          text: `Welcome to D C Physics!\n\nYour verification code is: ${verificationCode}\n\nThis code will expire in 10 minutes.`
        });
      } catch (mailError) {
        console.error("Email sending failed:", mailError);
      }
    }

    res.status(201).json({
      message: 'User registered. Check email for code.',
      verificationCode: verificationCode
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/auth/verify', async (req, res) => {
  const { email, code } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.verificationCode !== code || user.verificationCodeExpires < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired code' });
    }

    user.isVerified = true;
    user.verificationCode = undefined;
    user.verificationCodeExpires = undefined;
    await user.save();

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    // If user was created via Google (no password) but tries to login with password
    if (!user.password && user.googleId) return res.status(400).json({ message: 'Please sign in with Google' });

    if (!user.isVerified) return res.status(403).json({ message: 'Please verify your email first' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    res.json({
      id: user._id,
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
      purchasedChapterIds: user.purchasedChapterIds,
      purchasedCourseIds: user.purchasedCourseIds,
      classLevel: user.classLevel,
      progress: user.progress
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Social Login Endpoint (Google Simulation)
app.post('/api/auth/social-login', async (req, res) => {
  const { email, name, googleId } = req.body;
  try {
    let user = await User.findOne({ email });

    if (user) {
      // User exists, update googleId if missing
      if (!user.googleId) {
        user.googleId = googleId;
        await user.save();
      }
    } else {
      // Create new user
      user = await User.create({
        name,
        email,
        googleId,
        role: 'STUDENT',
        classLevel: 12, // Default
        isVerified: true, // Social logins are verified
        purchasedChapterIds: [],
        purchasedCourseIds: []
      });
    }

    res.json({
      id: user._id,
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
      purchasedChapterIds: user.purchasedChapterIds,
      purchasedCourseIds: user.purchasedCourseIds,
      classLevel: user.classLevel,
      progress: user.progress
    });

  } catch (error) {
    console.error("Social Login Error:", error);
    res.status(500).json({ message: "Social login failed" });
  }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const tempPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    user.password = hashedPassword;
    await user.save();

    if (process.env.EMAIL_PASS) {
      await transporter.sendMail({
        from: EMAIL_USER,
        to: email,
        subject: 'Password Reset - D C Physics',
        text: `You requested a password reset.\n\nYour new temporary password is: ${tempPassword}\n\nPlease log in and change your password immediately in the profile settings.`
      });
      res.json({ message: 'A new temporary password has been sent to your email.' });
    } else {
      res.status(500).json({ message: 'Email service not configured.' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Failed to process request' });
  }
});

app.get('/api/auth/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json({ ...user.toObject(), id: user._id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 2. Data Routes

app.get('/api/chapters', async (req, res) => {
  try {
    const chapters = await Chapter.find({});
    res.json(chapters);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/quizzes/:chapterId', async (req, res) => {
  try {
    const quiz = await Quiz.findOne({ chapterId: req.params.chapterId });
    res.json(quiz);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// --- NOTES ROUTES ---

app.get('/api/notes', async (req, res) => {
  try {
    const { chapterId, classLevel } = req.query;
    let query = {};
    if (chapterId) query.chapterId = chapterId;
    if (classLevel) query.classLevel = classLevel;

    const notes = await Note.find(query).sort({ date: -1 });
    res.json(notes.map(note => ({ ...note.toObject(), id: note._id })));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/notes', protect, async (req, res) => {
  try {
    const { title, content, url, type, classLevel, chapterId } = req.body;

    const note = await Note.create({
      title,
      content,
      url,
      type,
      classLevel,
      chapterId,
      authorId: req.user._id,
      authorName: req.user.name
    });
    res.status(201).json({ ...note.toObject(), id: note._id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete('/api/notes/:id', protect, async (req, res) => {
  try {
    await Note.findByIdAndDelete(req.params.id);
    res.json({ message: 'Note deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 3. Payment Routes (Razorpay)

app.post('/api/orders', protect, async (req, res) => {
  const { amount, itemId, type } = req.body;
  try {
    const options = {
      amount: amount * 100, // Amount in paise
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      notes: {
        userId: req.user._id.toString(),
        itemId: itemId,
        type: type
      }
    };

    // Create Razorpay Order
    const order = await razorpay.orders.create(options);

    // Return order details to frontend to open modal
    res.json(order);
  } catch (error) {
    console.error("Razorpay Error:", error);
    res.status(500).json({ message: "Payment creation failed" });
  }
});

app.post('/api/payment/verify', protect, async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, itemId, type } = req.body;

  try {
    // 1. Verify Signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'temporary_secret_456')
      .update(body.toString())
      .digest('hex');

    if (expectedSignature === razorpay_signature) {
      // 2. Signature is valid, update User permissions in DB
      const user = await User.findById(req.user._id);

      if (type === 'COURSE') {
        if (!user.purchasedCourseIds.includes(itemId)) {
          user.purchasedCourseIds.push(itemId);
        }
      } else if (type === 'CHAPTER') {
        if (!user.purchasedChapterIds.includes(itemId)) {
          user.purchasedChapterIds.push(itemId);
        }
      }

      await user.save();
      res.json({ success: true, user });
    } else {
      res.status(400).json({ success: false, message: 'Invalid Signature' });
    }
  } catch (error) {
    console.error("Verification Error:", error);
    res.status(500).json({ message: error.message });
  }
});

// 4. AI Tutor Route

app.post('/api/ai/chat', protect, async (req, res) => {
  const { message, context } = req.body;
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = 'gemini-3-flash-preview';
    const systemPrompt = `You are an expert high school Physics tutor. Context: ${context || 'General Physics'}. Answer concisely.`;

    const response = await ai.models.generateContent({
      model: model,
      contents: message,
      config: { systemInstruction: systemPrompt }
    });

    res.json({ text: response.text });
  } catch (error) {
    console.error("Gemini Error:", error);
    res.status(500).json({ message: 'AI Service Error' });
  }
});

// 5. Seeding Route
app.post('/api/seed', async (req, res) => {
  try {
    await Chapter.deleteMany({});
    await Quiz.deleteMany({});

    await Chapter.insertMany(CHAPTERS);
    await Quiz.insertMany(QUIZZES);

    res.json({ message: 'Database seeded successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// --- DEPLOYMENT CONFIGURATION ---
// Serve static assets if in production
if (process.env.NODE_ENV === 'production') {
  // Set static folder (Assuming frontend build is in 'client/dist' or similar)
  // Adjust '../dist' based on where your built React files are located
  app.use(express.static(path.join(__dirname, '../dist')));

  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../dist', 'index.html'));
  });
}

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
