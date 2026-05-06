# REVIEW.md — Daily Mate Mobile · AI Code Review Rules

> File này inject vào mọi AI review agent với priority cao nhất.
> Rules ở đây OVERRIDE default review behavior.
> Ref: OWASP Mobile Top 10 (2024) · OWASP MASVS L1 · React Native Security docs

---

## 1. Severity Definitions (Mobile-specific)

### CRITICAL — Fix NGAY, block release
- Auth bypass, token exposure qua plain-text HTTP
- Firestore data của user A đọc được bởi user B
- Firebase/Supabase service key lộ ở client side
- Crash khi handle auth callback

### HIGH — Fix trước khi release
- HTTP thay vì HTTPS cho API production
- Sensitive data trong AsyncStorage thay vì SecureStore
- `console.log` không có `__DEV__` guard leak sensitive info
- Unhandled Promise rejection gây silent fail hoặc crash
- Navigation không clear stack sau logout → auth bypass bằng back button

### MEDIUM — Nên fix trong sprint
- `Math.random()` làm ID thay vì CSPRNG
- Location data precision cao gửi lên server không cần thiết
- Thiếu loading state → double-submit
- Stale cache không có TTL
- Missing error boundary

### LOW — Best practice
- Input chưa có email format validation
- Password minimum 6 ký tự (weak)
- setTimeout/interval không được cleanup trong useEffect
- Firestore reads không có offline fallback

### INFO — Ghi nhận
- Known quirks đã document trong CLAUDE.md
- Style/naming inconsistency
- Technical debt (async deviceId pattern, v.v.)

---

## 2. Findings Cap

- Tối đa **5 findings MEDIUM** mỗi file
- CRITICAL và HIGH: báo cáo tất cả, không cap
- Gộp instances tương tự thành 1 finding (ví dụ: "7 screens thiếu try/catch" = 1 finding HIGH)

---

## 3. Skip Rules — KHÔNG scan những path này

```
node_modules/           ← chỉ scan package.json cho CVE
.expo/                  ← generated config
android/build/          ← build output
context_portal/         ← ConPort data, không phải app code
assets/animations/      ← lottie files
assets/textures/        ← image assets
*.png, *.jpg, *.gif     ← binary assets
patch_zustand.ps1       ← maintenance script
```

---

## 4. Repo-Specific Rules — Flag trên MỌI file được review

```
[ ] console.log/console.error với data nhạy cảm PHẢI có if (__DEV__) guard
[ ] Mọi AsyncStorage.setItem với token/credential → flag HIGH
[ ] Mọi HTTP (không phải HTTPS) URL trong production code → flag CRITICAL
[ ] Mọi call Supabase/Firebase API không có try/catch → flag HIGH
[ ] Mọi screen navigation sau logout phải dùng navigation.reset() không phải navigate()
[ ] Mọi Math.random() làm unique identifier → flag MEDIUM
[ ] Mọi location data gửi ra ngoài → check precision và consent
[ ] Mọi health/medical data (BMI, disease, allergy) → verify không log, không expose
```

---

## 5. React Native-Specific Patterns để tìm chủ động

### 5.1 AsyncStorage cho Sensitive Data (HIGH)
```js
// NGUY HIỂM: token trong plain storage
await AsyncStorage.setItem('access_token', token)
await AsyncStorage.setItem('user_session', JSON.stringify(session))

// AN TOÀN:
await SecureStore.setItemAsync('access_token', token)
```

### 5.2 console.log không có DEV guard (HIGH nếu nhạy cảm)
```js
// NGUY HIỂM: log deviceId/location/token trong production
console.log('deviceId:', _deviceId)
console.log('[Google OAuth] redirectUrl:', redirectUrl)

// AN TOÀN:
if (__DEV__) console.log('deviceId:', _deviceId)
```

