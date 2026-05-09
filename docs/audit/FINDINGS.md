# FINDINGS.md — Daily Mate Mobile · Security Audit Results
> Audit date: 2026-05-09
> Auditor: Claude Sonnet 4.6 (AI Agent)
> Scope: Firebase memory management, security, authentication flows
> Files scanned: firebaseConfig.js, database.js, api.js, suppabase.js, App.js,
>                LoginScreen.js, useAppStore.js, SettingsScreen.js, RecommendScreen.js

---

## Summary

| Severity  | Count |
|-----------|-------|
| CRITICAL  | 0     |
| HIGH      | 4     |
| MEDIUM    | 5     |
| LOW       | 3     |
| INFO      | 3     |

---

## HIGH — Fix trước khi release

### [HIGH] AUD-001 · console.log không có __DEV__ guard trong saveProfileMember

**Status**: OPEN
**File**: `utils/database.js`, dòng ~495–510
**Pattern**: logging / sensitive data
**OWASP Mobile**: M2 — Insecure Data Storage

**Mô tả**: Hàm `saveProfileMember()` có 3 lệnh `console.log` bare (không có `if (__DEV__)`): in ra `profileId`, `deviceId`, toàn bộ data keys, và đường dẫn Firestore collection. Trong production build log này chạy mỗi khi user lưu profile — lộ deviceId và cấu trúc Firestore tới Crashlytics/Sentry/ADB logcat. `console.error` trong catch block cũng log `e.code, e.message, e` không guard.

**Reproduce**:
```js
// database.js ~495:
console.log('[DB] saveProfileMember called — profileId:', profileId, '| data keys:', Object.keys(rest));
console.log('[DB] saveProfileMember — deviceId:', id, '| path: device_profiles/', id, ...);
console.log('[DB] saveProfileMember — ✅ success');
console.error('[DB] saveProfileMember — ❌ FAILED:', e.code, e.message, e); // trong catch
```

**Fix đề xuất**:
```js
if (__DEV__) console.log('[DB] saveProfileMember called — profileId:', profileId);
// catch block:
if (__DEV__) console.error('[DB] saveProfileMember — FAILED:', e.code, e.message);
else console.error('[DB] saveProfileMember failed'); // log chung, không có detail
```

---

### [HIGH] AUD-002 · Logout không reset _deviceId module-level variable

**Status**: OPEN
**File**: `screens/SettingsScreen.js` (handleLogout) + `utils/database.js` (_deviceId)
**Pattern**: data isolation / auth
**OWASP Mobile**: M1 — Improper Platform Usage

**Mô tả**: Khi user đăng xuất, `handleLogout` gọi `supabase.auth.signOut()`, App.js nhận event và gọi `resetStore()`. `resetStore()` xóa Zustand state đúng. Tuy nhiên `_deviceId` là module-level variable trong `database.js` — không bị xóa. Khi User B đăng nhập sau đó, `getDeviceId()` trả về cached `_deviceId` của User A (do `if (_deviceId) return _deviceId`). User B sẽ đọc/ghi vào Firestore namespace của User A cho đến khi app restart hoàn toàn.

**Reproduce**:
1. User A đăng nhập → deviceId = "uuid-A" → data được lưu vào `device_profiles/uuid-A/...`
2. User A đăng xuất
3. User B đăng nhập trên cùng thiết bị
4. `getDeviceId()` return "uuid-A" (cached) → User B thấy data của User A

**Fix đề xuất**:
```js
// database.js — thêm hàm:
export function clearDeviceId() {
  _deviceId = null;
}

// useAppStore.js — trong resetStore():
resetStore: () => {
  clearDeviceId(); // import từ database.js
  set({ /* ... existing reset ... */ });
}
```

---

### [HIGH] AUD-003 · Firestore Security Rules — Điểm mù không thể audit từ code

**Status**: BLOCKED (cần user cung cấp rules)
**File**: Firebase Console — không có trong codebase
**Pattern**: data access control
**OWASP Mobile**: M1, M2

**Mô tả**: App dùng `deviceId` làm namespace cho collections: `profiles/`, `device_profiles/`, `allergies/`, `sessions/`, `feedback/`. Nếu Rules là `allow read, write: if true` → bất kỳ ai biết `projectId = "jpdweb-9d3d3"` đều đọc được toàn bộ data sức khỏe của user. Đây là rủi ro cao nhất toàn app nhưng không thể verify từ code.

