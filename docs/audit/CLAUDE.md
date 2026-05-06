# CLAUDE.md — Daily Mate Mobile · AI Agent Instructions

> Đọc file này TRƯỚC MỌI THAO TÁC. Đây là bản đồ app, kiến trúc thực tế,
> và context để audit chính xác mà không nhầm "cố ý" với "lỗi".

---

## 1. Tổng quan app

| Thuộc tính | Giá trị |
|---|---|
| Tên | Daily Mate — Mobile App (React Native) |
| Framework | React Native 0.81.5 · Expo SDK 54 |
| State | Zustand 4.5 (useAppStore.js) |
| Auth | Supabase (email/password + Google OAuth via expo-auth-session) |
| DB người dùng | Firebase Firestore (profiles, metrics, allergies, sessions, feedback) |
| DB món ăn | SQLite local trên server (read-only từ app) |
| API | Flask server via axios (services/api.js) |
| Token storage | expo-secure-store (Supabase session) |
| Settings storage | AsyncStorage (settings không nhạy cảm + deviceId) |
| UI Style | Ghibli watercolor/storybook — Lora, BeVietnamPro, Caveat fonts |
| Platform | Android primary · iOS secondary |

---

## 2. Cấu trúc file quan trọng

```
mobile_app/
├── App.js                      ← Entry point, auth listener, navigation setup
├── store/
│   ├── useAppStore.js          ← Zustand store — toàn bộ app state
│   └── suppabase.js            ← Supabase client (SecureStore adapter)
├── utils/
│   ├── database.js             ← Firestore CRUD, deviceId, withTimeout helper
│   └── firebaseConfig.js       ← Firebase init — API KEY ở đây
├── services/
│   ├── api.js                  ← Axios instance, JWT interceptor, retry logic
│   ├── mealPlanService.js      ← Meal planning API calls
│   └── tasteProfileService.js  ← Taste profile calls
├── screens/
│   ├── LoginScreen.js          ← Email/Pass login, Register, Google OAuth
│   ├── HomeScreen.js           ← Landing, location, weather
│   ├── RecommendScreen.js      ← Recommendation results
│   ├── AllergyScreen.js        ← Category + ingredient allergy picker
│   ├── ProfileScreen.js        ← User profile view/edit
│   ├── BodyMetricsScreen.js    ← BMI, weight, height input
│   ├── SettingsScreen.js       ← App settings
│   ├── MarketBasketScreen.js   ← Ingredient basket selection
│   └── ...các screen khác
├── components/
│   └── ProfileSwitcherSheet.js ← Multi-profile switcher
├── theme.js                    ← Design tokens (colors, typography)
├── docs/audit/                 ← THƯ MỤC NÀY
│   ├── CLAUDE.md               ← File này
│   ├── SECURITY.md             ← Checklist bảo mật mobile
│   ├── LOGIC.md                ← Checklist logic & UX edge cases
│   ├── REVIEW.md               ← Rules cho AI code review agent
│   └── FINDINGS.md             ← Log findings
└── .env                        ← EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY
```

---

## 3. Luồng dữ liệu quan trọng cần hiểu

```
[User] → LoginScreen (supabase.auth)
      → SecureStore lưu session token
      → App.js onAuthStateChange → navigate vào app
      → useAppStore.initializeSettings() → AsyncStorage
      → useAppStore.loadAllProfilesAction() → Firestore (dùng deviceId)
      → useAppStore.initializeIngredients() → API Flask

[Recommend flow]
      → HomeScreen lấy GPS location (expo-location)
      → RecommendScreen POST /api/v1/recommend với JWT header (từ Supabase session)
      → Server trả ranked_dishes
      → Session được lưu vào Firestore (deviceId namespace)

[Allergy flow]
      → AllergyScreen đọc/ghi Firestore: allergies/{deviceId}/items/{key}
      → useAppStore.allergies[] ← allergy_key strings
      → API nhận allergy keys → server filter dishes
```

---

## 4. Nguyên tắc khi AI audit

