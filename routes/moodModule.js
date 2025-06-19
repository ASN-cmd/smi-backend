import express from 'express';
import Mood from '../models/Mood.js';
import admin from '../firebaseAdmin.js';

const router = express.Router();

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

// GET mood history
router.get('/', verifyFirebaseToken, async (req, res) => {
  try {
    const moods = await Mood.find({ uid: req.user.uid }).sort({ date: -1 });
    res.json(moods);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST mood (new entry)
router.post('/', verifyFirebaseToken, async (req, res) => {
  const { mood, note, intensity } = req.body;
  const uid = req.user.uid;

  try {
    const newEntry = new Mood({
      uid,
      mood,
      note,
      intensity,
      date: new Date().toISOString().split('T')[0], // just the date part
    });
    await newEntry.save();
    res.status(201).json(newEntry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET mood for a specific date
router.get('/:date', verifyFirebaseToken, async (req, res) => {
  const { date } = req.params;
  const uid = req.user.uid;

  try {
    const moodEntry = await Mood.findOne({ uid, date });
    if (!moodEntry) {
      return res.status(404).json({ message: 'No mood data found for this date' });
    }
    res.json(moodEntry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ✅ PUT mood (update today’s entry)
router.put('/', verifyFirebaseToken, async (req, res) => {
  const { mood, note, intensity, date } = req.body;
  const uid = req.user.uid;

  if (!date) return res.status(400).json({ error: 'Date is required to update mood' });

  try {
    const updated = await Mood.findOneAndUpdate(
      { uid, date },
      { mood, note, intensity },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: 'Mood entry not found for the specified date' });
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
