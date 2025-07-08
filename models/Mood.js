import db from '../firebase.js';

class MoodService {
  static collection = 'moods';

  // Validation schema (replaces Mongoose schema)
  static validateData(data) {
    const required = ['uid', 'mood', 'date'];
    for (const field of required) {
      if (!data[field]) {
        throw new Error(`${field} is required`);
      }
    }

    const validatedData = {
      uid: data.uid,
      mood: data.mood,
      note: data.note || '',
      intensity: data.intensity || 1,
      date: data.date,
      createdAt: data.createdAt || new Date(),
      updatedAt: new Date(),
    };

    return validatedData;
  }

  // Create new mood entry
  static async create(data) {
    const validatedData = this.validateData(data);
    const docRef = await db.collection(this.collection).add(validatedData);
    return { id: docRef.id, ...validatedData };
  }

  // Find by ID
  static async findById(id) {
    const doc = await db.collection(this.collection).doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  }

  // Find moods by uid
  static async findByUid(uid, options = {}) {
    let query = db.collection(this.collection).where('uid', '==', uid);

    if (options.orderBy) {
      query = query.orderBy(options.orderBy.field, options.orderBy.direction || 'desc');
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  // Find mood by uid and date
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

  // Update mood
  static async update(id, data) {
    const updateData = {
      mood: data.mood,
      note: data.note,
      intensity: data.intensity,
      updatedAt: new Date(),
    };

    await db.collection(this.collection).doc(id).update(updateData);
    return await this.findById(id);
  }

  // Delete mood
  static async delete(id) {
    await db.collection(this.collection).doc(id).delete();
    return { id, deleted: true };
  }
}

export default MoodService;