import mongoose from 'mongoose';

const DailyActivitySchema = new mongoose.Schema({
  uid: {
    type: String,
    required: true, // Ensures that every record is linked to a user
  },
  date: {
    type: String,
    required: true,
  },
  waterIntake: {
    type: Number,
    default: 0,
  },
  meals: [
    {
      time: {
        type: String,
        required: true,
      },
      description: {
        type: String,
        required: true,
      },
    },
  ],
  sleep: {
    bedtime: {
      type: String,
      required: true,
    },
    wakeup: {
      type: String,
      required: true,
    },
    duration: {
      type: Number,
      required: true,
    },
  },
  weeklyStats: {
    water: [
      {
        day: String,
        value: Number,
      },
    ],
    meals: [
      {
        day: String,
        value: Number,
      },
    ],
    sleep: [
      {
        day: String,
        value: Number,
      },
    ],
  },
  activity: [
    {
      type: { type: String, required: true },
      description: { type: String },
      duration: { type: Number },
    },
  ],
});

// module.exports = mongoose.model('DailyActivity', DailyActivitySchema);
export default mongoose.model('DailyActivity', DailyActivitySchema);