### 5.3 HTTP trong Production (CRITICAL)
```js
// NGUY HIỂM:
const API_BASE_URL = 'http://192.168.1.19:5001'
const API_BASE_URL = 'http://my-server.com/api'

// AN TOÀN:
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL
// và .env phải dùng https://
```

### 5.4 Unhandled Promise trong useEffect (HIGH)
```js
// NGUY HIỂM: unhandled async
useEffect(() => {
  loadData() // không có catch
}, [])

// AN TOÀN:
useEffect(() => {
  loadData().catch(e => {
    console.error(e)
    setError('Không tải được dữ liệu')
  })
}, [])
```

### 5.5 Navigation Back Stack sau Logout (HIGH)
```js
// NGUY HIỂM: user có thể back button về protected screen
navigation.navigate('Login')

// AN TOÀN:
navigation.reset({
  index: 0,
  routes: [{ name: 'Login' }],
})
```

### 5.6 Math.random() làm ID (MEDIUM)
```js
// NGUY HIỂM: không phải CSPRNG
id = 'dev_' + Math.random().toString(36).slice(2)

// AN TOÀN (expo-crypto đã có trong dependencies):
import * as Crypto from 'expo-crypto'
id = Crypto.randomUUID()
```

### 5.7 Location Precision (MEDIUM)
```js
// NGUY HIỂM: gửi full GPS precision → deanonymize user
body: { lat: location.coords.latitude, lon: location.coords.longitude }
// 16.047123456 → exact address traceable

// AN TOÀN: round về city-level precision
body: {
  lat: Math.round(location.coords.latitude * 100) / 100,  // 2 decimals ≈ 1km
  lon: Math.round(location.coords.longitude * 100) / 100,
}
```

### 5.8 Zustand State với Sensitive Data (INFO/MEDIUM)
```js
// CẢNH BÁO: in-memory OK, nhưng đảm bảo không persist sang AsyncStorage
// Kiểm tra: không có middleware persist({ storage: AsyncStorage }) cho state có:
// profile, latestMetrics (weight/height/BMI), allergies, disease_flags
```

---

## 6. Output Format Bắt buộc

```
### [SEVERITY] ID-xxx · Tên ngắn gọn

**Status**: OPEN
**File**: `path/to/file.js`, dòng N–M
**Pattern**: storage / network / auth / logging / navigation / data_validation
**OWASP Mobile**: M0x — Tên (nếu applicable)

**Mô tả**: Giải thích lỗi, điều kiện trigger, impact.

**Reproduce**:
Bước hoặc code để trigger lỗi.

**Fix đề xuất**:
Code snippet cụ thể.
```

---

## 7. False Positive Suppression — KHÔNG flag

```
Firebase apiKey trong firebaseConfig.js
  → Client key, public by design, bảo mật qua Firestore Rules

EXPO_PUBLIC_* trong .env hoặc code
  → Intentionally bundled, đây là spec Expo — không phải secret leak

supabase anon key (EXPO_PUBLIC_SUPABASE_ANON_KEY)
  → Public key với RLS protection — không phải service role key

experimentalForceLongPolling: true trong Firestore init
  → RN networking workaround, cố ý

detectSessionInUrl: false trong Supabase config
  → Đúng cho React Native

console.log bọc trong if (__DEV__)
  → Đúng chuẩn, không flag

withTimeout / withTimeoutFallback
  → Pattern tốt, không flag

_retry = true trong axios interceptor
  → Anti-loop pattern, cố ý

Zustand store có sensitive data in-memory (không persist)
  → OK nếu không có persist middleware ghi vào AsyncStorage
```

---

## 8. Khi nào DỪNG và hỏi user

1. Cần biết Firestore Security Rules (không đọc được từ code)
2. Cần biết Supabase OAuth config (PKCE vs implicit) — không đọc được từ code
3. Phát hiện data được gửi đi mà không biết endpoint nhận
4. Cần chạy `npm audit` hay `expo doctor` — hỏi user chạy và cung cấp output
5. Logic screen phức tạp cần hiểu user flow — mô tả và hỏi
