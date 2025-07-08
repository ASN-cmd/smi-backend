import express from 'express';
import admin from '../firebaseAdmin.js'; // your existing service-account initialized admin sdk
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// const storage = admin.storage().bucket(); // default bucket (DISABLED)

const verifyFirebaseToken = async (req, res, next) => {
  const auth = req.headers.authorization?.split('Bearer ')[1];
  if (!auth) return res.status(401).json({ error: 'Token missing' });
  try {
    req.user = await admin.auth().verifyIdToken(auth);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Upload image endpoint
router.post(
  '/upload',
  verifyFirebaseToken,
  upload.single('file'),
  async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const uid = req.user.uid;
    const { title, description } = req.body;
    const file = req.file;
    const filename = `media/${uid}/${uuidv4()}_${file.originalname}`;
    // const fileHandle = storage.file(filename);
    const publicUrl = null; // No storage, so no URL

    try {
      // await fileHandle.save(file.buffer, {
      //   metadata: { contentType: file.mimetype },
      // });
      // await fileHandle.makePublic(); // Optional: or use signed URLs

      const doc = {
        uid,
        title: title || null,
        description: description || null,
        imageUrl: publicUrl,
        storagePath: null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      const firestore = admin.firestore();
      const snap = await firestore.collection('media').add(doc);

      res.status(201).json({ id: snap.id, ...doc });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  }
);

// List user media
router.get('/list', verifyFirebaseToken, async (req, res) => {
  const uid = req.user.uid;
  try {
    const snaps = await admin
      .firestore()
      .collection('media')
      .where('uid', '==', uid)
      .orderBy('createdAt', 'desc')
      .get();
    const list = snaps.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete media
router.delete('/:id', verifyFirebaseToken, async (req, res) => {
  const uid = req.user.uid;
  const id = req.params.id;
  const docRef = admin.firestore().collection('media').doc(id);

  try {
    const docSnap = await docRef.get();
    if (!docSnap.exists) return res.status(404).json({ error: 'Not found' });

    const data = docSnap.data();
    if (data.uid !== uid)
      return res.status(403).json({ error: 'Not your file' });
    
    // Delete from storage
    // await storage.file(data.storagePath).delete();
    // Delete Firestore doc
    await docRef.delete();

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
