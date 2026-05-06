# LOGIC.md — Daily Mate Mobile · Business Logic & UX Audit Checklist

> Mục tiêu: phát hiện lỗi logic ẩn, edge case UX, data inconsistency,
> và hành vi không nhất quán trong app React Native.
> Không nhất thiết là security issue, nhưng ảnh hưởng reliability và UX.

---

## A. AUTH FLOW LOGIC (App.js + LoginScreen.js)

### A1. Auth State Race Condition
- [ ] `onAuthStateChange` listener trong App.js trigger navigation
      → Nếu Supabase session chưa load xong khi app start → flash màn hình login
      → Có loading state để prevent flickering không?

### A2. Logout Flow
- [ ] Khi `supabase.auth.signOut()` → `onAuthStateChange` fire với `session = null`
      → Navigate về LoginScreen — OK
      → Nhưng: Zustand store có được reset không? Nếu không → stale data khi re-login

### A3. Password Reset Deep Link
- [ ] `reset-password` deep link → nhận token từ email
      → Nếu user click link sau khi đã login vào app khác → behavior thế nào?
      → `ResetPasswordScreen.js` xử lý expired token thế nào?

### A4. Google OAuth Cancel
- [ ] Khi user cancel OAuth browser → `result.type === 'cancel'` → silent (đúng)
      → Nhưng có trường hợp WebBrowser.openAuthSessionAsync throw error không?
      → Catch block có? (đã có `catch (e) { Alert.alert(...) }` — OK)

### A5. Double-tap Submit
- [ ] `handleLogin`, `handleRegister`, `handleForgot` có `setLoading(true)` guard
      → Nhưng button disabled chỉ khi `loading === true`
      → Nếu user tap 2 lần cực nhanh trước khi loading set → 2 request gửi?
      → `useRef` debounce hoặc flag cần không?

---

## B. DATA FLOW LOGIC (useAppStore.js + database.js)

### B1. Stale allIngredients Cache
- [ ] `initializeIngredients()` load 1100+ ingredients vào memory khi app start
      → Nếu server update ingredient DB → app cache không invalidate
      → Không có TTL hay version check
      → User phải restart app để get data mới

### B2. Profile Switch Data Consistency
- [ ] `switchProfile()` làm 3 parallel Firestore reads:
      ```js
      const [allergiesRaw, metrics, tasteData] = await Promise.all([...])
      ```
      → Nếu 1 trong 3 call timeout/fail → allergies/metrics/taste của profile cũ bị mix với mới
      → Cần atomic update hoặc rollback khi bất kỳ call nào fail

### B3. deviceId Trên Nhiều Thiết Bị
- [ ] Mỗi device có deviceId khác nhau → user cài app trên 2 điện thoại → 2 profile khác nhau
      → Không có sync mechanism
      → User expect data sync khi đăng nhập Supabase account cùng nhau → thất vọng

### B4. initializeSettings Race
- [ ] `initializeLocation`, `initializeMaxPrepTime`, `initializeCostPreference`
      → Cả 3 đều delegate sang `initializeSettings()`
      → Nếu gọi cả 3 cùng lúc → 3 parallel calls đến `initializeSettings()`
      → Redundant AsyncStorage reads, potential state overwrite
      → `initializeSettings` có idempotent không? (Nhìn code: có — nhưng waste 3x reads)

### B5. loadAllIngredients Memory Usage
- [ ] 1100+ ingredients trong `allIngredients: []` state
      → Mỗi ingredient có bao nhiêu fields? Tính sơ: 1100 × 500 bytes ≈ 550KB in memory
      → Trên low-end Android → potential memory pressure
      → Có pagination hay lazy load không?

---

## C. API INTEGRATION LOGIC (services/api.js)

### C1. Retry Loop Risk
- [ ] 401 → refresh token → retry 1 lần (`_retry = true`)
      → Nếu refresh thành công nhưng server vẫn trả 401 → không retry lần 2 — OK
      → Nhưng nếu refresh thất bại → `refreshError` truthy → không retry
      → User nhận error gì? Có redirect về login không?

### C2. Axios Timeout vs Firestore Timeout
- [ ] Axios timeout: 12s
- [ ] Firestore `withTimeout`: 5s default
      → Request đến server có thể timeout ở tầng Axios (12s) nhưng Firestore đã timeout (5s)
      → Data không nhất quán: request thành công nhưng Firestore write fail silently

