// backend/models/Mood.js
import mongoose from 'mongoose';

const moodSchema = new mongoose.Schema({
  uid: { type: String, required: true },  // Firebase UID
  mood: { type: String, required: true },
  note: { type: String },
  intensity: { type: Number, default: 3 },  // Add this line
  date: { type: Date, default: Date.now }
});

export default mongoose.model('Mood', moodSchema);
