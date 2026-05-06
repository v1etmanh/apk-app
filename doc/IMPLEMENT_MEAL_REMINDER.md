# 🍱 IMPLEMENT_MEAL_REMINDER.md
## Tính năng: Nhắc ăn theo giờ kiểu Duolingo — Daily Mate

> **Mục tiêu**: Mỗi ngày tầm 10:30 sáng và 17:00 chiều, app tự động đẩy một local notification  
> lên thiết bị người dùng — hiển thị tên món ăn được gợi ý hôm đó kèm thông tin dinh dưỡng nhỏ  
> và animation con mèo Lottie khi người dùng mở notification vào app.

---

## 1. Tổng quan kiến trúc

```
[expo-notifications]  ←  scheduleNotificationAsync (DailyTriggerInput)
        ↓
  Notification payload: { title, body, data: { dishId, dishName, nutrition } }
        ↓
  Người dùng tap notification
        ↓
  App mở → NotificationResponseListener → navigate đến MealReminderModal
        ↓
  MealReminderModal: Lottie con mèo + tên món + chip dinh dưỡng
```

---

## 2. Dependency cần cài

```bash
npx expo install expo-notifications
```

> ✅ `lottie-react-native` đã có sẵn trong `package.json` (~7.3.1)  
> ✅ `@react-native-async-storage/async-storage` đã có sẵn  
> ✅ `phosphor-react-native` đã có sẵn (dùng icon dinh dưỡng)

### Config `app.json` — bắt buộc thêm:

```json
{
  "expo": {
    "plugins": [
      "expo-notifications"
    ],
    "android": {
      "permissions": [
        "android.permission.RECEIVE_BOOT_COMPLETED",
        "android.permission.SCHEDULE_EXACT_ALARM"
      ]
    }
  }
}
```

> **Lý do**: Android 12+ yêu cầu `SCHEDULE_EXACT_ALARM` để notification kích hoạt đúng giờ  
> thay vì bị trì hoãn khi máy vào Doze mode. `RECEIVE_BOOT_COMPLETED` để tự reschedule  
> sau khi máy khởi động lại (expo-notifications tự thêm nhưng cần khai báo tường minh).

---

## 3. Cấu trúc file mới

```
mobile_app/
├── services/
│   └── mealReminderService.js     ← NEW: toàn bộ logic schedule/cancel/reschedule
├── components/
│   └── MealReminderModal.js       ← NEW: modal popup với Lottie mèo + info món
├── screens/
│   └── SettingsScreen.js          ← EDIT: thêm row "Nhắc ăn" với toggle + timepicker
├── store/
│   └── useAppStore.js             ← EDIT: thêm state reminderEnabled, reminderTimes
├── App.js                         ← EDIT: đăng ký NotificationResponseListener
└── doc/
    └── IMPLEMENT_MEAL_REMINDER.md ← file này
```

---

## 4. Chi tiết từng file

---

### 4.1 `services/mealReminderService.js` — MỚI

**Nhiệm vụ**: Quản lý toàn bộ vòng đời của notification lịch ăn.

```js
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getSetting, setSetting } from '../utils/database';

// Key lưu Firestore (settings_kv)
const KEY_ENABLED = 'meal_reminder_enabled';
const KEY_TIMES   = 'meal_reminder_times'; // JSON string

// Giờ mặc định
export const DEFAULT_REMINDER_TIMES = [
  { id: 'lunch', label: 'Bữa trưa', hour: 10, minute: 30 },
  { id: 'dinner', label: 'Bữa tối', hour: 17, minute: 0  },
];

// IDs để cancel đúng notification
const NOTIF_IDS = {
  lunch:  'daily_mate_lunch_reminder',
  dinner: 'daily_mate_dinner_reminder',
};
```

**Hàm `setupNotificationChannel()`** — Android O+ bắt buộc có channel:
```js
export async function setupNotificationChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('meal-reminders', {
      name: 'Nhắc ăn hàng ngày',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF8C42',
      sound: 'default',
    });
  }
}
```

> ⚠️ Android 8.0+ silently drops notification nếu không có channel —  
> đây là lý do phổ biến nhất khiến notification "không hiện". Phải setup trước khi schedule.

**Hàm `requestPermission()`**:
```js
export async function requestNotificationPermission() {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    const { status: newStatus } = await Notifications.requestPermissionsAsync();
    return newStatus === 'granted';
  }
  return true;
}
```