**Rules tối thiểu cần có**:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Shared — OK
    match /weather_cache/{gridKey} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    // ingredients_ref — read-only public seed data
    match /ingredients_ref/{id} {
      allow read: if true;
      allow write: if false;
    }
    // User data — phải require auth
    match /profiles/{deviceId} {
      allow read, write: if request.auth != null;
    }
    match /device_profiles/{deviceId}/{rest=**} {
      allow read, write: if request.auth != null;
    }
    match /allergies/{deviceId}/{rest=**} {
      allow read, write: if request.auth != null;
    }
    match /sessions/{deviceId}/{rest=**} {
      allow read, write: if request.auth != null;
    }
    match /feedback/{deviceId}/{rest=**} {
      allow read, write: if request.auth != null;
    }
    match /body_metrics/{deviceId}/{rest=**} {
      allow read, write: if request.auth != null;
    }
    match /settings/{deviceId}/{rest=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**Hành động**: Bạn cần vào Firebase Console → Firestore → Rules và verify/update.

---

### [HIGH] AUD-004 · 401 refresh loop khi refresh token expired — không redirect về Login

**Status**: OPEN
**File**: `services/api.js`, dòng 32–43
**Pattern**: session management
**OWASP Mobile**: M1

**Mô tả**: Trong interceptor 401, khi `refreshSession()` có lỗi (`refreshError != null`), code chỉ reject error nhưng không clear session hay navigate về Login. User không biết session đã die, app ở trạng thái limbo — mọi request tiếp theo đều fail 401 silently. Nếu refresh token bị revoke từ phía Supabase (logout từ thiết bị khác, session expire), user bị kẹt.

**Fix đề xuất**:
```js
if (error.response?.status === 401 && !originalRequest._retry) {
  originalRequest._retry = true;
  const { error: refreshError } = await supabase.auth.refreshSession();
  if (!refreshError) {
    const { data: { session } } = await supabase.auth.getSession();
    originalRequest.headers['Authorization'] = `Bearer ${session.access_token}`;
    return api(originalRequest);
  } else {
    // [FIX] Session không thể refresh → force logout
    await supabase.auth.signOut(); // onAuthStateChange tự navigate về Login
    return Promise.reject(new Error('Session expired. Please login again.'));
  }
}
```

---

## MEDIUM — Nên fix trước release

### [MEDIUM] AUD-005 · Google OAuth có cả implicit flow và PKCE song song

**Status**: OPEN
**File**: `screens/LoginScreen.js`, hàm handleGoogle, dòng ~157–185
**Pattern**: auth / OAuth security
**OWASP Mobile**: M1

**Mô tả**: Code xử lý song song `access_token` từ URL fragment (implicit OAuth) và `code` (PKCE). Implicit flow không an toàn bằng PKCE vì token nằm trực tiếp trong URL hash. Supabase v2+ mặc định PKCE — nhánh implicit là dead code nhưng tạo confusion và surface attack nhỏ.

**Fix đề xuất**: Confirm Supabase project dùng PKCE → xóa nhánh `if (accessToken && refreshToken)`, chỉ giữ `else if (code)`.

---

### [MEDIUM] AUD-006 · GPS coordinates gửi full precision — over-collection

**Status**: OPEN
**File**: `App.js` (getUserLocation) + `services/api.js` (body params)
**Pattern**: location data / privacy
**OWASP Mobile**: M2

**Mô tả**: Tọa độ GPS lưu và gửi với ~6 decimal places (~10cm precision). App chỉ cần city-level (~1km). Vi phạm data minimization (GDPR Art.5).

**Fix đề xuất**:
```js
// Trong getUserLocation() hoặc trước khi lưu/gửi:
const lat = Math.round(loc.coords.latitude * 100) / 100;  // 2 decimals ≈ 1.1km
const lon = Math.round(loc.coords.longitude * 100) / 100;
```

---

### [MEDIUM] AUD-007 · Deep link không validate scheme trước khi xử lý

**Status**: OPEN
**File**: `App.js`, hàm handleDeepLink, dòng ~218–250
**Pattern**: auth / deep link hijacking
**OWASP Mobile**: M1

**Mô tả**: `handleDeepLink` xử lý bất kỳ URL nào không có scheme check. Trên Android, nhiều app có thể đăng ký cùng custom URL scheme → malicious app có thể gửi deep link giả. Cần verify `android:autoVerify="true"` trong AndroidManifest.

**Fix đề xuất**:
```js
const handleDeepLink = async (url) => {
  if (!url) return;
  // Whitelist allowed schemes
  const allowed = url.startsWith('dailymate://') || url.startsWith('exp://');
  if (!allowed) {
    if (__DEV__) console.warn('[DeepLink] Rejected unknown scheme:', url.slice(0, 30));
    return;
  }
  // ... existing logic
};
```

---

### [MEDIUM] AUD-008 · active_profile_id lưu AsyncStorage (unencrypted)

**Status**: OPEN
**File**: `utils/database.js`, hàm `getActiveProfileId` / `setActiveProfileId`
**Pattern**: storage / sensitive data
**OWASP Mobile**: M2

**Mô tả**: `active_profile_id` xác định profile đang load data (BMI, health conditions, allergies). Lưu trong AsyncStorage — plain text, readable qua ADB backup. Đã migrate `device_id` sang SecureStore (đúng) nhưng `active_profile_id` còn bỏ sót.

**Fix đề xuất**:
```js
import * as SecureStore from 'expo-secure-store';

export async function getActiveProfileId() {
  return await SecureStore.getItemAsync(ACTIVE_PROFILE_KEY);
}
export async function setActiveProfileId(profileId) {
  await SecureStore.setItemAsync(ACTIVE_PROFILE_KEY, profileId);
}
```

---

### [MEDIUM] AUD-009 · pruneOldSessions fetch unbounded — Firestore billing risk

**Status**: OPEN
**File**: `utils/database.js`, hàm `pruneOldSessions`, dòng ~298
**Pattern**: firebase cost / performance

**Mô tả**: `pruneOldSessions` query tất cả sessions không dùng `limit()` để biết tổng số. Trong worst case (user lâu năm), đọc N docs không giới hạn. Billing DoS nếu attacker spam create sessions.

**Fix đề xuất**:
```js
// Thay vì fetch tất cả, dùng limit(maxCount + 5):
const q = query(sessionsCol(id), orderBy('created_at', 'desc'), limit(maxCount + 5));
const snap = await withTimeoutFallback(getDocs(q), 8000, null);
if (!snap || snap.size <= maxCount) return;
const toDelete = snap.docs.slice(maxCount);
```

---

## LOW — Best practice

### [LOW] AUD-010 · Password minimum 6 ký tự — quá thấp cho health data app

**Status**: OPEN
**File**: `screens/LoginScreen.js`, handleRegister
**Pattern**: auth strength

**Fix**: Đổi `password.length < 6` thành `password.length < 8`.

---

### [LOW] AUD-011 · API timeout 12s — quá cao cho mobile UX

**Status**: OPEN
**File**: `services/api.js`, dòng 9
**Pattern**: UX / performance

**Fix**: Giảm `timeout: 8000`. Thêm retry logic cho 5xx errors.

---

### [LOW] AUD-012 · loadIngredientCategories thiếu withTimeoutFallback

**Status**: OPEN
**File**: `utils/database.js`, hàm `loadIngredientCategories`
**Pattern**: reliability / Firestore hang

**Fix**:
```js
export async function loadIngredientCategories() {
  const snap = await withTimeoutFallback(getDocs(ingredientsCol()), 5000, null);
  if (!snap) return [];
  const cats = new Set();
  snap.docs.forEach(d => { if (d.data().category) cats.add(d.data().category); });
  return Array.from(cats).sort().map(c => ({ category: c }));
}
```

---

## INFO — Điểm mù cần xác nhận

### [INFO] AUD-013 · Android Backup exclude SecureStore chưa verify

**Status**: NEEDS VERIFICATION
**Action**: Kiểm tra `android/app/src/main/res/xml/backup_rules.xml` có entry:
```xml
<exclude domain="sharedpref" path="SecureStore" />
```

---

### [INFO] AUD-014 · .gitignore exclude .env chưa verify

**Status**: NEEDS VERIFICATION
**Action**: Chạy `git log --all --full-history -- .env` để đảm bảo .env chưa bao giờ được commit.

---

### [INFO] AUD-015 · npm audit chưa chạy

**Status**: NEEDS ACTION
**Action**: Chạy `cd mobile_app && npm audit` và kiểm tra:
- `firebase@^11.0.0`
- `axios@^1.6.0`
- `@supabase/supabase-js@^2.104.0`
- `expo-auth-session@~7.0.11`
- `react-native@0.81.5`

---

## Known Good — Không flag

| Pattern | Lý do |
|---------|-------|
| Firebase apiKey hardcode trong firebaseConfig.js | Client key public by design — bảo mật qua Firestore Rules |
| EXPO_PUBLIC_* variables | Intentionally bundled theo Expo spec |
| deviceId dùng Crypto.randomUUID() | Đã fix đúng — CSPRNG entropy 122 bits |
| deviceId chuyển sang SecureStore | Đã fix đúng |
| console.log trong __DEV__ guard | Pattern đúng, không flag |
| withTimeout / withTimeoutFallback | Pattern tốt, consistent (trừ AUD-012) |
| experimentalForceLongPolling | RN networking workaround, cố ý |
| detectSessionInUrl: false | Đúng cho React Native |
| resetStore() trong onAuthStateChange | Đúng pattern, đã có |
| AbortController trong RecommendScreen | Tốt — cancel race condition |
| pruneOldSessions fire-and-forget | Đúng thiết kế — non-critical |
