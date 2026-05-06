# FINDINGS.md — Daily Mate Mobile · Audit Log

> Format chuẩn từ REVIEW.md. User triage và track fix ở đây.
> Audit lần 2 hoàn tất: 2026-05-06 — Claude Sonnet 4.6

---

## Trạng thái tổng quan

| Metric | Giá trị |
|---|---|
| Lần audit gần nhất | 2026-05-06 (Full scan) |
| Tổng findings | 18 |
| CRITICAL | 2 |
| HIGH | 7 |
| MEDIUM | 5 |
| LOW | 3 |
| INFO | 1 |
| Đã fix | 0 |
| Chờ fix | 18 |

---

## ═══════════════════════════════════════
## CRITICAL
## ═══════════════════════════════════════

---
### [CRITICAL] ID-M001 · API dùng HTTP thay vì HTTPS

**Status**: OPEN
**File**: `services/api.js`, dòng 3
**Pattern**: network / insecure_communication
**OWASP Mobile**: M3 — Insecure Communication

**Mô tả**:
`API_BASE_URL = 'http://192.168.1.19:5001'` — HTTP plain text.
Toàn bộ traffic (kể cả JWT Authorization header) đi qua mạng không mã hóa.
Attacker cùng WiFi dùng Wireshark/mitmproxy intercept được token → impersonate user.

**Fix đề xuất**:
```js
// services/api.js
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
// .env.production:
// EXPO_PUBLIC_API_BASE_URL=https://your-production-server.com
```

---
### [CRITICAL] ID-M010 · Biến `lat` / `lon` không khai báo — Implicit Global

**Status**: OPEN
**File**: `screens/HomeScreen.js`, dòng 236–237
**Pattern**: data_validation / javascript_error
**OWASP Mobile**: M7 — Client Code Quality

**Mô tả**:
```js
// HomeScreen.js — getUserLocation()
lat = getSetting('last_known_lat') || '16.047';   // ← KHÔNG có let/const/var
lon = getSetting('last_known_lon') || '108.206';
```
`lat` và `lon` không được khai báo → JavaScript engine tạo **global variable** ngầm.
Trong strict mode (React Native production build với Hermes): throw `ReferenceError` → crash app.
Ngoài strict mode: tạo biến global — có thể bị ghi đè bởi code khác → location data sai.

Thêm vào đó: `getSetting()` là async function nhưng đang được gọi **không có await** → luôn trả về `Promise object`, không phải string → `Number(Promise)` = `NaN` → fallback về `'16.047'` nhưng theo cách không tường minh.

**Reproduce**:
```
1. Build production (Hermes strict mode)
2. Mở HomeScreen → goSearch() → getUserLocation() throws ReferenceError
3. App crash hoặc location luôn = Đà Nẵng dù user ở nơi khác
```

**Fix đề xuất**:
```js
const getUserLocation = async () => {
  try {
    const latStr = await getSetting('last_known_lat');   // ← await
    const lonStr = await getSetting('last_known_lon');   // ← await
    const lat = latStr ? Number(latStr) : 16.047;
    const lon = lonStr ? Number(lonStr) : 108.206;
    return { lat, lon };
  } catch { return null; }
};
```

---

## ═══════════════════════════════════════
## HIGH
## ═══════════════════════════════════════

---
### [HIGH] ID-M002 · deviceId dùng Math.random() — Weak Identifier

**Status**: OPEN
**File**: `utils/database.js`, dòng 20–23
**Pattern**: cryptography / weak_random
**OWASP Mobile**: M1 — Improper Platform Usage

**Mô tả**:
```js
id = 'dev_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
```
`Math.random()` không phải CSPRNG. deviceId là primary key của toàn bộ
Firestore data người dùng. Entropy thực tế ~52 bits — có thể predict trong JS engine cũ.

**Fix đề xuất**:
```js
import * as Crypto from 'expo-crypto'; // đã có trong package.json
id = Crypto.randomUUID(); // UUID v4, CSPRNG
```

---
### [HIGH] ID-M003 · deviceId lưu AsyncStorage thay vì SecureStore

**Status**: OPEN
**File**: `utils/database.js`, dòng 20–24
**Pattern**: storage / insecure_storage
**OWASP Mobile**: M2 — Insecure Data Storage

