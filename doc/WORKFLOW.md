# 🔄 Daily Mate — Workflow & User Flows
> Mô tả luồng hoạt động của app từ góc độ kỹ thuật  
> Cập nhật: May 2026

---

## 1. App Startup Flow

```
App.js khởi động
  │
  ├─ Load fonts (Lora + Be Vietnam Pro) — hiện SplashScreen (Lazy Cat Lottie)
  │
  ├─ supabase.auth.getSession()
  │     ├─ No session → authState = 'unauthenticated' → LoginScreen
  │     └─ Has session → authState = 'authenticated' → initializeApp()
  │
  └─ initializeApp()
        ├─ initDB()                          → getDeviceId (AsyncStorage)
        ├─ migrateExistingProfile()          → 1 lần duy nhất (schema cũ → multi-profile)
        ├─ initializeSettings()             → load lat/lon, maxPrepTime, costPreference, activeProfileId
        ├─ Promise.all([
        │     loadProfile(),
        │     loadLatestMetrics(),
        │     loadAllergies(),
        │     loadAllProfilesAction(),
        │     initializeIngredients(),       → cache ~1100 ingredients vào memory
        │   ])
        ├─ getUserLocation()                 → expo-location + lưu settings
        ├─ check AsyncStorage 'onboarding_done'
        │     ├─ Not done → showOnboarding = true → OnboardingStack
        │     └─ Done    → showOnboarding = false → MainTabs
        └─ setAppReady(true) → render app
```

---

## 2. Auth Flow

```
LoginScreen
  ├─ Email/Password → supabase.auth.signInWithPassword()
  ├─ Google OAuth   → expo-auth-session + PKCE → exchangeCodeForSession()
  └─ Sign Up        → supabase.auth.signUp()

Deep Link Handler (email confirm / reset password):
  Linking.getInitialURL() / addEventListener('url')
  ├─ ?code=XXX     → PKCE: exchangeCodeForSession(url)
  ├─ #access_token → Implicit: supabase.auth.setSession()
  └─ includes 'reset-password' → setShowReset(true) → ResetPasswordScreen

supabase.auth.onAuthStateChange()
  ├─ signed in  → setAuthState('authenticated') → initializeApp()
  └─ signed out → setAuthState('unauthenticated') → LoginScreen, clear appReady
```

---

## 3. Home Screen — Gợi ý món ăn

```
HomeScreen mount / focus
  │
  ├─ Lấy location (GPS hoặc cached settings)
  ├─ GET /weather?lat=&lon= → hiển thị thời tiết + AQI
  │
  ├─ User nhấn "Gợi ý món" (hoặc auto fetch)
  │     │
  │     ├─ Build payload:
  │     │     { profile, latestMetrics, allergies, location,
  │     │       maxPrepTime, costPreference,
  │     │       marketBasket: { selectedIngredients, boostStrategy },
  │     │       tasteProfile, hometownProvinceId, tasteMode }
  │     │
  │     ├─ POST /recommend → backend Python
  │     │     → trả về rankedDishes[] với { dish_id, title, final_score, explanation, ... }
  │     │
  │     ├─ setRankedDishes(dishes) vào Zustand store
  │     │
  │     ├─ saveSession() → Firestore (session record)
  │     └─ saveDishesToSession() → Firestore (dishes sub-collection)
  │
  └─ Hiển thị danh sách dishes với ParchmentCard + WigglyFrame

User tap dish card → navigate('DishDetail', { dish })
User tap "Bữa hôm nay" tab → ChosenDishScreen (meal plan)
```

---

## 4. Meal Plan Flow (ChosenDishScreen)

```
ChosenDishScreen
  │
  ├─ getMealPlan(today) → AsyncStorage key: meal_plan_YYYY-MM-DD
  ├─ Hiển thị dishes đã chọn theo từng profile
  │
  ├─ User tap "Thêm món" → navigate HomeScreen / RecommendScreen
  │
  ├─ addDishToMealPlan(profileInfo, dish)
  │     → Upsert vào AsyncStorage: { date, items[{profileId, dishes[]}] }
  │
  ├─ removeDishFromMealPlan(profileId, dishId)
  │     → Xóa dish, nếu profile còn 0 món → xóa luôn entry
  │
  └─ Nút "Đi chợ" → navigate('MarketBasket')
        → getAllDishesFromTodayPlan() → gộp tất cả ingredients
```

---

## 5. Multi-Profile Switch Flow

