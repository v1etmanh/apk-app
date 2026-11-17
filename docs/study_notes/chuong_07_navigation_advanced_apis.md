# CHƯƠNG 7: ĐIỀU HƯỚNG VÀ CÁC API NÂNG CAO (NAVIGATION & ADVANCED APIS)

> **Tài liệu gốc**: [`docs/learning.md`](file:///d:/dream_project/daily_mate_code/daily_mate_all/mobile_app/docs/learning.md#L93-L111)  
> **Trạng thái**: 🟡 Đang học (In Progress)

---

## 💡 I. TÓM TẮT KIẾN THỨC CỐT LÕI (MENTOR NOTES)

### 1. Kiến trúc Điều hướng lồng nhau (Nested Navigation Pattern)
- **Khai báo Điều hướng**: Sử dụng thư viện chuẩn **React Navigation 6** kết hợp giữa `createStackNavigator` (chuyển màn hình trượt ngang/đè) và `createBottomTabNavigator` (chuyển đổi các tab chính ở đáy ứng dụng).
- **Mô hình Lồng ghép (Nested Pattern)**: Stack Navigator đóng vai trò là container gốc (Root), chứa màn hình `"Main"` chính là Tab Navigator (`MainTabs`), bên cạnh các màn hình chi tiết (`DishDetail`, `MarketBasket`, `BodyMetrics`...).
- **Mã nguồn thực tế**: [`App.js`](file:///d:/dream_project/daily_mate_code/daily_mate_all/mobile_app/App.js#L80-L101) & [`App.js`](file:///d:/dream_project/daily_mate_code/daily_mate_all/mobile_app/App.js#567-L581).

### 2. Truyền Tham Số Giữa Các Màn Hình (Navigation Params)
- **Gửi dữ liệu**: `navigation.navigate('DishDetail', { dishId: item.id })`.
- **Nhận dữ liệu**: `const { dishId } = route.params;` thông qua prop `route`.

### 3. Tích hợp các API Thiết bị Nâng cao (Advanced Hardware & Native APIs)
- **AsyncStorage**: Lưu trữ dữ liệu danh sách/thực đơn cục bộ dạng key-value bền vững trên thiết bị ([`services/mealPlanService.js`](file:///d:/dream_project/daily_mate_code/daily_mate_all/mobile_app/services/mealPlanService.js#L23)).
- **Linking & Deep Linking**: Mở ứng dụng ngoài hoặc điều hướng thẳng vào màn hình cụ thể từ URL / Thông báo ([`App.js`](file:///d:/dream_project/daily_mate_code/daily_mate_all/mobile_app/App.js#L11)).
- **Location & Notifications**: Lấy tọa độ GPS (`expo-location`) và xử lý thông báo đẩy/nhắc nhở bữa ăn (`expo-notifications`) ([`App.js`](file:///d:/dream_project/daily_mate_code/daily_mate_all/mobile_app/App.js#L505-L515)).

---

## 🔄 SO SÁNH HỆ THỐNG: CỔ ĐIỂN (DOC) VS HIỆN ĐẠI (CODEBASE THỰC TẾ)

| Khái niệm | Lý thuyết trong `learning.md` (Cổ điển) | Cách triển khai trong Project `mobile_app` (Hiện đại) |
| :--- | :--- | :--- |
| **Thư viện Navigation** | `Navigator` cũ / `NavigationExperimental` / `TabBarIOS` | **React Navigation 6** (`@react-navigation/native`, `@react-navigation/stack`, `@react-navigation/bottom-tabs`) |
| **Quản lý Nav State** | Đưa toàn bộ trạng thái chuyển trang vào Redux Store | Để **React Navigation tự quản lý state** điều hướng nội bộ (không làm nặng Store chính) |
| **Chuyển Tab** | `TabBarIOS` (chỉ chạy trên iOS) | `createBottomTabNavigator` hoạt động đồng nhất đa nền tảng (iOS + Android) |
| **Lưu trữ Cục bộ** | `AsyncStorage` cổ điển trực tiếp | `AsyncStorage` bọc trong Service helpers + **SQLite** (`utils/database.js`) |
| **APIs Thiết bị** | `NetInfo`, `Linking` đơn giản | `expo-location`, `expo-notifications`, `expo-linking` chuẩn Expo 54 |

---

## 📝 II. BÀI TẬP VÀ CÂU HỎI PHẢN XẠ (STUDENT TASKS)

### ❓ Câu hỏi 1: Cấu trúc Nested Navigation trong App.js
Mở tệp [`App.js`](file:///d:/dream_project/daily_mate_code/daily_mate_all/mobile_app/App.js#L567-L581):
1. Tại sao ta lại lồng `MainTabs` làm 1 `Stack.Screen` có tên `"Main"` thay vì khai báo tất cả các Tab và màn hình chung 1 cấp?
2. Khi từ `HomeScreen` (thuộc `MainTabs`) chuyển sang `DishDetailScreen`, thanh TabBar ở đáy màn hình có bị ẩn đi không? Vì sao?

### ❓ Câu hỏi 2: Truyền dữ liệu và API Thiết bị
Mở tệp [`App.js`](file:///d:/dream_project/daily_mate_code/daily_mate_all/mobile_app/App.js#L505-L516):
1. Tại sao vị trí GPS (`expo-location`) và Quyền thông báo (`expo-notifications`) lại được xin phép người dùng tuần tự ngay sau khi khởi chạy xong màn hình Splash?

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
