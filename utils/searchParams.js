// utils/searchParams.js
// Dựng tham số chung cho /api/v1/suggest-ingredients và /api/v1/recommend.
// Home dựng `baseParams` 1 lần → IngredientSuggest / MarketBasket thêm nguyên liệu → Recommend.

/**
 * @param {object} p
 * @param {object} p.profile, p.latestMetrics, p.tasteProfile
 * @param {Array}  p.allergies
 * @param {number} p.maxPrepTime, p.costPreference
 * @param {{lat:number, lon:number}} p.location  (đã chuẩn hoá)
 * @param {object} p.weather
 * @param {string} p.dishFilter      'all' | 'soup' | 'main_dish'
 * @param {string[]} p.tools         dụng cụ bếp (pot, pan, …)
 * @param {string} p.cuisineScope
 */
export function buildBaseSearchParams({
  profile, latestMetrics, tasteProfile, allergies, maxPrepTime, costPreference,
  location, weather, dishFilter = 'all', tools = [], cuisineScope = 'global',
}) {
  const personal = {
    gender: profile?.gender || 'female',
    height: latestMetrics?.height_cm || 160,
    weight: latestMetrics?.weight_kg || 55,
    diet_type: profile?.diet_type || 'omnivore',
    // Onboarding: khẩu vị (7 vị 0..1), vùng miền, món đã like/dislike.
    // tasteProfile (store) luôn là bản mới nhất — onboarding ghi cả taste_profile lẫn taste_weight
    taste_weight: tasteProfile || profile?.taste_profile || profile?.taste_weight || undefined,
    home_region: profile?.home_region || undefined,
    nation: profile?.nation || undefined,
    liked_dish_ids: profile?.liked_dish_ids || [],
    disliked_dish_ids: profile?.disliked_dish_ids || [],
    allergies: allergies || [],
    max_prep_time: maxPrepTime ?? 60,
  };
  return {
    // [FIX ID-M014] Round về 2 decimal (~1km precision) — đủ recommend theo vùng, không lộ địa chỉ nhà
    lat: Math.round(location.lat * 100) / 100,
    lon: Math.round(location.lon * 100) / 100,
    weather,
    personal,
    cuisine_scope: cuisineScope,
    dish_type_filter: dishFilter,
    cost_preference: costPreference,
    meal_filters: tools?.length ? { cooking_tools: tools } : {},
    location,
  };
}

/** Thêm nguyên liệu đã chọn → tham số /recommend. mode: 'suggest' (soft) | 'fridge' (strict). */
export function withIngredients(baseParams, ingredientIds, mode) {
  const ids = (ingredientIds || []).map(Number).filter(Number.isFinite);
  return {
    ...baseParams,
    market_basket: ids.length
      ? { is_skipped: false, selected_ingredient_ids: ids, boost_strategy: mode === 'fridge' ? 'strict' : 'soft' }
      : { is_skipped: true, selected_ingredient_ids: [], boost_strategy: 'none' },
    meal_filters: { ...(baseParams.meal_filters || {}), mode },
  };
}
