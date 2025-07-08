import db from '../firebase.js';

class FlaggedContentService {
  static collection = 'flagged_content';

  // Validation schema (replaces Mongoose schema)
  static validateData(data) {
    const required = ['userId', 'userEmail', 'contentType', 'originalContent', 'flaggedReason', 'confidence', 'severity'];
    for (const field of required) {
      if (!data[field]) {
        throw new Error(`${field} is required`);
      }
    }

    // Validate enums
    const validContentTypes = ['mood_entry', 'daily_activity', 'journal_entry', 'comment', 'other'];
    const validReasons = ['self_harm', 'violence', 'inappropriate_language', 'bullying', 'mental_health_crisis', 'other'];
    const validSeverities = ['low', 'medium', 'high', 'critical'];
    const validStatuses = ['pending', 'reviewed', 'resolved', 'false_positive'];

    if (!validContentTypes.includes(data.contentType)) {
      throw new Error(`Invalid contentType. Must be one of: ${validContentTypes.join(', ')}`);
    }
    if (!validReasons.includes(data.flaggedReason)) {
      throw new Error(`Invalid flaggedReason. Must be one of: ${validReasons.join(', ')}`);
    }
    if (!validSeverities.includes(data.severity)) {
      throw new Error(`Invalid severity. Must be one of: ${validSeverities.join(', ')}`);
    }
    if (data.status && !validStatuses.includes(data.status)) {
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const validatedData = {
      userId: data.userId,
      userEmail: data.userEmail,
      contentType: data.contentType,
      originalContent: data.originalContent,
      flaggedReason: data.flaggedReason,
      confidence: Math.max(0, Math.min(1, data.confidence)), // Ensure 0-1 range
      severity: data.severity,
      status: data.status || 'pending',
      adminNotes: data.adminNotes || '',
      reviewedBy: data.reviewedBy || null,
      reviewedAt: data.reviewedAt || null,
      createdAt: data.createdAt || new Date(),
      updatedAt: new Date(),
    };

    return validatedData;
  }

  // Create new flagged content
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

  // Find with filters and pagination
  static async find(filters = {}, options = {}) {
    let query = db.collection(this.collection);

    // Apply filters
    if (filters.status) {
      query = query.where('status', '==', filters.status);
    }
    if (filters.severity) {
      query = query.where('severity', '==', filters.severity);
    }
    if (filters.userId) {
      query = query.where('userId', '==', filters.userId);
    }

    // Apply ordering
    query = query.orderBy('createdAt', 'desc');

    // Apply pagination
    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.offset) {
      query = query.offset(options.offset);
    }

    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  // Count documents with filters
  static async count(filters = {}) {
    let query = db.collection(this.collection);

    if (filters.status) {
      query = query.where('status', '==', filters.status);
    }
    if (filters.severity) {
      query = query.where('severity', '==', filters.severity);
    }

    const snapshot = await query.get();
    return snapshot.size;
  }

  // Update flagged content
  static async update(id, data) {
    const validatedData = this.validateData({ ...data, userId: 'temp', userEmail: 'temp', contentType: 'other', originalContent: 'temp', flaggedReason: 'other', confidence: 0.5, severity: 'low' });
    
    // Only update the fields that were actually provided
    const updateData = {};
    const allowedFields = ['status', 'adminNotes', 'reviewedBy', 'reviewedAt', 'updatedAt'];
    
    allowedFields.forEach(field => {
      if (data[field] !== undefined) {
        updateData[field] = validatedData[field];
      }
    });

    await db.collection(this.collection).doc(id).update(updateData);
    return await this.findById(id);
  }

  // Get statistics
  static async getStats() {
    const snapshot = await db.collection(this.collection).get();
    const docs = snapshot.docs.map(doc => doc.data());

    const stats = {
      total: docs.length,
      pending: docs.filter(doc => doc.status === 'pending').length,
      critical: docs.filter(doc => doc.severity === 'critical').length,
      high: docs.filter(doc => doc.severity === 'high').length,
    };

    return stats;
  }

  // Get severity statistics
  static async getSeverityStats() {
    const snapshot = await db.collection(this.collection).get();
    const docs = snapshot.docs.map(doc => doc.data());

    const severityStats = {};
    docs.forEach(doc => {
      severityStats[doc.severity] = (severityStats[doc.severity] || 0) + 1;
    });

    return Object.entries(severityStats).map(([severity, count]) => ({
      _id: severity,
      count
    }));
  }

  // Get reason statistics
  static async getReasonStats() {
    const snapshot = await db.collection(this.collection).get();
    const docs = snapshot.docs.map(doc => doc.data());

    const reasonStats = {};
    docs.forEach(doc => {
      reasonStats[doc.flaggedReason] = (reasonStats[doc.flaggedReason] || 0) + 1;
    });

    return Object.entries(reasonStats).map(([reason, count]) => ({
      _id: reason,
      count
    }));
  }

  // Delete flagged content
  static async delete(id) {
    await db.collection(this.collection).doc(id).delete();
    return { id, deleted: true };
  }
}

export default FlaggedContentService; 