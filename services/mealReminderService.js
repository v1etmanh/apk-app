/**
 * services/mealReminderService.js
 * Quản lý toàn bộ vòng đời local notification nhắc ăn hàng ngày.
 *
 * ⚠️  expo-notifications ≥ 0.29 (SDK 53+): trigger BẮT BUỘC phải có `type`.
 *     Dùng enum Notifications.SchedulableTriggerInputTypes:
 *       - DAILY         → { type, hour, minute }  (lặp mỗi ngày)
 *       - TIME_INTERVAL → { type, seconds, repeats }  (dev/test)
 *     Trigger dạng { hour, minute, repeats } (không có type) sẽ ném lỗi
 *     "The trigger object you provided is invalid. It needs to contain a type".
 *
 *     channelId chỉ đặt ở content.channelId (Android), KHÔNG phải trigger.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getSetting, setSetting } from '../utils/database';

// ── Firestore/AsyncStorage keys ──────────────────────────────────────────────
const KEY_ENABLED = 'meal_reminder_enabled';
const KEY_TIMES   = 'meal_reminder_times';

// ── Defaults ─────────────────────────────────────────────────────────────────
export const DEFAULT_REMINDER_TIMES = [
  { id: 'lunch',  label: 'Bữa trưa', hour: 10, minute: 30 },
  { id: 'dinner', label: 'Bữa tối',  hour: 17, minute: 0  },
];

// Stable IDs để cancel đúng notification (không dùng random ID)
const NOTIF_IDS = {
  lunch:  'daily_mate_lunch_reminder',
  dinner: 'daily_mate_dinner_reminder',
};

// ── Android notification channel (bắt buộc cho Android 8+) ──────────────────
export async function setupNotificationChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('meal-reminders', {
    name: 'Nhắc ăn hàng ngày',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF8C42',
    sound: 'default',
  });
}

// ── Permission ────────────────────────────────────────────────────────────────
export async function requestNotificationPermission() {
  const { status } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return true;
  const { status: newStatus } = await Notifications.requestPermissionsAsync();
  return newStatus === 'granted';
}

// ── Copy văn chương theo bữa ──────────────────────────────────────────────────
const LUNCH_TITLES = [
  (name) => `Trưa nay ăn ${name} đi! 🍚`,
  (name) => `${name} đang chờ bạn nè~ 🥢`,
  (name) => `Bụng réo chưa? ${name} ngon lắm đó 👀`,
  (name) => `Hôm nay thử ${name} xem sao nhé 🍽️`,
  (name) => `Mèo đầu bếp gợi ý: ${name} 🐱`,
];

const DINNER_TITLES = [
  (name) => `Tối nay ${name} là chuẩn rồi 🌙`,
  (name) => `Tan làm rồi, ${name} thôi nào~ 🍜`,
  (name) => `${name} — phần thưởng cuối ngày xứng đáng 🥰`,
  (name) => `Buổi tối nhẹ nhàng với ${name} nhé 🌿`,
  (name) => `Đói chưa? ${name} đang gọi tên bạn đó 👋`,
];

const LUNCH_BODIES = [
  (dish) => `Nạp năng lượng buổi chiều ngay thôi, đừng để bụng réo nhé! 🔋`,
  (dish) => dish.nutrition ? `🔥 ${dish.nutrition.calories}kcal · đủ năng lượng cho cả buổi chiều` : `Ăn no rồi chiều làm mới có sức 💪`,
  (dish) => `Bỏ bữa trưa là chiều ngủ gật đó nghen~ 😴`,
  (dish) => dish.nutrition ? `🥩 ${dish.nutrition.protein}g đạm · ngon mà lành nữa` : `Món hôm nay hợp thời tiết lắm đó 🌤️`,
  (dish) => `Giữa ngày bận rộn, dành 30 phút ăn ngon cho bản thân nhé 🫶`,
];

const DINNER_BODIES = [
  (dish) => `Cả ngày vất vả rồi, tối nay ăn gì ngon ngon đi 🌙`,
  (dish) => dish.nutrition ? `🔥 ${dish.nutrition.calories}kcal · nhẹ nhàng, không lo nặng bụng` : `Tối ăn vừa đủ, ngủ mới ngon 😴`,
  (dish) => `Hết giờ làm rồi — thời gian cho bản thân và gia đình 🏠`,
  (dish) => dish.nutrition ? `🥩 ${dish.nutrition.protein}g đạm · ${dish.nutrition.carbs}g tinh bột · cân bằng đủ thứ` : `Bữa tối ngon là ngủ ngon, mà ngủ ngon là ngày mai xịn 💫`,
  (dish) => `Đừng bỏ bữa tối — cơ thể cần phục hồi sau một ngày dài 🌿`,
];

function pickRandom(arr, seed) {
  // Dùng seed từ giờ hiện tại để mỗi slot khác nhau nhưng ổn định trong cùng 1 slot
  const idx = Math.floor(Math.abs(Math.sin(seed) * 9999)) % arr.length;
  return arr[idx];
}

function buildNotifCopy(meal, dish) {
  const seed = Date.now() / 1000 / 300; // đổi mỗi 5 phút
  if (meal.id === 'lunch') {
    const titleFn = pickRandom(LUNCH_TITLES, seed);
    const bodyFn  = pickRandom(LUNCH_BODIES, seed + 1);
    return { title: titleFn(dish.name), body: bodyFn(dish) };
  } else {
    const titleFn = pickRandom(DINNER_TITLES, seed);
    const bodyFn  = pickRandom(DINNER_BODIES, seed + 1);
    return { title: titleFn(dish.name), body: bodyFn(dish) };
  }
}

// ── Schedule một meal ─────────────────────────────────────────────────────────
/**
 * @param {object} meal  - { id, label, hour, minute }
 * @param {object|null} dishInfo - { name, nutrition: { calories, protein, fat, carbs } } | null
 */
