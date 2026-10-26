const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

let firestoreDb = null;
let firebaseAuth = null;
let isFirebaseInitialized = false;

const initFirebase = () => {
  if (isFirebaseInitialized) {
    return { db: firestoreDb, auth: firebaseAuth, isConfigured: true };
  }

  try {
    // 1. Check for serviceAccountKey.json file
    const rawPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || 'serviceAccountKey.json';
    const possiblePaths = [
      path.isAbsolute(rawPath) ? rawPath : path.resolve(process.cwd(), rawPath),
      path.resolve(__dirname, '../../serviceAccountKey.json'),
      path.resolve(__dirname, '../../../serviceAccountKey.json'),
      path.resolve(process.cwd(), 'backend/serviceAccountKey.json')
    ];

    let serviceAccountPath = null;
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        serviceAccountPath = p;
        break;
      }
    }

    if (serviceAccountPath) {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL
      });
      firestoreDb = admin.firestore();
      firebaseAuth = admin.auth();
      isFirebaseInitialized = true;
      console.log(`🔥 Firebase Admin initialized successfully using: ${path.basename(serviceAccountPath)}`);
      return { db: firestoreDb, auth: firebaseAuth, isConfigured: true };
    }

    // 2. Check for individual environment variables
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey
        }),
        databaseURL: process.env.FIREBASE_DATABASE_URL
      });
      firestoreDb = admin.firestore();
      firebaseAuth = admin.auth();
      isFirebaseInitialized = true;
      console.log(`🔥 Firebase Admin initialized for project: ${process.env.FIREBASE_PROJECT_ID}`);
      return { db: firestoreDb, auth: firebaseAuth, isConfigured: true };
    }

    // 3. Fallback when credentials are not yet added
    console.warn('⚠️ Firebase credentials not found. To connect your live Firebase project:');
    console.warn('   1. Place your "serviceAccountKey.json" in the backend directory, OR');
    console.warn('   2. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY in .env');

    return { db: null, auth: null, isConfigured: false };
  } catch (err) {
    console.error('🔥 Firebase initialization error:', err.message);
    return { db: null, auth: null, isConfigured: false, error: err.message };
  }
};

module.exports = {
  admin,
  initFirebase,
  getFirestore: () => firestoreDb,
  getAuth: () => firebaseAuth
};
