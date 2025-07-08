import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import moodRoutes from './routes/moodModule.js';
import mediaRoutes from './routes/media.js';
import contentAssessmentRoutes from './routes/contentAssessment.js';
import DailyActivityService from './models/DailyActivity.js';
import admin from './firebaseAdmin.js';
import classRoutes from './routes/class.js';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: ['http://localhost:8081', 'http://192.168.7.10:8081', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/module/mood', moodRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/content-assessment', contentAssessmentRoutes);
app.use('/api/class', classRoutes);

// Middleware to verify Firebase token
const verifyFirebaseToken = async (req, res, next) => {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) return res.status(401).json({ error: 'Token missing' });

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Daily Activity Routes
app.post('/daily-activity', verifyFirebaseToken, async (req, res) => {
  try {
    const { waterIntake, meals, sleepTime, wakeTime, date } = req.body;
    const uid = req.user.uid;
    
    console.log('Received data:', req.body);

    if (!uid) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const activityData = {
      uid,
      date,
      waterIntake,
      meals,
      sleep: {
        bedtime: sleepTime,
        wakeup: wakeTime,
        duration: req.body.sleepDuration || 0
      }
    };

    // Check if activity exists for this date
    const existingActivity = await DailyActivityService.findByUidAndDate(uid, date);
    
    let savedActivity;
    if (existingActivity) {
      // Update existing activity
      savedActivity = await DailyActivityService.update(existingActivity.id, activityData);
      res.status(200).json({ 
        message: 'Daily activity updated!', 
        dailyActivity: savedActivity 
      });
    } else {
      // Create new activity
      savedActivity = await DailyActivityService.create(activityData);
      res.status(201).json({ 
        message: 'Daily activity created!', 
        dailyActivity: savedActivity 
      });
    }
  } catch (err) {
    console.error('Error saving daily activity:', err);
    res.status(500).json({ 
      error: err.message,
      details: err.stack
    });
  }
});

app.get('/daily-activity', verifyFirebaseToken, async (req, res) => {
  try {
    const uid = req.user.uid;

    if (!uid) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const activities = await DailyActivityService.findByUid(uid);
    res.status(200).json(activities);
  } catch (err) {
    console.error('Error fetching activities:', err);
    res.status(500).json({ 
      error: err.message,
      details: err.stack
    });
  }
});

// Health check route
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    database: 'Firebase Firestore'
  });
});

app.get('/', (req, res) => {
  res.send('🚀 SMI Backend is running on Render!');
});
// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔥 Using Firebase Firestore as database`);
});