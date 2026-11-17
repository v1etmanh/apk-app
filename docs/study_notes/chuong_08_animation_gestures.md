# CHƯƠNG 8: HOẠT ẢNH VÀ CỬ CHỈ (ANIMATION & GESTURES)

> **Tài liệu gốc**: [`docs/learning.md`](file:///d:/dream_project/daily_mate_code/daily_mate_all/mobile_app/docs/learning.md#L112-L130)  
> **Trạng thái**: 🟡 Đang học (In Progress)

---

## 💡 I. TÓM TẮT KIẾN THỨC CỐT LÕI (MENTOR NOTES)

### 1. Animated API & Tối ưu Cầu nối Native (`useNativeDriver: true`)
- **Hoạt ảnh cơ bản (Animated API)**: Sử dụng `Animated.Value`, `Animated.timing()`, `Animated.sequence()`, `Animated.loop()` để tạo các hiệu ứng như rung lắc thông báo lỗi (shake), xoay biểu tượng (rotate), hoặc làm mờ dần (fade-in/fade-out).
- **Tối ưu 60fps với Native Driver**: Cờ `useNativeDriver: true` giúp đẩy toàn bộ tính toán thuộc tính hình học (transform: translateX, scale, opacity) sang thread Native (UI Thread) để xử lý trực tiếp bằng GPU, không làm nghẽn JS Thread ngay cả khi ứng dụng đang xử lý logic nặng.
- **Mã nguồn thực tế**: [`screens/LoginScreen.js`](file:///d:/dream_project/daily_mate_code/daily_mate_all/mobile_app/screens/LoginScreen.js#L33-L47) (shake card khi sai mật khẩu) & [`screens/SettingsScreen.js`](file:///d:/dream_project/daily_mate_code/daily_mate_all/mobile_app/screens/SettingsScreen.js#L158-L165) (xoay bánh răng cài đặt).

### 2. Hoạt ảnh Vector Đồ họa với Lottie (Lottie Animations)
- **Lottie Framework**: Render các file hoạt ảnh vector dạng JSON được xuất từ Adobe After Effects thông qua thư viện `lottie-react-native`.
- **Ưu điểm**: File cực nhẹ (~vài KB), hỗ trợ thu phóng vô hạn không vỡ nét (Vector resolution independent) và chạy siêu mượt 60fps.
- **Mã nguồn thực tế**: Mascot mèo lười Splash Screen tại [`App.js`](file:///d:/dream_project/daily_mate_code/daily_mate_all/mobile_app/App.js#L126) và hoạt ảnh thời tiết tại [`components/ui/WeatherAnimationSprite.js`](file:///d:/dream_project/daily_mate_code/daily_mate_all/mobile_app/components/ui/WeatherAnimationSprite.js#L366).

### 3. Bộ xử lý Cử chỉ Chạm (Gesture Handling)
- **PanResponder vs Gesture Handler**: Xử lý cử chỉ vuốt, kéo thả (Pan/Swipe) của ngón tay người dùng trên màn hình.

---

## 🔄 SO SÁNH HỆ THỐNG: CỔ ĐIỂN (DOC) VS HIỆN ĐẠI (CODEBASE THỰC TẾ)

| Khái niệm | Lý thuyết trong `learning.md` (Cổ điển) | Cách triển khai trong Project `mobile_app` (Hiện đại) |
| :--- | :--- | :--- |
| **Hoạt ảnh cơ bản** | `LayoutAnimation` (nhanh nhưng khó kiểm soát chi tiết) | **`Animated API`** + **`useNativeDriver: true`** ([`screens/LoginScreen.js`](file:///d:/dream_project/daily_mate_code/daily_mate_all/mobile_app/screens/LoginScreen.js#L33)) |
| **Thread xử lý** | Chạy hoạt ảnh trên JS Thread (dễ bị tụt FPS khi JS bận) | Đẩy sang **Native UI Thread / GPU** xử lý |
| **Đồ họa Động** | Ảnh GIF tĩnh (nặng, nhòe) hoặc Sprite Sheets thủ công | **Lottie JSON Animations** (`lottie-react-native` [`App.js`](file:///d:/dream_project/daily_mate_code/daily_mate_all/mobile_app/App.js#L126)) |
| **Cử chỉ Chạm** | `PanResponder` thủ công của React Native | `PanResponder` + **React Native Gesture Handler** |

---

## 📝 II. BÀI TẬP VÀ CÂU HỎI PHẢN XẠ (STUDENT TASKS)

### ❓ Câu hỏi 1: Tối ưu `useNativeDriver: true` trong Animated API
Mở tệp [`screens/LoginScreen.js`](file:///d:/dream_project/daily_mate_code/daily_mate_all/mobile_app/screens/LoginScreen.js#L42-L47):
1. Chuỗi `Animated.sequence()` kết hợp `Animated.timing()` tạo ra hiệu ứng gì trên ô đăng nhập khi người dùng bấm nút?
2. Tại sao ta **bắt buộc** phải khai báo `useNativeDriver: true` trong cấu hình hoạt ảnh? Nếu chuyển thành `false` thì hiệu năng giao diện bị ảnh hưởng thế nào?

### ❓ Câu hỏi 2: Hoạt ảnh Lottie trong App.js
Mở tệp [`App.js`](file:///d:/dream_project/daily_mate_code/daily_mate_all/mobile_app/App.js#L126):
1. Thành phần `<LottieView>` nhận file JSON hoạt ảnh mascot mèo lười như thế nào?
2. Vì sao hiện nay các dự án di động hiện đại ưu tiên dùng Lottie thay vì dùng hình ảnh động định dạng `.gif` truyền thống?

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
