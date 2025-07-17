import express from 'express';
import twilio from 'twilio';
import admin from '../firebaseAdmin.js';

const router = express.Router();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = process.env.TWILIO_PHONE;
const adminPhone = process.env.ADMIN_PHONE;

const client = twilio(accountSid, authToken);

// Middleware to verify Firebase token (reuse from server.js)
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

router.post('/notify', verifyFirebaseToken, async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.user.uid;

    // Optionally fetch user email
    let userEmail = '';
    try {
      const userRecord = await admin.auth().getUser(userId);
      userEmail = userRecord.email || '';
    } catch (e) {}

    const smsBody = `🚨 Emergency Alert!\nUser ID: ${userId}\nEmail: ${userEmail}\nMessage: ${message}`;

    await client.messages.create({
      body: smsBody,
      from: twilioPhone,
      to: adminPhone
    });

    res.status(200).json({ success: true, message: 'Admin notified via SMS.' });
  } catch (err) {
    console.error('Error sending SMS:', err);
    res.status(500).json({ error: 'Failed to send SMS notification.' });
  }
});

export default router;