**Mô tả**:
deviceId lưu trong AsyncStorage (plain text, unencrypted).
Trên Android root hoặc ADB backup → đọc được.
deviceId là namespace duy nhất bảo vệ toàn bộ Firestore data của user.

**Fix đề xuất**:
```js
import * as SecureStore from 'expo-secure-store';

export async function getDeviceId() {
  if (_deviceId) return _deviceId;
  let id = await SecureStore.getItemAsync('device_id');
  if (!id) {
    id = Crypto.randomUUID();
    await SecureStore.setItemAsync('device_id', id);
  }
  _deviceId = id;
  return id;
}
```
**Lưu ý**: SecureStore bị xóa khi uninstall → cần migration path từ AsyncStorage.

---
### [HIGH] ID-M004 · console.log/error không có __DEV__ guard — leak data nhạy cảm

**Status**: OPEN
**File**: `screens/LoginScreen.js` dòng ~120; `services/api.js` dòng ~43; `screens/HomeScreen.js` dòng ~308; `utils/database.js` dòng ~140
**Pattern**: logging / information_disclosure

**Mô tả**:
4 vị trí log nhạy cảm trong production:

1. **LoginScreen.js** `console.log('[Google OAuth] redirectUrl:', redirectUrl)` — log URL OAuth redirect (không có `__DEV__` guard)
2. **api.js** `console.error('[API Error]', error.config?.url, msg)` — log API URL chứa lat/lon trong production
3. **HomeScreen.js** `console.warn('User location:', loc.coords)` — log tọa độ GPS chính xác của user (không có `__DEV__` guard)
4. **database.js** `console.log('[DB] setSetting Firestore OK:', key)` — log setting key trong production

**Fix đề xuất**:
```js
// Wrap tất cả bằng __DEV__ guard:
if (__DEV__) console.log('[Google OAuth] redirectUrl:', redirectUrl);
if (__DEV__) console.warn('User location:', loc.coords);
if (__DEV__) console.log('[DB] setSetting Firestore OK:', key);

// api.js — dùng error reporting service thay console trong production:
if (__DEV__) console.error('[API Error]', error.config?.url, msg);
// else: Sentry.captureException(error) — không log URL
```

---
### [HIGH] ID-M005 · Firestore Security Rules — Không thể audit từ code

**Status**: OPEN (cần action từ user)
**File**: Firebase Console → Firestore → Rules
**Pattern**: authorization / data_access_control
**OWASP Mobile**: M1 — Improper Platform Usage

**Mô tả**:
App dùng `deviceId` làm namespace Firestore (không phải Supabase uid).
Nếu Rules cho phép `read, write: if request.auth != null` (chỉ check authed, không check ownership),
bất kỳ authenticated user nào có thể đọc data của user khác nếu đoán được `deviceId`.

**Action cần user**:
1. Vào Firebase Console → Firestore Database → Rules
2. Paste rules vào đây để AI tiếp tục audit

