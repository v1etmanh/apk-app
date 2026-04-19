// metro.config.js — Expo SDK 54 / React Native 0.77
// Fix: "Cannot use 'import.meta' outside a module"
// Root cause: Metro was resolving zustand's ESM .mjs files instead of CJS entries

const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// 1. Ép Metro ưu tiên 'react-native' condition trong package exports
//    Zustand 4.5.x: 'react-native' -> ./index.js (CJS, no import.meta)
//    Không có config này Metro chọn 'import' -> ./esm/index.mjs (có import.meta -> crash)
config.resolver.unstable_conditionNames = [
  'react-native',
  'require',
  'default',
];

// 2. Đảm bảo .mjs không được resolve trước .js
config.resolver.sourceExts = [
  'js',
  'jsx',
  'ts',
  'tsx',
  'json',
  'cjs',
  'mjs',
];

module.exports = config;
