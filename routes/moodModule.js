// backend/routes/moodModule.js
import express from 'express';
import admin from '../firebaseAdmin.js';
import db from '../firebase.js';

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
    const snapshot = await db
      .collection('moods')
      .where('uid', '==', req.user.uid)
      .orderBy('date', 'desc')
      .get();

    const moods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(moods);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST mood
router.post('/', verifyFirebaseToken, async (req, res) => {
  const { mood, note, intensity } = req.body;
  const uid = req.user.uid;
  const date = new Date().toISOString().split('T')[0];

  try {
    const newMood = {
      uid,
      mood,
      note,
      intensity,
      date,
    };
    const ref = await db.collection('moods').add(newMood);
    res.status(201).json({ id: ref.id, ...newMood });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET mood for a specific date
router.get('/:date', verifyFirebaseToken, async (req, res) => {
  const { date } = req.params;
  const uid = req.user.uid;

  try {
    const snapshot = await db
      .collection('moods')
      .where('uid', '==', uid)
      .where('date', '==', date)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ message: 'No mood data found for this date' });
    }

    const doc = snapshot.docs[0];
    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT (update mood for a specific date)
router.put('/', verifyFirebaseToken, async (req, res) => {
  const { mood, note, intensity, date } = req.body;
  const uid = req.user.uid;

  if (!date) return res.status(400).json({ error: 'Date is required' });

  try {
    const snapshot = await db
      .collection('moods')
      .where('uid', '==', uid)
      .where('date', '==', date)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ error: 'Mood entry not found for the specified date' });
    }

    const doc = snapshot.docs[0];
    await db.collection('moods').doc(doc.id).update({ mood, note, intensity });

    res.json({ id: doc.id, mood, note, intensity, date, uid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
