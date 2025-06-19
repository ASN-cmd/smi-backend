import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import Mood from './models/Mood.js';
import moodRoutes from './routes/moodModule.js';
import DailyActivity from './models/DailyActivity.js';

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

app.use('/api/module/mood', moodRoutes);

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('✅ MongoDB connected');

    // Drop old index if it exists (ignore if not found)
    try {
      await DailyActivity.collection.dropIndex('date_1')
        .catch(err => {
          if (err.code !== 27) { // IndexNotFound
            console.error('❌ Error dropping old index:', err);
          }
        });

      // Create compound index (if not already exists)
      await DailyActivity.collection.createIndex(
        { uid: 1, date: 1 },
        { unique: true }
      ).catch(err => {
        if (err.code === 85) {
          console.warn('⚠️ Compound index already exists with a different name.');
        } else {
          throw err;
        }
      });

      console.log('✅ Index setup complete');
    } catch (err) {
      console.error('❌ Error managing indexes:', err);
    }
  })
  .catch(err => console.log('❌ MongoDB connection error:', err));

// Test route
app.post('/test', async (req, res) => {
  try {
    const user = new User({
      name: req.body.name,
      email: req.body.email
    });
    await user.save();
    res.status(201).json({ message: 'User saved!', user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Daily Activity Routes
app.post('/daily-activity', async (req, res) => {
  try {
    const { waterIntake, meals, sleepTime, wakeTime, date, uid } = req.body;
    console.log('Received data:', req.body);

    if (!uid) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    let dailyActivity = await DailyActivity.findOne({ uid, date });

    if (dailyActivity) {
      // Update existing activity
      dailyActivity.waterIntake = waterIntake;
      dailyActivity.meals = meals;
      dailyActivity.sleep = {
        bedtime: sleepTime,
        wakeup: wakeTime,
        duration: req.body.sleepDuration || dailyActivity.sleep?.duration || 0
      };
    } else {
      // Create new activity
      dailyActivity = new DailyActivity({
        uid,
        waterIntake,
        meals,
        sleep: {
          bedtime: sleepTime,
          wakeup: wakeTime,
          duration: req.body.sleepDuration || 0
        },
        date,
      });
    }

    const savedActivity = await dailyActivity.save();
    res.status(201).json({ 
      message: dailyActivity.isNew ? 'Daily activity created!' : 'Daily activity updated!', 
      dailyActivity: savedActivity 
    });
  } catch (err) {
    console.error('Error saving daily activity:', err);
    res.status(500).json({ 
      error: err.message,
      details: err.stack
    });
  }
});

app.get('/daily-activity', async (req, res) => {
  try {
    const { uid } = req.query;

    if (!uid) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const activities = await DailyActivity.find({ uid }).sort({ date: -1 });
    res.status(200).json(activities);
  } catch (err) {
    console.error('Error fetching activities:', err);
    res.status(500).json({ 
      error: err.message,
      details: err.stack
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});