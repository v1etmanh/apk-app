# CHƯƠNG 5: QUẢN LÝ TRẠNG THÁI (FLUX, REDUX VS ZUSTAND)

> **Tài liệu gốc**: [`docs/learning.md`](file:///d:/dream_project/daily_mate_code/daily_mate_all/mobile_app/docs/learning.md#L57-L71)
> **Trạng thái**: 🟡 Đang học (In Progress)

---

## 💡 I. TÓM TẮT KIẾN THỨC CỐT LÕI (MENTOR NOTES)

### 1. Triết lý Dòng Dữ Liệu Một Chiều (Unidirectional Data Flow)

- **Vấn đề của MVC truyền thống**: Khi ứng dụng phình to, dữ liệu (Model) và giao diện (View) cập nhật lẫn nhau tạo thành một "mạng lưới chéo" không thể kiểm soát lỗi (bug cascade).
- **Mô hình Flux/Redux/Zustand**: Dữ liệu chỉ chảy theo **một chiều duy nhất**:
  ```
  [User Gesture / Action] ➔ [Store / State Setter] ➔ [Cập nhật State Bất biến] ➔ [UI Re-render]
  ```



giải thik rõ hơn là khi người dùng thực hiện 1 tương tác lên màn hình hoặc gì đó sẽ xảy ra sự thay đổi 

1 lệnh updaate sẽ updatw vào store state nơi lưu trữ toàn bộ state của dự án

cuối dùng điều này sẽ dẫn đến việc  tạo ra 1 state hơn tìonaf mới  chứa giá trị vừa cập nhật  nghĩa là như nào

bản chât việc này là việc  state bản chât là 1 gia trị dc lấy việc lấy value tạo * pointer  , khi 1 state thay đổi ta lun tạo 1 giá trị mới thay vì update trực tiếp lên đối tượng cũ đây là điều tất, yếu bởi vì react nó sẽ luôn có 1  1 hàm check nó sẽ chỉ bt state thay đổi khi pointer tới  state đó thay đổi vị trí

điều này kích  goạt  1 thông báo làm  cập nhật lại giao diện

### 2. Redux Cổ điển vs Zustand Hiện đại

- **Redux Cổ điển (Lý thuyết `learning.md`)**:
  - Dựa trên 3 nguyên lý: Nguồn chân lý duy nhất (Single Store), State chỉ đọc (Read-only State), Thay đổi State qua hàm thuần khiết Reducer (`(state, action) => newState`).
  - *Bộ khung rườm rà*: Phải viết Action Types (`const SET_PROFILE = 'SET_PROFILE'`), Action Creators, Reducers, và bọc `<Provider store={store}>` ở đỉnh ứng dụng.
- **Zustand (Mã nguồn thực tế project `mobile_app`)**:
  - Thư viện cực nhẹ (~1KB) dựa trên React Hooks chuẩn hiện đại.
  - Khai báo State và Actions trực tiếp trong 1 Store duy nhất: [`store/useAppStore.js`](file:///d:/dream_project/daily_mate_code/daily_mate_all/mobile_app/store/useAppStore.js#L20-L50).
  - **Không cần `<Provider>`** bọc ngoài `App.js`.
  - **Atomic Selectors**: Chỉ re-render component khi biến State được chọn thay đổi (`useAppStore(state => state.profile)`).

---

### 🔄 SO SÁNH HỆ THỐNG: CỔ ĐIỂN (DOC) VS HIỆN ĐẠI (CODEBASE THỰC TẾ)

| Khái niệm                        | Lý thuyết trong`learning.md` (Cổ điển)              | Cách triển khai trong Project`mobile_app` (Hiện đại)                                                                                  |
| :--------------------------------- | :--------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------- |
| **Thư viện State**         | Redux + React-Redux (`connect`, `Provider`)            | **Zustand 4.5.0** ([`store/useAppStore.js`](file:///d:/dream_project/daily_mate_code/daily_mate_all/mobile_app/store/useAppStore.js)) |
| **Bọc Provider**            | Phải bọc`<Provider store={store}>` ở `App.js`       | **Không cần Provider** (Zero Boilerplate)                                                                                            |
| **Cập nhật State**         | Dispatch Action`dispatch({ type: '...', payload: ... })` | Gọi hàm setter trực tiếp`setProfile(newProfile)`                                                                                       |
| **Tác vụ Bất đồng bộ** | Middleware`redux-thunk` / `redux-saga`                 | Hàm async ngay trong Store (`switchProfile`, `loadSavedDishes`)                                                                         |

---

## 📝 II. BÀI TẬP VÀ CÂU HỎI PHẢN XẠ (STUDENT TASKS)

### ❓ Câu hỏi 1: Phân tích Setter trong useAppStore.js

Mở tệp [`store/useAppStore.js`](file:///d:/dream_project/daily_mate_code/daily_mate_all/mobile_app/store/useAppStore.js#L69-L76):

```javascript
setProfile:          (profile)   => set({ profile }),
setLatestMetrics:    (metrics)   => set({ latestMetrics: metrics }),
```

1. Hàm `set({ profile })` của Zustand hoạt động như thế nào?
2. So sánh sự ngắn gọn của dòng code trên so với cặp đôi **Action Creator + Reducer** trong Redux cổ điển.

### ❓ Câu hỏi 2: Tại sao Zustand không cần `<Provider>`?

Trong Redux cổ điển, bạn bắt buộc phải bọc `<Provider store={store}>` ở file gốc `App.js` để truyền Store xuống toàn bộ cây Component qua React Context.
Tại sao Zustand lại **không cần `<Provider>`** mà mọi Screen (như `HomeScreen`, `ProfileScreen`) vẫn truy cập và lắng nghe biến đổi State chung dễ dàng?

---

## ✍️ III. PHẦN CHÉP BÀI & TRẢ LỜI CỦA HỌC VIÊN (USER FILLS HERE)

### 1. Ghi chép cá nhân:

- (Nhập ghi chép của bạn ở đây...)

### 2. Trả lời Bài tập / Câu hỏi phản xạ:

- **Trả lời Câu 1**:
  -----------------
- **Trả lời Câu 2**:
  -----------------

### 3. Thắc mắc / Câu hỏi gửi Mentor:

- (Nhập câu hỏi của bạn tại đây nếu có...)
