# CHƯƠNG 1: XÂY DỰNG NỀN TẢNG VỚI REACT (BUILDING A FOUNDATION IN REACT)

> **Tài liệu gốc**: [`docs/learning.md`](file:///d:/dream_project/daily_mate_code/daily_mate_all/mobile_app/docs/learning.md#L2-L11)
> **Trạng thái**: 🟡 Đang học (In Progress)

---

## 💡 I. TÓM TẮT KIẾN THỨC CỐT LÕI (MENTOR NOTES)

### 1. Triết lý Giao diện Khai báo (Declarative UI)
- **Tư duy**: Thay vì tự tay điều khiển DOM/View từng bước một (Imperative - như JavaScript thuần hay Android Views/iOS UIViews), trong React bạn mô tả **Giao diện trông như thế nào tương ứng với Trạng thái (State) hiện tại**: `UI = f(State)`.
- Khi `State` thay đổi, React sẽ tự động tính toán và cập nhật lại giao diện.

### 2. Thành phần Giao diện (Component) & Cú pháp JSX
- Component là các khối xây dựng giao diện có thể tái sử dụng.
- **JSX (JavaScript XML)**: Cho phép viết mã mô tả HTML/UI ngay bên trong file JavaScript.

### 3. Truyền Dữ liệu qua Props (Properties)
- **Props** là tham số đầu vào được truyền từ Component cha xuống Component con (Luồng dữ liệu 1 chiều - Unidirectional Data Flow). Props mang tính chất **Read-only** (Chỉ đọc), Component con không được tự ý sửa Props của chính mình.
- 📌 **Dẫn chứng Code thực tế trong Dự án**:
  - Xem file [`components/ui/PaperCard.js`](file:///d:/dream_project/daily_mate_code/daily_mate_all/mobile_app/components/ui/PaperCard.js#L9-L33): Component `PaperCard` nhận các props `children`, `style`, `innerStyle`, `borderColor`, `priority`.

```javascript
// Dẫn chứng từ PaperCard.js:
export default function PaperCard({ 
  children, 
  style, 
  innerStyle,
  borderColor = C.border,
  priority = 'secondary', // default prop
}) {
  const isPrimary = priority === 'primary';
  return (
    <ImageBackground ...>
      <View style={[styles.paperCardInner, innerStyle]}>{children}</View>
    </ImageBackground>
  );
}
```

### 4. Trạng thái Nội bộ (State) & Vòng đời Component (Lifecycle)
- **State**: Dữ liệu nội bộ riêng của Component. Khi State thay đổi (`setState` hoặc `useState`), Component sẽ re-render.
- **Vòng đời Component (Lifecycle)**:
  - **Khởi tạo (Mounting)**: Component được chèn vào cây giao diện.
  - **Cập nhật (Updating)**: Component render lại khi Props hoặc State thay đổi.
  - **Hủy bỏ (Unmounting)**: Component bị gỡ bỏ khỏi cây giao diện.

### 🔄 SO SÁNH HỆ THỐNG: CỔ ĐIỂN (DOC) VS HIỆN ĐẠI (CODEBASE THỰC TẾ)
| Khái niệm | Lý thuyết trong `learning.md` (Cổ điển) | Cách triển khai trong Project `mobile_app` (Hiện đại) |
| :--- | :--- | :--- |
| **Loại Component** | Class Component (`class MyComp extends React.Component`) | **Functional Component** (`export default function MyComp()`) |
| **Quản lý State** | `this.state = {...}` & `this.setState({...})` | **React Hooks**: `useState()` |
| **Vòng đời (Lifecycle)** | `componentDidMount`, `componentDidUpdate`, `componentWillUnmount` | **React Hook**: `useEffect()` |
| **Kiểm tra kiểu Props** | `PropTypes` (thư viện `prop-types`) | JavaScript mặc định/Default Props hoặc TypeScript/JSDoc |

---

## 📝 II. BÀI TẬP VÀ CÂU HỎI PHẢN XẠ (STUDENT TASKS)

### ❓ Câu hỏi 1: Đọc code & Phân tích Props
Vào file [`components/ui/WoodButton.js`](file:///d:/dream_project/daily_mate_code/daily_mate_all/mobile_app/components/ui/WoodButton.js) và trả lời các câu hỏi sau:
1. Component `WoodButton` nhận những Props nào?
2. Prop `children` và Prop `onPress` được dùng để làm gì trong `WoodButton`?

### ❓ Câu hỏi 2: So sánh Vòng đời (Lifecycle) vs `useEffect`
Trong lý thuyết React cổ điển, khi một component chuẩn bị xuất hiện trên màn hình, nó chạy hàm `componentDidMount()`.
Trong mã nguồn hiện đại của dự án, người ta dùng `useEffect(() => { ... }, [])` với mảng phụ thuộc rỗng `[]`. Tại sao mảng `[]` lại tương đương với `componentDidMount()`?

---

## ✍️ III. PHẦN CHÉP BÀI & TRẢ LỜI CỦA HỌC VIÊN (USER FILLS HERE)

*(Học viên hãy ghi chép lại kiến thức cần nhớ, trả lời 2 câu hỏi trên và đặt thắc mắc bên dưới. Sau khi lưu file, bảo Agent "Checking bài giúp tôi" nhé!)*

### 1. Ghi chép cá nhân:
- (Nhập ghi chép của bạn ở đây...)

### 2. Trả lời Bài tập / Câu hỏi phản xạ:
- **Trả lời Câu 1**:
  - 
- **Trả lời Câu 2**:
  - 

### 3. Thắc mắc / Câu hỏi gửi Mentor:
- (Nhập câu hỏi của bạn tại đây nếu có...)
