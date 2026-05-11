# 🔒 Daily Mate — Privacy & Data Documentation (Mobile App)
> Phiên bản: 1.0 | Cập nhật: May 2026  
> Phạm vi: React Native (Expo) client — `daily_mate_all/mobile_app/`

---

## 1. Tổng quan về thu thập dữ liệu

Daily Mate thu thập dữ liệu cá nhân để cung cấp tính năng **gợi ý bữa ăn cá nhân hóa**.  
Toàn bộ dữ liệu được xử lý theo nguyên tắc **tối thiểu hóa** — chỉ thu thập những gì
thực sự cần thiết cho chức năng core.

---

## 2. Dữ liệu thu thập & nơi lưu trữ

### 2.1 Dữ liệu hồ sơ cá nhân (Profile)

| Trường dữ liệu | Bắt buộc | Nơi lưu | Mục đích |
|---|---|---|---|
| Tên hiển thị | Không | Firestore | Hiển thị UI, phân biệt multi-profile |
| Giới tính | Có | Firestore | Tính toán dinh dưỡng |
| Năm sinh | Có | Firestore | Tính tuổi → điều chỉnh gợi ý |
| Mục tiêu ăn uống | Có | Firestore | Core ranking logic |
| Dị ứng thực phẩm | Có | Firestore | Lọc món an toàn |
| Khẩu vị (7 chiều) | Có | Firestore | Scoring |
| Vùng miền / Tỉnh thành | Không | Firestore | Gợi ý theo địa phương |

> **Ghi chú**: Mỗi thiết bị hỗ trợ tối đa **5 profiles** (multi-profile cho gia đình).  
> Mỗi profile độc lập — dị ứng, khẩu vị của profile A không ảnh hưởng profile B.

---

### 2.2 Dữ liệu chỉ số cơ thể (BodyMetrics)

| Trường dữ liệu | Lưu tại | Ghi chú |
|---|---|---|
| Cân nặng (kg) | Firestore | Lưu lịch sử theo profile |
| Chiều cao (cm) | Firestore | Dùng để tính BMI |
| BMI (tính toán) | Client-side only | Không gửi lên server nguyên bản |

---

### 2.3 Dữ liệu vị trí (Location)

| Thông tin | Cách thu thập | Mục đích | Lưu trữ |
|---|---|---|---|
| Tọa độ GPS (lat/lon) | `expo-location` (khi dùng app) | Lấy thời tiết thực & AQI | **Không lưu trên client**, gửi lên server mỗi request |
| Tên tỉnh / thành phố | Reverse geocoding qua backend | Hiển thị tên địa điểm | Không lưu |

> **Quan trọng**: App **không** theo dõi vị trí nền (background location).  
> Location chỉ được lấy khi user chủ động mở HomeScreen.

---

### 2.4 Dữ liệu xác thực (Auth)

| Thông tin | Nhà cung cấp | Lưu ở đâu |
|---|---|---|
| Email | Supabase Auth | Supabase cloud (EU/US region) |
| JWT access token | Supabase | AsyncStorage (encrypted by Expo) |
| Password | Supabase Auth | **Không bao giờ** lưu trên client — chỉ hash server-side |

---

### 2.5 Dữ liệu cục bộ (AsyncStorage)

Những thông tin sau **chỉ lưu trên thiết bị**, không đồng bộ lên cloud:

| Key | Nội dung | Thời gian giữ |
|---|---|---|
| `meal_plan_YYYY-MM-DD` | Bữa ăn đã chọn trong ngày | 30 ngày rồi tự xóa |
| `onboarding_done` | Cờ onboarding hoàn thành | Vĩnh viễn (cho đến gỡ app) |
| Settings (prep time, chi phí...) | Tùy chỉnh filter | Vĩnh viễn |
| Session cache gợi ý | Kết quả API gần nhất | Phiên hiện tại |

---

### 2.6 Push Notification Token

| Thông tin | Mục đích | Nơi lưu |
|---|---|---|
| Expo Push Token | Gửi nhắc nhở bữa ăn | SQLite trên backend server |
| Platform (android/ios) | Định dạng notification | SQLite trên backend server |

Token **không** chứa thông tin nhận dạng cá nhân (PII). Có thể thu hồi bất kỳ lúc nào qua Settings.

