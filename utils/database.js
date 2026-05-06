// utils/database.js
// Firebase Firestore replacement cho expo-sqlite
// Giữ nguyên interface: initDB(), và db object với các method tương thích

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import {
  doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc,
  collection, query, where, orderBy, limit,
  getDocs, serverTimestamp,
} from 'firebase/firestore';
import { firestore } from './firebaseConfig';

// ─── Device ID (thay cho user auth) ───────────────────────────────────────────
// Mỗi máy có 1 deviceId duy nhất, dùng làm "user namespace" trên Firestore
let _deviceId = null;

export async function getDeviceId() {
  if (_deviceId) return _deviceId;

  // [FIX ID-M003] Dùng SecureStore thay AsyncStorage để bảo vệ deviceId
  // SecureStore = encrypted storage (Keystore/Keychain) — không đọc được qua ADB/root
  let id = await SecureStore.getItemAsync('device_id');

  if (!id) {
    // [FIX ID-M002] Migration: nếu đã có deviceId cũ trong AsyncStorage → migrate sang SecureStore
    const legacy = await AsyncStorage.getItem('device_id');
    if (legacy) {
      id = legacy;
      await SecureStore.setItemAsync('device_id', id);
      await AsyncStorage.removeItem('device_id'); // dọn legacy
    } else {
      // [FIX ID-M002] Dùng Crypto.randomUUID() thay Math.random() — CSPRNG, entropy 122 bits
      id = Crypto.randomUUID();
      await SecureStore.setItemAsync('device_id', id);
    }
  }

  _deviceId = id;
  return id;
}

// ─── Cấu trúc collection trên Firestore ───────────────────────────────────────
// profiles/{deviceId}                          ← personal_profile
// body_metrics/{deviceId}/entries/{autoId}     ← body_metrics
// allergies/{deviceId}/items/{allergyKey}      ← allergy_list
// settings/{deviceId}/kv/{key}                 ← settings_kv
// sessions/{deviceId}/records/{autoId}         ← recommendation_sessions
// sessions/{deviceId}/records/{sessionId}/dishes/{autoId}  ← recommended_dishes
// feedback/{deviceId}/items/{autoId}           ← dish_feedback
// weather_cache/{gridKey}                      ← weather_cache_local (shared)

function profileRef(deviceId)      { return doc(firestore, 'profiles', deviceId); }
function metricsCol(deviceId)      { return collection(firestore, 'body_metrics', deviceId, 'entries'); }
function allergiesCol(deviceId)    { return collection(firestore, 'allergies', deviceId, 'items'); }
function allergyRef(deviceId, key) { return doc(firestore, 'allergies', deviceId, 'items', key); }
function settingsRef(deviceId, k)  { return doc(firestore, 'settings', deviceId, 'kv', k); }
function sessionsCol(deviceId)     { return collection(firestore, 'sessions', deviceId, 'records'); }
function sessionRef(deviceId, sid) { return doc(firestore, 'sessions', deviceId, 'records', sid); }
function dishesCol(deviceId, sid)  { return collection(firestore, 'sessions', deviceId, 'records', sid, 'dishes'); }
function feedbackCol(deviceId)     { return collection(firestore, 'feedback', deviceId, 'items'); }
function weatherRef(gridKey)       { return doc(firestore, 'weather_cache', gridKey); }

// ─── initDB  (không cần tạo table, Firestore tự tạo) ─────────────────────────
export async function initDB() {
  await getDeviceId(); // đảm bảo deviceId tồn tại
  if (__DEV__) console.log('[DB] Firebase Firestore ready. deviceId:', _deviceId);
}

// ─── Timeout helper — Firestore call không được block >5s ─────────────────────
// FIX (Logic): reject thay vì resolve để caller phân biệt được timeout vs data null thật.
function withTimeout(promise, ms = 5000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => {
        const err = new Error('[DB] Firestore timeout');
        err.isTimeout = true;
        reject(err);
      }, ms)
    ),
  ]);
}

