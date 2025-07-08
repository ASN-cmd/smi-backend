# Firebase Setup Guide

This project has been converted to use Firebase Firestore exclusively. Here's how to set up your environment:

## Required Environment Variables

Create a `.env` file in the backend directory with the following variables:

```env
# Server Configuration
PORT=3000

# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-client-email@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com

# OpenAI Configuration (for content assessment)
OPENAI_API_KEY=your-openai-api-key
```

## Firebase Project Setup

1. Create a Firebase project at https://console.firebase.google.com/
2. Enable Firestore Database
3. Enable Firebase Storage (for media files)
4. Go to Project Settings > Service Accounts
5. Generate a new private key
6. Use the credentials in your `.env` file

## Firestore Collections

The application uses these Firestore collections:

- `moods` - User mood entries
- `daily_activities` - User daily activity data
- `flagged_content` - Content flagged by AI moderation
- `media` - User uploaded media files metadata

## Migration from MongoDB

All MongoDB/Mongoose logic has been removed and replaced with Firebase Firestore operations. The data models are now implemented as service classes with built-in validation.

## Key Changes

- Removed `mongoose` dependency
- Converted Mongoose schemas to Firebase service classes
- All CRUD operations now use Firestore
- Authentication uses Firebase ID tokens
- File storage uses Firebase Storage 