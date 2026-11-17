# CHƯƠNG 3: STYLING VÀ LAYOUT TRONG REACT NATIVE (FLEXBOX & STYLESHEET)

> **Tài liệu gốc**: [`docs/learning.md`](file:///d:/dream_project/daily_mate_code/daily_mate_all/mobile_app/docs/learning.md#L25-L36)
> **Trạng thái**: 🟡 Đang học (In Progress)

---

## 💡 I. TÓM TẮT KIẾN THỨC CỐT LÕI (MENTOR NOTES)

### 1. Sự khác biệt giữa CSS Web và Styling trong React Native
- **Không có CSS Cascading / Selector toàn cục**: Style trong RN không bị kế thừa (ngoại trừ component `<Text>` lồng nhau). Điều này giúp cô lập giao diện tuyệt đối, tránh xung đột style giữa các màn hình.
- **Đơn vị đo lường (Unitless DP/Points)**:
  - Không dùng `px`, `em`, `rem`. Tất cả con số (ví dụ: `margin: 16`) đều là số nguyên đại diện cho **DP (Density-independent Pixel)** trên Android và **Point** trên iOS.
  - Hệ thống sẽ tự động nhân với mật độ điểm ảnh của màn hình (Pixel Density) để hiển thị sắc nét trên mọi thiết bị.

### 2. Làm chủ Hệ thống Flexbox trong React Native
- ⚠️ **Khác biệt quan trọng với Web**:
  - Mặc định `flexDirection` trong React Native là **`column`** (xếp theo chiều dọc từ trên xuống), trong khi Web là `row`.
  - Mọi phần tử giao diện trong RN mặc định đều là `display: 'flex'`.
- **Trục chính (Main Axis) & Trục phụ (Cross Axis)**:
  - `justifyContent`: Căn chỉnh các phần tử con theo **trục chính** (`flex-start`, `center`, `flex-end`, `space-between`, `space-around`).
  - `alignItems`: Căn chỉnh các phần tử con theo **trục phụ** (`flex-start`, `center`, `flex-end`, `stretch`).
  - `flex: 1`: Cho phép component co giãn chiếm trọn toàn bộ khoảng trống khả dụng của container cha.

### 3. Design System & Quản lý Style tối ưu
- **Thư viện Style toàn cục**: Sử dụng file Design Tokens như [`theme.js`](file:///d:/dream_project/daily_mate_code/daily_mate_all/mobile_app/theme.js) để quản lý bảng màu (`C`), bo góc (`R`), cỡ chữ (`F`) và bóng đổ (`shadow`).
- **`StyleSheet.create()`**: Gom nhóm và gửi danh sách style xuống tầng Native 1 lần duy nhất qua ID số (style ID), giúp tối ưu bộ nhớ hơn việc truyền Inline Style Javascript object `{ flex: 1 }` liên tục ở mỗi lượt render.
- **Xử lý Đổ bóng (Cross-platform Shadow)**:
  - iOS dùng cụm thuộc tính: `shadowColor`, `shadowOffset`, `shadowOpacity`, `shadowRadius`.
  - Android dùng duy nhất thuộc tính: `elevation`.

---

### 🔄 SO SÁNH HỆ THỐNG: CỔ ĐIỂN (DOC) VS HIỆN ĐẠI (CODEBASE THỰC TẾ)
| Khái niệm | Lý thuyết trong `learning.md` (Cổ điển) | Cách triển khai trong Project `mobile_app` (Hiện đại) |
| :--- | :--- | :--- |
| **Bảng màu & Theme** | Định nghĩa màu cứng rải rác trong từng component | **Design Tokens tập trung** trong [`theme.js`](file:///d:/dream_project/daily_mate_code/daily_mate_all/mobile_app/theme.js) (`C.primary`, `C.bg`) |
| **Độ mảnh đường viền** | Dùng `borderWidth: 1` cố định | **`StyleSheet.hairlineWidth`** hoặc `borderWidth: 0.5` cho đường viền mỏng mịn |
| **Đổ bóng (Shadow)** | Đổ bóng màu đen cứng ngắc | **Hàm `shadow(level)` chuẩn hóa** trong [`theme.js`](file:///d:/dream_project/daily_mate_code/daily_mate_all/mobile_app/theme.js#L50) hỗ trợ cả iOS & Android |
| **Khoảng cách phần tử** | Phải dùng `marginRight` / `marginBottom` rải rác | Dùng thuộc tính Flexbox hiện đại: **`gap: 4`** hoặc **`gap: 8`** ([`MetaChip.js:L42`](file:///d:/dream_project/daily_mate_code/daily_mate_all/mobile_app/components/ui/MetaChip.js#L42)) |

---

## 📝 II. BÀI TẬP VÀ CÂU HỎI PHẢN XẠ (STUDENT TASKS)

### ❓ Câu hỏi 1: Đọc code theme.js & Xử lý Cross-platform Shadow
Mở tệp [`theme.js`](file:///d:/dream_project/daily_mate_code/daily_mate_all/mobile_app/theme.js#L50-L56) và xem hàm `shadow`:
```javascript
export const shadow = (level = 1) => ({
  elevation: level * 2,
  shadowColor: C.shadow,
  shadowOffset: { width: 0, height: level },
  shadowOpacity: 1,
  shadowRadius: level * 3,
});
```
1. Thuộc tính nào trong hàm trên dành riêng cho hệ điều hành **Android**?
2. Nhóm thuộc tính nào dành riêng cho hệ điều hành **iOS**?

### ❓ Câu hỏi 2: Phân tích Flexbox trong MetaChip.js
Mở tệp [`components/ui/MetaChip.js`](file:///d:/dream_project/daily_mate_code/daily_mate_all/mobile_app/components/ui/MetaChip.js#L32-L43):
1. Tại sao trong `MetaChip.js`, người ta lại khai báo `flexDirection: 'row'` và `alignItems: 'center'`?
2. Thuộc tính `gap: 4` (dòng 42) có tác dụng gì trong việc sắp xếp biểu tượng `icon` và văn bản `label`?

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
