# Daily Mate Mobile — Technical README

## 1. Mục đích tài liệu

Tài liệu này mô tả kiến trúc và quy tắc kỹ thuật của ứng dụng mobile Daily Mate để AI hoặc developer mới có thể đọc trước khi sửa code.

Khi làm việc với repository này, phải ưu tiên code hiện tại và cấu hình thực tế. Không suy luận theo README cũ, không tự thay đổi backend, schema hoặc authentication nếu chưa kiểm tra contract đang được sử dụng.

## 2. Tổng quan sản phẩm

Daily Mate là ứng dụng gợi ý món ăn Việt Nam dựa trên:

- Vị trí và thời tiết hiện tại.
- Hồ sơ cá nhân, mục tiêu sức khỏe và khẩu vị.
- Dị ứng/thực phẩm cần tránh.
- Nguyên liệu người dùng đang có.
- Thời gian nấu và mức chi phí mong muốn.
- Lịch sử gợi ý, món đã lưu và phản hồi của người dùng.
- Video giới thiệu nguyên liệu được phát từ YouTube.

Ứng dụng hỗ trợ tiếng Việt (`vi`) và tiếng Anh (`en`).

## 3. Công nghệ chính

| Thành phần | Công nghệ |
|---|---|
| Framework | React Native 0.81.5 trên Expo SDK 54 |
| Runtime | Node.js + Metro + Hermes |
| UI navigation | React Navigation 6: Stack + Bottom Tabs |
| State | Zustand |
| HTTP | Axios |
| Auth chính | Supabase Auth |
| Local/persistent storage | AsyncStorage + Expo SecureStore |
| Cloud user data | Firebase Firestore |
| Firebase auth | Anonymous Auth để đáp ứng Firestore Rules |
| Localization | i18next + react-i18next + expo-localization |
| Video | react-native-webview, phát YouTube embed |
| Notification | expo-notifications |
| Location | expo-location |
| Charts | react-native-chart-kit |
| Icons/assets | Phosphor React Native, Lottie, Expo Google Fonts |
| Android build | Gradle 8.14.3, Android Gradle Plugin, CMake/NDK |
| Cloud build | EAS Build |

## 4. Cấu trúc thư mục

```text
mobile_app/
├── App.js                         # Bootstrap app, auth, navigation, deep links
├── app.json                       # Expo/native configuration
├── eas.json                       # EAS build profiles
├── package.json                   # Dependencies and scripts
├── build.ps1                      # Export JS bundle + local release APK
├── theme.js                       # Shared visual tokens
├── assets/
│   ├── data/ingredients.json      # Ingredient dataset bundled offline
│   ├── animations/                # Lottie assets
│   └── textures/                  # App backgrounds
├── components/                    # Reusable UI components
├── screens/                       # App screens
├── services/                      # API/business service wrappers
├── store/                         # Zustand store and Supabase client
├── utils/                         # Database, Firebase, data and media helpers
├── i18n/                          # i18next setup and locale dictionaries
├── android/                       # Generated/native Android project
├── docs/                          # Technical plans and project notes
└── tools/                         # Local development/verification scripts
```

## 5. Luồng khởi động ứng dụng

Luồng tổng quát trong `App.js`:

```text
App start
  → load fonts/assets
  → restore saved language
  → restore Supabase session
  → ensure Firebase anonymous auth
  → initialize Firestore/data layer
  → load profile, ingredients and reminder settings
  → request/read location when appropriate
  → register device token for push notifications
  → show Login hoặc MainTabs
```

Không được tạo một auth flow thứ ba. Supabase là auth chính; Firebase anonymous auth chỉ phục vụ quyền truy cập Firestore.

## 6. Navigation

### Bottom tabs

- `Home` → `screens/HomeScreen.js`
- `ChosenDish` → `screens/ChosenDishScreen.js`
- `History` → `screens/HistoryScreen.js`
- `Profile` → `screens/ProfileScreen.js`
- `Settings` → `screens/SettingsScreen.js`
- `FoodVideos` → `screens/FoodVideosScreen.js`

### Stack screens

