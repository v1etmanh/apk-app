// services/onboardingService.js
// Onboarding 5 màn: gọi API flashcard / taste-profile, lưu nháp và lưu hồ sơ cuối cùng.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';
import { supabase } from '../store/supabase';
import {
  getActiveProfileId,
  loadAllIngredients,
  saveProfileMember,
  saveBodyMetricsForProfile,
  loadAllergiesForProfile,
  addAllergyForProfile,
  removeAllergyForProfile,
} from '../utils/database';
import { computeTasteWeightLocal, regionTaste } from '../utils/tasteMath';

export const ONBOARDING_VERSION = 1;

// true = luôn hiện onboarding mỗi lần mở app (để test). Đã có tab "Khẩu vị" để làm lại
// onboarding bất cứ lúc nào, nên mặc định chỉ hiện với hồ sơ chưa hoàn tất onboarding.
export const FORCE_ONBOARDING = false;
const DRAFT_KEY = 'onb_draft_v1';

// Nhóm dị ứng chuẩn (khớp ALLERGY_GROUPS ở server — taxonomy.py)
export const ALLERGY_OPTIONS = [
  { key: 'seafood',    emoji: '🦐' },
  { key: 'fish',       emoji: '🐟' },
  { key: 'beef',       emoji: '🐄' },
  { key: 'pork',       emoji: '🐖' },
  { key: 'legume_nut', emoji: '🥜' },
  { key: 'dairy_egg',  emoji: '🥚' },
  { key: 'vegetable',  emoji: '🥬' },
  { key: 'gluten',     emoji: '🌾' },
];
const ALLERGY_KEYS = new Set(ALLERGY_OPTIONS.map(o => o.key));

export const HOME_REGION_OPTIONS = [
  { key: 'northern', emoji: '🏞️' },
  { key: 'central',  emoji: '🌶️' },
  { key: 'southern', emoji: '🥥' },
  { key: 'national', emoji: '🇻🇳' },
];

export const NATION_OPTIONS = [
  { key: 'vietnam', emoji: '🇻🇳' },
  { key: 'other',   emoji: '🌏' },
];

export const DIET_OPTIONS = [
  { key: 'omnivore',   emoji: '🍖' },
  { key: 'vegetarian', emoji: '🥚' },
  { key: 'vegan',      emoji: '🌱' },
];

export const DEFAULT_DRAFT = {
  step: 0,
  gender: null,
  height: 165,
  weight: 55,
  nation: 'vietnam',
  home_region: null,
  diet_type: 'omnivore',
  allergies: [],         // nhóm dị ứng "hầu hết / tất cả" (vd. 'seafood')
  allergy_items: [],     // nguyên liệu cụ thể: [{ id, name, group }] — group null = thêm từ màn Dị ứng cũ
  noAllergy: false,
  cards: [],
  votes: {},            // { [dish_id]: 'like' | 'neutral' | 'dislike' }
  taste_weight: null,
  taste_source: null,
  liked_dish_ids: [],
  disliked_dish_ids: [],
};

// ── Cổng onboarding ──────────────────────────────────────────────────────────

/** User cũ = đã có chỉ số cơ thể hoặc khẩu vị từ trước → dữ liệu cũ được điền sẵn vào onboarding. */
export const isLegacyUser = (profile, latestMetrics) =>
  !!(latestMetrics?.height_cm || profile?.taste_profile);

/**
 * Mọi hồ sơ chưa hoàn tất onboarding (kể cả user cũ) đều phải đi qua 5 màn.
 * profile = null nghĩa là tải hồ sơ thất bại (App luôn tạo sẵn hồ sơ mặc định)
 * → không ép onboarding để tránh bắt user đã làm rồi làm lại khi mạng lỗi.
 */
export const needsOnboarding = (profile) =>
  FORCE_ONBOARDING || (!!profile && !profile.onboarding_completed_at);

/**
 * Banner "Cập nhật khẩu vị" ở Home: chỉ còn ý nghĩa khi onboarding bị bỏ qua
 * (vd. hồ sơ được tạo ở nơi khác) — giữ lại làm lối vào phụ.
 */
export const shouldShowTasteBanner = (profile) =>
  !!profile && !profile.onboarding_completed_at && !profile.taste_banner_dismissed;

// ── Nháp ─────────────────────────────────────────────────────────────────────