### C3. API Error Propagation
- [ ] `api.js` reject Promise khi error → caller phải try/catch
      → Kiểm tra: các screen call `api.post('/recommend')` có try/catch không?
      → Nếu không → unhandled promise rejection → crash hoặc silent fail

### C4. Request Deduplication
- [ ] User mở HomeScreen → kéo refresh nhanh nhiều lần → multiple /recommend requests
      → Không có request cancellation (AbortController)
      → Response cuối cùng override state — nhưng intermediate responses có thể arrive out-of-order

---

## D. LOCATION & WEATHER LOGIC (HomeScreen.js + api.js)

### D1. Location Permission Flow
- [ ] `expo-location` cần permission request
      → Nếu user từ chối → fallback về default location (Đà Nẵng 16.047, 108.206)?
      → User có được thông báo rõ không khi dùng fallback?

### D2. Location Staleness
- [ ] Location được lưu vào AsyncStorage: `last_known_lat`, `last_known_lon`
      → Không có TTL → location từ tuần trước vẫn được dùng
      → User di chuyển sang thành phố khác → recommendation vẫn cho thành phố cũ

### D3. GPS Precision vs Privacy
- [ ] lat/lon được gửi lên server với full precision (ví dụ: 16.047123, 108.206456)
      → Location precision cao → có thể identify exact address
      → Cân nhắc round về 2-3 decimal places trước khi gửi server

---

## E. ALLERGY / PREFERENCE LOGIC (AllergyScreen.js)

### E1. Allergy Key Data Contract
- [ ] Category allergy keys: alphabetic strings (ví dụ: "seafood")
- [ ] Ingredient allergy keys: numeric strings (ví dụ: "42")
- [ ] Server phân biệt bằng `x.isdigit()`
- [ ] Kiểm tra: khi save allergy, key format có được preserve đúng không?
- [ ] Khi switch profile → `loadAllergiesForProfile()` → mapping có giữ đúng type không?

### E2. Allergy Sync Timing
- [ ] AllergyScreen save → Firestore
      → Recommend ngay lập tức → API call với allergy từ Zustand store
      → Nếu Firestore write chưa xong mà recommend đã gửi → allergy stale

### E3. Ingredient Mode Loading
- [ ] `loadAllIngredients()` từ store — nếu chưa initialize → empty list
      → AllergyScreen hiển thị gì khi list empty? Loading state hay blank?

---

## F. MULTI-PROFILE LOGIC (useAppStore.js + database.js)

### F1. Profile Limit
- [ ] Không có giới hạn số lượng profile
      → User tạo 1000 profiles → memory vấn đề + Firestore cost tăng

### F2. Delete Profile
- [ ] Khi xóa active profile → switchProfile về profile nào?
      → Edge case: xóa profile cuối cùng → app state thế nào?

### F3. Profile Data Isolation
- [ ] Mỗi profile có allergy, metrics, taste riêng → OK theo code
      → Nhưng: `allIngredients`, `provinces`, `rankedDishes` là shared → đúng không?

---

## G. NAVIGATION & SCREEN LOGIC

### G1. Auth Guard
- [ ] Các screen yêu cầu auth: HomeScreen, RecommendScreen, ProfileScreen, etc.
      → Nếu session expire trong khi app đang chạy → API trả 401 → interceptor refresh
      → Nhưng nếu refresh cũng fail → user vẫn thấy màn hình protected?
      → Có navigation guard kiểm tra auth state trước khi render không?

### G2. Back Navigation sau Logout
- [ ] Sau logout → navigate LoginScreen
      → Nếu không clear navigation stack → Android back button quay về protected screen
      → `navigation.reset()` hay `navigation.navigate()` đang dùng loại nào?

### G3. Error Boundary
- [ ] Không thấy `<ErrorBoundary>` wrapper trong App.js
      → Unhandled JS error → crash toàn app thay vì fallback UI
      → Cân nhắc thêm ErrorBoundary cho production

---

## H. PERFORMANCE LOGIC

### H1. Firestore Reads trên App Start
- [ ] App start trigger: initDB → loadAllProfiles → loadProfile → loadAllergies → loadLatestMetrics → loadTasteProfile
      → 5-6 parallel Firestore reads ngay khi mở app
      → Trên 3G / network chậm → app "đứng" 5-10 giây

### H2. Re-render từ Zustand
- [ ] `set({ allergies: [...allergies] })` — spread tạo array mới mỗi lần
      → Tất cả component subscribe `allergies` sẽ re-render
      → Không có `shallow` selector → potential unnecessary re-renders
      → Nếu performance issue: kiểm tra Zustand selector granularity