// Wrapper cho những nơi cần graceful fallback thay vì throw.
async function withTimeoutFallback(promise, ms = 5000, fallback = null) {
  try {
    return await withTimeout(promise, ms);
  } catch (e) {
    console.warn('[DB] withTimeoutFallback:', e.message);
    return fallback;
  }
}

// ─── PROFILE ──────────────────────────────────────────────────────────────────
export async function saveProfile(data) {
  const id = await getDeviceId();
  await setDoc(profileRef(id), { ...data, updated_at: new Date().toISOString() }, { merge: true });
}

export async function loadProfile() {
  const id = await getDeviceId();
  const snap = await withTimeoutFallback(getDoc(profileRef(id)), 5000, null);
  return snap && snap.exists() ? { id: 1, ...snap.data() } : null;
}

// ─── BODY METRICS ─────────────────────────────────────────────────────────────
export async function saveBodyMetrics(data) {
  const id = await getDeviceId();
  const ref = await addDoc(metricsCol(id), { ...data, measured_at: data.measured_at || new Date().toISOString() });
  return ref.id;
}

export async function loadLatestMetrics() {
  const id = await getDeviceId();
  const q = query(metricsCol(id), orderBy('measured_at', 'desc'), limit(1));
  const snap = await withTimeoutFallback(getDocs(q), 5000, null);
  if (!snap || snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

// FIX (Hiệu suất): thêm limit(100) tránh fetch không giới hạn khi user dùng lâu dài.
export async function loadAllMetrics(limitCount = 100) {
  const id = await getDeviceId();
  const q = query(metricsCol(id), orderBy('measured_at', 'desc'), limit(limitCount));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ─── ALLERGIES ────────────────────────────────────────────────────────────────
export async function addAllergy(allergyKey, displayName) {
  const id = await getDeviceId();
  await setDoc(allergyRef(id, allergyKey), {
    allergy_key: allergyKey,
    display_name: displayName,
    added_at: new Date().toISOString(),
  });
}

export async function removeAllergy(allergyKey) {
  const id = await getDeviceId();
  await deleteDoc(allergyRef(id, allergyKey));
}

export async function loadAllergies() {
  const id = await getDeviceId();
  const snap = await withTimeoutFallback(getDocs(allergiesCol(id)), 5000, null);
  if (!snap) return [];
  return snap.docs.map(d => d.data());
}

// ─── SETTINGS KV ──────────────────────────────────────────────────────────────
export async function setSetting(key, value) {
  await AsyncStorage.setItem(`setting_${key}`, String(value));
  
  try {
    const id = await getDeviceId();
    await setDoc(settingsRef(id, key), { key, value: String(value) });
    // [FIX ID-M004] guard __DEV__ — không log setting key trong production
    if (__DEV__) console.log('[DB] setSetting Firestore OK:', key);
  } catch (e) {
    // In toàn bộ error, không chỉ e.code
    console.warn('[DB] setSetting Firestore FAILED:', JSON.stringify(e), e.message);
  }
}

export async function getSetting(key) {
   const local = await AsyncStorage.getItem(`setting_${key}`);
  if (local !== null) return local;
  // 2. Fallback lên Firestore
  const id = await getDeviceId();
  const snap = await withTimeoutFallback(getDoc(settingsRef(id, key)), 5000, null);
  return snap && snap.exists() ? snap.data().value : null;
}

// ─── RECOMMENDATION SESSIONS ──────────────────────────────────────────────────
export async function saveSession(sessionData) {
  const id = await getDeviceId();
  const ref = await addDoc(sessionsCol(id), {
    ...sessionData,
    created_at: sessionData.created_at || new Date().toISOString(),
    synced_to_server: 0,
  });
  return ref.id;
}

export async function loadSessions(limitCount = 20) {
  const id = await getDeviceId();
  const q = query(sessionsCol(id), orderBy('created_at', 'desc'), limit(limitCount));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function loadSessionById(sessionId) {
  const id = await getDeviceId();
  const snap = await getDoc(sessionRef(id, sessionId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// ─── RECOMMENDED DISHES ───────────────────────────────────────────────────────
export async function saveDishesToSession(sessionId, dishes) {
  const id = await getDeviceId();
  const col = dishesCol(id, sessionId);
  const promises = dishes.map(dish => addDoc(col, dish));
  await Promise.all(promises);
}

export async function loadDishesBySession(sessionId) {
  const id = await getDeviceId();
  const q = query(dishesCol(id, sessionId), orderBy('rank', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ─── DISH FEEDBACK ────────────────────────────────────────────────────────────
export async function saveFeedback(feedbackData) {
  const id = await getDeviceId();
  const ref = await addDoc(feedbackCol(id), {
    ...feedbackData,
    feedback_at: feedbackData.feedback_at || new Date().toISOString(),
    synced_to_server: 0,
  });
  return ref.id;
}

export async function loadFeedbackBySession(sessionId) {
  const id = await getDeviceId();
  const q = query(feedbackCol(id), where('session_id', '==', sessionId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * F04 — Anti-repetition: lấy danh sách dish_id đã xuất hiện trong n session gần nhất.
 * Trả về mảng dish_id (string), ordered gần nhất → xa nhất (tối đa 30 dishes).
 * @param {number} nSessions - số session gần nhất cần lookback (mặc định 3)
 */
/**
 * F04 — Anti-repetition: lấy danh sách dish_id đã xuất hiện trong n session gần nhất.
 * FIX (Hiệu suất): Promise.all để fetch dishes song song thay vì await tuần tự —
 * giảm từ ~1500ms → ~500ms với 3 sessions (mỗi Firestore round-trip ~200–500ms).
 */
export async function getRecentDishIds(nSessions = 3) {
  try {
    const id = await getDeviceId();
    const q = query(sessionsCol(id), orderBy('created_at', 'desc'), limit(nSessions));
    const sessSnap = await withTimeoutFallback(getDocs(q), 6000, null);
    if (!sessSnap || sessSnap.empty) return [];

    // Fetch tất cả dishes song song
    const dishSnaps = await Promise.all(
      sessSnap.docs.map(sessionDoc => {
        const dishQ = query(dishesCol(id, sessionDoc.id), orderBy('rank', 'asc'));
        return withTimeoutFallback(getDocs(dishQ), 5000, null);
      })
    );

    const seenIds = new Set();
    const allDishIds = [];
    for (const dishSnap of dishSnaps) {
      if (!dishSnap) continue;
      for (const d of dishSnap.docs) {
        const dishId = String(d.data().dish_id || '');
        if (dishId && !seenIds.has(dishId)) {
          seenIds.add(dishId);
          allDishIds.push(dishId);
        }
      }
    }
    return allDishIds.slice(0, 30);
  } catch (e) {
    console.warn('[DB] getRecentDishIds error:', e);
    return [];
  }
}
// ─── WEATHER CACHE ────────────────────────────────────────────────────────────
// Dùng AsyncStorage làm primary cache (instant, offline-safe)
// Firestore chỉ dùng để sync nếu cần — không block pipeline chính

const WEATHER_CACHE_PREFIX = 'weather_cache_';

export async function getWeatherCache(gridKey) {
  try {
    // Ưu tiên AsyncStorage — không cần network, không hang
    const raw = await AsyncStorage.getItem(WEATHER_CACHE_PREFIX + gridKey);
    if (raw) {
      const data = JSON.parse(raw);
      if (new Date(data.expires_at) > new Date()) return data;
    }
  } catch (e) {
    console.warn('[WeatherCache] AsyncStorage read error:', e);
  }
  return null;
}

export async function setWeatherCache(gridKey, weatherData, ttlMinutes = 30) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000);
  const payload = {
    grid_key:   gridKey,
    ...weatherData,
    fetched_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
  };
  try {
    await AsyncStorage.setItem(WEATHER_CACHE_PREFIX + gridKey, JSON.stringify(payload));
  } catch (e) {
    console.warn('[WeatherCache] AsyncStorage write error:', e);
  }
}

// ─── INGREDIENTS REF (read-only — seed từ server, dùng cho MarketBasket) ─────
// Collection: ingredients_ref/{ingredientId}
function ingredientsCol() { return collection(firestore, 'ingredients_ref'); }

export async function loadIngredientCategories() {
  const snap = await getDocs(ingredientsCol());
  const cats = new Set();
  snap.docs.forEach(d => { if (d.data().category) cats.add(d.data().category); });
  return Array.from(cats).sort().map(c => ({ category: c }));
}

export async function loadIngredientsByCategories(categoryKeys) {
  if (!categoryKeys || categoryKeys.length === 0) return [];
  // Firestore 'in' max 10 giá trị — chunk nếu nhiều hơn
  const results = [];
  for (let i = 0; i < categoryKeys.length; i += 10) {
    const chunk = categoryKeys.slice(i, i + 10);
    const q = query(ingredientsCol(), where('category', 'in', chunk), orderBy('name'));
    const snap = await getDocs(q);
    snap.docs.forEach(d => results.push({ id: d.id, ...d.data() }));
  }
  return results;
}

// FIX (Hiệu suất): TTL-based cache invalidation cho _ingredientCache.
// Cache sống tối đa 30 phút. Gọi invalidateIngredientCache() khi data thay đổi server-side.
const INGREDIENT_CACHE_TTL_MS = 30 * 60 * 1000;
let _ingredientCache = null;
let _ingredientCacheAt = 0;

export function invalidateIngredientCache() {
  _ingredientCache = null;
  _ingredientCacheAt = 0;
}

export async function loadAllIngredients() {
  const now = Date.now();
  if (_ingredientCache && now - _ingredientCacheAt < INGREDIENT_CACHE_TTL_MS) {
    return _ingredientCache;
  }
  const snap = await getDocs(ingredientsCol());
  _ingredientCache = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'vi'));
  _ingredientCacheAt = now;
  return _ingredientCache;
}

// ─── CHALLENGE HISTORY ────────────────────────────────────────────────────────
// Lưu local bằng AsyncStorage (offline-safe). Firestore sync optional.
const CHALLENGE_PREFIX = 'challenge_history_';

// FIX (Logic): atomic check-and-set — chỉ ghi record nếu chưa tồn tại,
// tránh race condition khi useFocusEffect gọi 2 lần trước khi check hoàn thành.
export async function saveChallengeHistory({ challenge_date, dish_id, dish_title }) {
  const key = CHALLENGE_PREFIX + challenge_date;
  const existing = await AsyncStorage.getItem(key);
  if (existing) {
    // Record đã tồn tại — không ghi đè, trả lại record cũ
    return JSON.parse(existing);
  }
  const record = { challenge_date, dish_id, dish_title, completed: 0, completed_at: null };
  await AsyncStorage.setItem(key, JSON.stringify(record));
  return record;
}

export async function markChallengeCompleted(challenge_date) {
  const key = CHALLENGE_PREFIX + challenge_date;
  try {
    const raw = await AsyncStorage.getItem(key);
    const record = raw ? JSON.parse(raw) : { challenge_date, dish_id: '', dish_title: '', completed: 0 };
    record.completed    = 1;
    record.completed_at = new Date().toISOString();
    await AsyncStorage.setItem(key, JSON.stringify(record));
    return record;
  } catch (e) {
    console.warn('[ChallengeHistory] markCompleted error:', e);
    return null;
  }
}

export async function loadChallengeHistory(limitCount = 30) {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const challengeKeys = keys.filter(k => k.startsWith(CHALLENGE_PREFIX))
      .sort().reverse().slice(0, limitCount);
    if (!challengeKeys.length) return [];
    const pairs = await AsyncStorage.multiGet(challengeKeys);
    return pairs.map(([, v]) => v ? JSON.parse(v) : null).filter(Boolean);
  } catch (e) {
    console.warn('[ChallengeHistory] load error:', e);
    return [];
  }
}

export async function getChallengeDateRecord(challenge_date) {
  try {
    const raw = await AsyncStorage.getItem(CHALLENGE_PREFIX + challenge_date);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

// FIX (Logic): kiểm tra hôm nay trước (i=0), không bỏ qua ngày hiện tại.
// Tránh streak = 0 khi user vừa hoàn thành challenge hôm nay nhưng chưa làm hôm qua.
export async function computeStreak() {
  const history = await loadChallengeHistory(60);
  const completedSet = new Set(history.filter(r => r.completed).map(r => r.challenge_date));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i <= 60; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10).replace(/-/g, '');
    if (completedSet.has(dateStr)) {
      streak++;
    } else {
      // Hôm nay chưa làm thì không phạt — tiếp tục kiểm tra từ hôm qua
      if (i === 0) continue;
      break;
    }
  }
  return streak;
}

// ─── PRUNE OLD SESSIONS — giữ tối đa maxCount session gần nhất ───────────────
/**
 * Xóa các session cũ vượt quá giới hạn maxCount.
 * Mỗi session bị xóa sẽ kéo theo toàn bộ dishes sub-collection của nó.
 *
 * Chiến lược: Fire-and-forget từ persistSession — không throw, không block UI.
 * Gọi sau khi saveSession() thành công để tránh race condition xóa session vừa tạo.
 *
 * @param {number} maxCount - Số session tối đa được giữ lại (default: 20)
 */
export async function pruneOldSessions(maxCount = 20) {
  try {
    const id = await getDeviceId();

    // Đọc TẤT CẢ sessions, sort newest first — không dùng limit() vì cần biết tổng số
    const q = query(sessionsCol(id), orderBy('created_at', 'desc'));
    const snap = await withTimeoutFallback(getDocs(q), 8000, null);

    if (!snap || snap.size <= maxCount) return; // Chưa vượt ngưỡng → không làm gì

    // Những session cần xóa = tất cả từ index maxCount trở đi (cũ nhất)
    const toDelete = snap.docs.slice(maxCount);

    if (__DEV__) {
      console.log(`[DB] pruneOldSessions: total=${snap.size}, keeping=${maxCount}, deleting=${toDelete.length}`);
    }

    // Fetch dishes sub-collection của mỗi session cần xóa — song song
    const dishSnaps = await Promise.all(
      toDelete.map(sessionDoc =>
        withTimeoutFallback(getDocs(dishesCol(id, sessionDoc.id)), 5000, null)
      )
    );

    // Gom tất cả deleteDoc vào 1 mảng rồi Promise.all
    const deletes = [];
    toDelete.forEach((sessionDoc, idx) => {
      if (dishSnaps[idx]) {
        dishSnaps[idx].docs.forEach(d => deletes.push(deleteDoc(d.ref)));
      }
      deletes.push(deleteDoc(sessionDoc.ref));
    });

    await Promise.all(deletes);

    if (__DEV__) {
      console.log(`[DB] pruneOldSessions: ✅ Removed ${toDelete.length} old sessions`);
    }
  } catch (e) {
    // Non-critical: không throw để không crash persistSession
    console.warn('[DB] pruneOldSessions error:', e.message);
  }
}

// ─── CLEAR ALL HISTORY (Firestore) ───────────────────────────────────────────
// FIX (Hiệu suất): fetch tất cả dishes song song, tránh N+1 problem.
// Với 20 session × 10 dishes, giảm từ ~200 Firestore calls nối đuôi → parallel batch.
export async function clearAllHistory() {
  const id = await getDeviceId();
  const sessions = await getDocs(sessionsCol(id));

  // Fetch dishes của mọi session song song
  const allDishSnaps = await Promise.all(
    sessions.docs.map(sessionDoc => getDocs(dishesCol(id, sessionDoc.id)))
  );

  const deletes = [];
  sessions.docs.forEach((sessionDoc, idx) => {
    allDishSnaps[idx].docs.forEach(d => deletes.push(deleteDoc(d.ref)));
    deletes.push(deleteDoc(sessionDoc.ref));
  });

  const feedbackSnap = await getDocs(feedbackCol(id));
  feedbackSnap.docs.forEach(d => deletes.push(deleteDoc(d.ref)));

  await Promise.all(deletes);
}

// ─── RECENT DISHES CACHE (AsyncStorage — không cần network) ──────────────────
// Dùng để hiển thị dishes cuối cùng khi user mở app mà không cần gọi API.
// Chỉ lưu danh sách dishes đã recommend thành công gần nhất.
const RECENT_DISHES_CACHE_KEY = 'recent_dishes_cache_v1';

export async function saveRecentDishesCache(dishes) {
  try {
    await AsyncStorage.setItem(RECENT_DISHES_CACHE_KEY, JSON.stringify(dishes));
  } catch (e) { console.warn('[DB] saveRecentDishesCache:', e); }
}

export async function loadRecentDishesCache() {
  try {
    const raw = await AsyncStorage.getItem(RECENT_DISHES_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) { console.warn('[DB] loadRecentDishesCache:', e); return []; }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MULTI-PROFILE — Phase 1
// Schema mới: device_profiles/{deviceId}/members/{profileId}
//   ├─ (doc)       profile fields (displayName, relation, avatar, gender, ...)
//   ├─ allergies/{key}
//   └─ body_metrics/{id}
// ═══════════════════════════════════════════════════════════════════════════════

const ACTIVE_PROFILE_KEY = 'active_profile_id';

// ── Ref helpers ──────────────────────────────────────────────────────────────
function membersCol(deviceId)                   { return collection(firestore, 'device_profiles', deviceId, 'members'); }
function memberRef(deviceId, profileId)         { return doc(firestore, 'device_profiles', deviceId, 'members', profileId); }
function memberAllergiesCol(deviceId, profileId){ return collection(firestore, 'device_profiles', deviceId, 'members', profileId, 'allergies'); }
function memberAllergyRef(deviceId, pid, key)   { return doc(firestore, 'device_profiles', deviceId, 'members', pid, 'allergies', key); }
function memberMetricsCol(deviceId, profileId)  { return collection(firestore, 'device_profiles', deviceId, 'members', profileId, 'body_metrics'); }

// ── Active profile ID ────────────────────────────────────────────────────────
export async function getActiveProfileId() {
  return await AsyncStorage.getItem(ACTIVE_PROFILE_KEY);
}

export async function setActiveProfileId(profileId) {
  await AsyncStorage.setItem(ACTIVE_PROFILE_KEY, profileId);
}

// ── Load all profiles ────────────────────────────────────────────────────────
export async function loadAllProfiles() {
  try {
    const id = await getDeviceId();
    const snap = await withTimeoutFallback(getDocs(membersCol(id)), 6000, null);
    if (!snap) return [];
    return snap.docs.map(d => ({ profileId: d.id, ...d.data() }))
      .sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
  } catch (e) {
    console.warn('[DB] loadAllProfiles:', e.message);
    return [];
  }
}

// ── Load 1 profile ───────────────────────────────────────────────────────────
export async function loadProfileById(profileId) {
  if (!profileId) return null;
  try {
    const id = await getDeviceId();
    const snap = await withTimeoutFallback(getDoc(memberRef(id, profileId)), 5000, null);
    return snap && snap.exists() ? { profileId: snap.id, ...snap.data() } : null;
  } catch (e) {
    console.warn('[DB] loadProfileById:', e.message);
    return null;
  }
}

// ── Save (upsert) profile member ─────────────────────────────────────────────
export async function saveProfileMember(data) {
  const { profileId, ...rest } = data;
  if (!profileId) throw new Error('saveProfileMember: profileId required');
  const id = await getDeviceId();
  await setDoc(memberRef(id, profileId), {
    ...rest,
    updated_at: new Date().toISOString(),
  }, { merge: true });
}

// ── Delete profile member ────────────────────────────────────────────────────
export async function deleteProfileMember(profileId) {
  const id = await getDeviceId();
  // Xóa sub-collections allergies trước
  const alSnap = await withTimeoutFallback(getDocs(memberAllergiesCol(id, profileId)), 5000, null);
  const meSnap = await withTimeoutFallback(getDocs(memberMetricsCol(id, profileId)), 5000, null);
  const dels = [];
  if (alSnap) alSnap.docs.forEach(d => dels.push(deleteDoc(d.ref)));
  if (meSnap) meSnap.docs.forEach(d => dels.push(deleteDoc(d.ref)));
  await Promise.all(dels);
  await deleteDoc(memberRef(id, profileId));
}

// ── Scoped Allergies ─────────────────────────────────────────────────────────
export async function loadAllergiesForProfile(profileId) {
  if (!profileId) return [];
  const id = await getDeviceId();
  const snap = await withTimeoutFallback(getDocs(memberAllergiesCol(id, profileId)), 5000, null);
  if (!snap) return [];
  return snap.docs.map(d => d.data());
}

export async function addAllergyForProfile(profileId, allergyKey, displayName) {
  const id = await getDeviceId();
  await setDoc(memberAllergyRef(id, profileId, allergyKey), {
    allergy_key: allergyKey,
    display_name: displayName,
    added_at: new Date().toISOString(),
  });
}

export async function removeAllergyForProfile(profileId, allergyKey) {
  const id = await getDeviceId();
  await deleteDoc(memberAllergyRef(id, profileId, allergyKey));
}

// ── Scoped Body Metrics ──────────────────────────────────────────────────────
export async function loadLatestMetricsForProfile(profileId) {
  if (!profileId) return null;
  const id = await getDeviceId();
  const q = query(memberMetricsCol(id, profileId), orderBy('measured_at', 'desc'), limit(1));
  const snap = await withTimeoutFallback(getDocs(q), 5000, null);
  if (!snap || snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

export async function saveBodyMetricsForProfile(profileId, data) {
  if (!profileId) return null;
  const id = await getDeviceId();
  const ref = await addDoc(memberMetricsCol(id, profileId), {
    ...data,
    measured_at: data.measured_at || new Date().toISOString(),
  });
  return ref.id;
}

export async function loadAllMetricsForProfile(profileId, limitCount = 100) {
  if (!profileId) return [];
  const id = await getDeviceId();
  const q = query(memberMetricsCol(id, profileId), orderBy('measured_at', 'desc'), limit(limitCount));
  const snap = await withTimeoutFallback(getDocs(q), 6000, null);
  if (!snap) return [];
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ── Scoped Taste Profile ─────────────────────────────────────────────────────
// Lưu khẩu vị vào device_profiles/{deviceId}/members/{profileId} (merge)
export async function saveTasteProfileForProfile(profileId, { tasteProfile, hometownProvinceId, tasteMode }) {
  if (!profileId) return;
  const deviceId = await getDeviceId();
  await setDoc(memberRef(deviceId, profileId), {
    taste_profile:        tasteProfile,
    hometown_province_id: hometownProvinceId ?? null,
    taste_mode:           tasteMode,
    taste_updated_at:     new Date().toISOString(),
  }, { merge: true });
}

// Đọc khẩu vị từ member doc
export async function loadTasteProfileForProfile(profileId) {
  if (!profileId) return null;
  const deviceId = await getDeviceId();
  const snap = await withTimeoutFallback(getDoc(memberRef(deviceId, profileId)), 5000, null);
  if (!snap || !snap.exists()) return null;
  const data = snap.data();
  return {
    tasteProfile:       data.taste_profile       ?? null,
    hometownProvinceId: data.hometown_province_id ?? null,
    tasteMode:          data.taste_mode           ?? 'hometown',
  };
}

// ── Migration: profiles/{deviceId} → device_profiles/{deviceId}/members/default ──
export async function migrateExistingProfile() {
  try {
    const activeId = await getActiveProfileId();
    if (activeId) return; // Đã migrate rồi, bỏ qua

    const deviceId = await getDeviceId();

    // 1. Đọc profile cũ
    const oldSnap = await withTimeoutFallback(getDoc(profileRef(deviceId)), 5000, null);
    const oldData = oldSnap && oldSnap.exists() ? oldSnap.data() : {};

    // 2. Tạo profile "Bản thân" mới
    const newProfileId = 'profile_' + Date.now().toString(36);
    await setDoc(memberRef(deviceId, newProfileId), {
      displayName:      oldData.name || 'Bản thân',
      relation:         'self',
      avatar:           '🧑',
      isDefault:        true,
      created_at:       new Date().toISOString(),
      updated_at:       new Date().toISOString(),
      // Copy personal info cũ
      gender:           oldData.gender           || 'male',
      birth_year:       oldData.birth_year       || null,
      age:              oldData.age              || null,
      dietary_goal:     oldData.dietary_goal     || 'maintenance',
      diet_type:        oldData.diet_type        || 'omnivore',
      activity_level:   oldData.activity_level   || 'moderately_active',
      health_condition: oldData.health_condition || [],
      taste_preference: oldData.taste_preference || [],
    });

    // 3. Copy allergies cũ sang profile mới
    const oldAlSnap = await withTimeoutFallback(getDocs(allergiesCol(deviceId)), 5000, null);
    if (oldAlSnap && !oldAlSnap.empty) {
      await Promise.all(oldAlSnap.docs.map(d =>
        setDoc(memberAllergyRef(deviceId, newProfileId, d.id), d.data())
      ));
    }

    // 4. Set active profile
    await setActiveProfileId(newProfileId);
    if (__DEV__) console.log('[DB] Migration OK — profileId:', newProfileId);

  } catch (e) {
    // Migration fail → tạo profile trống vẫn hoạt động
    console.warn('[DB] migrateExistingProfile error:', e.message);
    try {
      const fallbackId = 'profile_default';
      const deviceId = await getDeviceId();
      await setDoc(memberRef(deviceId, fallbackId), {
        displayName: 'Bản thân', relation: 'self', avatar: '🧑',
        isDefault: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }, { merge: true });
      await setActiveProfileId(fallbackId);
    } catch (e2) {
      console.warn('[DB] fallback migration error:', e2.message);
    }
  }
}

// ─── db object — chỉ còn dùng bởi useAppStore (load profile/metrics/location)
export const db = {
  getAllAsync: async (sql) => {
    if (sql.includes('personal_profile')) return [await loadProfile()].filter(Boolean);
    if (sql.includes('body_metrics'))     return await loadAllMetrics();
    if (sql.includes('allergy_list'))     return await loadAllergies();
    console.warn('[db.getAllAsync] unsupported:', sql);
    return [];
  },

  getFirstAsync: async (sql) => {
    if (sql.includes('body_metrics'))            return await loadLatestMetrics();
    if (sql.includes("'last_known_lat'"))        return { value: await getSetting('last_known_lat') };
    if (sql.includes("'last_known_lon'"))        return { value: await getSetting('last_known_lon') };
    if (sql.includes("'last_known_province'"))   return { value: await getSetting('last_known_province') };
    console.warn('[db.getFirstAsync] unsupported:', sql);
    return null;
  },

  runAsync: async () => ({ lastInsertRowId: null, changes: 0 }),
  execAsync: async () => {},
};