```
User tap profile name ở HomeScreen header
  → ProfileSwitcherSheet mở (Modal bottom sheet)
       ├─ Hiển thị danh sách profiles từ Zustand: store.profiles[]
       ├─ Active profile có checkmark + highlight
       └─ User chọn profile khác
             → switchProfile(profileId) [useAppStore thunk]
                   ├─ setActiveProfileId(profileId) → AsyncStorage
                   ├─ set({ activeProfileId }) → Zustand
                   ├─ loadProfileById(profileId) → Firestore
                   ├─ loadAllergiesForProfile(profileId) → Firestore
                   ├─ loadLatestMetricsForProfile(profileId) → Firestore
                   ├─ loadTasteProfileForProfile(profileId) → Firestore
                   └─ set({ profile, allergies, latestMetrics, tasteProfile... })
             → Sheet đóng, toàn bộ app dùng data profile mới

Thêm profile mới:
  ProfileScreen → "+ Thêm thành viên" → AddEditProfileScreen (create mode)
  Sửa profile: long press → AddEditProfileScreen (edit mode, route.params.profileId)
  Xóa profile: guard không xóa nếu còn 1 profile; nếu xóa active → auto switch
```

---

## 6. API Interceptor Flow

```
services/api.js (Axios instance)
  │
  REQUEST interceptor:
  ├─ supabase.auth.getSession()
  ├─ Nếu có session.access_token → thêm header: Authorization: Bearer {token}
  └─ Tiếp tục request
  │
  RESPONSE interceptor:
  ├─ 200 OK → pass through
  └─ 401 Unauthorized (và chưa retry):
        ├─ supabase.auth.refreshSession()
        ├─ Lấy access_token mới
        ├─ Cập nhật header
        └─ Retry request gốc 1 lần
```

---

## 7. Database Write Flow (Firestore)

```
Nguyên tắc: READ trước, WRITE sau, scope theo deviceId + profileId

Profile read:  loadProfileById(profileId)
               → doc('device_profiles/{deviceId}/members/{profileId}/profile_info')

Profile write: saveProfileMember(data)
               → setDoc với merge: true

Allergies:     loadAllergiesForProfile(profileId)
               → collection('device_profiles/{deviceId}/members/{profileId}/allergies')

Metrics:       loadLatestMetricsForProfile(profileId)
               → collection('device_profiles/{deviceId}/members/{profileId}/body_metrics')
               → orderBy created_at desc, limit 1

Sessions:      saveSession(deviceId, sessionData)
               → addDoc('sessions/{deviceId}/records')

Dishes:        saveDishesToSession(deviceId, sessionId, dishes[])
               → batch addDoc('sessions/{deviceId}/records/{sessionId}/dishes')

Settings:      getSetting(key) / setSetting(key, value)
               → doc('settings/{deviceId}/kv/{key}')
               → KHÔNG scope theo profile (device-level)
```

---

## 8. Settings Initialization (Zustand)

```
initializeSettings() — gọi khi app start
  Promise.all([
    getSetting('last_known_lat'),
    getSetting('last_known_lon'),
    getSetting('last_known_province'),
    getSetting('max_cook_time'),       → default 60 phút
    getSetting('cost_preference'),     → default 2 (Vừa phải: 1/2/3)
    getActiveProfileId(),              → AsyncStorage 'active_profile_id'
  ])
  → set tất cả vào Zustand 1 lần duy nhất
  → initializeLocation / initializeMaxPrepTime / initializeCostPreference đều
    delegate sang hàm này (backward compat)
```

---

## 9. Onboarding Flow (lần đầu)

```
AsyncStorage 'onboarding_done' chưa có
→ App.js render OnboardingStack:

OnboardingWelcome
  └─ Next → OnboardingPersonal
              └─ Save profile → OnboardingAllergy
                                  └─ Save allergies → TasteProfile (OnBoardTast)
                                                          └─ Save taste
                                                               → AsyncStorage.setItem('onboarding_done', '1')
                                                               → navigate Main (reset stack)
```

---

## 10. Error Handling Conventions

| Tình huống | Xử lý |
|------------|-------|
| Firestore call timeout >5s | `withTimeout()` throw; `withTimeoutFallback()` trả null |
| API 401 | Auto refresh token 1 lần, sau đó reject |
| API error khác | Log `[API Error]` + reject, UI hiện toast/alert |
| initializeApp fail | Log error, vẫn setAppReady(true) để không block UI |
| Migration fail | Catch error → tạo profile trống "Bản thân" làm fallback |
| ActiveProfileId bị mất | Fallback: load profile đầu tiên trong list |
