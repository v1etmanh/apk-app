// services/tasteProfileService.js
// F08 — Taste Profile CRUD
//
// Provinces là dữ liệu tĩnh local; khẩu vị được lưu trong hồ sơ Supabase.

import {
  getActiveProfileId,
  loadTasteProfileForProfile,
  saveTasteProfileForProfile,
} from '../utils/database';

// Local JSON — provinces + default taste
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
 * Lấy taste profile của hồ sơ đang hoạt động.
 * @param {string} profileId
 * @returns {{ tasteProfile, hometownProvinceId, tasteMode } | null}
 */
export const getTasteProfile = async (profileId) => {
  try {
    const resolvedId = profileId && profileId !== 'local_user'
      ? profileId
      : await getActiveProfileId();
    return resolvedId ? loadTasteProfileForProfile(resolvedId) : null;
  } catch (e) {
    console.error('[tasteProfileService] getTasteProfile:', e);
    return null;
  }
};

/**
 * Lưu taste profile vào hồ sơ Supabase đang hoạt động.
 * @param {string} profileId
 * @param {{ tasteProfile, hometownProvinceId, tasteMode }} data
 */
export const saveTasteProfile = async (profileId, data) => {
  const resolvedId = profileId && profileId !== 'local_user'
    ? profileId
    : await getActiveProfileId();
  if (!resolvedId) throw new Error('No active profile');
  await saveTasteProfileForProfile(resolvedId, data);
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
