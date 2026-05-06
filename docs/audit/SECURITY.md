ẽe# SECURITY.md — Daily Mate Mobile · Security Audit Checklist

> Chuẩn: OWASP Mobile Top 10 (2024) + OWASP MASVS L1/L2
> Stack-specific: React Native · Expo · Supabase · Firebase Firestore · AsyncStorage · SecureStore

---

## A. SECURE STORAGE (OWASP M2 — Insecure Data Storage)

### A1. AsyncStorage vs SecureStore — Phân loại đúng chưa?

- [ ] **deviceId** lưu trong AsyncStorage (`database.js`) → unencrypted
      Trên Android bị root hoặc qua ADB backup → đọc được
      → deviceId là primary key của toàn bộ Firestore data của user
      → nên move sang SecureStore

- [ ] **Supabase session token** → đang dùng SecureStore qua SecureStoreAdapter ✅
      Nhưng cần verify: Android Auto Backup có exclude SecureStore không?
      ```xml
      <!-- android/app/src/main/res/xml/backup_rules.xml -->
      <exclude domain="sharedpref" path="SecureStore"/>
      ```

- [ ] **Settings (lat/lon, province, maxCookTime, costPref)** → AsyncStorage → OK (không nhạy cảm)

- [ ] **Zustand store** chứa `profile` (name, dob, disease_flags, BMI), `latestMetrics`, `allergies`
      → in-memory only, không persist → OK với điều kiện không có setState leak vào AsyncStorage

- [ ] Kiểm tra: có bất kỳ chỗ nào `JSON.stringify(state)` rồi lưu AsyncStorage không?

### A2. Sensitive Data Clear on Logout

- [ ] Khi user logout, Zustand store có được reset không?
- [ ] deviceId có bị xóa khỏi AsyncStorage không? (Nếu có, ID mới sẽ tạo Firestore docs mới)
- [ ] SecureStore (Supabase session) có được xóa không? (`supabase.auth.signOut()` tự xóa)
- [ ] Sau logout, navigate về LoginScreen và clear back stack không?

---

## B. NETWORK SECURITY (OWASP M3 — Insecure Communication)

### B1. HTTP thay vì HTTPS — CRITICAL

- [ ] `services/api.js`: `const API_BASE_URL = 'http://192.168.1.19:5001'`
      → HTTP không mã hóa → toàn bộ request/response (kể cả JWT token) plain text
      → Man-in-the-middle attack trivial trên cùng WiFi
      → Production PHẢI dùng `https://`

- [ ] Hardcode local IP `192.168.1.19` → khi deploy sẽ fail
      → Cần dùng env var: `process.env.EXPO_PUBLIC_API_BASE_URL`

### B2. Certificate / SSL Pinning

- [ ] Không có certificate pinning cho API Flask server
      → Attacker có thể dùng proxy (Burp Suite, mitmproxy) để intercept traffic
      → Với app food recommendation: risk thấp-trung (không có banking data)
      → Cân nhắc `@bam.tech/react-native-app-security` nếu muốn hardening

### B3. Token trong Request

- [ ] JWT được gắn qua interceptor → OK
- [ ] Nhưng nếu baseURL là HTTP → JWT đi qua plain text → token bị capture → impersonation
- [ ] `console.error('[API Error]', error.config?.url, msg)` → có log URL không? Có leak token trong URL không?

### B4. Timeout và Error Handling

- [ ] `timeout: 12000` (12s) — hơi cao, user UX sẽ bị treo 12s khi server chậm
- [ ] Retry chỉ áp dụng cho 401 (refresh token) — các lỗi 5xx không có retry
- [ ] Network error (device offline) có UI feedback không? Hay silent fail?

---

## C. AUTHENTICATION (OWASP M1 — Improper Platform Usage)

### C1. Email/Password Validation