**Hàm `scheduleReminder(meal, dishInfo)`** — core function:
```js
export async function scheduleReminder(meal, dishInfo = null) {
  // Cancel cái cũ trước
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
        mealId: meal.id,
        dishName: dish.name,
        nutrition: dish.nutrition,
        screen: 'MealReminder',
      },
      sound: true,
      ...(Platform.OS === 'android' && { channelId: 'meal-reminders' }),
    },
    trigger: {
      hour: meal.hour,
      minute: meal.minute,
      repeats: true,
      // ⚠️ Không truyền channelId vào trigger — chỉ truyền vào content
      // (bug đã biết: DailyTriggerInput chỉ nhận đúng 3 keys: hour, minute, repeats)
    },
  });
}
```

> **Lưu ý quan trọng về DailyTriggerInput**:  
> Expo phát hiện trigger type bằng cách đếm số keys. `DailyTriggerInput` phải có **đúng 3 keys**:  
> `{ hour, minute, repeats: true }`. Thêm `channelId` vào trigger sẽ gây lỗi  
> *"Trigger of type: calendar is not supported on Android"*.  
> Channel phải đặt ở `content.channelId`, không phải `trigger.channelId`.

**Hàm `cancelAll()` và `rescheduleAll(times)`**:
```js
export async function cancelAllReminders() {
  await Promise.all(
    Object.values(NOTIF_IDS).map(id =>
      Notifications.cancelScheduledNotificationAsync(id).catch(() => {})
    )
  );
}

export async function rescheduleAllReminders(times, dishLookup = {}) {
  await cancelAllReminders();
  for (const meal of times) {
    await scheduleReminder(meal, dishLookup[meal.id] || null);
  }
}
```

**Hàm persistence (Firestore qua database.js)**:
```js
export async function loadReminderSettings() {
  const enabled = await getSetting(KEY_ENABLED);
  const timesRaw = await getSetting(KEY_TIMES);
  return {
    enabled: enabled === 'true',
    times: timesRaw ? JSON.parse(timesRaw) : DEFAULT_REMINDER_TIMES,
  };
}

export async function saveReminderSettings(enabled, times) {
  await setSetting(KEY_ENABLED, String(enabled));
  await setSetting(KEY_TIMES, JSON.stringify(times));
}
```

---

### 4.2 `components/MealReminderModal.js` — MỚI

**Nhiệm vụ**: Popup hiện khi người dùng tap notification, dùng Lottie mèo + info món.

```jsx
import React, { useRef, useEffect } from 'react';
import {
  Modal, View, Text, TouchableOpacity,
  StyleSheet, Dimensions, Animated,
} from 'react-native';
import LottieView from 'lottie-react-native';
import { C } from '../theme';
// Phosphor icons cho nutrition
import { Fire }         from 'phosphor-react-native/lib/module/icons/Fire';
import { Drop }         from 'phosphor-react-native/lib/module/icons/Drop';
import { Egg }          from 'phosphor-react-native/lib/module/icons/Egg';
import { Bread }        from 'phosphor-react-native/lib/module/icons/Bread';
import PaperCard        from './ui/PaperCard';
```

**Assets Lottie mèo có sẵn** (trong `assets/animations/`):
- `cat_orange.json`   → mèo cam vui vẻ — dùng cho bữa trưa
- `Lazy cat.json`     → mèo lười — dùng cho bữa tối
- `Cat Pookie.json`   → mèo cute — fallback
- `cat_gosh.json`     → mèo bật ngửa — dùng khi không có dish info

**Props của component**:
```js
// visible: boolean
// onClose: () => void
// onNavigate: () => void  ← navigate sang RecommendScreen
// dishName: string
// mealLabel: string  ('Bữa trưa' | 'Bữa tối')
// nutrition: { calories, protein, fat, carbs } | null
```

**Layout**:
```
╔══════════════════════════════╗
║  [PaperCard với wood texture]║
║                              ║
║    🐱  [Lottie mèo 120x120]  ║
║                              ║
║   "Đến giờ Bữa trưa rồi!"   ║
║   ─────────────────────────  ║
║      Cơm gà xối mỡ 🍽️       ║
║                              ║
║  🔥 480kcal  🥩 28g  🍞 52g  ║
║  (Nutrition chips hàng ngang)║
║                              ║
║  [ Xem gợi ý ]  [ Để sau ]  ║
╚══════════════════════════════╝
```

