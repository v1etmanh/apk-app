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
import { firestore, ensureFirebaseAuth } from './firebaseConfig';
// ─── Local data — ingredients (offline-first, không cần Firestore) ────────────
import { ALL_INGREDIENTS, getAllCategories, getIngredientsByCategory } from './ingredientsData';
// ─── Supabase (chỉ đọc userId — không import toàn bộ client để tránh circular) ──
import { supabase } from '../store/suppabase';

// ─── Device ID (fallback khi chưa đăng nhập) ─────────────────────────────────
// Chỉ dùng làm fallback. Primary namespace là Supabase userId (xem getUserNamespace).
let _deviceId = null;

// [AUD-002] Dùng khi logout — reset cache để User B không đọc namespace của User A
export function clearDeviceId() { _deviceId = null; }

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

/**
 * getUserNamespace() — namespace duy nhất để phân vùng dữ liệu Firestore theo user.
 *
 * FIX (BUG NGHIÊM TRỌNG): Trước đây dùng deviceId (UUID lưu SecureStore) làm namespace.
 * Khi user xóa app → SecureStore bị xóa → UUID mới → không tìm lại được data cũ.
 *
 * Fix: ưu tiên Supabase userId (bất biến theo tài khoản, sống qua uninstall).
 * Fallback về deviceId chỉ khi chưa đăng nhập (edge case: guest mode / anonymous).
 *
 * [FIX SAVE-003] Dùng getSession() thay getUser():
 * - getUser() = network call đến Supabase server → chậm, có thể fail khi mạng yếu
 *   → trả null → fallback sai deviceId → Firestore query path sai → savedDishes trống.
 * - getSession() = đọc từ SecureStore (local, instant, luôn có ngay sau login)
 *   → không có network call → userId luôn đúng ngay cả khi offline.
 */
export async function getUserNamespace() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) return session.user.id;
  } catch (e) {
    if (__DEV__) console.warn('[DB] getUserNamespace: supabase.auth.getSession failed, fallback to deviceId:', e.message);
  }
  return await getDeviceId();
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
  await getUserNamespace(); // đảm bảo namespace sẵn sàng
  if (__DEV__) console.log('[DB] Firebase Firestore ready. namespace:', await getUserNamespace());
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
  const id = await getUserNamespace();
  await setDoc(profileRef(id), { ...data, updated_at: new Date().toISOString() }, { merge: true });
}

export async function loadProfile() {
  const id = await getUserNamespace();
  const snap = await withTimeoutFallback(getDoc(profileRef(id)), 5000, null);
  return snap && snap.exists() ? { id: 1, ...snap.data() } : null;
}

// ─── BODY METRICS ─────────────────────────────────────────────────────────────
export async function saveBodyMetrics(data) {
  const id = await getUserNamespace();
  const ref = await addDoc(metricsCol(id), { ...data, measured_at: data.measured_at || new Date().toISOString() });
  return ref.id;
}