- [ ] `handleLogin`: chỉ check `!email || !password` — không validate email format
      → `"abc"` là email hợp lệ theo validation hiện tại
      → Nên dùng regex cơ bản hoặc validator library

- [ ] `handleRegister`: password minimum 6 ký tự — khá thấp
      → Supabase default cho phép nhưng cân nhắc enforce 8+ trên client

- [ ] Không có rate limiting trên client (brute-force protection)
      → Supabase có built-in rate limit, nhưng không có UI feedback count/lockout

### C2. Google OAuth — Token Extraction từ URL Fragment

- [ ] `LoginScreen.js` extract `access_token` + `refresh_token` từ URL fragment sau redirect:
      ```js
      const hashParams = new URLSearchParams(result.url.split('#')[1] ?? ...)
      const accessToken = hashParams.get('access_token')
      ```
      → Implicit OAuth flow: token nằm trong URL fragment → có thể bị capture bởi:
        - Logging (console.log redirectUrl đang log URL không bao gồm token, nhưng...)
        - Browser history
        - Malicious deep link interceptor

- [ ] `console.log('[Google OAuth] redirectUrl:', redirectUrl)` trong production build
      → Nếu không có `if (__DEV__)` guard → log URL trong production (verify!)

- [ ] Fallback `exchangeCodeForSession(result.url)` — PKCE flow — tốt hơn implicit flow
      → Nếu PKCE work, nên ưu tiên PKCE, bỏ implicit flow fallback
      → Kiểm tra: Supabase project có config PKCE không?

### C3. Deep Link Security

- [ ] App nhận deep link `dailymate://reset-password`, `dailymate://auth/callback`
- [ ] Kiểm tra App.js: có validate URL scheme trước khi xử lý không?
- [ ] Malicious app có thể register cùng scheme → hijack redirect (Universal Links/App Links tốt hơn)
- [ ] Android: `android:autoVerify="true"` trong AndroidManifest.xml chưa?

### C4. Session Management

- [ ] Token refresh: interceptor retry 401 → gọi `supabase.auth.refreshSession()`
      → Nếu refresh token cũng expired → user bị loop 401? Hay redirect login?
- [ ] Multiple tabs/instances (web mode): session state có sync không?
- [ ] `autoRefreshToken: true` trong Supabase config → OK

---

## D. FIREBASE / FIRESTORE SECURITY

### D1. Firestore Security Rules — ĐIỂM MÙ LỚN NHẤT

- [ ] **Không thể audit từ code** — cần xem rules trong Firebase Console
- [ ] Cấu trúc hiện tại: `profiles/{deviceId}`, `allergies/{deviceId}/items/{key}`
- [ ] Nếu rules là `allow read, write: if true` → BẤT KỲ AI cũng đọc được data của user khác
- [ ] Rules TỐI THIỂU cần có:
      ```javascript
      match /profiles/{deviceId} {
        allow read, write: if request.auth != null
          && request.auth.uid == deviceId; // nếu dùng auth uid làm deviceId
      }
      // HOẶC nếu dùng random deviceId:
      match /profiles/{deviceId} {
        allow read, write: if request.auth != null; // tối thiểu phải authed
      }
      ```

### D2. deviceId Entropy — Weak Identifier

- [ ] `database.js`: `id = 'dev_' + Math.random().toString(36).slice(2) + Date.now().toString(36)`
      → `Math.random()` KHÔNG phải CSPRNG — entropy ~52 bits
      → Với Firestore query brute-force → có thể đoán được
- [ ] Nên dùng `expo-crypto` (đã có trong dependencies!) để tạo UUID v4:
      ```js
      import * as Crypto from 'expo-crypto';
      id = Crypto.randomUUID();
      ```

### D3. Firebase Config trong Source Code