- `Login`
- `ResetPassword`
- `Main`
- `DishDetail`
- `MarketBasket`
- `HistoryDetail`
- `EditPersonal`
- `BodyMetrics`
- `Allergy`
- `CookingChallenge`
- `TasteProfile`
- `Recommend`
- `AddEditProfile`
- `ChosenDish`

Khi thêm screen mới, phải đăng ký trong `App.js` và dùng i18n cho toàn bộ text hiển thị.

## 7. Authentication và deep link

Client Supabase nằm tại `store/suppabase.js`.

- Supabase lưu session bằng `expo-secure-store`.
- `services/api.js` tự đọc session và gắn `Authorization: Bearer <access_token>` vào request.
- `App.js` xử lý deep link cho OAuth/reset password với scheme `dailymate://`.
- Firebase dùng anonymous sign-in độc lập với Supabase. Không dùng Firebase anonymous UID thay cho Supabase user ID khi phân vùng dữ liệu user.

## 8. Data layer và lưu trữ

### AsyncStorage

Dùng cho các giá trị local/persistent nhẹ, đặc biệt settings:

- `setting_language`
- `setting_max_cook_time`
- `setting_cost_preference`
- `setting_unit_system`
- `setting_last_known_lat`
- `setting_last_known_lon`
- reminder settings

### SecureStore

Dùng cho dữ liệu cần bảo vệ:

- Supabase session thông qua adapter.
- `device_id`.

Không ghi API key bí mật, private key hoặc credential upload vào mobile bundle.

### Firebase Firestore

`utils/database.js` giữ interface data layer cho app. Firestore collections chính:

```text
profiles/{userNamespace}
body_metrics/{userNamespace}/entries/{autoId}
allergies/{userNamespace}/items/{allergyKey}
settings/{userNamespace}/kv/{key}
sessions/{userNamespace}/records/{autoId}
sessions/{userNamespace}/records/{sessionId}/dishes/{autoId}
feedback/{userNamespace}/items/{autoId}
weather_cache/{gridKey}
```

`getUserNamespace()` ưu tiên Supabase user ID và chỉ fallback về device ID khi chưa đăng nhập. Không tự đổi namespace vì có thể làm mất khả năng đọc dữ liệu cũ.

### Local ingredients

`assets/data/ingredients.json` là dữ liệu nguyên liệu được bundle offline.

`utils/ingredientsData.js` cung cấp:

- `ALL_INGREDIENTS`
- `getIngredientsForLanguage(language)`
- `getIngredientById(id)`
- `getIngredientsByCategory(category)`
- `searchIngredients(query)`

Ingredient hiện có các field chính như `id`, `name`, `name_en`, `category`.

## 9. Backend API contract đang dùng

Base URL lấy từ `EXPO_PUBLIC_API_BASE_URL`; fallback production hiện tại được khai báo trong `services/api.js`.

Axios interceptor trong `services/api.js` tự động:

1. Gắn Supabase JWT nếu session tồn tại.
2. Gắn `Accept-Language`.
3. Thêm query `lang` vào request.
4. Refresh session và retry một lần khi nhận HTTP 401.

Các endpoint mobile đang gọi:

| Method | Endpoint | Mục đích |
|---|---|---|
| `POST` | `/api/v1/device/register` | Đăng ký device token push |
| `GET` | `/api/v1/challenge?lat=&lon=` | Lấy thử thách món ăn |
| `GET` | `/api/weather?lat=&lon=` | Lấy thời tiết |
| `POST` | `/api/v1/recommend` | Tạo danh sách món gợi ý |
| `GET` | `/api/v1/dishes/:id` | Chi tiết món |
| `POST` | `/api/v1/feedback` | Gửi phản hồi món |
| `GET` | `/api/v1/ingredient-videos` | Lấy danh sách video nguyên liệu |

Backend phải được xem là project/contract riêng. Nếu sửa payload hoặc tên field API, phải kiểm tra cả backend và các screen/service tương ứng.

## 10. Localization

Localization nằm trong:

```text
i18n/index.js
i18n/locales/vi.js
i18n/locales/en.js
```

Quy tắc:

