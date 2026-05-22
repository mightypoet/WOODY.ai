import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Load from JSON file if it exists, otherwise use environment variables
// This is a Vite-specific way to handle optional files without breaking the build
const configs = import.meta.glob('../firebase-applet-config.json', { eager: true, import: 'default' });
const jsonConfig = (configs['../firebase-applet-config.json'] as any) || {};

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || jsonConfig.apiKey || "AIzaSyA5mXvdcu9TyRlWMX05KE8uAVJwx3XRtmE",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || jsonConfig.authDomain || "gen-lang-client-0925881828.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || jsonConfig.projectId || "gen-lang-client-0925881828",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || jsonConfig.storageBucket || "gen-lang-client-0925881828.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || jsonConfig.messagingSenderId || "469639958302",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || jsonConfig.appId || "1:469639958302:web:967b4e96925d25b54c830f",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || jsonConfig.measurementId,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || jsonConfig.firestoreDatabaseId
};

const app = initializeApp(firebaseConfig);
export const db = firebaseConfig.firestoreDatabaseId 
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);
export const auth = getAuth(app);