export async function loadLatestMetrics() {
  const id = await getUserNamespace();
  const q = query(metricsCol(id), orderBy('measured_at', 'desc'), limit(1));
  const snap = await withTimeoutFallback(getDocs(q), 5000, null);
  if (!snap || snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

// FIX (Hiệu suất): thêm limit(100) tránh fetch không giới hạn khi user dùng lâu dài.
export async function loadAllMetrics(limitCount = 100) {
  const id = await getUserNamespace();
  const q = query(metricsCol(id), orderBy('measured_at', 'desc'), limit(limitCount));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ─── ALLERGIES ────────────────────────────────────────────────────────────────
export async function addAllergy(allergyKey, displayName) {
  const id = await getUserNamespace();
  await setDoc(allergyRef(id, allergyKey), {
    allergy_key: allergyKey,
    display_name: displayName,
    added_at: new Date().toISOString(),
  });
}

export async function removeAllergy(allergyKey) {
  const id = await getUserNamespace();
  await deleteDoc(allergyRef(id, allergyKey));
}

export async function loadAllergies() {
  const id = await getUserNamespace();
  const snap = await withTimeoutFallback(getDocs(allergiesCol(id)), 5000, null);
  if (!snap) return [];
  return snap.docs.map(d => d.data());
}

// ─── SETTINGS KV ──────────────────────────────────────────────────────────────
export async function setSetting(key, value) {
  await AsyncStorage.setItem(`setting_${key}`, String(value));
  
  try {
    const id = await getUserNamespace();
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
  const id = await getUserNamespace();
  const snap = await withTimeoutFallback(getDoc(settingsRef(id, key)), 5000, null);
  return snap && snap.exists() ? snap.data().value : null;
}

// ─── RECOMMENDATION SESSIONS ──────────────────────────────────────────────────
export async function saveSession(sessionData) {
  const id = await getUserNamespace();
  const ref = await addDoc(sessionsCol(id), {
    ...sessionData,
    created_at: sessionData.created_at || new Date().toISOString(),
    synced_to_server: 0,
  });
  return ref.id;
}

export async function loadSessions(limitCount = 20) {
  // [FIX PERM-001] ensureFirebaseAuth() trước khi query Firestore —
  // loadSessions() được gọi từ HistoryScreen (useFocusEffect) mà không đi qua
  // initializeApp(), nên Firebase Anonymous Auth có thể chưa sẵn sàng → permission-denied.
  await ensureFirebaseAuth();
  const id = await getUserNamespace();
  const q = query(sessionsCol(id), orderBy('created_at', 'desc'), limit(limitCount));
  const snap = await withTimeoutFallback(getDocs(q), 8000, null);
  if (!snap) return [];
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function loadSessionById(sessionId) {
  await ensureFirebaseAuth();
  const id = await getUserNamespace();
  const snap = await withTimeoutFallback(getDoc(sessionRef(id, sessionId)), 5000, null);
  return snap && snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// ─── RECOMMENDED DISHES ───────────────────────────────────────────────────────
export async function saveDishesToSession(sessionId, dishes) {
  const id = await getUserNamespace();
  const col = dishesCol(id, sessionId);
  const promises = dishes.map(dish => addDoc(col, dish));
  await Promise.all(promises);
}

export async function loadDishesBySession(sessionId) {
  const id = await getUserNamespace();
  const q = query(dishesCol(id, sessionId), orderBy('rank', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ─── DISH FEEDBACK ────────────────────────────────────────────────────────────
export async function saveFeedback(feedbackData) {
  const id = await getUserNamespace();
  const ref = await addDoc(feedbackCol(id), {
    ...feedbackData,
    feedback_at: feedbackData.feedback_at || new Date().toISOString(),
    synced_to_server: 0,
  });
  return ref.id;
}

export async function loadFeedbackBySession(sessionId) {
  const id = await getUserNamespace();
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
    const id = await getUserNamespace();
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

// ─── INGREDIENTS REF (read-only — từ local JSON, không cần Firestore) ────────
// Đã migrate sang assets/data/ingredients.json (offline-first).
// Giữ nguyên tên hàm để không phá caller (useAppStore, MarketBasketScreen).

export function loadIngredientCategories() {
  return Promise.resolve(
    getAllCategories().map(c => ({ category: c }))
  );
}

export function loadIngredientsByCategories(categoryKeys) {
  if (!categoryKeys || categoryKeys.length === 0) return Promise.resolve([]);
  const results = categoryKeys.flatMap(cat => getIngredientsByCategory(cat));
  return Promise.resolve(results);
}

// invalidateIngredientCache là no-op — local JSON không cần invalidate
export function invalidateIngredientCache() {}

// loadAllIngredients trả ngay từ memory — sync wrapped in Promise để giữ interface
export function loadAllIngredients() {
  return Promise.resolve(ALL_INGREDIENTS);
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
    const id = await getUserNamespace();

    // [AUD-009] limit(maxCount + 5) thay vì fetch unbounded — tránh billing DoS
    const q = query(sessionsCol(id), orderBy('created_at', 'desc'), limit(maxCount + 5));
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
  const id = await getUserNamespace();
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
// [AUD-008] SecureStore thay AsyncStorage — active_profile_id xác định ai đang load BMI/dị ứng
// Migration tự động: đọc giá trị cũ ở AsyncStorage rồi chuyển sang SecureStore 1 lần
export async function getActiveProfileId() {
  const legacy = await AsyncStorage.getItem(ACTIVE_PROFILE_KEY);
  if (legacy !== null) {
    await SecureStore.setItemAsync(ACTIVE_PROFILE_KEY, legacy);
    await AsyncStorage.removeItem(ACTIVE_PROFILE_KEY);
    return legacy;
  }
  return await SecureStore.getItemAsync(ACTIVE_PROFILE_KEY);
}

export async function setActiveProfileId(profileId) {
  await SecureStore.setItemAsync(ACTIVE_PROFILE_KEY, profileId);
}

// ── Load all profiles ────────────────────────────────────────────────────────
export async function loadAllProfiles() {
  try {
    await ensureFirebaseAuth(); // [FIX] Firestore read cũng cần auth nếu Rules require auth
    const id = await getUserNamespace();
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
    const id = await getUserNamespace();
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
  // [AUD-001] __DEV__ guard — không leak profileId/deviceId/path ra production logs
  if (__DEV__) console.log('[DB] saveProfileMember called — profileId:', profileId, '| data keys:', Object.keys(rest));
  if (!profileId) throw new Error('saveProfileMember: profileId required');
  const id = await getUserNamespace();
  if (__DEV__) console.log('[DB] saveProfileMember — deviceId:', id, '| path: device_profiles/', id, '/members/', profileId);
  try {
    await setDoc(memberRef(id, profileId), {
      ...rest,
      updated_at: new Date().toISOString(),
    }, { merge: true });
    if (__DEV__) console.log('[DB] saveProfileMember — ✅ success');
  } catch (e) {
    if (__DEV__) console.error('[DB] saveProfileMember — ❌ FAILED:', e.code, e.message, e);
    else console.error('[DB] saveProfileMember failed');
    throw e;
  }
}

// ── Delete profile member ────────────────────────────────────────────────────
export async function deleteProfileMember(profileId) {
  const id = await getUserNamespace();
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
  const id = await getUserNamespace();
  const snap = await withTimeoutFallback(getDocs(memberAllergiesCol(id, profileId)), 5000, null);
  if (!snap) return [];
  return snap.docs.map(d => d.data());
}

export async function addAllergyForProfile(profileId, allergyKey, displayName) {
  const id = await getUserNamespace();
  await setDoc(memberAllergyRef(id, profileId, allergyKey), {
    allergy_key: allergyKey,
    display_name: displayName,
    added_at: new Date().toISOString(),
  });
}

export async function removeAllergyForProfile(profileId, allergyKey) {
  const id = await getUserNamespace();
  await deleteDoc(memberAllergyRef(id, profileId, allergyKey));
}

// ── Scoped Body Metrics ──────────────────────────────────────────────────────
export async function loadLatestMetricsForProfile(profileId) {
  if (!profileId) return null;
  const id = await getUserNamespace();
  const q = query(memberMetricsCol(id, profileId), orderBy('measured_at', 'desc'), limit(1));
  const snap = await withTimeoutFallback(getDocs(q), 5000, null);
  if (!snap || snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

export async function saveBodyMetricsForProfile(profileId, data) {
  if (!profileId) return null;
  const id = await getUserNamespace();
  const ref = await addDoc(memberMetricsCol(id, profileId), {
    ...data,
    measured_at: data.measured_at || new Date().toISOString(),
  });
  return ref.id;
}

export async function loadAllMetricsForProfile(profileId, limitCount = 100) {
  if (!profileId) return [];
  const id = await getUserNamespace();
  const q = query(memberMetricsCol(id, profileId), orderBy('measured_at', 'desc'), limit(limitCount));
  const snap = await withTimeoutFallback(getDocs(q), 6000, null);
  if (!snap) return [];
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ── Scoped Taste Profile ─────────────────────────────────────────────────────
// Lưu khẩu vị vào device_profiles/{deviceId}/members/{profileId} (merge)
export async function saveTasteProfileForProfile(profileId, { tasteProfile, hometownProvinceId, tasteMode }) {
  if (!profileId) return;
  const deviceId = await getUserNamespace();
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
  const deviceId = await getUserNamespace();
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

    const deviceId = await getUserNamespace();

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
      const deviceId = await getUserNamespace();
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

// ─── SAVED DISHES — món ưa thích do user tự chọn ─────────────────────────────
// Primary: AsyncStorage (instant, offline-safe)
// Backup:  Firestore saved_dishes/{userId}/items/{dish_id} (sync khi có mạng)
// Mỗi entry: { dish_id, title, image_url, cook_time_min, final_score, nation, saved_at }

const SAVED_DISHES_KEY = 'saved_dishes_v1';
const MAX_SAVED_DISHES = 50;

// Ref helpers cho Firestore saved dishes
function savedDishesCol(userId) {
  return collection(firestore, 'saved_dishes', userId, 'items');
}
function savedDishRef(userId, dishId) {
  return doc(firestore, 'saved_dishes', userId, 'items', String(dishId));
}

// [FIX BUG-A] Load từ Firestore khi AsyncStorage trống — phục hồi sau cài lại app
// [FIX BUG-B] ensureFirebaseAuth() phải được gọi trước Firestore read để tránh
//   permission-denied khi fallback chạy độc lập (gọi ngoài initializeApp flow).
export async function getSavedDishes() {
  try {
    // [FIX SAVE-002] Luôn đảm bảo Firebase auth sẵn sàng TRƯỚC khi check AS,
    // tránh race condition: AS trống → Firestore query → permission-denied im lặng.
    // Gọi sớm ở đây thay vì chỉ khi AS trống — chi phí thấp (cache hit nếu đã auth).
    await ensureFirebaseAuth();

    const raw = await AsyncStorage.getItem(SAVED_DISHES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.length > 0) return parsed;
    }

    // AsyncStorage trống → thử load từ Firestore (sau cài lại app / sau logout)
    if (__DEV__) console.log('[DB] getSavedDishes: AS empty, fetching from Firestore...');

    const userId = await getUserNamespace();
    const q = query(savedDishesCol(userId), orderBy('saved_at', 'desc'), limit(MAX_SAVED_DISHES));
    const snap = await withTimeoutFallback(getDocs(q), 6000, null);
    if (!snap || snap.empty) return [];
    const dishes = snap.docs.map(d => d.data());
    // Hydrate lại AsyncStorage để lần sau không cần Firestore
    await AsyncStorage.setItem(SAVED_DISHES_KEY, JSON.stringify(dishes));
    if (__DEV__) console.log('[DB] getSavedDishes: hydrated', dishes.length, 'dishes from Firestore');
    return dishes;
  } catch (e) {
    console.warn('[DB] getSavedDishes:', e);
    return [];
  }
}

export async function saveDish(dish) {
  try {
    const current = await getSavedDishes();
    if (current.some(d => String(d.dish_id) === String(dish.dish_id))) return current;
    const entry = {
      dish_id:       dish.dish_id,
      title:         dish.title         || '',
      image_url:     dish.image_url     || '',
      cook_time_min: dish.cook_time_min || 0,
      final_score:   dish.final_score   || 0,
      nation:        dish.nation        || '',
      url:           dish.url           || '',
      saved_at:      new Date().toISOString(),
    };
    const updated = [entry, ...current].slice(0, MAX_SAVED_DISHES);
    // 1. AsyncStorage — instant
    await AsyncStorage.setItem(SAVED_DISHES_KEY, JSON.stringify(updated));
    // 2. Firestore — await thẳng để biết có lỗi không (không fire-and-forget nữa)
    // [FIX BUG-C] ensureFirebaseAuth() trước write — saveDish() được gọi từ
    // toggleSaveDish() trong store, KHÔNG đi qua initializeApp(). Nếu Firebase
    // token chưa ready (cold start, hoặc sau resetStore) → permission-denied.
    try {
      await ensureFirebaseAuth();
      const userId = await getUserNamespace();
      await setDoc(savedDishRef(userId, dish.dish_id), entry);
      if (__DEV__) console.log('[DB] saveDish Firestore OK — dish_id:', dish.dish_id);
    } catch (fsErr) {
      console.warn('[DB] saveDish Firestore FAILED:', fsErr.code, fsErr.message);
    }
    return updated;
  } catch (e) {
    console.warn('[DB] saveDish:', e);
    return [];
  }
}

export async function removeSavedDish(dishId) {
  try {
    const current = await getSavedDishes();
    const updated = current.filter(d => String(d.dish_id) !== String(dishId));
    // 1. AsyncStorage
    await AsyncStorage.setItem(SAVED_DISHES_KEY, JSON.stringify(updated));
    // [FIX BUG-A] 2. Firestore — fire-and-forget nhưng đảm bảo auth trước
    ensureFirebaseAuth().then(() => getUserNamespace()).then(userId =>
      deleteDoc(savedDishRef(userId, dishId)).catch(e =>
        console.warn('[DB] removeSavedDish Firestore sync failed (non-critical):', e.message)
      )
    );
    return updated;
  } catch (e) {
    console.warn('[DB] removeSavedDish:', e);
    return [];
  }
}

export async function isDishSaved(dishId) {
  const current = await getSavedDishes();
  return current.some(d => String(d.dish_id) === String(dishId));
}

// [FIX BUG-C] Gọi khi logout — xóa toàn bộ AsyncStorage keys nhạy cảm của user
// Ngăn User B nhìn thấy saved dishes / weather cache / recent dishes của User A
export async function clearUserLocalCache() {
  try {
    await AsyncStorage.multiRemove([
      SAVED_DISHES_KEY,
      RECENT_DISHES_CACHE_KEY,
    ]);
    // Xóa hết weather cache keys
    const allKeys = await AsyncStorage.getAllKeys();
    const weatherKeys = allKeys.filter(k => k.startsWith(WEATHER_CACHE_PREFIX));
    if (weatherKeys.length > 0) await AsyncStorage.multiRemove(weatherKeys);
    if (__DEV__) console.log('[DB] clearUserLocalCache: cleared', SAVED_DISHES_KEY, RECENT_DISHES_CACHE_KEY, `+ ${weatherKeys.length} weather keys`);
  } catch (e) {
    console.warn('[DB] clearUserLocalCache:', e.message);
  }
}
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