async function draftKey() {
  // Nháp riêng theo tài khoản + hồ sơ đang chọn (gia đình nhiều thành viên)
  const { data: { session } } = await supabase.auth.getSession();
  let profileId = 'default';
  try { profileId = (await getActiveProfileId()) || 'default'; } catch {}
  return `${DRAFT_KEY}:${session?.user?.id ?? 'anon'}:${profileId}`;
}

export async function loadDraft() {
  try {
    const raw = await AsyncStorage.getItem(await draftKey());
    return raw ? { ...DEFAULT_DRAFT, ...JSON.parse(raw) } : null;
  } catch { return null; }
}

export async function saveDraft(draft) {
  try { await AsyncStorage.setItem(await draftKey(), JSON.stringify(draft)); } catch {}
}

export async function clearDraft() {
  try { await AsyncStorage.removeItem(await draftKey()); } catch {}
}

// ── Dị ứng ───────────────────────────────────────────────────────────────────

/** Nhóm + id nguyên liệu cụ thể → danh sách key gửi server / lưu app_allergies. */
export const allergyKeysForRequest = (draft) => {
  if (draft.noAllergy) return [];
  return [
    ...(draft.allergies || []),
    ...(draft.allergy_items || []).map(i => String(i.id)),
  ];
};

// Fallback offline: nhóm → category nguyên liệu (khớp taxonomy.py ở server)
const GROUP_CATEGORY_FALLBACK = {
  seafood: ['Hải sản'], fish: ['Hải sản'], beef: ['Thịt'], pork: ['Thịt'],
  legume_nut: ['Đậu & Hạt'], dairy_egg: ['Sữa & Trứng'], vegetable: ['Rau củ'], gluten: ['Ngũ cốc & Tinh bột'],
};
const GROUP_NAME_FALLBACK = { fish: /^cá\s/i, beef: /(^|\s)bò(\s|$)/i, pork: /(^|\s)(heo|lợn)(\s|$)/i };

/** Nguyên liệu cụ thể trong một nhóm dị ứng (API, lỗi mạng → lọc từ danh sách nguyên liệu local). */
export async function fetchAllergyIngredients(group) {
  try {
    const res = await api.get('/api/v1/onboarding/allergy-ingredients', { params: { group } });
    if (Array.isArray(res.data?.ingredients)) return res.data.ingredients;
  } catch (e) {
    if (__DEV__) console.warn('[onboarding] allergy-ingredients fallback:', e?.message);
  }
  const all = await loadAllIngredients();
  const cats = new Set(GROUP_CATEGORY_FALLBACK[group] || []);
  const nameRe = GROUP_NAME_FALLBACK[group];
  return all
    .filter(i => cats.has(i.category) && (!nameRe || nameRe.test(`${i.name} `)))
    .map(i => ({ id: Number(i.id), name: i.name, category: i.category, dish_count: 0 }));
}

// ── API ──────────────────────────────────────────────────────────────────────

const normalizedNation = (nation) => (nation === 'vietnam' ? 'vietnam' : 'global');
const effectiveRegion = (draft) => (draft.nation === 'vietnam' ? (draft.home_region || 'national') : 'national');

export async function fetchFlashcards(draft) {
  const res = await api.post('/api/v1/onboarding/flashcards', {
    nation:      normalizedNation(draft.nation),
    home_region: effectiveRegion(draft),
    diet_type:   draft.diet_type,
    allergies:   allergyKeysForRequest(draft),
    seed:        Math.floor(Math.random() * 1e6),
  });
  return res.data?.cards ?? [];
}

/** Gọi server tính taste_weight; lỗi mạng → tính local cùng công thức. */
export async function computeTasteProfile(draft) {
  const region = effectiveRegion(draft);
  const votes = (draft.cards || [])
    .filter(c => draft.votes?.[c.dish_id])
    .map(c => ({ dish_id: c.dish_id, vote: draft.votes[c.dish_id], taste_profile: c.taste_profile }));
  try {
    const res = await api.post('/api/v1/onboarding/taste-profile', {
      home_region: region,
      votes: votes.map(({ dish_id, vote }) => ({ dish_id, vote })),
    });
    if (res.data?.taste_weight) {
      return {
        taste_weight:      res.data.taste_weight,
        source:            res.data.source,
        liked_dish_ids:    res.data.liked_dish_ids ?? [],
        disliked_dish_ids: res.data.disliked_dish_ids ?? [],
      };
    }
  } catch (e) {
    if (__DEV__) console.warn('[onboarding] taste-profile offline fallback:', e?.message);
  }
  return computeTasteWeightLocal(region, votes);
}