### ĐƯỢC làm
- Đọc tất cả file .js trước khi kết luận
- Cross-reference: LoginScreen ↔ suppabase.js ↔ api.js ↔ App.js
- Báo cáo severity: CRITICAL / HIGH / MEDIUM / LOW / INFO
- Ghi finding vào FINDINGS.md theo format chuẩn
- Phân biệt "EXPO_PUBLIC_" prefix = intentionally bundled = khác với secret bị lộ

### KHÔNG được làm
- KHÔNG sửa code khi chưa được user xác nhận
- KHÔNG nhầm Firebase apiKey (public by design) với Supabase service role key (secret)
- KHÔNG flag __DEV__ console.log là lỗi production nếu có guard đúng
- KHÔNG bỏ qua node_modules/ khi kiểm tra dep vulnerabilities

---

## 5. Thứ tự audit được khuyến nghị

```
Ưu tiên Critical/High:
  1. utils/firebaseConfig.js  → hardcoded config, git exposure
  2. services/api.js          → HTTP vs HTTPS, baseURL hardcode, token leak
  3. screens/LoginScreen.js   → OAuth flow, token extraction, validation
  4. store/suppabase.js       → SecureStore setup, backup exclusion
  5. utils/database.js        → deviceId generation, Firestore security
  6. App.js                   → deep link handling, auth state management

Ưu tiên Medium:
  7. store/useAppStore.js     → sensitive data in memory/AsyncStorage
  8. screens/BodyMetricsScreen.js  → health data storage, validation
  9. screens/AllergyScreen.js     → data integrity
 10. package.json + node_modules  → CVE, outdated deps

Logic & UX:
 11. screens/RecommendScreen.js   → API error handling
 12. services/mealPlanService.js  → API calls, error states
 13. Tất cả screens còn lại      → input validation, navigation auth guard
```

---

## 6. Known quirks — KHÔNG flag những thứ này

| Pattern | Lý do chấp nhận |
|---|---|
| Firebase apiKey trong firebaseConfig.js | Firebase client key ĐƯỢC THIẾT KẾ để public — bảo mật qua Firestore Security Rules, không phải giấu key |
| EXPO_PUBLIC_ prefix trong .env | Prefix này intentionally bundle vào app — đúng spec Expo |
| `experimentalForceLongPolling: true` trong Firestore | Workaround cho React Native networking — cố ý |
| `detectSessionInUrl: false` trong Supabase | Đúng cho React Native — deep link do App.js xử lý |
| Supabase anon key public | Anon key chỉ có quyền theo RLS policy — không phải service role key |
| `console.log` bọc trong `if (__DEV__)` | Đúng chuẩn — chỉ log khi dev build |
| `withTimeout` / `withTimeoutFallback` wrapper | Pattern tốt, cố ý để tránh Firestore block UI |
| deviceId dùng làm Firestore namespace | Thiết kế hiện tại (trước khi có full auth), không phải bug nếu Rules chặt |

---

## 7. Biến môi trường cần kiểm tra

```bash
EXPO_PUBLIC_SUPABASE_URL        # bundled vào app — OK, anon endpoint
EXPO_PUBLIC_SUPABASE_ANON_KEY   # bundled vào app — OK nếu RLS đúng
# Không được có:
SUPABASE_SERVICE_ROLE_KEY       # KHÔNG bao giờ được ở client
FIREBASE_PRIVATE_KEY            # KHÔNG bao giờ được ở client
```

---

## 8. Firestore Security Rules — Điểm mù lớn nhất

App dùng `deviceId` làm namespace trên Firestore.
Nếu Rules không restrict đúng → user A đọc data user B bằng cách đoán deviceId.
deviceId = `'dev_' + Math.random()...` — entropy thấp, dự đoán được.

**AI agent KHÔNG thể đọc Firestore Security Rules từ code** —
cần user cung cấp rules từ Firebase Console.
Khi audit: flag đây là **điểm mù**, nhắc user verify rules.
