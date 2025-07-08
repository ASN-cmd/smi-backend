// import OpenAI from 'openai';
// import dotenv from 'dotenv';
// dotenv.config();

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

// Content assessment configuration
// const ASSESSMENT_PROMPT = `...`;

export class ContentAssessmentService {
  static async assessContent(content, contentType = 'general') {
    // MOCK: Always return not flagged
    return {
      isFlagged: false,
      reason: null,
      confidence: 1.0,
      severity: 'low',
      explanation: 'LLM assessment is disabled (no API key present)'
    };
  }

  static async batchAssessContent(contentArray, contentType = 'general') {
    const assessments = [];
    for (const content of contentArray) {
      const assessment = await this.assessContent(content, contentType);
      assessments.push({
        content,
        assessment
      });
    }
    return assessments;
  }

  static getSeverityLevel(severity) {
    const levels = {
      'low': 1,
      'medium': 2,
      'high': 3,
      'critical': 4
    };
    return levels[severity] || 1;
  }

  static shouldEscalate(assessment) {
    return false; // No escalation in mock mode
  }
} 