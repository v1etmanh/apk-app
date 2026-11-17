# CHƯƠNG 6: TÍCH HỢP API & LUỒNG DỮ LIỆU BẤT ĐỒNG BỘ (ASYNC DATA FLOW)

> **Tài liệu gốc**: [`docs/learning.md`](file:///d:/dream_project/daily_mate_code/daily_mate_all/mobile_app/docs/learning.md#L72-L91)  
> **Trạng thái**: 🟡 Đang học (In Progress)

---

## 💡 I. TÓM TẮT KIẾN THỨC CỐT LÕI (MENTOR NOTES)

### 1. Quản lý Yêu cầu Mạng (Network Requests) & Tự động gắn Token
- **Tách biệt Service Layer**: Toàn bộ logic giao tiếp mạng được đưa về lớp `services/` nhằm tách biệt hoàn toàn khỏi UI (Presentational Components).
- **Axios Interceptors**: Tự động chèn JWT `Authorization: Bearer <access_token>` vào header trước mỗi request và tự động refresh token khi gặp lỗi `401 Unauthorized`.
- **Mã nguồn thực tế**: [`services/api.js`](file:///d:/dream_project/daily_mate_code/daily_mate_all/mobile_app/services/api.js#L16-L43).

### 2. Biến đổi dữ liệu (Data Transformation) & Caching
- **Data Transformation**: Dữ liệu từ API/Backend thường cần chuẩn hóa trước khi render ra màn hình (ví dụ: định dạng ngày tháng, ghép chuỗi tên, gán giá trị mặc định).
- **Hệ thống Cache Cục bộ (Local Caching)**: Kết hợp `AsyncStorage` / `SQLite` để cache dữ liệu offline trước khi fallback sang gọi API.
- **Mã nguồn thực tế**: [`services/mealPlanService.js`](file:///d:/dream_project/daily_mate_code/daily_mate_all/mobile_app/services/mealPlanService.js#L23-L45).

### 3. Phản hồi Trạng thái Tải dữ liệu trên Giao diện (UX Loading States)
- **ActivityIndicator**: Hiển thị vòng xoay spinner trong lúc chờ dữ liệu bất đồng bộ trả về từ Server.
- **RefreshControl**: Cho phép người dùng kéo xuống từ đỉnh màn hình (Pull-to-Refresh) để làm mới dữ liệu.
- **Mã nguồn thực tế**: [`screens/HomeScreen.js`](file:///d:/dream_project/daily_mate_code/daily_mate_all/mobile_app/screens/HomeScreen.js#L390-L395).

---

## 🔄 SO SÁNH HỆ THỐNG: CỔ ĐIỂN (DOC) VS HIỆN ĐẠI (CODEBASE THỰC TẾ)

| Khái niệm | Lý thuyết trong `learning.md` (Cổ điển) | Cách triển khai trong Project `mobile_app` (Hiện đại) |
| :--- | :--- | :--- |
| **HTTP Client** | API `fetch()` mặc định của React Native | **Axios 1.7** ([`services/api.js`](file:///d:/dream_project/daily_mate_code/daily_mate_all/mobile_app/services/api.js#L9)) + Interceptors |
| **Async Middleware** | `redux-promise` / `redux-thunk` / `redux-saga` | **Zustand Async Actions** (`async/await` ngay trong Store [`store/useAppStore.js`](file:///d:/dream_project/daily_mate_code/daily_mate_all/mobile_app/store/useAppStore.js)) |
| **Xử lý Token/Auth** | Viết tay trong từng Action hoặc Reducer | **Axios Request/Response Interceptors** tự động gắn JWT từ Supabase |
| **Memoization/Selectors** | Thư viện `reselect` | **Atomic Selectors** của Zustand + React `useMemo` / `useCallback` |
| **Data Transform** | Tệp `dataTransformations.js` truyền thống | Helper Functions chuyên biệt từng Service (`services/mealPlanService.js`, `utils/database.js`) |

---

## 📝 II. BÀI TẬP VÀ CÂU HỎI PHẢN XẠ (STUDENT TASKS)

### ❓ Câu hỏi 1: Cơ chế tự động Refresh Token của Axios Interceptor
Mở tệp [`services/api.js`](file:///d:/dream_project/daily_mate_code/daily_mate_all/mobile_app/services/api.js#L28-L43):
1. Khi máy chủ trả về mã lỗi HTTP `401 Unauthorized`, response interceptor làm những bước gì để người dùng không bị văng khỏi app?
2. Biến `originalRequest._retry = true` có vai trò gì trong đoạn code trên?

### ❓ Câu hỏi 2: Trải nghiệm Pull-to-Refresh trên HomeScreen
Mở tệp [`screens/HomeScreen.js`](file:///d:/dream_project/daily_mate_code/daily_mate_all/mobile_app/screens/HomeScreen.js#L392):
1. Thành phần `<RefreshControl>` nhận 2 props quan trọng là `refreshing` và `onRefresh`. Hai props này liên kết với State và Logic bất đồng bộ như thế nào?
2. Tại sao ta phải đặt `setRefreshing(false)` trong khối `finally` thay vì khối `try` khi thực hiện gọi API làm mới dữ liệu?

---

## ✍️ III. PHẦN CHÉP BÀI & TRẢ LỜI CỦA HỌC VIÊN (USER FILLS HERE)

### 1. Ghi chép cá nhân:
- (Nhập ghi chép của bạn ở đây...)

### 2. Trả lời Bài tập / Câu hỏi phản xạ:
- **Trả lời Câu 1**:
  - 
- **Trả lời Câu 2**:
  - *Ý 1 (`refreshing` & `onRefresh`)*: `refreshing` được sử dụng như 1 prop truyền state từ cha xuống con để điều khiển ẩn/hiện spinner; còn `onRefresh` là 1 prop callback function cho phép component con kích hoạt thực thi hàm bất đồng bộ của cha khi người dùng thực hiện cử chỉ vuốt xuống.
  - *Ý 2 (`finally` vs `try`)*: Bản chất khối `finally` luôn chạy dù có lỗi hay không, giúp đảm bảo state `refreshing` luôn được reset về `false`, tránh lỗi xoay spinner vô tận (endless loading bug) khi gặp sự cố kết nối.
  - 🌟 **Mentor Đánh giá**: **Chính xác 100%!** Tư duy bóc tách luồng truyền prop và hiểu rõ bản chất của khối `finally` giúp bạn tránh được một trong những bug giao diện phổ biến nhất trên di động.

### 3. Thắc mắc / Câu hỏi gửi Mentor:
- (Nhập câu hỏi của bạn tại đây nếu có...)
