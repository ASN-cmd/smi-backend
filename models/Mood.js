import mongoose from 'mongoose';

const moodSchema = new mongoose.Schema({
  uid: { type: String, required: true },
  date: { type: String, required: true }, // ISO string (e.g., '2025-06-19')
  mood: { type: String, required: true },
  intensity: { type: Number, required: true },
  note: { type: String }
});

// Ensure only 1 entry per user per date
moodSchema.index({ userId: 1, date: 1 }, { unique: true });

// module.exports = mongoose.model('Mood', moodSchema);
export default mongoose.model('Mood', moodSchema);
