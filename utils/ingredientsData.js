// utils/ingredientsData.js
// Local JSON fallback cho ingredients khi API không khả dụng.
//
// Single source of truth: assets/data/ingredients.json (exported từ server)
// Không cần network. Hoạt động offline hoàn toàn.
//
// Fields mỗi ingredient: { id: number, name: string, name_en: string, category: string, member_ids: number[] }
//
// Bộ phận con (parent_id != null, vd. sườn heo, ba chỉ) KHÔNG hiển thị riêng: chúng được gộp
// vào nguyên liệu gốc (thịt heo) qua member_ids. Backend tự mở rộng id gốc khi lọc món.

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
const _membersByParent = new Map();
for (const ing of ingredientsRaw.data) {
  if (ing.parent_id == null) continue;
  if (!_membersByParent.has(ing.parent_id)) _membersByParent.set(ing.parent_id, []);
  _membersByParent.get(ing.parent_id).push(ing.id);
}

export const ALL_INGREDIENTS = ingredientsRaw.data
  .filter(i => i.parent_id == null)
  .map(({ parent_id, ...i }) => ({ ...i, member_ids: _membersByParent.get(i.id) ?? [] }))
  .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'vi'));

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

/**
 * Map id bộ phận con → id nguyên liệu gốc, dựng từ member_ids của list đang hiển thị
 * (API hoặc fallback). Dùng để chuyển lựa chọn cũ (vd. "sườn heo") sang "thịt heo".
 */
export function buildMemberToParentMap(ingredients) {
  const map = new Map();
  for (const ing of ingredients || []) {
    for (const mid of ing.member_ids || []) map.set(mid, ing.id);
  }
  return map;
}

// ─── Ảnh nguyên liệu (repo concop19/daily-mate-assets, qua CDN jsDelivr) ──────
// thumb = 256px (card/tile), icon = 96px (list). Ảnh gốc 1024px không dùng trong app.
const INGREDIENT_IMG_BASE = 'https://cdn.jsdelivr.net/gh/concop19/daily-mate-assets@main/ingredients';

export function getIngredientImageUrl(id, variant = 'thumb') {
  if (id == null || id === '') return null;
  return `${INGREDIENT_IMG_BASE}/${variant === 'icon' ? 'icon' : 'thumb'}/ingredient_${id}.webp`;
}

/** Emoji fallback theo category (key tiếng Việt trong ingredients.json). */
export const CATEGORY_EMOJI = {
  'Dầu & Mỡ': '🫙',
  'Gia vị': '🧄',
  'Hải sản': '🦐',
  'Ngũ cốc & Tinh bột': '🌾',
  'Rau củ': '🥦',
  'Sữa & Trứng': '🥚',
  'Thịt': '🥩',
  'Trái cây': '🍎',
  'Đã chế biến': '🥫',
  'Đậu & Hạt': '🥜',
  'Đồ uống': '🥤',
};

export { CATEGORY_EN };

export default ALL_INGREDIENTS;
