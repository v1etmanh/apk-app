import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as SecureStore from './secureStorage';

import { api } from '../services/api';
import { supabase } from '../store/supabase';
import i18n from '../i18n';
import { getIngredientsForLanguage } from './ingredientsData';

const ACTIVE_PROFILE_KEY = 'active_profile_id';
const WEATHER_CACHE_PREFIX = 'weather_cache_';
const SAVED_DISHES_KEY = 'saved_dishes_v2';
const RECENT_DISHES_CACHE_KEY = 'recent_dishes_cache_v2';
const INGREDIENTS_CACHE_KEY = 'ingredients_api_cache_v1';
const MAX_SAVED_DISHES = 50;
const INGREDIENT_PAGE_SIZE = 200;

let _deviceId = null;
let _lastUserId = null;
let _ingredientCache = new Map();

const nowIso = () => new Date().toISOString();

function assertNoError(error, context) {
  if (!error) return;
  const wrapped = new Error(`${context}: ${error.message}`);
  wrapped.code = error.code;
  throw wrapped;
}

async function currentUserId() {
  const { data: { session }, error } = await supabase.auth.getSession();
  assertNoError(error, 'Supabase session');
  const userId = session?.user?.id;
  if (!userId) {
    const authError = new Error('Supabase session is required');
    authError.code = 'not-authenticated';
    throw authError;
  }
  _lastUserId = userId;
  return userId;
}

async function userStorageKey(baseKey) {
  return `${baseKey}:${await currentUserId()}`;
}

function unpackDataRow(row, idField = 'id') {
  if (!row) return null;
  const data = row.data && typeof row.data === 'object' ? row.data : {};
  return {
    ...data,
    [idField]: row[idField],
    created_at: data.created_at ?? row.created_at,
    updated_at: data.updated_at ?? row.updated_at,
  };
}

async function getProfileRow(userId, profileId) {
  const { data, error } = await supabase
    .from('app_profiles')
    .select('profile_id, data, created_at, updated_at')
    .eq('user_id', userId)
    .eq('profile_id', profileId)
    .maybeSingle();
  assertNoError(error, 'Load profile');
  return data;
}

async function activeOrFirstProfileId() {
  const activeId = await getActiveProfileId();
  if (activeId) return activeId;
  const profiles = await loadAllProfiles();
  return profiles[0]?.profileId ?? null;
}

export function clearDeviceId() {
  _deviceId = null;
}

export async function getDeviceId() {
  if (_deviceId) return _deviceId;
  let id = await SecureStore.getItemAsync('device_id');
  if (!id) {
    const legacy = await AsyncStorage.getItem('device_id');
    id = legacy || Crypto.randomUUID();
    await SecureStore.setItemAsync('device_id', id);
    if (legacy) await AsyncStorage.removeItem('device_id');
  }
  _deviceId = id;
  return id;
}

export async function getUserNamespace() {
  return currentUserId();
}

export async function initDB() {
  const userId = await currentUserId();
  if (__DEV__) console.log('[DB] Supabase ready for user:', userId.slice(0, 8));
}

export async function saveProfile(data) {
  let profileId = await activeOrFirstProfileId();
  if (!profileId) {
    profileId = `profile_${Date.now().toString(36)}`;
    await setActiveProfileId(profileId);
  }
  await saveProfileMember({
    profileId,
    ...data,
    displayName: data.displayName || data.name || 'Bản thân',
  });
}

export async function loadProfile() {
  const profileId = await activeOrFirstProfileId();
  return profileId ? loadProfileById(profileId) : null;
}

export async function saveBodyMetrics(data) {
  const profileId = await activeOrFirstProfileId();
  if (!profileId) throw new Error('No active profile');
  return saveBodyMetricsForProfile(profileId, data);
}

export async function loadLatestMetrics() {
  const profileId = await activeOrFirstProfileId();
  return profileId ? loadLatestMetricsForProfile(profileId) : null;
}

