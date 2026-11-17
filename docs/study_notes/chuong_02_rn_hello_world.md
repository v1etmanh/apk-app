# CHƯƠNG 2: HELLO WORLD TRONG REACT NATIVE & KIẾN TRÚC ỨNG DỤNG

> **Tài liệu gốc**: [`docs/learning.md`](file:///d:/dream_project/daily_mate_code/daily_mate_all/mobile_app/docs/learning.md#L12-L24)
> **Trạng thái**: 🟡 Đang học (In Progress)

---

## 💡 I. TÓM TẮT KIẾN THỨC CỐT LÕI (MENTOR NOTES)

### 1. Kiến trúc Cầu nối (Bridge) vs Kiến trúc Mới (JSI / New Architecture)

- **Cơ chế Cổ điển (Bridge)**:
  - Luồng JavaScript và Luồng Native (Java/Objective-C) hoàn toàn độc lập.
  - Khi JS muốn bảo Native vẽ giao diện hoặc gọi camera/sensor, nó phải mã hóa dữ liệu thành **JSON chuỗi** gửi qua Cầu nối bất đồng bộ (**Asynchronous Bridge**).
  - ⚠️ *Nhược điểm*: Khi dữ liệu lớn hoặc sự kiện vuốt/cuộn xảy ra liên tục, Bridge bị dồn hàng (bottleneck) gây giật lag (frame drop).
- **Cơ chế Hiện đại (JSI - JavaScript Interface)**:
  - JS Engine có thể tham chiếu trực tiếp đến các đối tượng C++ Native (Host Objects) thông qua pointer mà không cần chuyển đổi thành JSON.
  - Cho phép gọi hàm Native đồng bộ (synchronous calls), giúp animation và xử lý sự kiện mượt mà 60-120fps.
  - 📌 **Dẫn chứng trong Project**: Mở [`app.json`](file:///d:/dream_project/daily_mate_code/daily_mate_all/mobile_app/app.json#L55-L63) xem cấu hình `newArchEnabled: true`.

### 2. React Native CLI vs Expo Framework

- **RN CLI (`react-native init`) - Cổ điển**: Tự quản lý 100% folder `android` và `ios`. Yêu cầu phải mở Xcode & Android Studio để build ngay từ đầu.
- **Expo Framework (Project `mobile_app`)**:
  - Quản lý sẵn cấu hình Native thông qua tệp cấu hình [`app.json`](file:///d:/dream_project/daily_mate_code/daily_mate_all/mobile_app/app.json).
  - Cho phép chạy app trực tiếp qua ứng dụng Expo Go trên điện thoại thực hoặc dùng lệnh `expo start`.
  - Hỗ trợ dịch vụ đóng gói đám mây EAS ([`eas.json`](file:///d:/dream_project/daily_mate_code/daily_mate_all/mobile_app/eas.json)).

### 3. Điểm khởi chạy Ứng dụng (App Entry Point) & Khởi tạo Tài nguyên

- Trong dự án Expo, điểm khởi chạy gốc bắt đầu từ `node_modules/expo/AppEntry.js`, tệp này import và render gốc từ [`App.js`](file:///d:/dream_project/daily_mate_code/daily_mate_all/mobile_app/App.js).
- **Luồng khởi tạo ứng dụng thực tế**:
  - nạp Fonts hệ thống (`useFonts` từ `@expo-google-fonts/...` tại [`App.js`](file:///d:/dream_project/daily_mate_code/daily_mate_all/mobile_app/App.js#L10-L20)).
  - Khai báo các thiết lập ứng dụng toàn cục như `setNotificationHandler` tại [`App.js`](file:///d:/dream_project/daily_mate_code/daily_mate_all/mobile_app/App.js#L59).

---

### 🔄 SO SÁNH HỆ THỐNG: CỔ ĐIỂN (DOC) VS HIỆN ĐẠI (CODEBASE THỰC TẾ)

| Khái niệm                      | Lý thuyết trong`learning.md` (Cổ điển)      | Cách triển khai trong Project`mobile_app` (Hiện đại)                                                      |
| :------------------------------- | :------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------- |
| **Giao tiếp JS - Native** | JSON Bridge (bất đồng bộ, tuần tự hóa JSON) | **JSI / TurboModules** (Truy cập C++ trực tiếp)                                                         |
| **Công cụ khởi tạo**   | `react-native init AppName`                      | **Expo SDK 54** (`expo start`, Managed/Prebuild)                                                         |
| **Debugging**              | Chrome Developer Tools (Remote JS Debugging)       | **Expo Dev Tools / React Native DevTools / Flipper**                                                       |
| **Đóng gói & Build**    | Chạy thủ công Xcode / Gradle                    | **EAS Build** ([`eas.json`](file:///d:/dream_project/daily_mate_code/daily_mate_all/mobile_app/eas.json)) |

---

## 📝 II. BÀI TẬP VÀ CÂU HỎI PHẢN XẠ (STUDENT TASKS)

### ❓ Câu hỏi 1: Đọc & Phân tích cấu hình app.json

Mở tệp [`app.json`](file:///d:/dream_project/daily_mate_code/daily_mate_all/mobile_app/app.json#L1-L35) và tìm câu trả lời cho các câu hỏi sau:

1. Tên hiển thị ứng dụng (`name`) và tên định danh ứng dụng Android (`package`) là gì?

tên là daily mate package là `com.vietmanh.dailymate`

1. Ứng dụng này khai báo các quyền hệ thống Android (`permissions`) nào trong `android.permissions`?
2. 

```json
  "android.permission.RECEIVE_BOOT_COMPLETED",
        "android.permission.SCHEDULE_EXACT_ALARM",
        "android.permission.POST_NOTIFICATIONS",
        "android.permission.USE_EXACT_ALARM"
```

    các quyền như là nhận  kết quả dc gọi từ gg hoặc phần mềm gọi về khi hoàn tất 1 task

đặt lịch hẹn thời gian, gửi thông báo và dùng thời gian hiện tại

### ❓ Câu hỏi 2: Bản chất cơ chế JSI & Bridge

Tại sao việc chuyển đổi từ cơ chế **Bridge (JSON)** sang **JSI (JavaScript Interface)** lại giải quyết được triệt để hiện tượng giật/khung hình bị drop khi cuộn một danh sách dài?


kiến trúc bright và kiến trúc mới jsx ,  so sánh sự khác biệt,

bởi vì trong kiến trúc bright cũ ---> các event đc đóng gói thành json và gửi tới  bright sẽ gửi tới native program

---> thực hiện việc update

nhưng mà với 1 ứng dụng phức tapj, thì đôii khi làm nghẽn cổ chai vì  quá nhiều sự kiện cần 1 cơ chế thay thế đó là lúc mà

ta cần thực hiện việc sử dụng jsi , thì nó tích hợp 1 bộ pointer tới các chức năng của native  flatform cho phép react natice nó gọi trục tiếp thay vì gửi chờ bên kia xử lí,

---

## ✍️ III. PHẦN CHÉP BÀI & TRẢ LỜI CỦA HỌC VIÊN (STUDENT WORK)

### 1. Ghi chép cá nhân:
- **So sánh Kiến trúc Cầu nối (Bridge) vs JSI**:
  - *Kiến trúc Bridge cũ*: Các event/sự kiện được đóng gói thành chuỗi JSON và gửi qua Bridge tới chương trình Native để xử lý và cập nhật UI. Với ứng dụng phức tạp, việc này gây nghẽn cổ chai (bottleneck) vì quá nhiều sự kiện cần đóng gói và truyền tải.
  - *Kiến trúc JSI mới*: Tích hợp một bộ con trỏ (pointer) trực tiếp tới các chức năng của Native Platform, cho phép React Native gọi trực tiếp (Synchronous call) các hàm Native thay vì gửi JSON chờ phía bên kia xử lý.

---

### 2. Trả lời Bài tập / Câu hỏi phản xạ:

- **Trả lời Câu 1**:
  - *Tên app & Package Name*: Name là **Daily Mate**, package Android là `com.vietmanh.dailymate`.
  - *Các quyền Android permissions*:
    ```json
    "android.permission.RECEIVE_BOOT_COMPLETED",
    "android.permission.SCHEDULE_EXACT_ALARM",
    "android.permission.POST_NOTIFICATIONS",
    "android.permission.USE_EXACT_ALARM"
    ```
    - Khởi động lại thiết bị vẫn giữ lịch hẹn thông báo.
    - Đặt lịch hẹn thời gian chính xác, gửi thông báo push/local tới người dùng.

- **Trả lời Câu 2 (Bản chất JSI & Bridge)**:
  - Trong kiến trúc Bridge cũ, các event được đóng gói thành JSON gửi qua Bridge đến Native để update. Khi ứng dụng phức tạp hoặc kéo danh sách dài, quá nhiều event JSON khiến Bridge bị nghẽn cổ chai.
  - JSI giải quyết bằng cách tích hợp một bộ pointer (con trỏ C++) kết nối trực tiếp đến Native Platform, cho phép JS gọi trực tiếp Native đồng bộ thay vì phải đóng gói JSON chờ xử lý.

---

## 🎓 IV. ĐÁNH GIÁ & NHẬN XÉT CỦA MENTOR (MENTOR FEEDBACK)

> 🟢 **Đánh giá tổng quan**: **RẤT XUẤT SẮC (9.5/10)**! Học viên nắm rất chắc bản chất kỹ thuật, giải thích đúng từ khóa quan trọng: *Nghẽn cổ chai (bottleneck)*, *Đóng gói JSON qua Bridge* và *Bộ con trỏ (Pointer) C++ của JSI*.

### 🌟 Nhận xét chi tiết:

1. **Câu 1 (Cấu hình `app.json` & Android Permissions)**:
   - **Tên app & Package**: Chính xác 100%! Name: `Daily Mate` và Package: `com.vietmanh.dailymate` trong [`app.json:L33`](file:///d:/dream_project/daily_mate_code/daily_mate_all/mobile_app/app.json#L33).
   - **Các quyền Android**: Nắm đúng 4 quyền liên quan tới thông báo. Mentor bổ sung thêm bản chất hệ thống của từng quyền:
     - `RECEIVE_BOOT_COMPLETED`: Cho phép app tự nạp lại lịch nhắc bữa ăn khi máy vừa bật nguồn lại mà người dùng chưa cần mở app.
     - `SCHEDULE_EXACT_ALARM` & `USE_EXACT_ALARM`: Cho phép đặt báo thức chính xác tới từng giây (dùng cho dịch vụ nhắc giờ ăn tại [`services/mealReminderService.js`](file:///d:/dream_project/daily_mate_code/daily_mate_all/mobile_app/services/mealReminderService.js)).
     - `POST_NOTIFICATIONS`: Quyền hiển thị thông báo đẩy lên thanh trạng thái (bắt buộc từ Android 13/API 33).

2. **Câu 2 (Cơ chế JSI vs Bridge)**:
   - **Tư duy cốt lõi**: Trả lời cực kỳ chuẩn xác! Việc chỉ ra JSI dùng **pointer** gọi trực tiếp thay vì chờ đóng gói JSON là điểm mấu chốt tại sao ứng dụng cuộn FlatList đạt được mượt mà 60-120fps.