**Chi tiết animation**:
- Lottie chạy `autoPlay loop` khi modal mở
- Dùng `useRef` để `animRef.current?.reset()` mỗi lần modal re-open
- Scale-in animation cho modal bằng `Animated.spring` (giống Duolingo)

**Code skeleton**:
```jsx
export default function MealReminderModal({
  visible, onClose, onNavigate,
  dishName = 'Cơm gà xối mỡ',
  mealLabel = 'Bữa trưa',
  nutrition = null,
}) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const lottieRef = useRef(null);

  useEffect(() => {
    if (visible) {
      lottieRef.current?.reset();
      lottieRef.current?.play();
      Animated.spring(scaleAnim, {
        toValue: 1, tension: 80, friction: 8,
        useNativeDriver: true,
      }).start();
    } else {
      scaleAnim.setValue(0);
    }
  }, [visible]);

  const catSource = mealLabel.includes('trưa')
    ? require('../assets/animations/cat_orange.json')
    : require('../assets/animations/Lazy cat.json');

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <PaperCard>
            <LottieView
              ref={lottieRef}
              source={catSource}
              style={{ width: 120, height: 120, alignSelf: 'center' }}
              autoPlay loop
            />
            <Text style={styles.label}>Đến giờ {mealLabel} rồi!</Text>
            <Text style={styles.dishName}>{dishName} 🍽️</Text>

            {nutrition && (
              <View style={styles.chips}>
                <NutritionChip icon={<Fire />} value={`${nutrition.calories}kcal`} color="#E8512A" />
                <NutritionChip icon={<Egg />}  value={`${nutrition.protein}g đạm`} color="#2A8AE8" />
                <NutritionChip icon={<Bread />} value={`${nutrition.carbs}g tinh bột`} color="#E8A52A" />
              </View>
            )}

            <View style={styles.actions}>
              <TouchableOpacity onPress={onNavigate} style={styles.btnPrimary}>
                <Text style={styles.btnPrimaryText}>Xem gợi ý</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={styles.btnSecondary}>
                <Text style={styles.btnSecondaryText}>Để sau</Text>
              </TouchableOpacity>
            </View>
          </PaperCard>
        </Animated.View>
      </View>
    </Modal>
  );
}
```

---

### 4.3 `store/useAppStore.js` — EDIT

Thêm các state và action sau vào store:

```js
// Thêm vào state ban đầu:
reminderEnabled: false,
reminderTimes: [
  { id: 'lunch',  label: 'Bữa trưa', hour: 10, minute: 30 },
  { id: 'dinner', label: 'Bữa tối',  hour: 17, minute: 0  },
],
mealReminderModal: {         // state điều khiển modal
  visible: false,
  dishName: '',
  mealLabel: '',
  nutrition: null,
},

// Thêm các action:
setReminderEnabled: (val) => set({ reminderEnabled: val }),
setReminderTimes:   (val) => set({ reminderTimes: val }),
showMealReminderModal: (data) => set({
  mealReminderModal: { visible: true, ...data }
}),
hideMealReminderModal: () => set({
  mealReminderModal: { visible: false, dishName: '', mealLabel: '', nutrition: null }
}),

// Trong initializeApp (hoặc hàm init tương đương):
// gọi loadReminderSettings() từ mealReminderService
// set reminderEnabled và reminderTimes vào store
```

---

### 4.4 `App.js` — EDIT

**Bước 1**: Setup notification handler (đặt ở top-level, ngoài component):
```js
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});
```

**Bước 2**: Trong component `App`, thêm `useEffect` lắng nghe tap notification:
```js
useEffect(() => {
  // Setup channel ngay khi app khởi động
  setupNotificationChannel();

  // Listener: người dùng TAP vào notification (app đang background/killed)
  const responseSub = Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data;
    if (data?.screen === 'MealReminder') {
      useAppStore.getState().showMealReminderModal({
        dishName:  data.dishName  || 'Món ăn hôm nay',
        mealLabel: data.mealId === 'lunch' ? 'Bữa trưa' : 'Bữa tối',
        nutrition: data.nutrition || null,
      });
    }
  });

  // Listener: notification HIỆN khi app đang foreground
  const receiveSub = Notifications.addNotificationReceivedListener(notification => {
    const data = notification.request.content.data;
    if (data?.screen === 'MealReminder') {
      useAppStore.getState().showMealReminderModal({
        dishName:  data.dishName  || 'Món ăn hôm nay',
        mealLabel: data.mealId === 'lunch' ? 'Bữa trưa' : 'Bữa tối',
        nutrition: data.nutrition || null,
      });
    }
  });

  return () => {
    responseSub.remove();
    receiveSub.remove();
  };
}, []);
```