export async function loadAllMetrics(limitCount = 100) {
  const profileId = await activeOrFirstProfileId();
  return profileId ? loadAllMetricsForProfile(profileId, limitCount) : [];
}

export async function addAllergy(allergyKey, displayName) {
  const profileId = await activeOrFirstProfileId();
  if (!profileId) throw new Error('No active profile');
  return addAllergyForProfile(profileId, allergyKey, displayName);
}

export async function removeAllergy(allergyKey) {
  const profileId = await activeOrFirstProfileId();
  if (profileId) await removeAllergyForProfile(profileId, allergyKey);
}

export async function loadAllergies() {
  const profileId = await activeOrFirstProfileId();
  return profileId ? loadAllergiesForProfile(profileId) : [];
}

export async function setSetting(key, value) {
  const userId = await currentUserId();
  await AsyncStorage.setItem(`setting_${key}:${userId}`, String(value));
  const { error } = await supabase.from('app_settings').upsert({
    user_id: userId,
    key,
    value: String(value),
    updated_at: nowIso(),
  }, { onConflict: 'user_id,key' });
  assertNoError(error, `Save setting ${key}`);
}

export async function getSetting(key) {
  const userId = await currentUserId();
  const localKey = `setting_${key}:${userId}`;
  const local = await AsyncStorage.getItem(localKey);
  if (local !== null) return local;
  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('user_id', userId)
    .eq('key', key)
    .maybeSingle();
  assertNoError(error, `Load setting ${key}`);
  if (data?.value != null) await AsyncStorage.setItem(localKey, String(data.value));
  return data?.value ?? null;
}

export async function saveSession(sessionData) {
  const userId = await currentUserId();
  const { data, error } = await supabase
    .from('app_recommendation_sessions')
    .insert({
      user_id: userId,
      data: sessionData,
      created_at: sessionData.created_at || nowIso(),
    })
    .select('id')
    .single();
  assertNoError(error, 'Save recommendation session');
  return data.id;
}

