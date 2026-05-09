// utils/firebaseConfig.js
// Firebase JS SDK v11+ — hoạt động với Expo Go & New Architecture
// Lấy config tại: Firebase Console → Project Settings → Your apps → SDK setup

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { initializeAuth, getReactNativePersistence, signInAnonymously, getAuth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyCdBs-0aXwH3Y83FOYEMCva_v1bTdFXaAM",
  authDomain: "jpdweb-9d3d3.firebaseapp.com",
  projectId: "jpdweb-9d3d3",
  storageBucket: "jpdweb-9d3d3.firebasestorage.app",
  messagingSenderId: "278913880737",
  appId: "1:278913880737:web:51842f03526615535856e0",
  measurementId: "G-EKPBVXN961"
};

const isFirstInit = getApps().length === 0;
const app = isFirstInit ? initializeApp(firebaseConfig) : getApp();

export const firestore = isFirstInit
  ? initializeFirestore(app, { experimentalForceLongPolling: true })
  : getFirestore(app);

// [AUD-003] Firebase Auth với React Native persistence — cần cho Firestore Rules
// initializeAuth chỉ gọi 1 lần (isFirstInit), getAuth cho các lần sau (hot-reload)
export const firebaseAuth = isFirstInit
  ? initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })
  : getAuth(app);

/**
 * Đảm bảo Firebase có anonymous session → Firestore Rules (request.auth != null) pass.
 * Gọi 1 lần trong initializeApp() của App.js sau khi Supabase session active.
 * KHÔNG ảnh hưởng đến Supabase auth — hoàn toàn độc lập.
 */
export async function ensureFirebaseAuth() {
  try {
    if (firebaseAuth.currentUser) return; // Đã có session rồi
    await signInAnonymously(firebaseAuth);
    if (__DEV__) console.log('[Firebase] Anonymous auth OK');
  } catch (e) {
    console.warn('[Firebase] ensureFirebaseAuth failed:', e.message);
  }
}