---

## 3. Luồng dữ liệu khi gọi API

```
Mobile App
    │
    ├─ [Payload gửi lên backend]
    │     - profile: { age, gender, goal, allergies, taste_vector }
    │     - metrics: { weight, height }
    │     - location: { lat, lon }
    │     - weather: (backend tự lấy từ lat/lon)
    │     - market_basket: [ ingredient_ids ]
    │     - max_prep_time, cost_preference
    │
    ├─ Header: Authorization: Bearer <JWT>
    │
    └─ [Phản hồi nhận về]
          - ranked_dishes: [ { id, name, score, reason } ]
          - weather_info: { temp, condition, aqi }
```

**Dữ liệu KHÔNG bao giờ gửi lên server:**
- Lịch sử meal plan (lưu local)
- Password
- Số điện thoại
- Số CMND / CCCD
- Thông tin thanh toán

---

## 4. Nhà cung cấp dịch vụ bên thứ ba

| Dịch vụ | Mục đích | Dữ liệu chia sẻ | Chính sách riêng tư |
|---|---|---|---|
| **Supabase** | Auth, Cloud DB | Email, JWT, profile data | [supabase.com/privacy](https://supabase.com/privacy) |
| **Firebase / Firestore** | Profile storage | Profile data (không có PII nhạy cảm) | [firebase.google.com/support/privacy](https://firebase.google.com/support/privacy) |
| **OpenWeatherMap** | Dữ liệu thời tiết | Tọa độ GPS (lat/lon) | [openweathermap.org/privacy-policy](https://openweathermap.org/privacy-policy) |
| **Expo Push** | Push notification | Expo token | [expo.dev/privacy](https://expo.dev/privacy) |

---

## 5. Quyền thiết bị được yêu cầu

| Quyền | Lý do | Có thể từ chối? |
|---|---|---|
| `ACCESS_FINE_LOCATION` | Lấy thời tiết thực tế | Có — app fallback về vị trí mặc định |
| `RECEIVE_NOTIFICATIONS` | Nhắc nhở bữa ăn | Có — tính năng nhắc nhở sẽ bị tắt |
| `INTERNET` | Kết nối API backend | Không (bắt buộc) |

---

## 6. Lưu giữ & Xóa dữ liệu

### Xóa tài khoản
Khi user xóa tài khoản (qua Supabase Auth):
1. Firestore data (profile, metrics, allergies) → xóa theo `uid`
2. Supabase Auth record → xóa
3. AsyncStorage trên thiết bị → user cần gỡ app hoặc xóa cache thủ công
4. Backend `device_tokens` → xóa theo `device_id`

### Xóa profile phụ (multi-profile)
- Xóa document trong Firestore theo `profileId`
- Meal plan local vẫn tồn tại (AsyncStorage) cho đến khi hết hạn 30 ngày

---

## 7. Bảo mật dữ liệu phía Client

| Biện pháp | Chi tiết |
|---|---|
| **JWT authentication** | Mọi API call đều mang Bearer token — `services/api.js` interceptor tự inject |
| **AsyncStorage** | Dữ liệu được Expo sandbox theo app — app khác không đọc được |
| **HTTPS only** | Toàn bộ traffic đến backend qua HTTPS (production) |
| **No plaintext secrets** | Firebase config, Supabase URL trong `.env`, không hardcode trong code |

---

## 8. Dữ liệu trẻ em

Daily Mate cho phép tạo profile cho trẻ em (thành viên gia đình nhỏ tuổi) dưới sự quản lý của phụ huynh thông qua **multi-profile**. Tài khoản Supabase vẫn phải thuộc về người lớn.

App **không** hướng tới người dùng dưới 13 tuổi làm chủ tài khoản.

---

## 9. Liên hệ về Quyền riêng tư

Mọi yêu cầu liên quan đến dữ liệu cá nhân (truy cập, chỉnh sửa, xóa):
- Qua phần **Settings** trong app
- Hoặc liên hệ trực tiếp với nhà phát triển (cập nhật thông tin khi publish)

---

*Tài liệu này dành cho nội bộ phát triển. Khi publish app store, cần chuyển đổi sang Privacy Policy công khai theo yêu cầu của Google Play / App Store.*
