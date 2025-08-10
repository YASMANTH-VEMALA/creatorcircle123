import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAjfvtu9SjMtjZd1Kut82SimykK7GZIreM",
  authDomain: "demoproject-13b80.firebaseapp.com",
  projectId: "demoproject-13b80",
  storageBucket: "demoproject-13b80.firebasestorage.app",
  messagingSenderId: "744259896450",
  appId: "1:744259896450:web:85ee43637dda003ae8e09b",
  measurementId: "G-38MLN40P23"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Firebase Storage
export const storage = getStorage(app);

export default app;
