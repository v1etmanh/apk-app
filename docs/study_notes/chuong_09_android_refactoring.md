# CHƯƠNG 9: TÁI CẤU TRÚC VÀ TỐI ƯU CHO ANDROID (ANDROID REFACTORING & OPTIMIZATION)

> **Tài liệu gốc**: [`docs/learning.md`](file:///d:/dream_project/daily_mate_code/daily_mate_all/mobile_app/docs/learning.md#L131-L151)  
> **Trạng thái**: 🟡 Đang học (In Progress)

---

## 💡 I. TÓM TẮT KIẾN THỨC CỐT LÕI (MENTOR NOTES)

### 1. Phân nhánh Nền tảng với API `Platform` (`Platform.OS` & `Platform.select`)
- **Tách biệt Logic Giao diện**: Hệ điều hành iOS và Android có thiết kế phần cứng khác nhau (tai thỏ Notch, thanh điều hướng 3 nút Android, bàn phím mềm).
- **Phân nhánh theo hệ điều hành (`Platform.OS`)**:
  * Xử lý khoảng cách khoảng đệm StatusBar: `paddingTop: Platform.OS === 'android' ? 44 : 56` ([`screens/TasteProfileScreen.js`](file:///d:/dream_project/daily_mate_code/daily_mate_all/mobile_app/screens/TasteProfileScreen.js#L425)).
  * Xử lý trượt bàn phím `KeyboardAvoidingView`: `behavior={Platform.OS === 'ios' ? 'padding' : 'height'}` ([`screens/LoginScreen.js`](file:///d:/dream_project/daily_mate_code/daily_mate_all/mobile_app/screens/LoginScreen.js#L209)).
- **Phân nhánh theo thuộc tính (`Platform.select`)**:
  * Định nghĩa hiệu ứng đổ bóng: iOS dùng chuỗi `shadowColor/shadowOpacity`, trong khi Android bắt buộc dùng `elevation` ([`screens/BodyMetricsScreen.js`](file:///d:/dream_project/daily_mate_code/daily_mate_all/mobile_app/screens/BodyMetricsScreen.js#L366)).

### 2. Cấu hình Đặc thù Android (Notification Channels & Permissions)
- **Notification Channels (Bắt buộc từ Android 8.0 Oreo trở lên)**: Không giống iOS, Android đòi hỏi phải đăng ký Kênh thông báo (`NotificationChannel`) thì ứng dụng mới có quyền phát âm thanh/hiển thị banner thông báo nhắc nhở.
- **Mã nguồn thực tế**: [`services/mealReminderService.js`](file:///d:/dream_project/daily_mate_code/daily_mate_all/mobile_app/services/mealReminderService.js#L37-L45).

### 3. Tối ưu Đổ bóng (Shadow) Đa nền tảng trong Design System
- Bọc helper function tạo bóng `shadow()` trong [`theme.js`](file:///d:/dream_project/daily_mate_code/daily_mate_all/mobile_app/theme.js#L50-L56) để tự động xuất `elevation` cho Android và `shadow*` cho iOS.

---

## 🔄 SO SÁNH HỆ THỐNG: CỔ ĐIỂN (DOC) VS HIỆN ĐẠI (CODEBASE THỰC TẾ)

| Khái niệm | Lý thuyết trong `learning.md` (Cổ điển) | Cách triển khai trong Project `mobile_app` (Hiện đại) |
| :--- | :--- | :--- |
| **Cấu trúc File** | Nhân bản tệp tin dạng `index.ios.js` & `index.android.js` | Dùng 1 codebase duy nhất kết hợp **`Platform.OS`** và **`Platform.select()`** |
| **Menu Đồ họa** | `DrawerLayoutAndroid` (chỉ chạy trên Android) | `createBottomTabNavigator` / React Navigation đa nền tảng |
| **Bong bóng thông báo** | API `ToastAndroid` (chỉ chạy trên Android) | Component `Toast` tùy chỉnh bằng `Animated.View` hoạt động mượt trên cả 2 hệ điều hành ([`screens/RecommendScreen.js`](file:///d:/dream_project/daily_mate_code/daily_mate_all/mobile_app/screens/RecommendScreen.js#L696)) |
| **Bàn phím** | Chỉnh sửa padding/margin thủ công | `KeyboardAvoidingView` kết hợp `Platform.OS` rẽ nhánh `behavior` |
| **Thông báo hệ thống** | Cấu hình thủ công trong `AndroidManifest.xml` | `expo-notifications` kết hợp `setupNotificationChannel()` |

---

## 📝 II. BÀI TẬP VÀ CÂU HỎI PHẢN XẠ (STUDENT TASKS)

### ❓ Câu hỏi 1: Đổ bóng (Shadow vs Elevation) giữa iOS và Android
Mở tệp [`theme.js`](file:///d:/dream_project/daily_mate_code/daily_mate_all/mobile_app/theme.js#L50-L56):
```javascript
export const shadow = (level = 1) => ({
  elevation: level * 2,
  shadowColor: C.shadow,
  shadowOffset: { width: 0, height: level },
  shadowOpacity: 1,
  shadowRadius: level * 3,
});
```
1. Thuộc tính `elevation` có tác dụng gì trên Android? Nếu xóa `elevation` đi thì giao diện ứng dụng trên thiết bị Android sẽ bị biến đổi thế nào?
2. Tại sao ta không nên tách ra 2 file `Component.android.js` và `Component.ios.js` như Redux/RN thời kỳ đầu mà nên dùng helper function trong 1 file duy nhất?

### ❓ Câu hỏi 2: Notification Channel trên Android
Mở tệp [`services/mealReminderService.js`](file:///d:/dream_project/daily_mate_code/daily_mate_all/mobile_app/services/mealReminderService.js#L37):
1. Tại sao đoạn code lại kiểm tra `if (Platform.OS !== 'android') return;` trước khi gọi `Notifications.setNotificationChannelAsync`?

---

## ✍️ III. PHẦN CHÉP BÀI & TRẢ LỜI CỦA HỌC VIÊN (USER FILLS HERE)

### 1. Ghi chép cá nhân:
- (Nhập ghi chép của bạn ở đây...)

### 2. Trả lời Bài tập / Câu hỏi phản xạ:
- **Trả lời Câu 1**:
  - 
- **Trả lời Câu 2**:
  - 

### 3. Thắc mắc / Câu hỏi gửi Mentor:
- (Nhập câu hỏi của bạn tại đây nếu có...)
