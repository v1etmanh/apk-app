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
 * Chờ Firebase Auth SDK restore session từ AsyncStorage persistence.
 * Phải gọi trước bất kỳ Firestore read nào để tránh permission-denied khi app khởi động lại.
 * onAuthStateChanged fire 1 lần ngay khi SDK load xong (với currentUser hoặc null).
 */
function waitForFirebaseAuthReady(timeoutMs = 5000) {
  return new Promise((resolve) => {
    // Nếu SDK đã có user (hot reload / đã init xong), resolve ngay
    if (firebaseAuth.currentUser) { resolve(); return; }

    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) { settled = true; resolve(); } // timeout → không block app
    }, timeoutMs);

    const unsub = firebaseAuth.onAuthStateChanged(() => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        unsub();
        resolve();
      }
    });
  });
}

/**
 * Đảm bảo Firebase có anonymous session → Firestore Rules (request.auth != null) pass.
 * Gọi 1 lần trong initializeApp() của App.js sau khi Supabase session active.
 * KHÔNG ảnh hưởng đến Supabase auth — hoàn toàn độc lập.
 *
 * Flow khi mở lại app:
 *   1. waitForFirebaseAuthReady() — chờ SDK đọc token từ AsyncStorage persistence
 *   2. Nếu currentUser đã có (token còn hạn) → xong
 *   3. Nếu không → signInAnonymously để tạo session mới
 */
export async function ensureFirebaseAuth() {
  try {
    // Bước 1: chờ SDK restore persisted session (quan trọng khi restart app)
    await waitForFirebaseAuthReady();

    // Bước 2: nếu sau khi chờ vẫn chưa có user → tạo anonymous session mới
    if (firebaseAuth.currentUser) {
      if (__DEV__) console.log('[Firebase] Auth ready — user:', firebaseAuth.currentUser.uid.slice(0,8));
      return;
    }

    await signInAnonymously(firebaseAuth);
    if (__DEV__) console.log('[Firebase] Anonymous auth OK — new session');
  } catch (e) {
    console.warn('[Firebase] ensureFirebaseAuth failed:', e.message);
  }
}