**Rules tối thiểu đề xuất**:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /device_profiles/{deviceId}/{document=**} {
      allow read, write: if request.auth != null;
    }
    match /sessions/{deviceId}/{document=**} {
      allow read, write: if request.auth != null;
    }
    // Lý tưởng: map deviceId với Supabase uid → ownership check
  }
}
```

---
### [HIGH] ID-M006-A · Google OAuth — console.log redirectUrl không có __DEV__ guard

**Status**: OPEN
**File**: `screens/LoginScreen.js`, dòng ~120
**Pattern**: logging / information_disclosure
**OWASP Mobile**: M1 — Improper Platform Usage

**Mô tả**:
```js
console.log('[Google OAuth] redirectUrl:', redirectUrl);
```
Dòng này không có `if (__DEV__)` guard → chạy trong production build.
Trong một số môi trường, redirect URL có thể chứa OAuth state parameter.

*(Đã gộp vào ID-M004 — xem chi tiết ở đó)*

---
### [HIGH] ID-M011 · Zustand store không reset khi logout

**Status**: OPEN
**File**: `App.js`, `store/useAppStore.js`
**Pattern**: auth / session_management
**OWASP Mobile**: M1 — Improper Platform Usage

**Mô tả**:
Khi `supabase.auth.signOut()` fire → `onAuthStateChange` set `authState = 'unauthenticated'`
và `setAppReady(false)`.

**Tuy nhiên: Zustand store KHÔNG được reset.**

Sau logout, store vẫn giữ:
- `profile` (tên, giới tính, năm sinh, dietary goal)
- `latestMetrics` (cân nặng, chiều cao, BMI)
- `allergies[]` (dị ứng thực phẩm — dữ liệu y tế)
- `tasteProfile`, `rankedDishes`, `marketBasket`
- `activeProfileId`, `profiles[]`

Nếu user A logout → user B login trên cùng thiết bị:
1. App hiện SplashScreen → `initializeApp()` chạy → load data của user B
2. Nhưng trong khoảng thời gian giữa: store vẫn có data của user A
3. Race condition: nếu `initializeApp()` fail → app render với data user A cho user B

**Fix đề xuất**:
```js
// App.js — trong onAuthStateChange:
const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
  setAuthState(session ? 'authenticated' : 'unauthenticated');
  if (!session) {
    setAppReady(false);
    // THÊM: reset toàn bộ store
    useAppStore.getState().resetStore();
  }
});

