// utils/ingredientsData.js
// Local JSON fallback cho ingredients khi API không khả dụng.
//
// Single source of truth: assets/data/ingredients.json (exported từ server)
// Không cần network. Hoạt động offline hoàn toàn.
//
// Fields mỗi ingredient: { id: number, name: string, name_en: string, category: string }

import ingredientsRaw from '../assets/data/ingredients.json';
import i18n from '../i18n';

const CATEGORY_EN = {
  'Dầu & Mỡ': 'Oils & Fats',
  'Gia vị': 'Seasonings',
  'Hải sản': 'Seafood',
  'Ngũ cốc & Tinh bột': 'Grains & Starches',
  'Rau củ': 'Vegetables',
  'Sữa & Trứng': 'Dairy & Eggs',
  'Thịt': 'Meat',
  'Trái cây': 'Fruits',
  'Đã chế biến': 'Processed Foods',
  'Đậu & Hạt': 'Legumes & Nuts',
  'Đồ uống': 'Beverages',
};

/** Toàn bộ danh sách ingredients, đã sort theo tên tiếng Việt */
export const ALL_INGREDIENTS = [...ingredientsRaw.data].sort((a, b) =>
  (a.name || '').localeCompare(b.name || '', 'vi')
);

/** UI projection: keep Vietnamese category keys for grouping, localize labels/names. */
export function getIngredientsForLanguage(language = i18n.language) {
  if (!String(language).startsWith('en')) return ALL_INGREDIENTS;
  return ALL_INGREDIENTS.map((ingredient) => ({
    ...ingredient,
    name_vi: ingredient.name,
    name: ingredient.name_en || ingredient.name,
    name_en: '',
    category_en: CATEGORY_EN[ingredient.category] || ingredient.category,
  }));
}

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

export { CATEGORY_EN };

export default ALL_INGREDIENTS;
