import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
const firebaseConfig = {
  apiKey: "AIzaSyBHpCsohDhbZb96RRaOW6LAemagUeFp8UY",
  authDomain: "woody-93acf.firebaseapp.com",
  projectId: "woody-93acf",
  storageBucket: "woody-93acf.firebasestorage.app",
  messagingSenderId: "289384524127",
  appId: "1:289384524127:web:909a07d19b50927fe26eea",
  measurementId: "G-7R712523CF"
};

const app = initializeApp(firebaseConfig);
let analytics = null;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

export const auth = getAuth(app);
export const db = getFirestore(app);