// useAppStore.js — thêm action:
resetStore: () => set({
  profile: null, latestMetrics: null, allergies: [],
  tasteProfile: null, rankedDishes: [], marketBasket: { selectedIngredients: [], isSkipped: true, boostStrategy: 'strict' },
  profiles: [], activeProfileId: null,
  location: { lat: null, lon: null, province: '', food_region: '' },
}),
```

---
### [HIGH] ID-M012 · Navigation stack không clear sau logout — Android back bypass

**Status**: OPEN (cần verify)
**File**: `App.js`, dòng 320–338
**Pattern**: navigation / auth_guard
**OWASP Mobile**: M1 — Improper Platform Usage

**Mô tả**:
App.js render conditionally dựa trên `authState` — pattern này ĐÚNG về lý thuyết
(React sẽ unmount toàn bộ `<NavigationContainer>` khi logout).

**Tuy nhiên**: `NavigationContainer` được render bên trong điều kiện `authState === 'authenticated'`,
nhưng khi `authState` thay đổi → React phải re-render → có khoảng thời gian ngắn
navigation stack vẫn còn trong memory trước khi unmount.

**Điểm cần verify**: Kiểm tra xem `ResetPasswordScreen` flow có bị ảnh hưởng không —
nếu user đang ở `ResetPasswordScreen` (render ngoài NavigationContainer) và back button được nhấn
→ behavior thế nào?

**Khuyến nghị**:
Thêm `navigation.reset()` tường minh tại bất kỳ nơi nào gọi `supabase.auth.signOut()` trong các screen.

---

## ═══════════════════════════════════════
## MEDIUM
## ═══════════════════════════════════════

---
### [MEDIUM] ID-M006 · Google OAuth dùng Implicit Flow — Token trong URL fragment

**Status**: OPEN
**File**: `screens/LoginScreen.js`, dòng ~143–153
**Pattern**: auth / oauth_flow
**OWASP Mobile**: M1 — Improper Platform Usage

**Mô tả**:
```js
const hashParams = new URLSearchParams(result.url.split('#')[1] ?? ...)
const accessToken = hashParams.get('access_token')
```
Implicit flow extract token từ URL fragment. PKCE flow (exchangeCodeForSession) an toàn hơn
và đã được implement dưới dạng fallback. Nếu Supabase project config PKCE → implicit flow
không cần thiết và tạo attack surface.

**Fix đề xuất**:
Kiểm tra Supabase Console → Authentication → Providers → Google → Flow type.
Nếu PKCE work → bỏ implicit flow block, chỉ dùng `exchangeCodeForSession(result.url)`.

---
### [MEDIUM] ID-M007 · API Base URL Hardcode Local IP

**Status**: OPEN
**File**: `services/api.js`, dòng 3
**Pattern**: config / hardcode

**Mô tả**:
`'http://192.168.1.19:5001'` hardcode — kết hợp với ID-M001 (HTTP).
Production/CI build sẽ fail nếu device không cùng mạng LAN.

**Fix đề xuất**:
```js
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:5001';
```

---
### [MEDIUM] ID-M008 · Navigation Stack Không Clear Sau Logout

**Status**: OPEN (đã escalate lên HIGH — xem ID-M012)**

---
### [MEDIUM] ID-M013 · switchProfile() — Partial failure gây data inconsistency

**Status**: OPEN
**File**: `store/useAppStore.js`, dòng 95–113
**Pattern**: data_validation / error_handling
**OWASP Mobile**: M7 — Client Code Quality

**Mô tả**:
```js
const [allergiesRaw, metrics, tasteData] = await Promise.all([
  loadAllergiesForProfile(profileId),
  loadLatestMetricsForProfile(profileId),
  loadTasteProfileForProfile(profileId),
]);
```
`Promise.all` fail nếu BẤT KỲ call nào throw. Nhưng `loadProfileById` đã được gọi TRƯỚC đó
và set `profile` vào store. Nếu `Promise.all` fail sau đó → store có:
- `profile` = profile mới (từ `loadProfileById`)
- `allergies` = allergies cũ (vì `set()` chưa được gọi)
- `latestMetrics` = metrics cũ
→ Data inconsistency: profile mới nhưng allergies/metrics của profile cũ.

**Fix đề xuất**:
```js
switchProfile: async (profileId) => {
  try {
    await setActiveProfileId(profileId);
    set({ activeProfileId: profileId });

    const [profileData, allergiesRaw, metrics, tasteData] = await Promise.all([
      loadProfileById(profileId),
      loadAllergiesForProfile(profileId),
      loadLatestMetricsForProfile(profileId),
      loadTasteProfileForProfile(profileId),
    ]);
    // Set tất cả cùng 1 lần — atomic update
    set({
      profile: profileData,
      allergies: allergiesRaw.map(r => r.allergy_key),
      latestMetrics: metrics,
      tasteProfile:       tasteData?.tasteProfile       ?? null,
      hometownProvinceId: tasteData?.hometownProvinceId ?? null,
      tasteMode:          tasteData?.tasteMode          ?? 'hometown',
    });
  } catch (e) { console.error('switchProfile:', e); }
},
```

---
### [MEDIUM] ID-M014 · GPS full-precision gửi lên server — Location privacy

**Status**: OPEN
**File**: `screens/HomeScreen.js` dòng ~270–280; `screens/App.js` dòng ~276
**Pattern**: privacy / location_data
**OWASP Mobile**: M2 — Insecure Data Storage

**Mô tả**:
Tọa độ GPS full precision được gửi lên server API:
```js
// HomeScreen.js — goSearch()
lat: safeCurrentLocation.lat,  // ví dụ: 16.04712345
lon: safeCurrentLocation.lon,  // ví dụ: 108.20645678
```
Precision 6 decimal ≈ 10cm — có thể xác định địa chỉ nhà chính xác.
App.js cũng `console.warn('User location:', loc.coords)` log tọa độ đầy đủ.

**Fix đề xuất**:
```js
// Round về 2 decimal ≈ 1km precision — đủ để recommend theo thành phố
const roundCoord = (v) => Math.round(Number(v) * 100) / 100;

