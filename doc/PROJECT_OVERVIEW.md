# 📱 Daily Mate — Project Overview
> Tài liệu tham chiếu nhanh cho AI Agent & Developer mới vào dự án  
> Cập nhật: May 2026 | Version: 1.0.0

---

## 1. Mô tả dự án

**Daily Mate** là ứng dụng mobile React Native giúp người dùng Việt Nam **lên thực đơn bữa ăn hàng ngày** dựa trên hồ sơ cá nhân (tuổi, cân nặng, dị ứng, khẩu vị, vùng miền, thời tiết, nguyên liệu trong nhà). App kết nối với một backend Python (Flask/FastAPI) chạy riêng để tính điểm và gợi ý món ăn thông minh.

**Tagline:** *"Bạn đồng hành ẩm thực"*

---

## 2. Stack công nghệ

| Layer | Công nghệ | Ghi chú |
|-------|-----------|---------|
| **Mobile App** | React Native 0.81.5 + Expo ~54 | iOS + Android |
| **Navigation** | React Navigation 6 (Stack + BottomTabs) | |
| **State Management** | Zustand 4.5 | `store/useAppStore.js` |
| **Backend API** | Axios → `http://192.168.1.19:5001` | Python server riêng |
| **Auth + Cloud DB** | Supabase (JWT Auth) | `store/suppabase.js` |
| **Local DB / Profile** | Firebase Firestore | `utils/database.js` |
| **Local cache** | AsyncStorage | Session, meal plan, settings |
| **Animation** | Lottie React Native | Mascot mèo, splash screen |
| **Fonts** | Lora + Be Vietnam Pro (Google Fonts) | Ghibli handcrafted style |
| **Icons** | Phosphor React Native | |
| **Charts** | react-native-chart-kit | Body metrics screen |


---

## 3. Tính năng chính

### F01 — Gợi ý món ăn (HomeScreen)
- Gọi API backend với payload: profile + metrics + allergies + location + weather + maxPrepTime + costPreference + marketBasket
- Nhận về danh sách `rankedDishes[]` với điểm số và lý do
- Hiển thị thời tiết thực (OpenWeatherMap qua backend) + AQI

### F02 — Bữa hôm nay (ChosenDishScreen)
- Người dùng chọn món từ danh sách gợi ý vào "bữa hôm nay"
- Lưu local qua `mealPlanService.js` (AsyncStorage theo ngày, key: `meal_plan_YYYY-MM-DD`)
- Hỗ trợ nhiều profile trong cùng 1 ngày

### F03 — Giỏ nguyên liệu (MarketBasketScreen)
- Tick nguyên liệu có sẵn trong nhà → ảnh hưởng ranking món
- Chiến lược boost: `strict` (chỉ món dùng nguyên liệu đó) hoặc `loose`

### F04 — Lịch sử bữa ăn (HistoryScreen)
- Xem lại các session gợi ý đã qua
- Chi tiết từng session: món nào được chọn, lý do

### F05 — Hồ sơ cá nhân (ProfileScreen)
- Thông tin cá nhân: tên, giới tính, năm sinh, mục tiêu ăn uống
- Multi-profile: nhiều thành viên gia đình (tối đa 5 profiles/thiết bị)
- Chuyển đổi active profile → toàn bộ recommendation thay đổi

### F06 — Chỉ số cơ thể (BodyMetricsScreen)
- Nhập cân nặng, chiều cao, BMI tự tính
- Lưu lịch sử metrics theo profile

### F07 — Dị ứng thực phẩm (AllergyScreen)
- Multi-select danh sách dị ứng phổ biến
- Scope theo profile: dị ứng của profile A ≠ profile B

### F08 — Khẩu vị & Vùng miền (TasteProfileScreen)
- 7 chiều khẩu vị: ngọt, chua, mặn, đắng, umami, cay, chát
- Chế độ `hometown` (theo tỉnh thành 63 tỉnh) hoặc `manual` (tự chỉnh)

### F09 — Thử thách nấu ăn (CookingChallengeScreen)
- Gợi ý thử công thức mới mẻ, thoát khỏi vùng an toàn

### F10 — Onboarding (screens/onboarding/)
- 4 bước: Welcome → Personal → Allergy → TasteProfile
- Chạy 1 lần duy nhất, sau đó set AsyncStorage `onboarding_done`


---

## 4. Màn hình (Screens)