export const regionOnlyTaste = (draft) => ({
  taste_weight: regionTaste(effectiveRegion(draft)),
  source: 'region',
  liked_dish_ids: [],
  disliked_dish_ids: [],
});

// ── Lưu hồ sơ ────────────────────────────────────────────────────────────────

async function syncAllergies(profileId, draft, labelFor) {
  const rows = await loadAllergiesForProfile(profileId);
  const existing = new Set(rows.map(r => String(r.allergy_key)));
  const groups = draft.noAllergy ? [] : (draft.allergies || []);
  const items = draft.noAllergy ? [] : (draft.allergy_items || []);
  const wanted = new Map([
    ...groups.map(k => [k, labelFor(k)]),
    ...items.map(i => [String(i.id), i.name]),
  ]);
  // Onboarding quản lý nhóm chuẩn + nguyên liệu cụ thể (id số); key nhóm kiểu cũ giữ nguyên
  const managed = (k) => ALLERGY_KEYS.has(k) || /^\d+$/.test(k);
  const toRemove = [...existing].filter(k => managed(k) && !wanted.has(k));
  const toAdd = [...wanted.keys()].filter(k => !existing.has(k));
  await Promise.all([
    ...toRemove.map(k => removeAllergyForProfile(profileId, k)),
    ...toAdd.map(k => addAllergyForProfile(profileId, k, wanted.get(k))),
  ]);
}

/**
 * Ghi toàn bộ onboarding_profile vào Supabase.
 * @param {object} draft
 * @param {(key: string) => string} allergyLabel  nhãn hiển thị cho app_allergies.display_name
 * @returns {Promise<string>} profileId
 */
export async function completeOnboarding(draft, allergyLabel = (k) => k, target = {}) {
  // target.profileId + target.meta: tạo hồ sơ thành viên mới (tên, quan hệ, avatar…)
  const profileId = target.profileId || await getActiveProfileId();
  if (!profileId) throw new Error('No active profile');
  const now = new Date().toISOString();
  if (target.meta) {
    await saveProfileMember({ profileId, ...target.meta, created_at: now });
  }
  const nation = draft.nation === 'vietnam' ? 'vietnam' : 'other';
  const homeRegion = effectiveRegion(draft);
  const taste = draft.taste_weight || regionTaste(homeRegion);

  await saveProfileMember({
    profileId,
    gender:                  draft.gender || 'male',
    nation,
    home_region:             homeRegion,
    diet_type:               draft.diet_type || 'omnivore',
    taste_weight:            taste,
    // Đồng bộ màn TasteProfileScreen cũ
    taste_profile:           taste,
    taste_mode:              'manual',
    taste_updated_at:        now,
    liked_dish_ids:          draft.liked_dish_ids || [],
    disliked_dish_ids:       draft.disliked_dish_ids || [],
    onboarding_version:      ONBOARDING_VERSION,
    onboarding_completed_at: now,
    updated_at:              now,
  });

  await saveBodyMetricsForProfile(profileId, {
    height_cm:   Number(draft.height),
    weight_kg:   Number(draft.weight),
    measured_at: now,
    note:        'onboarding',
  });

  await syncAllergies(profileId, draft, allergyLabel);
  if (!target.meta) await clearDraft();
  return profileId;
}

/** Chỉ cập nhật phần khẩu vị (banner cho user cũ). */
export async function saveTasteOnly(draft) {
  const profileId = await getActiveProfileId();
  if (!profileId) throw new Error('No active profile');
  const now = new Date().toISOString();
  const taste = draft.taste_weight || regionTaste(effectiveRegion(draft));
  await saveProfileMember({
    profileId,
    nation:                  draft.nation === 'vietnam' ? 'vietnam' : 'other',
    home_region:             effectiveRegion(draft),
    taste_weight:            taste,
    taste_profile:           taste,
    taste_mode:              'manual',
    taste_updated_at:        now,
    liked_dish_ids:          draft.liked_dish_ids || [],
    disliked_dish_ids:       draft.disliked_dish_ids || [],
    onboarding_version:      ONBOARDING_VERSION,
    onboarding_completed_at: now,
  });
  await clearDraft();
  return profileId;
}

export async function dismissTasteBanner() {
  const profileId = await getActiveProfileId();
  if (profileId) await saveProfileMember({ profileId, taste_banner_dismissed: true });
}
