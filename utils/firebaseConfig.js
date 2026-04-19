// utils/firebaseConfig.js
// Firebase JS SDK v11+ — hoạt động với Expo Go & New Architecture
// Lấy config tại: Firebase Console → Project Settings → Your apps → SDK setup

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, initializeFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCdBs-0aXwH3Y83FOYEMCva_v1bTdFXaAM",
  authDomain: "jpdweb-9d3d3.firebaseapp.com",
  projectId: "jpdweb-9d3d3",
  storageBucket: "jpdweb-9d3d3.firebasestorage.app",
  messagingSenderId: "278913880737",
  appId: "1:278913880737:web:51842f03526615535856e0",
  measurementId: "G-EKPBVXN961"
};

// Tránh init nhiều lần khi hot-reload
const isFirstInit = getApps().length === 0;
const app = isFirstInit ? initializeApp(firebaseConfig) : getApp();

// initializeFirestore chỉ được gọi đúng 1 lần (lần đầu tiên)
// experimentalForceLongPolling: true giúp hoạt động ổn định trên React Native / Expo
export const firestore = isFirstInit
  ? initializeFirestore(app, {
      experimentalForceLongPolling: true,
    })
  : getFirestore(app);
