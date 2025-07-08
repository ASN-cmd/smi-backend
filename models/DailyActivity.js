import db from '../firebase.js';

class DailyActivityService {
  static collection = 'daily_activities';

  // Validation schema (replaces Mongoose schema)
  static validateData(data) {
    const required = ['uid', 'date'];
    for (const field of required) {
      if (!data[field]) {
        throw new Error(`${field} is required`);
      }
    }

    // Validate data structure
    const validatedData = {
      uid: data.uid,
      date: data.date,
      waterIntake: data.waterIntake || 0,
      meals: data.meals || [],
      sleep: {
        bedtime: data.sleep?.bedtime || '',
        wakeup: data.sleep?.wakeup || '',
        duration: data.sleep?.duration || 0,
      },
      weeklyStats: data.weeklyStats || {
        water: [],
        meals: [],
        sleep: [],
      },
      activity: data.activity || [],
      createdAt: data.createdAt || new Date(),
      updatedAt: new Date(),
    };

    return validatedData;
  }

  // Create new daily activity
  static async create(data) {
    const validatedData = this.validateData(data);
    const docRef = await db.collection(this.collection).add(validatedData);
    return { id: docRef.id, ...validatedData };
  }

  // Find activity by uid and date
  static async findByUidAndDate(uid, date) {
    const snapshot = await db
      .collection(this.collection)
      .where('uid', '==', uid)
      .where('date', '==', date)
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  }

  // Find all activities by uid
  static async findByUid(uid) {
    const snapshot = await db
      .collection(this.collection)
      .where('uid', '==', uid)
      .orderBy('date', 'desc')
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  // Update existing activity
  static async update(id, data) {
    const validatedData = this.validateData(data);
    await db.collection(this.collection).doc(id).update(validatedData);
    return { id, ...validatedData };
  }

  // Update or create (upsert) activity
  static async upsert(uid, date, data) {
    const existing = await this.findByUidAndDate(uid, date);
    
    if (existing) {
      return await this.update(existing.id, { ...data, uid, date });
    } else {
      return await this.create({ ...data, uid, date });
    }
  }

  // Delete activity
  static async delete(id) {
    await db.collection(this.collection).doc(id).delete();
    return { id, deleted: true };
  }
}

export default DailyActivityService;