export async function loadSessions(limitCount = 20) {
  const userId = await currentUserId();
  const { data, error } = await supabase
    .from('app_recommendation_sessions')
    .select('id, data, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limitCount);
  assertNoError(error, 'Load recommendation sessions');
  return (data || []).map(row => unpackDataRow(row));
}

export async function loadSessionById(sessionId) {
  const userId = await currentUserId();
  const { data, error } = await supabase
    .from('app_recommendation_sessions')
    .select('id, data, created_at')
    .eq('user_id', userId)
    .eq('id', sessionId)
    .maybeSingle();
  assertNoError(error, 'Load recommendation session');
  return unpackDataRow(data);
}

export async function saveDishesToSession(sessionId, dishes) {
  if (!dishes?.length) return;
  const userId = await currentUserId();
  const rows = dishes.map((dish, index) => ({
    user_id: userId,
    session_id: sessionId,
    rank: Number(dish.rank ?? index + 1),
    data: dish,
  }));
  const { error } = await supabase.from('app_recommended_dishes').insert(rows);
  assertNoError(error, 'Save recommended dishes');
}

export async function loadDishesBySession(sessionId) {
  const userId = await currentUserId();
  const { data, error } = await supabase
    .from('app_recommended_dishes')
    .select('id, data, rank')
    .eq('user_id', userId)
    .eq('session_id', sessionId)
    .order('rank', { ascending: true });
  assertNoError(error, 'Load recommended dishes');
  return (data || []).map(row => ({ ...row.data, id: row.id, rank: row.data?.rank ?? row.rank }));
}

export async function saveFeedback(feedbackData) {
  const userId = await currentUserId();
  const { data, error } = await supabase
    .from('app_feedback')
    .insert({
      user_id: userId,
      session_id: feedbackData.session_id || null,
      data: feedbackData,
      feedback_at: feedbackData.feedback_at || nowIso(),
    })
    .select('id')
    .single();
  assertNoError(error, 'Save feedback');
  return data.id;
}

export async function loadFeedbackBySession(sessionId) {
  const userId = await currentUserId();
  const { data, error } = await supabase
    .from('app_feedback')
    .select('id, data, feedback_at')
    .eq('user_id', userId)
    .eq('session_id', sessionId)
    .order('feedback_at', { ascending: true });
  assertNoError(error, 'Load feedback');
  return (data || []).map(row => ({
    ...row.data,
    id: row.id,
    feedback_at: row.data?.feedback_at ?? row.feedback_at,
  }));
}

export async function getRecentDishIds(nSessions = 3) {
  try {
    const sessions = await loadSessions(nSessions);
    if (!sessions.length) return [];
    const userId = await currentUserId();
    const { data, error } = await supabase
      .from('app_recommended_dishes')
      .select('session_id, data, rank')
      .eq('user_id', userId)
      .in('session_id', sessions.map(session => session.id))
      .order('rank', { ascending: true });
    assertNoError(error, 'Load recent dishes');
    const bySession = new Map();
    for (const row of data || []) {
      if (!bySession.has(row.session_id)) bySession.set(row.session_id, []);
      bySession.get(row.session_id).push(row.data);
    }
    const seen = new Set();
    const ids = [];
    for (const session of sessions) {
      for (const dish of bySession.get(session.id) || []) {
        const dishId = String(dish?.dish_id || '');
        if (dishId && !seen.has(dishId)) {
          seen.add(dishId);
          ids.push(dishId);
        }
      }
    }
    return ids.slice(0, 30);
  } catch (error) {
    console.warn('[DB] getRecentDishIds:', error.message);
    return [];
  }
}

export async function getWeatherCache(gridKey) {
  try {
    const raw = await AsyncStorage.getItem(WEATHER_CACHE_PREFIX + gridKey);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return new Date(data.expires_at) > new Date() ? data : null;
  } catch (error) {
    console.warn('[WeatherCache] read:', error.message);
    return null;
  }
}

export async function setWeatherCache(gridKey, weatherData, ttlMinutes = 30) {
  const fetchedAt = new Date();
  const payload = {
    grid_key: gridKey,
    ...weatherData,
    fetched_at: fetchedAt.toISOString(),
    expires_at: new Date(fetchedAt.getTime() + ttlMinutes * 60000).toISOString(),
  };
  await AsyncStorage.setItem(WEATHER_CACHE_PREFIX + gridKey, JSON.stringify(payload));
}

function uniqueIngredients(items) {
  const byId = new Map();
  for (const item of items || []) {
    if (item?.id != null) byId.set(String(item.id), item);
  }
  return [...byId.values()];
}

export async function loadAllIngredients(language = i18n.language) {
  const lang = language === 'en' ? 'en' : 'vi';
  if (_ingredientCache.has(lang)) return _ingredientCache.get(lang);
  try {
    let page = 1;
    let hasMore = true;
    const items = [];
    while (hasMore && page <= 20) {
      const response = await api.get('/api/v1/ingredients', {
        params: { page, limit: INGREDIENT_PAGE_SIZE, lang },
      });
      const batch = response.data?.ingredients;
      if (!Array.isArray(batch)) throw new Error('Invalid ingredients response');
      items.push(...batch);
      hasMore = response.data?.has_more === true;
      page += 1;
    }
    const normalized = uniqueIngredients(items);
    if (!normalized.length) throw new Error('Ingredients response is empty');
    _ingredientCache.set(lang, normalized);
    await AsyncStorage.setItem(`${INGREDIENTS_CACHE_KEY}:${lang}`, JSON.stringify(normalized));
    return normalized;
  } catch (error) {
    console.warn('[Ingredients] API unavailable, using cache:', error.message);
    const cached = await AsyncStorage.getItem(`${INGREDIENTS_CACHE_KEY}:${lang}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      _ingredientCache.set(lang, parsed);
      return parsed;
    }
    const fallback = getIngredientsForLanguage(lang);
    _ingredientCache.set(lang, fallback);
    return fallback;
  }
}

export async function loadIngredientCategories(language = i18n.language) {
  const ingredients = await loadAllIngredients(language);
  return [...new Set(ingredients.map(item => item.category).filter(Boolean))]
    .map(category => ({ category }));
}

export async function loadIngredientsByCategories(categoryKeys, language = i18n.language) {
  if (!categoryKeys?.length) return [];
  const categories = new Set(categoryKeys);
  return (await loadAllIngredients(language)).filter(item => categories.has(item.category));
}

export function invalidateIngredientCache() {
  _ingredientCache = new Map();
}

export async function pruneOldSessions(maxCount = 20) {
  try {
    const sessions = await loadSessions(maxCount + 5);
    const ids = sessions.slice(maxCount).map(item => item.id);
    if (!ids.length) return;
    const userId = await currentUserId();
    const { error } = await supabase
      .from('app_recommendation_sessions')
      .delete()
      .eq('user_id', userId)
      .in('id', ids);
    assertNoError(error, 'Prune recommendation sessions');
  } catch (error) {
    console.warn('[DB] pruneOldSessions:', error.message);
  }
}

export async function clearAllHistory() {
  const userId = await currentUserId();
  const [sessionsResult, feedbackResult] = await Promise.all([
    supabase.from('app_recommendation_sessions').delete().eq('user_id', userId),
    supabase.from('app_feedback').delete().eq('user_id', userId),
  ]);
  assertNoError(sessionsResult.error, 'Clear sessions');
  assertNoError(feedbackResult.error, 'Clear feedback');
}

export async function saveRecentDishesCache(dishes) {
  await AsyncStorage.setItem(await userStorageKey(RECENT_DISHES_CACHE_KEY), JSON.stringify(dishes));
}

export async function loadRecentDishesCache() {
  const raw = await AsyncStorage.getItem(await userStorageKey(RECENT_DISHES_CACHE_KEY));
  return raw ? JSON.parse(raw) : [];
}

export async function getActiveProfileId() {
  const userId = await currentUserId();
  return SecureStore.getItemAsync(`${ACTIVE_PROFILE_KEY}.${userId}`);
}

export async function setActiveProfileId(profileId) {
  const userId = await currentUserId();
  await SecureStore.setItemAsync(`${ACTIVE_PROFILE_KEY}.${userId}`, profileId);
}

export async function loadAllProfiles() {
  const userId = await currentUserId();
  const { data, error } = await supabase
    .from('app_profiles')
    .select('profile_id, data, created_at, updated_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  assertNoError(error, 'Load profiles');
  return (data || []).map(row => {
    const unpacked = unpackDataRow(row, 'profile_id');
    return { ...unpacked, profileId: unpacked.profile_id };
  });
}

export async function loadProfileById(profileId) {
  if (!profileId) return null;
  const userId = await currentUserId();
  const row = await getProfileRow(userId, profileId);
  if (!row) return null;
  const unpacked = unpackDataRow(row, 'profile_id');
  return { ...unpacked, profileId: unpacked.profile_id };
}

export async function saveProfileMember({ profileId, ...data }) {
  if (!profileId) throw new Error('saveProfileMember: profileId required');
  const userId = await currentUserId();
  const existing = await getProfileRow(userId, profileId);
  const merged = { ...(existing?.data || {}), ...data };
  const { error } = await supabase.from('app_profiles').upsert({
    user_id: userId,
    profile_id: profileId,
    data: merged,
    updated_at: nowIso(),
  }, { onConflict: 'user_id,profile_id' });
  assertNoError(error, 'Save profile');
}

export async function deleteProfileMember(profileId) {
  const userId = await currentUserId();
  const { error } = await supabase
    .from('app_profiles')
    .delete()
    .eq('user_id', userId)
    .eq('profile_id', profileId);
  assertNoError(error, 'Delete profile');
}

export async function loadAllergiesForProfile(profileId) {
  if (!profileId) return [];
  const userId = await currentUserId();
  const { data, error } = await supabase
    .from('app_allergies')
    .select('allergy_key, display_name, added_at')
    .eq('user_id', userId)
    .eq('profile_id', profileId)
    .order('added_at', { ascending: true });
  assertNoError(error, 'Load allergies');
  return data || [];
}

export async function addAllergyForProfile(profileId, allergyKey, displayName) {
  const userId = await currentUserId();
  const { error } = await supabase.from('app_allergies').upsert({
    user_id: userId,
    profile_id: profileId,
    allergy_key: String(allergyKey),
    display_name: displayName,
    added_at: nowIso(),
  }, { onConflict: 'user_id,profile_id,allergy_key' });
  assertNoError(error, 'Save allergy');
}

export async function removeAllergyForProfile(profileId, allergyKey) {
  const userId = await currentUserId();
  const { error } = await supabase
    .from('app_allergies')
    .delete()
    .eq('user_id', userId)
    .eq('profile_id', profileId)
    .eq('allergy_key', String(allergyKey));
  assertNoError(error, 'Remove allergy');
}

export async function loadLatestMetricsForProfile(profileId) {
  if (!profileId) return null;
  const rows = await loadAllMetricsForProfile(profileId, 1);
  return rows[0] || null;
}

export async function saveBodyMetricsForProfile(profileId, data) {
  if (!profileId) return null;
  const userId = await currentUserId();
  const { data: row, error } = await supabase
    .from('app_body_metrics')
    .insert({
      user_id: userId,
      profile_id: profileId,
      data,
      measured_at: data.measured_at || nowIso(),
    })
    .select('id')
    .single();
  assertNoError(error, 'Save body metrics');
  return row.id;
}

export async function loadAllMetricsForProfile(profileId, limitCount = 100) {
  if (!profileId) return [];
  const userId = await currentUserId();
  const { data, error } = await supabase
    .from('app_body_metrics')
    .select('id, data, measured_at')
    .eq('user_id', userId)
    .eq('profile_id', profileId)
    .order('measured_at', { ascending: false })
    .limit(limitCount);
  assertNoError(error, 'Load body metrics');
  return (data || []).map(row => ({
    ...row.data,
    id: row.id,
    measured_at: row.data?.measured_at ?? row.measured_at,
  }));
}

export async function saveTasteProfileForProfile(profileId, { tasteProfile, hometownProvinceId, tasteMode }) {
  await saveProfileMember({
    profileId,
    taste_profile: tasteProfile,
    hometown_province_id: hometownProvinceId ?? null,
    taste_mode: tasteMode,
    taste_updated_at: nowIso(),
  });
}

export async function loadTasteProfileForProfile(profileId) {
  const profile = await loadProfileById(profileId);
  if (!profile) return null;
  return {
    tasteProfile: profile.taste_profile ?? null,
    hometownProvinceId: profile.hometown_province_id ?? null,
    tasteMode: profile.taste_mode ?? 'hometown',
  };
}

export async function migrateExistingProfile() {
  const profiles = await loadAllProfiles();
  let activeId = await getActiveProfileId();
  if (profiles.length) {
    if (!profiles.some(profile => profile.profileId === activeId)) {
      activeId = profiles[0].profileId;
      await setActiveProfileId(activeId);
    }
    return;
  }
  const profileId = 'profile_default';
  await saveProfileMember({
    profileId,
    displayName: 'Bản thân',
    relation: 'self',
    avatar: '🧑',
    isDefault: true,
    gender: 'male',
    dietary_goal: 'maintenance',
    diet_type: 'omnivore',
    activity_level: 'moderately_active',
    health_condition: [],
    taste_preference: [],
    created_at: nowIso(),
  });
  await setActiveProfileId(profileId);
}

async function savedDishesStorageKey() {
  return userStorageKey(SAVED_DISHES_KEY);
}

export async function getSavedDishes() {
  const localKey = await savedDishesStorageKey();
  const raw = await AsyncStorage.getItem(localKey);
  if (raw) return JSON.parse(raw);
  const userId = await currentUserId();
  const { data, error } = await supabase
    .from('app_saved_dishes')
    .select('data, saved_at')
    .eq('user_id', userId)
    .order('saved_at', { ascending: false })
    .limit(MAX_SAVED_DISHES);
  assertNoError(error, 'Load saved dishes');
  const dishes = (data || []).map(row => ({
    ...row.data,
    saved_at: row.data?.saved_at ?? row.saved_at,
  }));
  await AsyncStorage.setItem(localKey, JSON.stringify(dishes));
  return dishes;
}

export async function saveDish(dish) {
  const current = await getSavedDishes();
  if (current.some(item => String(item.dish_id) === String(dish.dish_id))) return current;
  const entry = {
    dish_id: dish.dish_id,
    title: dish.title || '',
    image_url: dish.image_url || '',
    cook_time_min: dish.cook_time_min || 0,
    final_score: dish.final_score || 0,
    nation: dish.nation || '',
    url: dish.url || '',
    est_cost_vnd: dish.est_cost_vnd ?? null,
    est_cost_level: dish.est_cost_level ?? null,
    match_pct: dish.match_pct ?? null,
    explanation: dish.explanation || null,
    why: dish.why || null,
    saved_at: nowIso(),
  };
  const userId = await currentUserId();
  const { error } = await supabase.from('app_saved_dishes').upsert({
    user_id: userId,
    dish_id: String(dish.dish_id),
    data: entry,
    saved_at: entry.saved_at,
  }, { onConflict: 'user_id,dish_id' });
  assertNoError(error, 'Save dish');
  const updated = [entry, ...current].slice(0, MAX_SAVED_DISHES);
  await AsyncStorage.setItem(await savedDishesStorageKey(), JSON.stringify(updated));
  return updated;
}

export async function removeSavedDish(dishId) {
  const userId = await currentUserId();
  const { error } = await supabase
    .from('app_saved_dishes')
    .delete()
    .eq('user_id', userId)
    .eq('dish_id', String(dishId));
  assertNoError(error, 'Remove saved dish');
  const current = await getSavedDishes();
  const updated = current.filter(item => String(item.dish_id) !== String(dishId));
  await AsyncStorage.setItem(await savedDishesStorageKey(), JSON.stringify(updated));
  return updated;
}

export async function isDishSaved(dishId) {
  return (await getSavedDishes()).some(item => String(item.dish_id) === String(dishId));
}

export async function clearUserLocalCache() {
  try {
    const userId = _lastUserId;
    const allKeys = await AsyncStorage.getAllKeys();
    const keys = allKeys.filter(key =>
      key.startsWith(WEATHER_CACHE_PREFIX)
      || (userId && key.includes(`:${userId}`))
      || key === 'saved_dishes_v1'
      || key === 'recent_dishes_cache_v1'
    );
    if (keys.length) await AsyncStorage.multiRemove(keys);
    _ingredientCache = new Map();
    _lastUserId = null;
  } catch (error) {
    console.warn('[DB] clearUserLocalCache:', error.message);
  }
}

export const db = {
  getAllAsync: async (sql) => {
    if (sql.includes('personal_profile')) return [await loadProfile()].filter(Boolean);
    if (sql.includes('body_metrics')) return loadAllMetrics();
    if (sql.includes('allergy_list')) return loadAllergies();
    return [];
  },
  getFirstAsync: async (sql) => {
    if (sql.includes('body_metrics')) return loadLatestMetrics();
    if (sql.includes("'last_known_lat'")) return { value: await getSetting('last_known_lat') };
    if (sql.includes("'last_known_lon'")) return { value: await getSetting('last_known_lon') };
    if (sql.includes("'last_known_province'")) return { value: await getSetting('last_known_province') };
    return null;
  },
  runAsync: async () => ({ lastInsertRowId: null, changes: 0 }),
  execAsync: async () => {},
};
