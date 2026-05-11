// utils/provincesData.js
// Local JSON data layer cho provinces/taste-profile — thay thế Firestore getProvinces().
//
// Single source of truth: assets/data/provinces.json (exported từ server)
// Không cần network. Hoạt động offline hoàn toàn.
//
// Fields mỗi province:
//   id, name, food_region, climate_type, cuisine_culture,
//   taste: { sweet, sour, salty, bitter, umami, spicy, astringent },
//   regional_flavor_label: string

import provincesRaw from '../assets/data/provinces.json';

/** Toàn bộ 65 tỉnh/thành, sort theo tên */
export const ALL_PROVINCES = [...provincesRaw.data].sort((a, b) =>
  (a.name || '').localeCompare(b.name || '', 'vi')
);

/** Map id → province để lookup O(1) */
const _byId = new Map(ALL_PROVINCES.map(p => [p.id, p]));

/**
 * Lấy province theo id.
 * @param {number} id
 * @returns {object | undefined}
 */
export function getProvinceById(id) {
  return _byId.get(id);
}

/**
 * Lấy taste vector của province (fallback về DEFAULT_TASTE nếu không tìm thấy).
 * @param {number} provinceId
 * @returns {{ sweet, sour, salty, bitter, umami, spicy, astringent }}
 */
export function getTasteByProvinceId(provinceId) {
  const prov = _byId.get(provinceId);
  return prov?.taste ?? DEFAULT_TASTE;
}

/** Default taste khi không có province */
export const DEFAULT_TASTE = {
  sweet: 0.5, sour: 0.3, salty: 0.4,
  bitter: 0.1, umami: 0.5, spicy: 0.3, astringent: 0.1,
};

export default ALL_PROVINCES;
