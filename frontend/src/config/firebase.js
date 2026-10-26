import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Client-side Firebase configuration
// Replace with your project's configuration from Firebase Console -> Project Settings -> General
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSy...",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "multiple-mail-1ce3e.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "multiple-mail-1ce3e",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "multiple-mail-1ce3e.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "782542098396",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ""
};

let app = null;
let auth = null;
let db = null;

try {
  if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY") {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    console.log("🔥 Client Firebase SDK initialized.");
  }
} catch (err) {
  console.warn("Client Firebase initialization skipped:", err.message);
}

export { app, auth, db };
