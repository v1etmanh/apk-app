# Kế hoạch 3: API đơn giản quản lý video nguyên liệu

## 1. Mục tiêu

Backend chỉ cần hỗ trợ đúng ba việc:

1. Nhận tên nguyên liệu và URL YouTube để thêm hoặc cập nhật video.
2. Kiểm tra một secret key được lưu trong backend.
3. Cung cấp danh sách tên nguyên liệu và URL video để mobile gọi và hiển thị.

Mỗi nguyên liệu chỉ có một video. Video được đăng thủ công lên YouTube; backend chỉ lưu URL, không upload file video và không gọi YouTube Data API.

Không dùng JWT, phân quyền tài khoản, audit log hay API key trong mobile.

## 2. Secret key

Thêm một biến vào file .env của Python backend:

~~~env
INGREDIENT_VIDEO_ADMIN_KEY=đặt-một-secret-key-dài-và-khó-đoán
~~~

Quy tắc:

- Chỉ backend được đọc key từ .env.
- Không commit .env lên Git.
- Không đặt key trong mobile app.
- Không ghi key ra log hoặc response.
- Khi cần đổi key, đổi biến môi trường rồi restart backend.

## 3. API thêm hoặc cập nhật video

### Endpoint

~~~text
POST /api/v1/ingredient-videos
~~~

### Header

~~~text
X-Ingredient-Video-Key: <INGREDIENT_VIDEO_ADMIN_KEY>
Content-Type: application/json
~~~

### Body

~~~json
{
  "ingredient_name": "Cà chua",
  "video_url": "https://www.youtube.com/watch?v=abc123xyz",
  "category": "Rau củ"
}
~~~

Trường category có thể để trống nếu backend hiện tại chưa có nhóm nguyên liệu.

### Luồng xử lý

1. Đọc header X-Ingredient-Video-Key.
2. So sánh với INGREDIENT_VIDEO_ADMIN_KEY.
3. Key sai hoặc thiếu thì trả HTTP 401.
4. Kiểm tra tên nguyên liệu không rỗng.
5. Kiểm tra URL là URL YouTube hợp lệ.
6. Chuẩn hóa slug theo quy tắc:
   - Cà chua -> ca-chua
   - Rau muống -> rau-muong
   - bỏ dấu, viết thường, thay khoảng trắng bằng dấu gạch ngang.
7. Tìm bản ghi theo slug.
8. Nếu chưa có thì tạo mới.
9. Nếu đã có thì cập nhật URL, tên hiển thị và category.
10. Trả lại bản ghi sau khi lưu.

### Response thành công

~~~json
{
  "success": true,
  "item": {
    "ingredient_name": "Cà chua",
    "slug": "ca-chua",
    "video_url": "https://www.youtube.com/watch?v=abc123xyz",
    "category": "Rau củ"
  }
}
~~~

### Response khi key sai

~~~json
{
  "success": false,
  "error": "invalid ingredient video key"
}
~~~

HTTP status: 401 Unauthorized.

## 4. API lấy danh sách cho mobile

### Endpoint

~~~text
GET /api/v1/ingredient-videos
~~~

Endpoint này public vì dữ liệu chỉ gồm tên nguyên liệu và các URL YouTube public. Không yêu cầu secret key.

### Response

~~~json
{
  "items": [
    {
      "ingredient_name": "Cà chua",
      "slug": "ca-chua",
      "video_url": "https://www.youtube.com/watch?v=abc123xyz",
      "category": "Rau củ"
    }
  ],
  "total": 1
}
~~~

Chỉ trả các bản ghi có URL hợp lệ. Có thể sắp xếp theo tên nguyên liệu để app hiển thị ổn định.

## 5. Cấu trúc dữ liệu tối thiểu

Nếu backend đã có bảng nguyên liệu, nên lưu ingredient_id để liên kết đúng nguyên liệu gốc.

~~~text
ingredient_videos
- id
- ingredient_id hoặc ingredient_name
- slug: unique
- video_url
- category: nullable
- created_at
- updated_at
~~~

Ràng buộc quan trọng:

- slug là duy nhất.
- Một slug chỉ có một URL video.
- POST lần hai cùng nguyên liệu sẽ update bản ghi cũ, không tạo bản ghi trùng.

Nếu cần làm nhanh ở bản đầu, có thể dùng ingredient_name và slug; sau đó đổi sang ingredient_id khi tích hợp sâu với bảng nguyên liệu hiện tại.

## 6. Màn hình mobile

Tên màn hình đề xuất: Khám phá nguyên liệu.

Thành phần:

- Tiêu đề màn hình.
- Ô tìm kiếm theo tên nguyên liệu.
- Bộ lọc category nếu backend trả category.
- Danh sách card nguyên liệu.
- Mỗi card hiển thị tên nguyên liệu và đúng một video.
- Trạng thái loading, empty và lỗi mạng.

Luồng mobile:

1. Gọi GET /api/v1/ingredient-videos.
2. Lưu danh sách vào state hoặc cache nhẹ.
3. Lọc theo tên khi người dùng nhập.
4. Lọc theo category nếu có.
5. Chạm card để xem video.
6. Dừng video khi rời màn hình bằng lifecycle/focus của navigation.

Mobile tuyệt đối không gọi API POST và không biết secret key.

## 7. Quy trình thêm video thủ công

1. Đăng video nguyên liệu lên YouTube.
2. Copy URL video.
3. Gọi API POST với tên nguyên liệu, URL và key.
4. Backend thêm mới hoặc cập nhật nguyên liệu đó.
5. Mở lại màn hình mobile hoặc pull-to-refresh để gọi GET danh sách mới.

Ví dụ PowerShell:

~~~powershell
$headers = @{
  "X-Ingredient-Video-Key" = "secret-key"
  "Content-Type" = "application/json"
}
$body = @{
  ingredient_name = "Cà chua"
  video_url = "https://www.youtube.com/watch?v=abc123xyz"
  category = "Rau củ"
} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:5001/api/v1/ingredient-videos" -Method Post -Headers $headers -Body $body
~~~

## 8. Kiểm thử tối thiểu

- POST với key đúng: tạo được bản ghi.
- POST với key sai hoặc thiếu: trả 401.
- POST thiếu tên hoặc URL: trả 400.
- POST URL không phải YouTube: trả 400.
- POST cùng một nguyên liệu lần hai: cập nhật, không tạo dòng trùng.
- GET không cần key và trả đúng tên + URL.
- Tìm kiếm có dấu và không dấu đều tìm được:
  - ca chua tìm thấy Cà chua.
- Category filter hoạt động khi category được lưu.
- Mỗi nguyên liệu chỉ hiển thị một video.
- Video dừng khi chuyển sang screen khác.

## 9. Tiêu chí hoàn thành

- Backend đọc đúng một key từ .env.
- Có POST thêm/cập nhật video với cơ chế kiểm tra key.
- Có GET public cho mobile.
- Có unique slug để đảm bảo một nguyên liệu một video.
- Mobile có tiêu đề, GET all, search và filter.
- Không có JWT, role admin, audit log hoặc secret key trong app.

Đây là phương án phù hợp với cách vận hành hiện tại: bạn upload video thủ công lên YouTube, sau đó chỉ cần đăng ký hoặc cập nhật URL bằng một request có secret key.
