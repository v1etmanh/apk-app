// utils/ingredientsData.js
// Local JSON data layer cho ingredients — thay thế Firestore loadAllIngredients().
//
// Single source of truth: assets/data/ingredients.json (exported từ server)
// Không cần network. Hoạt động offline hoàn toàn.
//
// Fields mỗi ingredient: { id: number, name: string, name_en: string, category: string }

import ingredientsRaw from '../assets/data/ingredients.json';

/** Toàn bộ danh sách ingredients, đã sort theo tên tiếng Việt */
export const ALL_INGREDIENTS = [...ingredientsRaw.data].sort((a, b) =>
  (a.name || '').localeCompare(b.name || '', 'vi')
);

/** Map id → ingredient để lookup O(1) */
const _byId = new Map(ALL_INGREDIENTS.map(i => [i.id, i]));

/** Map category → ingredients[] để group O(1) */
const _byCategory = new Map();
for (const ing of ALL_INGREDIENTS) {
  const cat = ing.category || 'other';
  if (!_byCategory.has(cat)) _byCategory.set(cat, []);
  _byCategory.get(cat).push(ing);
}

/**
 * Lấy ingredient theo id.
 * @param {number} id
 * @returns {{ id, name, name_en, category } | undefined}
 */
export function getIngredientById(id) {
  return _byId.get(id);
}

/**
 * Lấy danh sách ingredients theo category.
 * @param {string} category
 * @returns {Array<{ id, name, name_en, category }>}
 */
export function getIngredientsByCategory(category) {
  return _byCategory.get(category) ?? [];
}

/**
 * Lấy tất cả category keys có trong data.
 * @returns {string[]}
 */
export function getAllCategories() {
  return Array.from(_byCategory.keys()).sort();
}

/**
 * Tìm kiếm ingredients theo tên (Việt hoặc Anh).
 * @param {string} query
 * @returns {Array<{ id, name, name_en, category }>}
 */
export function searchIngredients(query) {
  if (!query || !query.trim()) return ALL_INGREDIENTS;
  const q = query.trim().toLowerCase();
  return ALL_INGREDIENTS.filter(i =>
    (i.name || '').toLowerCase().includes(q) ||
    (i.name_en || '').toLowerCase().includes(q)
  );
}

export default ALL_INGREDIENTS;
