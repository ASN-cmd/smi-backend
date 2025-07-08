import express from 'express';
import { ContentAssessmentService } from '../services/contentAssessment.js';
import FlaggedContentService from '../models/FlaggedContent.js';
import Joi from 'joi';

const router = express.Router();

// Validation schemas
const assessContentSchema = Joi.object({
  content: Joi.string().required().min(1).max(10000),
  contentType: Joi.string().valid('mood_entry', 'daily_activity', 'journal_entry', 'comment', 'other').default('other'),
  userId: Joi.string().required(),
  userEmail: Joi.string().email().required()
});

const updateFlaggedContentSchema = Joi.object({
  status: Joi.string().valid('pending', 'reviewed', 'resolved', 'false_positive').required(),
  adminNotes: Joi.string().max(1000).optional(),
  reviewedBy: Joi.string().required()
});

// Assess content and flag if necessary
router.post('/assess', async (req, res) => {
  try {
    const { error, value } = assessContentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { content, contentType, userId, userEmail } = value;

    // Assess content using LLM
    const assessment = await ContentAssessmentService.assessContent(content, contentType);

    // If content is flagged, save to database
    if (assessment.isFlagged) {
      const flaggedContent = await FlaggedContentService.create({
        userId,
        userEmail,
        contentType,
        originalContent: content,
        flaggedReason: assessment.reason || 'other',
        confidence: assessment.confidence,
        severity: assessment.severity,
        explanation: assessment.explanation
      });

      // Check if escalation is needed
      const shouldEscalate = ContentAssessmentService.shouldEscalate(assessment);

      return res.json({
        success: true,
        flagged: true,
        assessment,
        flaggedContentId: flaggedContent.id,
        shouldEscalate,
        message: 'Content flagged for admin review'
      });
    }

    return res.json({
      success: true,
      flagged: false,
      assessment,
      message: 'Content passed assessment'
    });

  } catch (error) {
    console.error('Content assessment error:', error);
    res.status(500).json({ error: 'Internal server error during content assessment' });
  }
});

// Get all flagged content (admin only)
router.get('/flagged', async (req, res) => {
  try {
    const { status, severity, page = 1, limit = 20 } = req.query;
    
    const filters = {};
    if (status) filters.status = status;
    if (severity) filters.severity = severity;

    const skip = (page - 1) * limit;
    const options = {
      limit: parseInt(limit),
      offset: skip
    };
    
    const flaggedContent = await FlaggedContentService.find(filters, options);
    const total = await FlaggedContentService.count(filters);

    res.json({
      success: true,
      data: flaggedContent,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get flagged content error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get flagged content by ID
router.get('/flagged/:id', async (req, res) => {
  try {
    const flaggedContent = await FlaggedContentService.findById(req.params.id);
    
    if (!flaggedContent) {
      return res.status(404).json({ error: 'Flagged content not found' });
    }

    res.json({
      success: true,
      data: flaggedContent
    });

  } catch (error) {
    console.error('Get flagged content by ID error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update flagged content status (admin only)
router.put('/flagged/:id', async (req, res) => {
  try {
    const { error, value } = updateFlaggedContentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { status, adminNotes, reviewedBy } = value;

    const flaggedContent = await FlaggedContentService.findById(req.params.id);
    
    if (!flaggedContent) {
      return res.status(404).json({ error: 'Flagged content not found' });
    }

    const updatedContent = await FlaggedContentService.update(req.params.id, {
      status,
      adminNotes,
      reviewedBy,
      reviewedAt: new Date()
    });

    res.json({
      success: true,
      data: updatedContent,
      message: 'Flagged content updated successfully'
    });

  } catch (error) {
    console.error('Update flagged content error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get flagged content statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await FlaggedContentService.getStats();
    const severityStats = await FlaggedContentService.getSeverityStats();
    const reasonStats = await FlaggedContentService.getReasonStats();

    res.json({
      success: true,
      data: {
        overview: stats,
        severityBreakdown: severityStats,
        reasonBreakdown: reasonStats
      }
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Batch assess multiple content items
router.post('/assess/batch', async (req, res) => {
  try {
    const { contentArray, contentType, userId, userEmail } = req.body;

    if (!Array.isArray(contentArray) || contentArray.length === 0) {
      return res.status(400).json({ error: 'Content array is required and must not be empty' });
    }

    if (contentArray.length > 10) {
      return res.status(400).json({ error: 'Maximum 10 items can be assessed at once' });
    }

    const assessments = await ContentAssessmentService.batchAssessContent(contentArray, contentType);
    const flaggedItems = [];

    // Save flagged content to database
    for (const item of assessments) {
      if (item.assessment.isFlagged) {
        const flaggedContent = await FlaggedContentService.create({
          userId,
          userEmail,
          contentType,
          originalContent: item.content,
          flaggedReason: item.assessment.reason || 'other',
          confidence: item.assessment.confidence,
          severity: item.assessment.severity,
          explanation: item.assessment.explanation
        });

        flaggedItems.push({
          content: item.content,
          assessment: item.assessment,
          flaggedContentId: flaggedContent.id
        });
      }
    }

    res.json({
      success: true,
      assessments,
      flaggedItems,
      totalFlagged: flaggedItems.length
    });

  } catch (error) {
    console.error('Batch assessment error:', error);
    res.status(500).json({ error: 'Internal server error during batch assessment' });
  }
});

export default router; 