**Bước 3**: Render `MealReminderModal` ở root level (trong NavigationContainer):
```jsx
<NavigationContainer>
  {/* ... navigator ... */}
  <MealReminderModal
    visible={mealReminderModal.visible}
    dishName={mealReminderModal.dishName}
    mealLabel={mealReminderModal.mealLabel}
    nutrition={mealReminderModal.nutrition}
    onClose={hideMealReminderModal}
    onNavigate={() => {
      hideMealReminderModal();
      navigationRef.current?.navigate('Recommend');
    }}
  />
</NavigationContainer>
```

> Cần dùng `navigationRef` — thêm `const navigationRef = useRef()` và  
> `<NavigationContainer ref={navigationRef}>` để navigate từ ngoài component.

---

### 4.5 `screens/SettingsScreen.js` — EDIT

Thêm section "🔔 Nhắc ăn" vào sau section "Mức chi phí":

```jsx
{/* ── Meal Reminder Section ────────────────────────── */}
<SectionHeader title="Nhắc ăn" icon={<Bell weight="bold" size={16} color={C.textPrimary} />} />
<PaperCard>
  {/* Toggle bật/tắt */}
  <SettingRow
    label="Nhắc ăn hàng ngày"
    icon={<Bell size={20} color={C.accentGold} />}
    right={
      <Switch
        value={reminderEnabled}
        onValueChange={async (val) => {
          setReminderEnabled(val);
          await saveReminderSettings(val, reminderTimes);
          if (val) {
            const granted = await requestNotificationPermission();
            if (granted) await rescheduleAllReminders(reminderTimes);
          } else {
            await cancelAllReminders();
          }
        }}
        trackColor={{ true: C.accentGreen, false: C.cardBorder }}
        thumbColor={reminderEnabled ? '#fff' : '#ccc'}
      />
    }
  />

  {/* Giờ bữa trưa */}
  {reminderEnabled && (
    <TimePickerRow
      label="Bữa trưa"
      time={reminderTimes.find(t => t.id === 'lunch')}
      onChange={(newTime) => updateReminderTime('lunch', newTime)}
    />
  )}

  {/* Giờ bữa tối */}
  {reminderEnabled && (
    <TimePickerRow
      label="Bữa tối"
      time={reminderTimes.find(t => t.id === 'dinner')}
      onChange={(newTime) => updateReminderTime('dinner', newTime)}
    />
  )}
</PaperCard>
```

**`TimePickerRow`** component nhỏ (inline trong SettingsScreen):
- Hiển thị giờ dạng `"10:30"` 
- Tap → mở `WoodPicker` (đã có sẵn trong project) cho hour (0-23) và minute (0, 15, 30, 45)
- Sau khi chọn → `rescheduleAllReminders(newTimes)`

Import cần thêm:
```js
import { Switch } from 'react-native';
import { Bell } from 'phosphor-react-native/lib/module/icons/Bell';
import {
  loadReminderSettings, saveReminderSettings,
  requestNotificationPermission, rescheduleAllReminders, cancelAllReminders,
} from '../services/mealReminderService';
```

---

## 5. Luồng dữ liệu: Dish vào Notification

Hiện tại notification chỉ hiển thị tên món tĩnh (hoặc generic). Để nâng cấp:

### Phase 1 (MVP): Notification generic
- Notification body: `"🐱 Mèo đầu bếp nhắc bạn ăn trưa rồi!"`
- Khi tap → mở modal → navigate sang RecommendScreen để xem gợi ý

### Phase 2 (nâng cao): Notification có dish cụ thể
- Khi `HomeScreen` nhận được `rankedDishes` từ API → gọi `updateReminderDishInfo(dish)`
- `updateReminderDishInfo` lưu `dishName` + `nutrition` vào Firestore `settings_kv`
- `mealReminderService` đọc info này khi schedule notification

