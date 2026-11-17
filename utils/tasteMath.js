// utils/tasteMath.js
// Bản JS của công thức server (demo_server/onboarding.py → compute_taste_profile).
// Dùng làm fallback khi mất mạng ở Màn 4/5 của onboarding.

export const TASTE_KEYS = ['sweet', 'sour', 'salty', 'bitter', 'umami', 'spicy', 'astringent'];

export const VOTE_WEIGHTS = { like: 1.0, neutral: 0.25, dislike: -0.6 };

const REGION_BLEND = 0.4;
const TASTE_MIN = 0.05;
const TASTE_MAX = 0.95;

const TASTE_DEFAULTS = {
  spicy: 0.5, sweet: 0.5, sour: 0.4, umami: 0.6, salty: 0.4, bitter: 0.2, astringent: 0.1,
};

// Đồng bộ HOME_REGION_FLAVOR ở server (taxonomy.py)
export const HOME_REGION_FLAVOR = {
  northern: { sweet: 0.3, sour: 0.2, salty: 0.4, bitter: 0.1, umami: 0.5, spicy: 0.2, astringent: 0.1 },
  central:  { sweet: 0.1, sour: 0.2, salty: 0.6, bitter: 0.1, umami: 0.5, spicy: 0.7, astringent: 0.1 },
  southern: { sweet: 0.6, sour: 0.2, salty: 0.3, bitter: 0.1, umami: 0.5, spicy: 0.2, astringent: 0.1 },
  national: { sweet: 0.3, sour: 0.2, salty: 0.3, bitter: 0.1, umami: 0.5, spicy: 0.3, astringent: 0.1 },
};

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const round2 = (v) => Math.round(v * 100) / 100;

export const regionTaste = (homeRegion) => {
  const region = { ...TASTE_DEFAULTS, ...(HOME_REGION_FLAVOR[homeRegion] || HOME_REGION_FLAVOR.national) };
  const out = {};
  TASTE_KEYS.forEach(k => { out[k] = round2(clamp(region[k], TASTE_MIN, TASTE_MAX)); });
  return out;
};

/**
 * @param {string} homeRegion
 * @param {Array<{ vote: 'like'|'neutral'|'dislike', taste_profile: object, dish_id: string }>} votes
 *        taste_profile đã chuẩn hoá 0..1 (server trả về trong mỗi flashcard)
 */
export const computeTasteWeightLocal = (homeRegion, votes = []) => {
  const region = { ...TASTE_DEFAULTS, ...(HOME_REGION_FLAVOR[homeRegion] || HOME_REGION_FLAVOR.national) };
  const num = Object.fromEntries(TASTE_KEYS.map(k => [k, 0]));
  let den = 0;
  let anyPositive = false;
  const liked = [];
  const disliked = [];

  votes.forEach(v => {
    const w = VOTE_WEIGHTS[v?.vote];
    if (w == null || !v.taste_profile) return;
    if (v.vote === 'like') liked.push(String(v.dish_id));
    if (v.vote === 'dislike') disliked.push(String(v.dish_id));
    if (w > 0) anyPositive = true;
    TASTE_KEYS.forEach(k => { num[k] += w * (Number(v.taste_profile[k]) || 0); });
    den += Math.abs(w);
  });

  let taste;
  let source;
  if (den <= 0 || !anyPositive) {
    taste = regionTaste(homeRegion);
    source = 'region';
  } else {
    taste = {};
    TASTE_KEYS.forEach(k => {
      const signal = num[k] / den;
      const pref = (signal + 0.6) / 1.6;
      taste[k] = round2(clamp(REGION_BLEND * region[k] + (1 - REGION_BLEND) * pref, TASTE_MIN, TASTE_MAX));
    });
    source = 'flashcards';
  }
  return { taste_weight: taste, source, liked_dish_ids: liked, disliked_dish_ids: disliked };
};

/** Các vị nổi bật (>= 35%) sắp giảm dần — dùng cho thẻ tổng kết Màn 5. */
export const tasteSummary = (taste = {}) =>
  TASTE_KEYS
    .filter(k => (taste[k] ?? 0) >= 0.35)
    .sort((a, b) => taste[b] - taste[a])
    .map(k => ({ key: k, pct: Math.round(taste[k] * 100) }));