```
screens/
├── LoginScreen.js              Auth — Supabase email/password + OAuth
├── HomeScreen.js               Trang chủ — gợi ý + thời tiết + AQI
├── ChosenDishScreen.js         Bữa hôm nay — meal plan hàng ngày
├── DishDetailScreen.js         Chi tiết món ăn
├── HistoryScreen.js            Lịch sử các session
├── HistoryDetailScreen.js      Chi tiết 1 session cụ thể
├── ProfileScreen.js            Hồ sơ + quản lý multi-profile
├── EditPersonalScreen.js       Sửa thông tin cá nhân
├── BodyMetricsScreen.js        Nhập chỉ số cơ thể
├── AllergyScreen.js            Quản lý dị ứng
├── TasteProfileScreen.js       Cài đặt khẩu vị & vùng miền
├── MarketBasketScreen.js       Giỏ nguyên liệu
├── CookingChallengeScreen.js   Thử thách nấu ăn
├── RecommendScreen.js          Gợi ý nâng cao
├── AddEditProfileScreen.js     Thêm / sửa profile thành viên
├── SettingsScreen.js           Cài đặt app (prep time, chi phí...)
├── ResetPasswordScreen.js      Đổi mật khẩu (deep link flow)
└── onboarding/
    ├── OnboardingWelcome.js
    ├── OnboardingPersonal.js
    ├── OnboardingAllergy.js
    └── OnBoardTast.js
```

---

## 5. Design System (Ghibli Handcrafted)

**Phong cách:** Studio Ghibli × Storybook — mọi thứ trông như được vẽ tay, ra từ cuốn sổ tay của người nấu ăn lãng mạn.  
**File đầy đủ:** `design.md` ở root project — PHẢI đọc trước khi tạo screen mới.

### Màu chính
| Token | Hex | Dùng cho |
|-------|-----|----------|
| Parchment | `#F5EDDC` | Background card |
| Wood Dark | `#8B5E3C` | Tiêu đề, icon đậm |
| Wood Mid | `#C8A96E` | Viền card, accent |
| Ink Brown | `#3D2B1F` | Text chính |
| Sky Blue | `#60A5FA` | CTA primary |
| Done Green | `#4ADE80` | Hoàn thành |

### Font
- **Lora** — tiêu đề, badge, CTA
- **Be Vietnam Pro** — body text, chip label (tốt cho tiếng Việt)

### Texture Assets
```
assets/textures/
├── wood_light.png      → Background màn hình (opacity 0.85)
├── paper_cream.png     → Card background
├── sky_watercolor.png  → Empty/loading state
└── notebook_lines.png  → Overlay nhẹ
```

---

## 6. Cấu trúc thư mục

```
mobile_app/
├── App.js                      Entry point + Navigation root + Auth guard
├── theme.js                    Design tokens (colors C, fonts)
├── design.md                   Design system đầy đủ (đọc trước khi code UI)
├── screens/                    Tất cả màn hình
├── components/
│   ├── ProfileSwitcherSheet.js Bottom sheet chọn profile
│   └── ui/                     Shared UI components (PaperCard, WoodButton...)
├── store/
│   ├── useAppStore.js          Zustand global store
│   └── suppabase.js            Supabase client
├── services/
│   ├── api.js                  Axios + JWT interceptors
│   ├── mealPlanService.js      Meal plan CRUD (AsyncStorage)
│   └── tasteProfileService.js
├── utils/
│   ├── database.js             Firebase Firestore helpers
│   └── firebaseConfig.js       Firebase init
├── assets/
│   ├── textures/               Texture PNG files
│   └── animations/             Lottie JSON files (mèo mascot)
└── doc/                        ← Tài liệu AI (thư mục này)
```

---

## 7. Lưu ý QUAN TRỌNG cho AI Agent

1. **`overflow: 'hidden'` KHÔNG đặt trên container chứa `<Text>`** → clip tiếng Việt có dấu. Luôn tách Image texture vào View wrapper riêng.
2. **Multi-profile đã implemented** — mọi thao tác DB phải truyền `profileId`, không dùng `deviceId` trực tiếp.
3. **API calls luôn qua `services/api.js`** — interceptor tự inject JWT, không tạo axios instance mới.
4. **Firestore = nguồn truth cho profile data** — AsyncStorage chỉ dùng cho settings, meal plan, cache nhất thời.
5. **Migration chạy 1 lần khi app start** — `migrateExistingProfile()` trong `App.js` initializeApp().
6. **Đọc `design.md`** trước khi tạo bất kỳ component/screen mới nào.
7. **Backend API URL hardcode** `http://192.168.1.19:5001` trong `services/api.js` — cần đổi khi deploy production.