export async function scheduleReminder(meal, dishInfo = null) {
  await Notifications.cancelScheduledNotificationAsync(NOTIF_IDS[meal.id]).catch(() => {});

  const dish = dishInfo || { name: 'món ăn hôm nay', nutrition: null };
  const { title, body } = buildNotifCopy(meal, dish);

  await Notifications.scheduleNotificationAsync({
    identifier: NOTIF_IDS[meal.id],
    content: {
      title,
      body,
      data: {
        screen:    'MealReminder',
        mealId:    meal.id,
        dishName:  dish.name,
        nutrition: dish.nutrition,
      },
      sound: true,
      // channelId ĐẶT Ở ĐÂY (content), KHÔNG phải trigger
      ...(Platform.OS === 'android' && { channelId: 'meal-reminders' }),
    },
    trigger: {
      // expo-notifications ≥ 0.29 (SDK 53+) bắt buộc phải có `type` trong trigger.
      // DAILY trigger = lặp lại mỗi ngày đúng giờ đó.
      type:   Notifications.SchedulableTriggerInputTypes.DAILY,
      hour:   meal.hour,
      minute: meal.minute,
    },
  });
}

// ── Cancel tất cả ─────────────────────────────────────────────────────────────
export async function cancelAllReminders() {
  await Promise.all(
    Object.values(NOTIF_IDS).map(id =>
      Notifications.cancelScheduledNotificationAsync(id).catch(() => {})
    )
  );
}

// ── Reschedule tất cả (dùng khi đổi giờ) ────────────────────────────────────
export async function rescheduleAllReminders(times = DEFAULT_REMINDER_TIMES, dishLookup = {}) {
  await cancelAllReminders();
  for (const meal of times) {
    await scheduleReminder(meal, dishLookup[meal.id] || null);
  }
}

// ── [DEV ONLY] Test notification mỗi 5 giây ─────────────────────────────────
export async function scheduleTestNotification() {
  if (!__DEV__) return;

  await Notifications.cancelScheduledNotificationAsync('dev_test_notif').catch(() => {});

  // Random bữa trưa / tối để test cả 2 kiểu copy
  const isMorning = new Date().getHours() < 14;
  const meal = isMorning
    ? { id: 'lunch',  label: 'Bữa trưa', hour: 10, minute: 30 }
    : { id: 'dinner', label: 'Bữa tối',  hour: 17, minute: 0  };

  const testDishes = [
    { name: 'Bún bò Huế',      nutrition: { calories: 480, protein: 28, fat: 12, carbs: 55 } },
    { name: 'Cơm gà xối mỡ',   nutrition: { calories: 520, protein: 32, fat: 18, carbs: 60 } },
    { name: 'Phở bò tái chín',  nutrition: { calories: 420, protein: 30, fat: 10, carbs: 50 } },
    { name: 'Bánh mì thịt nướng', nutrition: { calories: 380, protein: 22, fat: 14, carbs: 45 } },
  ];
  const dish = testDishes[Math.floor(Math.random() * testDishes.length)];
  const { title, body } = buildNotifCopy(meal, dish);

  await Notifications.scheduleNotificationAsync({
    identifier: 'dev_test_notif',
    content: {
      title,
      body,
      data: {
        screen:    'MealReminder',
        mealId:    meal.id,
        dishName:  dish.name,
        nutrition: dish.nutrition,
      },
      sound: true,
      ...(Platform.OS === 'android' && { channelId: 'meal-reminders' }),
    },
    trigger: {
      type:    Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
      repeats: true,
    },
  });

  console.log('[DEV] Test notification scheduled — every 5s:', title);
}

export async function cancelTestNotification() {
  await Notifications.cancelScheduledNotificationAsync('dev_test_notif').catch(() => {});
  console.log('[DEV] Test notification cancelled');
}
export async function loadReminderSettings() {
  try {
    const [enabled, timesRaw] = await Promise.all([
      getSetting(KEY_ENABLED),
      getSetting(KEY_TIMES),
    ]);
    return {
      enabled: enabled === 'true',
      times:   timesRaw ? JSON.parse(timesRaw) : DEFAULT_REMINDER_TIMES,
    };
  } catch {
    return { enabled: false, times: DEFAULT_REMINDER_TIMES };
  }
}

export async function saveReminderSettings(enabled, times) {
  await Promise.all([
    setSetting(KEY_ENABLED, String(enabled)),
    setSetting(KEY_TIMES, JSON.stringify(times)),
  ]);
}
