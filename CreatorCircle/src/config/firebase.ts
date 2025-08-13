import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

// Initialize Firebase app (reuse if already initialized)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Auth with React Native persistence.
// If Auth was already initialized (due to Fast Refresh), fall back to getAuth.
let authInstance: Auth;
try {
  authInstance = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (e) {
  authInstance = getAuth(app);
}

export const auth = authInstance;

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Firebase Storage
export const storage = getStorage(app);

export default app;