- Trong component dùng `const { t } = useTranslation()`.
- Text hiển thị dùng `t('namespace.key')`.
- Khi thêm key phải thêm đồng thời vào `vi.js` và `en.js`.
- Không hardcode label, title, button, alert, error, empty state hoặc notification.
- Có thể dùng `defaultValue` cho dữ liệu backend chưa có bản dịch, nhưng phải bảo đảm giao diện không bị trộn ngôn ngữ.
- Ngôn ngữ được lưu bằng key `language`.
- Ngôn ngữ ban đầu lấy từ thiết bị nếu là `vi`/`en`, nếu không thì fallback `vi`.
- `SettingsScreen` cho phép đổi ngôn ngữ runtime; sau khi đổi phải cập nhật i18n và danh sách ingredient.

## 11. Video nguyên liệu

`screens/FoodVideosScreen.js` là màn hình video nguyên liệu.

Luồng:

```text
FoodVideosScreen
  → ingredientVideoService.getIngredientVideos()
  → GET /api/v1/ingredient-videos
  → normalizeIngredientVideos()
  → chọn video + search/filter
  → YouTube iframe trong WebView
```

`utils/foodVideos.js` xử lý:

- Chuẩn hóa slug nguyên liệu bằng `toIngredientSlug()`.
- Trích xuất YouTube video ID.
- Tạo thumbnail `i.ytimg.com`.
- Tạo embed URL và HTML iframe.
- Hỗ trợ các dạng YouTube URL: watch, youtu.be, embed, shorts.

App chỉ xem video. App không upload video, không lưu Cloudflare/YouTube management key và không cần quyền upload.

Khi rời screen, `useIsFocused()` được dùng để thay WebView bằng thumbnail, giúp dừng video và tránh phát âm thanh ở screen khác.

## 12. State management

Store chính là `store/useAppStore.js`.

Các state quan trọng:

- `profile`, `profiles`, `activeProfileId`
- `latestMetrics`, `allergies`, `tasteProfile`
- `location`, `weatherData`
- `currentSession`, `currentSessionId`, `rankedDishes`
- `allIngredients`
- `marketBasket`
- `savedDishes`, `savedDishIds`
- `reminderEnabled`, `reminderTimes`

Khi logout, phải dùng `resetStore()` để xóa state/cache user cũ trước khi user khác đăng nhập.

## 13. Environment variables

File `.env` dùng các biến public cần thiết cho client:

```env
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_API_BASE_URL=...
EXPO_PUBLIC_YOUTUBE_EMBED_REFERRER=...
```

Quy tắc bảo mật:

- Không commit giá trị secret thật vào README, source hoặc log.
- Prefix `EXPO_PUBLIC_` nghĩa là giá trị có thể được bundle vào app; không đặt private backend key ở đây.
- Supabase anon key chỉ an toàn khi Supabase RLS được cấu hình đúng.
- Backend secret, upload key, Cloudflare management token, AI provider key và signing key phải nằm ở backend/secret manager.
- File `@v1etmanh__daily-mate.jks` là signing material nhạy cảm; không gửi hoặc commit lại nếu không cần thiết.

## 14. Build và chạy local

### Cài dependencies

```powershell
npm install
```

### Chạy Metro/Expo

```powershell
npx expo start
```

Android debug:

```powershell
npx expo run:android --device
```

### Tạo APK release local

`build.ps1` thực hiện:

1. Export JS bundle bằng `expo export:embed`.
2. Chạy `android/gradlew assembleRelease`.
3. Copy kết quả thành `DailyMate-release.apk`.

```powershell
.\build.ps1
```

APK đầu ra:

```text
android\app\build\outputs\apk\release\app-release.apk
DailyMate-release.apk
```

### Windows CMake path workaround

Native New Architecture có thể tạo object path dài hơn giới hạn Windows. `android/app/build.gradle` đã đặt:

```gradle
buildStagingDirectory file("D:/dm_cxx")
```

Không tự xóa cấu hình này nếu chưa có phương án thay thế. Khi clean build, chỉ xóa artifact generated như `android/app/.cxx` và `android/app/build`, không xóa source code.

### Cài APK vào thiết bị USB

```powershell
adb devices
adb install -r .\DailyMate-release.apk
```

`adb reverse` chỉ dùng khi app debug cần truy cập server chạy trên máy developer:

```powershell
adb reverse tcp:5001 tcp:5001
adb reverse tcp:8081 tcp:8081
```

Không cần `adb reverse` cho APK release nếu API dùng URL production.