lat: roundCoord(safeCurrentLocation.lat),
lon: roundCoord(safeCurrentLocation.lon),
```

---
### [MEDIUM] ID-M015 · RecommendScreen — fetchRecommendations không có request deduplication

**Status**: OPEN
**File**: `screens/RecommendScreen.js`, dòng ~270–295
**Pattern**: data_validation / race_condition

**Mô tả**:
User có thể nhấn "Làm mới" nhiều lần liên tiếp → multiple concurrent POST /recommend requests.
Không có AbortController hay debounce:
```js
const fetchRecommendations = async () => {
  setIsLoading(true); setError(null);
  // ... không check xem có request đang chạy không
```
Response cuối cùng arrive sau response trước → `setDishes()` bị set ngẫu nhiên theo thứ tự network,
không theo thứ tự click. Có thể gây flash UI hoặc hiển thị stale data.

**Fix đề xuất**:
```js
const abortRef = useRef(null);

const fetchRecommendations = async () => {
  // Cancel request cũ nếu có
  if (abortRef.current) abortRef.current.abort();
  abortRef.current = new AbortController();

  setIsLoading(true); setError(null);
  try {
    const res = await api.post('/api/v1/recommend', {...}, {
      signal: abortRef.current.signal,
    });
    // ...
  } catch (e) {
    if (e.name === 'CanceledError') return; // ignore aborted
    // ...
  }
};
```

---

## ═══════════════════════════════════════
## LOW
## ═══════════════════════════════════════

---
### [LOW] ID-M009 · Email Không Được Validate Format

**Status**: OPEN
**File**: `screens/LoginScreen.js`, dòng ~49, ~61
**Pattern**: input_validation

**Mô tả**:
`if (!email || !password)` chỉ check truthy. `"abc"`, `"@"` đều pass.
Supabase reject ở server side — nhưng UX xấu, user nhận generic error.

**Fix đề xuất**:
```js
const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
if (!isValidEmail(email)) { Alert.alert('Email không hợp lệ 😿'); shake(); return; }
```

---
### [LOW] ID-M016 · Double-submit risk — handleLogin/handleRegister không có debounce

**Status**: OPEN
**File**: `screens/LoginScreen.js`, dòng ~49, ~63
**Pattern**: data_validation / ux

**Mô tả**:
`setLoading(true)` được gọi bên trong async function. Nếu user double-tap cực nhanh
trước khi React re-render với `loading=true` → 2 request gửi đồng thời.

**Fix đề xuất**:
```js
const isSubmittingRef = useRef(false);

const handleLogin = async () => {
  if (isSubmittingRef.current) return;
  isSubmittingRef.current = true;
  try {
    // ... auth logic
  } finally {
    isSubmittingRef.current = false;
  }
};
```

---
### [LOW] ID-M017 · BodyMetricsScreen — Không validate range cho chiều cao / cân nặng

**Status**: OPEN
**File**: `screens/BodyMetricsScreen.js`, dòng ~163–170
**Pattern**: input_validation

**Mô tả**:
```js
const h = parseFloat(height), w = parseFloat(weight);
if (isNaN(h) || isNaN(w) || h <= 0 || w <= 0) { ... }
```
Chỉ check `> 0`. User có thể nhập `h = 5` (5cm) hoặc `w = 500` (500kg) → BMI vô nghĩa.
Server sử dụng BMI để tính toán recommendation → bad data → bad recommendation.

**Fix đề xuất**:
```js
if (h < 50 || h > 250) { Alert.alert('Chiều cao phải từ 50–250 cm'); return; }
if (w < 20 || w > 300) { Alert.alert('Cân nặng phải từ 20–300 kg'); return; }
```

---

## ═══════════════════════════════════════
## INFO
## ═══════════════════════════════════════

---
### [INFO] ID-M018 · GPS location bị comment out trong HomeScreen — chỉ dùng cached

**Status**: OPEN (cần xác nhận ý định)
**File**: `screens/HomeScreen.js`, dòng ~233–242
**Pattern**: logic / feature_flag

**Mô tả**:
```js
// const { status } = await Location.requestForegroundPermissionsAsync();
// const loc = await Location.getCurrentPositionAsync({ ... });
// return { lat: ..., lon: ... };
lat = getSetting('last_known_lat') || '16.047';  // ← chỉ dùng cached
lon = getSetting('last_known_lon') || '108.206';
```
Toàn bộ GPS real-time bị comment out. App LUÔN dùng location đã cache (từ App.js startup).
Nếu user di chuyển → location stale → recommendation sai vùng.

Điều này có thể là **cố ý** (tắt GPS để tiết kiệm battery trong dev), nhưng cần confirm
trước khi release production.

**Action**: Xác nhận với dev team — nếu cố ý thì document lại; nếu quên uncommment thì fix.

---

## Changelog

| Ngày | Action | Agent | Ghi chú |
|---|---|---|---|
| 2026-05-06 | Pre-populate 9 findings từ initial code review | Claude | ID-M001 đến ID-M009 |
| 2026-05-06 | Full audit scan — thêm 9 findings mới | Claude Sonnet 4.6 | ID-M010 đến ID-M018 |
