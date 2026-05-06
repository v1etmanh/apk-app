/**
 * services/mealReminderService.js
 * Quản lý toàn bộ vòng đời local notification nhắc ăn hàng ngày.
 *
 * ⚠️  DailyTriggerInput phải có ĐÚNG 3 keys: { hour, minute, repeats }.
 *     Không thêm channelId vào trigger — chỉ đặt ở content.channelId.
 *     (Bug: thêm key thừa → "Trigger of type: calendar is not supported on Android")
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

// ── Schedule một meal ─────────────────────────────────────────────────────────
/**
 * @param {object} meal  - { id, label, hour, minute }
 * @param {object|null} dishInfo - { name, nutrition: { calories, protein, fat, carbs } } | null
 */
export async function scheduleReminder(meal, dishInfo = null) {
  // Cancel bản cũ trước để tránh duplicate
  await Notifications.cancelScheduledNotificationAsync(NOTIF_IDS[meal.id]).catch(() => {});

  const dish = dishInfo || { name: 'món ăn hôm nay', nutrition: null };

  const nutritionLine = dish.nutrition
    ? `🔥 ${dish.nutrition.calories}kcal · 🥩 ${dish.nutrition.protein}g đạm`
    : '🐱 Mèo đầu bếp đã chọn cho bạn!';

  await Notifications.scheduleNotificationAsync({
    identifier: NOTIF_IDS[meal.id],
    content: {
      title: `${meal.label} — ${dish.name} 🍽️`,
      body: nutritionLine,
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
      // DailyTriggerInput: đúng 3 keys, không thêm bất kỳ key nào khác
      hour:    meal.hour,
      minute:  meal.minute,
      repeats: true,
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

// ── Persistence (qua database.js settings_kv) ────────────────────────────────
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