## 15. EAS build profiles

`eas.json` hiện có:

| Profile | Output | Dùng cho |
|---|---|---|
| `development` | Development client/internal | Debug native |
| `preview` | APK | Test nội bộ |
| `production` | Android App Bundle (`.aab`) | Google Play |

Lệnh preview APK:

```powershell
npx eas build --platform android --profile preview
```

Lệnh production cho Google Play:

```powershell
npx eas build --platform android --profile production
```

App hiện có:

- Package: `com.vietmanh.dailymate`
- Version name: `1.0.7`
- Version code: `7`
- EAS project ID: `131e9657-e462-4ad8-8a95-083990f87e3a`

Release local hiện đang dùng debug signing trong native Gradle project, chỉ dùng test nội bộ. Không upload `DailyMate-release.apk` lên Google Play. Production Play release phải dùng đúng upload key/signing credentials của app đã phát hành.

## 16. Kiểm tra trước khi phát hành

Trước khi tạo release:

1. Kiểm tra package name không đổi.
2. Tăng `versionCode` lớn hơn bản đang có trên Play.
3. Kiểm tra EAS credentials không tạo nhầm keystore mới.
4. Build `preview` và test trên thiết bị thật.
5. Test đăng nhập, reset password, location, weather, recommendation, history, notification, language và video.
6. Test cả `vi` và `en`, đặc biệt các alert/error/empty state.
7. Kiểm tra API production, không để API local trong build production.
8. Kiểm tra privacy policy, Data safety và quyền notification/location trên Play Console.

## 17. Quy tắc dành cho AI khi sửa code

### Bắt buộc

- Đọc file liên quan trước khi sửa.
- Giữ nguyên package name, auth flow, namespace dữ liệu và API contract nếu task không yêu cầu đổi.
- Dùng `api` trong `services/api.js`, không tự tạo Axios client thứ hai.
- Dùng `useTranslation()` cho toàn bộ text hiển thị.
- Khi thêm locale key, cập nhật cả `vi.js` và `en.js`.
- Dùng `utils/database.js` thay vì truy cập Firestore rải rác trong screen.
- Dùng Zustand cho state dùng chung giữa nhiều screen.
- Giữ fallback offline và timeout behavior hiện có.
- Chạy ít nhất một build/bundle check sau thay đổi liên quan runtime.

### Không được tự ý làm

- Không đưa API key bí mật vào mobile app.
- Không đổi Supabase user ID thành device ID.
- Không xóa dữ liệu Firestore/AsyncStorage để “fix” bug nếu chưa có yêu cầu rõ ràng.
- Không xóa `.cxx`, `android/app/build` hoặc APK artifact của người dùng ngoài phạm vi clean build.
- Không đổi `newArchEnabled`, signing config hoặc package name chỉ để né lỗi build mà không báo rõ tác động.
- Không đổi endpoint/payload backend chỉ dựa trên suy đoán.
- Không mở YouTube bằng URL ngoài nếu task yêu cầu phát inline; ưu tiên embed WebView hiện tại.
- Không thêm upload flow vào mobile video screen; upload video là quy trình backend/admin thủ công.

## 18. Kiểm tra đã thực hiện gần đây

- `npx expo export --platform web` đã chạy thành công sau đợt hoàn thiện i18n.
- Local release APK đã build thành công sau khi chuyển CMake staging directory sang `D:/dm_cxx`.
- APK kiểm thử hiện tại: `DailyMate-release.apk`.

## 19. Các điểm cần lưu ý khi tiếp tục phát triển

- Backend recommendation/weather/video là hệ thống riêng; mobile chỉ là client.
- Dữ liệu ingredient local phải giữ khả năng chạy offline.
- Firestore rules phụ thuộc Firebase anonymous auth đã sẵn sàng trước các query.
- Notification cần permission hệ điều hành và notification channel Android.
- WebView/YouTube phụ thuộc mạng và chính sách embed của YouTube; không coi thumbnail là video playback.
- `app.json` có `newArchEnabled: false` ở cấp Expo nhưng plugin `expo-build-properties` và `android/gradle.properties` đang bật New Architecture cho Android/iOS. Đây là cấu hình cần giữ nhất quán khi thay đổi native.