```js
// Trong HomeScreen sau khi fetch recommend:
const topDish = rankedDishes[0];
if (topDish && reminderEnabled) {
  await scheduleReminder(
    reminderTimes.find(t => t.id === 'lunch'),
    {
      name: topDish.dish_name,
      nutrition: {
        calories: topDish.estimated_calories,
        protein:  topDish.estimated_protein,
        fat:      topDish.estimated_fat,
        carbs:    topDish.estimated_carbs,
      }
    }
  );
}
```

---

## 6. Lottie Animation — Mapping

| Thời điểm         | File animation             | Lý do chọn              |
|-------------------|----------------------------|--------------------------|
| Bữa trưa (10:30)  | `cat_orange.json`          | Mèo cam năng động, vui   |
| Bữa tối (17:00)   | `Lazy cat.json`            | Mèo lười = relax buổi tối|
| Modal mở (generic)| `Cat Pookie.json`          | Mèo cute, dễ thương      |
| Không có dish info| `cat_gosh.json`            | Mèo ngạc nhiên           |
| Loading/xử lý     | `Cute cat works.json`      | Mèo làm việc             |

---

## 7. Thứ tự implement (từng bước)

```
Bước 1: Cài expo-notifications + update app.json
        → npx expo install expo-notifications
        → thêm plugin + permissions vào app.json
        → rebuild: npx expo run:android

Bước 2: Tạo services/mealReminderService.js
        → copy skeleton ở mục 4.1
        → test scheduleReminder với trigger { seconds: 10, repeats: false }
          (dùng interval trigger để test nhanh, không cần đợi đến 10:30)

Bước 3: Edit App.js
        → thêm setNotificationHandler ở top
        → thêm useEffect đăng ký 2 listener
        → thêm navigationRef

Bước 4: Tạo MealReminderModal.js
        → layout + Lottie mèo + chips dinh dưỡng
        → test với mock data

Bước 5: Edit useAppStore.js
        → thêm state + actions cho reminder

Bước 6: Edit SettingsScreen.js
        → thêm Toggle + TimePickerRow
        → kết nối với service

Bước 7: Render MealReminderModal trong App.js

Bước 8: Kết nối Phase 2 — HomeScreen ghi dish vào reminder
```

---

## 8. Gotchas & Lưu ý quan trọng

| Vấn đề | Giải pháp |
|--------|-----------|
| Android 12+ notification không đúng giờ | Thêm `SCHEDULE_EXACT_ALARM` permission vào `app.json` |
| Notification không hiện trên Android | Tạo `NotificationChannel` với `importance: HIGH` trước khi schedule |
| `DailyTriggerInput` lỗi "calendar not supported" | Không thêm `channelId` vào trigger, chỉ đặt ở `content` |
| Notification mất sau khi reboot | `expo-notifications` tự xử lý qua `RECEIVE_BOOT_COMPLETED` — đã OK |
| Expo Go vs Dev Build | Local notification **hoạt động trong Expo Go** — không cần dev build cho tính năng này |
| iOS permissions | Phải gọi `requestPermissionsAsync()` trước khi schedule — show dialog cho user |
| Lottie file "Lazy cat.json" có space | Dùng `require('../assets/animations/Lazy cat.json')` — RN handle được |
| Modal bị che bởi StatusBar | Wrap overlay bằng `SafeAreaView` hoặc dùng `paddingTop: insets.top` |

---

## 9. Test Plan

```
□ Bật reminder trong Settings → thấy permission dialog (iOS) hoặc không (Android < 13)
□ Schedule với trigger { seconds: 10 } → thấy notification sau 10 giây
□ Tap notification khi app background → modal mở với đúng dishName
□ Notification hiện khi app foreground → modal vẫn hiện (qua addNotificationReceivedListener)
□ Tắt reminder → cancelAllReminders → không còn notification nào
□ Đổi giờ bữa trưa → reschedule → notification cũ bị hủy, cái mới đúng giờ
□ Reboot máy → notification vẫn còn (RECEIVE_BOOT_COMPLETED)
□ Lottie mèo chạy smooth, không giật
□ Chip dinh dưỡng hiển thị đúng khi có/không có nutrition data
```

---

*File này được tạo: 06/05/2026 — Daily Mate Feature Planning*