- [ ] `utils/firebaseConfig.js`: apiKey, projectId, appId... hardcode trong source
- [ ] Firebase client keys ĐƯỢC THIẾT KẾ để public — bảo mật qua Firestore Rules, không phải giấu key
- [ ] NHƯNG: nếu Firestore Rules quá lỏng → key lộ = data lộ
- [ ] Kiểm tra: config có trong git history không? (`git log -- utils/firebaseConfig.js`)
- [ ] Cân nhắc move sang `google-services.json` / `GoogleService-Info.plist` cho production build

### D4. Firestore Read Quotas / Cost Attack

- [ ] Không có rate limiting phía client cho Firestore calls
- [ ] Attacker biết projectId → spam reads → Firebase bill tăng (billing DoS)
- [ ] Firestore Security Rules có thể thêm rate limiting nếu cần

---

## E. SENSITIVE DATA IN MEMORY & LOGS

### E1. console.log Leaking Sensitive Data

- [ ] `database.js` line: `console.log('[DB] Firebase Firestore ready. deviceId:', _deviceId)`
      → Bọc trong `if (__DEV__)` → kiểm tra có guard không

- [ ] `useAppStore.js` line: `console.log('[Store] initializeSettings:', { location, ... })`
      → Bọc trong `if (__DEV__)` ✅ (đã có guard)

- [ ] `api.js` line: `console.error('[API Error]', error.config?.url, msg)`
      → KHÔNG có __DEV__ guard → log error URL + message trong production
      → URL có thể chứa lat/lon (location data)

- [ ] Tất cả `console.log` trong production screens (LoginScreen, ProfileScreen, etc.) có guard không?

### E2. Health/Personal Data Classification

App lưu và xử lý:
- [ ] BMI, cân nặng, chiều cao → **sensitive health data**
- [ ] Disease flags (diabetes, hypertension, etc.) → **rất nhạy cảm**
- [ ] Dị ứng thực phẩm → **y tế nhạy cảm**
- [ ] GPS location history → **location data**

Kiểm tra: dữ liệu này có được xử lý đúng theo GDPR/privacy không nếu app publish store?

---

## F. DEPENDENCIES (OWASP M8 — Code Tampering)

Chạy để check CVE:
```bash
cd mobile_app
npm audit
npx expo install --check   # check compatibility
```

Packages cần chú ý đặc biệt:
- [ ] `axios@^1.6.0` — có CVE nào trong phiên bản đang dùng?
- [ ] `@supabase/supabase-js@^2.104.0` — version mới nhất?
- [ ] `firebase@^11.0.0` — version stable?
- [ ] `expo-secure-store@~15.0.8` — Android backup exclusion OK?
- [ ] `expo-auth-session@~7.0.11` — PKCE support đầy đủ?
- [ ] `react-native@0.81.5` — có known CVE không?

---

## G. BUILD & RELEASE SECURITY

### G1. .env không được commit vào git
- [ ] `.gitignore` có entry cho `.env` không?
- [ ] Kiểm tra git history: `git log --all --full-history -- .env`
- [ ] `eas.json` có chứa secret nào không?

### G2. Expo Build
- [ ] `app.json` có `android.permissions` quá rộng không?
- [ ] `expo-location` yêu cầu `ACCESS_FINE_LOCATION` — có cần `ACCESS_BACKGROUND_LOCATION` không? (nếu không cần thì xóa)
- [ ] ProGuard / Hermes minification có bật không? (obfuscation cho production)

### G3. Debug Mode trong Production
- [ ] `app.json`: `"__DEV__"` sẽ là `false` trong production build — đảm bảo tất cả console.log có guard
- [ ] `debug=True` trong Flask server (server-side) — xem demo_server audit

---

## Severity Reference

| Level | Ý nghĩa |
|---|---|
| CRITICAL | Exploit trực tiếp, data breach, auth bypass |
| HIGH | Fix trước khi release — bảo mật, crash, data loss |
| MEDIUM | Cần fix trong sprint — hardening, info disclosure |
| LOW | Best practice, không urgent |
| INFO | Ghi nhận, không cần action |
