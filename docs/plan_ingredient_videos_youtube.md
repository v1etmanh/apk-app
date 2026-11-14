# Kế hoạch 2: Chuyển video nguyên liệu từ R2 sang YouTube

## 1. Quy tắc nghiệp vụ

Mỗi nguyên liệu chỉ có một video:

~~~text
1 ingredient = 1 YouTube video
~~~

Ví dụ:

~~~text
Cà chua   -> slug: ca-chua, youtube_video_id: <id>
Rau muống -> slug: rau-muong, youtube_video_id: <id>
Ớt hiểm  -> slug: ot-hiem, youtube_video_id: <id>
Đậu đen  -> slug: dau-den, youtube_video_id: <id>
~~~

Slug chỉ dùng để định danh nguyên liệu. YouTube sử dụng video ID riêng, không dùng slug làm video ID.

## 2. Mục tiêu

- Chuyển nguồn phát video từ Cloudflare R2 sang kênh YouTube của dự án.
- Đăng video thủ công lên YouTube.
- Cập nhật video ID vào database backend.
- App tự lấy danh sách video từ backend, không cần build lại sau mỗi lần đăng video.
- Không cần lưu video hoặc Cloudflare API key trong mobile.
- Giữ đúng mô hình một nguyên liệu tương ứng một video.

## 3. Thiết kế dữ liệu backend

Tạo bảng ingredient_videos:

~~~text
id
ingredient_id       unique, foreign key
slug
provider            youtube
youtube_video_id
youtube_url
status              published
created_at
updated_at
~~~

Ràng buộc quan trọng:

- ingredient_id là unique.
- Mỗi ingredient chỉ có một video đang published.
- Khi đăng video mới cho cùng nguyên liệu, update youtube_video_id cũ.
- Không tạo nhiều dòng video cho cùng một ingredient.
- Không lưu API key YouTube trong database.

Nên lưu youtube_video_id làm dữ liệu chính. youtube_url có thể được tạo từ ID khi backend trả response:

~~~text
https://www.youtube.com/watch?v=<youtube_video_id>
~~~

## 4. Quy trình đăng video

1. Quay và chỉnh sửa video nguyên liệu.
2. Đặt tiêu đề theo tên nguyên liệu.
3. Đăng video lên kênh YouTube.
4. Bật quyền Allow embedding.
5. Đảm bảo video ở trạng thái Public hoặc Unlisted tùy mục đích.
6. Lấy video ID từ URL YouTube.
7. Upsert dòng ingredient_videos theo ingredient_id.
8. Đánh dấu status = published.
9. App refresh API và hiển thị video mới.

Ví dụ URL:

~~~text
https://www.youtube.com/watch?v=abc123xyz
~~~

Video ID:

~~~text
abc123xyz
~~~

## 5. API backend

### Lấy danh sách video

~~~text
GET /api/v1/ingredient-videos
~~~

Response dự kiến:

~~~json
{
  "items": [
    {
      "ingredient_id": "ca-chua",
      "slug": "ca-chua",
      "title": "Cà chua",
      "category": "vegetables",
      "provider": "youtube",
      "youtube_video_id": "abc123xyz",
      "youtube_url": "https://www.youtube.com/watch?v=abc123xyz",
      "status": "published"
    }
  ]
}
~~~

### Lấy video của một nguyên liệu

Có thể bổ sung:

~~~text
GET /api/v1/ingredients/{ingredient_id}/video
~~~

Endpoint này trả về tối đa một video.

## 6. Thay đổi mobile

- Bỏ catalog R2 hardcode làm nguồn chính.
- Gọi API backend để lấy danh sách ingredient_videos.
- Mỗi card nguyên liệu mở đúng một YouTube video.
- Dùng YouTube Embedded Player chính thức hoặc mở YouTube app khi embed không khả dụng.
- Khi chuyển screen/tab, player phải pause hoặc destroy.
- Khi quay lại screen, video không tự phát lại.
- Không có chức năng upload video trong app.
- Không lưu YouTube API key trong mobile.

## 7. YouTube API key

Không cần YouTube Data API key nếu quản trị viên:

- Đăng video thủ công.
- Lấy video ID thủ công.
- Cập nhật video ID vào backend database.

YouTube Data API key chỉ cần nếu muốn backend tự động:

- Đọc danh sách video từ kênh.
- Đồng bộ playlist.
- Lấy thumbnail, thời lượng hoặc trạng thái tự động.

Giai đoạn đầu nên nhập video ID thủ công để giảm độ phức tạp.

## 8. Lưu ý chính sách và kỹ thuật

- Phải dùng YouTube Embedded Player hoặc mở video trên YouTube.
- Không tải video YouTube về R2 để phát lại.
- Không tự ý ẩn các chức năng chuẩn hoặc branding của YouTube.
- Không chặn quảng cáo khi YouTube phát quảng cáo.
- Video age-restricted hoặc tắt embedding có thể không chạy trong app.
- Cần giữ thông tin origin/client phù hợp để tránh lỗi embed.

Tài liệu tham khảo:

- https://developers.google.com/youtube/iframe_api_reference
- https://developers.google.com/youtube/terms/developer-policies-guide
- https://support.google.com/youtube/answer/171780

## 9. Migration từ R2

Không cần chuyển lại file video từ R2 sang app.

Đối với từng nguyên liệu:

1. Đăng hoặc dùng video tương ứng trên YouTube.
2. Lấy YouTube video ID.
3. Cập nhật provider từ r2 sang youtube.
4. Ghi youtube_video_id vào database.
5. Kiểm tra app phát đúng video.
6. Sau khi toàn bộ video đã chuyển thành công, có thể ngừng dùng R2 cho tính năng này.

Trong giai đoạn chuyển tiếp có thể hỗ trợ:

~~~text
provider = r2
provider = youtube
~~~

Sau khi migration hoàn tất, dữ liệu published chỉ dùng provider = youtube.

## 10. Tiêu chí hoàn thành

- Một nguyên liệu chỉ trả về một YouTube video.
- App lấy danh sách video từ backend.
- Đăng video và cập nhật database không yêu cầu phát hành app mới.
- Video Public/Unlisted được phát đúng trong app.
- Chuyển tab không còn âm thanh nền.
- Không có Cloudflare secret hoặc YouTube API key trong app.
- Tìm kiếm và filter hoạt động theo nguyên liệu.
- Video R2 cũ không còn là nguồn phát chính.

## 11. Kết luận

YouTube là nguồn video chính cho tính năng này vì dự án đã có kênh riêng và video được đăng thủ công. Backend chỉ cần lưu mapping một nguyên liệu với một YouTube video ID. App lấy mapping đó qua API và phát bằng player chính thức.
