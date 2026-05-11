// services/tasteProfileService.js
// F08 — Taste Profile CRUD
//
// Provinces đã migrate sang local JSON (assets/data/provinces.json).
// Firestore chỉ còn dùng để lưu/đọc taste profile của từng user.

import { firestore } from '../utils/firebaseConfig';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

// Local JSON — provinces + default taste (thay thế FALLBACK_PROVINCES & Firestore query)
import { ALL_PROVINCES, DEFAULT_TASTE } from '../utils/provincesData';

// Re-export để các screen import từ 1 chỗ không cần đổi
export { DEFAULT_TASTE };

// ─── Bảng mapping food_region → default_taste_profile ─────────────────────────
export const REGION_FLAVOR_MAP = {
  red_river_delta:   { sweet:0.3, sour:0.2, salty:0.4, bitter:0.1, umami:0.5, spicy:0.2, astringent:0.1 },
  northern_highland: { sweet:0.2, sour:0.4, salty:0.5, bitter:0.1, umami:0.4, spicy:0.3, astringent:0.2 },
  central_coast:     { sweet:0.1, sour:0.2, salty:0.6, bitter:0.1, umami:0.5, spicy:0.7, astringent:0.1 },
  central_highland:  { sweet:0.3, sour:0.2, salty:0.3, bitter:0.2, umami:0.4, spicy:0.2, astringent:0.2 },
  southeast:         { sweet:0.4, sour:0.2, salty:0.4, bitter:0.1, umami:0.5, spicy:0.3, astringent:0.1 },
  mekong_delta:      { sweet:0.6, sour:0.2, salty:0.3, bitter:0.1, umami:0.5, spicy:0.2, astringent:0.1 },
  urban_major:       { sweet:0.3, sour:0.2, salty:0.3, bitter:0.1, umami:0.5, spicy:0.3, astringent:0.1 },
};

// ─── API Functions ─────────────────────────────────────────────────────────────

/**
 * Lấy taste_profile của user từ Firestore.
 * @param {string} uid
 * @returns {{ tasteProfile, hometownProvinceId, tasteMode } | null}
 */
export const getTasteProfile = async (uid) => {
  try {
    const ref = doc(firestore, 'users', uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      tasteProfile:       data.taste_profile       ?? null,
      hometownProvinceId: data.hometown_province_id ?? null,
      tasteMode:          data.taste_mode           ?? 'hometown',
    };
  } catch (e) {
    console.error('[tasteProfileService] getTasteProfile:', e);
    return null;
  }
};

/**
 * Lưu taste_profile lên Firestore (merge: true để không ghi đè field khác).
 * @param {string} uid
 * @param {{ tasteProfile, hometownProvinceId, tasteMode }} data
 */
export const saveTasteProfile = async (uid, { tasteProfile, hometownProvinceId, tasteMode }) => {
  const ref = doc(firestore, 'users', uid);
  await setDoc(ref, {
    taste_profile:        tasteProfile,
    hometown_province_id: hometownProvinceId ?? null,
    taste_mode:           tasteMode,
    taste_updated_at:     serverTimestamp(),
  }, { merge: true });
};

/**
 * Lấy 65 tỉnh — từ local JSON (offline-first, không cần network).
 * Interface giữ nguyên (trả Promise<array>) để caller không đổi gì.
 */
export const getProvinces = () => Promise.resolve(ALL_PROVINCES);

/**
 * Map food_region sang default_taste_profile.
 * @param {string} foodRegion
 */
export const regionToTaste = (foodRegion) =>
  REGION_FLAVOR_MAP[foodRegion] ?? DEFAULT_TASTE;
