/**
 * mealPlanService.js — Lưu/đọc thực đơn hôm nay (AsyncStorage, local only)
 *
 * Data model:
 *   AsyncStorage key: meal_plan_YYYY-MM-DD
 *   Value (JSON):
 *   {
 *     date: 'YYYY-MM-DD',
 *     items: [
 *       {
 *         profileId:    string,
 *         displayName:  string,
 *         avatar:       string (emoji),
 *         relation:     string,
 *         dishes: [
 *           { dish_id, title, image_url, cook_time_min, nation, final_score, addedAt }
 *         ]
 *       }
 *     ]
 *   }
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Trả về key AsyncStorage cho 1 ngày cụ thể (mặc định hôm nay) */
function makePlanKey(date) {
  return `meal_plan_${date}`;
}

/** Trả về chuỗi 'YYYY-MM-DD' của hôm nay (device local time) */
export function getTodayDateStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Trả về label hiển thị kiểu "Thứ Ba, 03/05/2026" */
export function formatDisplayDate(dateStr) {
  try {
    const [y, m, dd] = dateStr.split('-').map(Number);
    const d = new Date(y, m - 1, dd);
    const days = ['Chủ Nhật','Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy'];
    return `${days[d.getDay()]}, ${String(dd).padStart(2,'0')}/${String(m).padStart(2,'0')}/${y}`;
  } catch {
    return dateStr;
  }
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

/** Đọc kế hoạch bữa ăn cho ngày `dateStr` (mặc định hôm nay) */
export async function getMealPlan(dateStr = getTodayDateStr()) {
  try {
    const raw = await AsyncStorage.getItem(makePlanKey(dateStr));
    if (!raw) return { date: dateStr, items: [] };
    return JSON.parse(raw);
  } catch (e) {
    console.warn('[MealPlan] getMealPlan error:', e);
    return { date: dateStr, items: [] };
  }
}

/** Lưu kế hoạch bữa ăn (ghi đè toàn bộ) */
async function saveMealPlan(plan) {
  try {
    await AsyncStorage.setItem(makePlanKey(plan.date), JSON.stringify(plan));
  } catch (e) {
    console.warn('[MealPlan] saveMealPlan error:', e);
  }
}

/**
 * Thêm 1 món vào bữa ăn của 1 profile hôm nay.
 * Nếu profile chưa có trong plan → tạo mới.
 * Nếu món đã tồn tại → bỏ qua (no-op).
 * Trả về plan đã cập nhật.
 */
export async function addDishToMealPlan(profileInfo, dish) {
  const { profileId, displayName, avatar, relation } = profileInfo;
  const plan = await getMealPlan();

  let entry = plan.items.find(i => i.profileId === profileId);
  if (!entry) {
    entry = { profileId, displayName, avatar: avatar || '🧑', relation: relation || 'other', dishes: [] };
    plan.items.push(entry);
  }

  const alreadyExists = entry.dishes.some(d => d.dish_id === dish.dish_id);
  if (!alreadyExists) {
    entry.dishes.push({
      dish_id:       dish.dish_id,
      title:         dish.title,
      image_url:     dish.image_url  || '',
      cook_time_min: dish.cook_time_min || 0,
      nation:        dish.nation     || '',
      final_score:   dish.final_score || 0,
      explanation:   dish.explanation?.[0] || '',
      addedAt:       new Date().toISOString(),
    });
  }

  await saveMealPlan(plan);
  return plan;
}

/**
 * Xoá 1 món khỏi bữa ăn của 1 profile hôm nay.
 * Nếu profile còn 0 món → xoá luôn profile entry khỏi plan.
 */
export async function removeDishFromMealPlan(profileId, dishId) {
  const plan = await getMealPlan();
  const entry = plan.items.find(i => i.profileId === profileId);
  if (entry) {
    entry.dishes = entry.dishes.filter(d => d.dish_id !== dishId);
    if (entry.dishes.length === 0) {
      plan.items = plan.items.filter(i => i.profileId !== profileId);
    }
  }
  await saveMealPlan(plan);
  return plan;
}

/** Reset toàn bộ bữa ăn hôm nay */
export async function resetTodayMealPlan() {
  try {
    await AsyncStorage.removeItem(makePlanKey(getTodayDateStr()));
  } catch (e) {
    console.warn('[MealPlan] resetTodayMealPlan error:', e);
  }
}

/**
 * Kiểm tra món `dishId` đã được thêm vào bữa hôm nay chưa
 * (bất kỳ profile nào).
 */
export async function isDishInTodayPlan(dishId) {
  try {
    const plan = await getMealPlan();
    return plan.items.some(i => i.dishes.some(d => d.dish_id === dishId));
  } catch {
    return false;
  }
}

/**
 * Kiểm tra món `dishId` đã được thêm bởi profile `profileId` chưa.
 */
export async function isDishInProfilePlan(profileId, dishId) {
  try {
    const plan = await getMealPlan();
    const entry = plan.items.find(i => i.profileId === profileId);
    return entry ? entry.dishes.some(d => d.dish_id === dishId) : false;
  } catch {
    return false;
  }
}

/**
 * Lấy tất cả dishes trong bữa hôm nay (gộp tất cả profiles, không trùng dish_id)
 * → dùng để đẩy sang MarketBasket
 */
export async function getAllDishesFromTodayPlan() {
  try {
    const plan = await getMealPlan();
    const seen = new Set();
    const result = [];
    plan.items.forEach(entry => {
      entry.dishes.forEach(dish => {
        if (!seen.has(dish.dish_id)) {
          seen.add(dish.dish_id);
          result.push(dish);
        }
      });
    });
    return result;
  } catch {
    return [];
  }
}
