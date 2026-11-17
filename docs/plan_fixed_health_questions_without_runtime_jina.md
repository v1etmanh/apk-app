# Kế hoạch 1: Xử lý câu hỏi cố định không cần Jina runtime

## 1. Bối cảnh hiện tại

Các câu hỏi dinh dưỡng trong app đang là danh sách cố định theo question_id, được khai báo ở backend trong rag/health_qa.py.

Các nhóm câu hỏi hiện tại gồm:

- general_nutrition
- diabetes
- hypertension
- gout
- ibs
- calories
- weight_loss
- energy_goal
- satiety
- weather_fit
- allergy_check
- diet_type
- ingredient_impact
- cooking_method

Backend đã có hàm trả lời deterministic build_answer() dựa trên:

- Chỉ số dinh dưỡng của món.
- Danh sách nguyên liệu.
- Khẩu phần.
- Hồ sơ sức khỏe.
- Mục tiêu ăn uống.

Tuy nhiên route dish_health_question hiện vẫn gọi Nutrition RAG trước khi tạo câu trả lời. Luồng này làm phát sinh phụ thuộc vào Jina API key, vector store và mạng bên ngoài.

## 2. Mục tiêu

- Các câu hỏi cố định vẫn trả lời được khi Jina hết quota, lỗi mạng hoặc không cấu hình API key.
- Giảm thời gian phản hồi.
- Không phải trả phí Jina cho từng lần người dùng bấm câu hỏi.
- Kết quả ổn định, dễ kiểm thử và dễ giải thích.
- Giữ khả năng mở rộng RAG cho câu hỏi tự do trong tương lai.

## 3. Kiến trúc đề xuất

### Luồng chính cho câu hỏi cố định

1. Mobile gửi question_id và dish_id.
2. Backend kiểm tra question_id hợp lệ.
3. Backend lấy dữ liệu món ăn, nguyên liệu và profile.
4. Backend gọi build_answer().
5. Backend trả về answer_mode = deterministic.
6. Jina không được gọi trong luồng này.

### Luồng RAG tùy chọn

RAG/Jina chỉ giữ lại cho:

- Endpoint hỏi tự do.
- Tìm kiếm kiến thức dinh dưỡng mở rộng.
- Hiển thị nguồn tham khảo khi thật sự cần semantic retrieval.

## 4. Phương án vector hóa offline nếu vẫn cần nguồn tham khảo

Nếu muốn giữ phần nguồn tham khảo:

1. Dùng Jina để vector hóa toàn bộ tài liệu một lần.
2. Dùng cùng model Jina và cùng số chiều để vector hóa các câu hỏi chuẩn.
3. Lưu vector câu hỏi theo question_id.
4. Lưu embedding tài liệu trong Supabase pgvector hoặc vector store hiện tại.
5. Runtime lấy vector câu hỏi đã lưu, không gọi Jina API.
6. Khi đổi model hoặc số chiều embedding, phải chạy lại toàn bộ quá trình index.

Ví dụ mapping:

~~~text
diabetes      -> vector câu hỏi tiểu đường
hypertension  -> vector câu hỏi huyết áp
gout          -> vector câu hỏi gout
calories      -> vector câu hỏi calories
~~~

Nếu câu trả lời chỉ dựa trên dữ liệu món và không cần nguồn tham khảo thì không cần vector hóa câu hỏi.

## 5. Thay đổi dự kiến

### Backend

- Bổ sung feature flag, ví dụ FIXED_HEALTH_QUESTIONS=true.
- Cho phép route câu hỏi cố định chạy deterministic trước.
- Chỉ gọi RAG khi bật chế độ nguồn tham khảo.
- Trả về rõ:

~~~json
{
  "answer_mode": "deterministic",
  "sources": []
}
~~~

- Giữ fallback hiện tại để tránh breaking flow.

### Mobile

- Không cần thay đổi UI câu hỏi.
- Có thể hiển thị nhãn nguồn dựa trên answer_mode.
- Không cần lưu Jina API key ở mobile.

## 6. Kiểm thử

- Kiểm thử toàn bộ nhóm question_id.
- Kiểm thử tiếng Việt và tiếng Anh.
- Kiểm thử món thiếu chỉ số dinh dưỡng.
- Kiểm thử profile có tiểu đường, huyết áp, gout, IBS.
- Kiểm thử mục tiêu giảm cân và tăng năng lượng.
- Tắt Jina API key rồi kiểm tra câu trả lời vẫn hoạt động.
- Kiểm tra response không còn chờ timeout từ Jina.
- Kiểm tra định dạng disclaimer y tế.

## 7. Tiêu chí hoàn thành

- 100% câu hỏi cố định trả lời được khi Jina không hoạt động.
- Không gọi Jina trong request thông thường của câu hỏi cố định.
- answer_mode phản ánh đúng nguồn trả lời.
- Việt/Anh hoạt động giống nhau.
- RAG vẫn có thể bật lại cho câu hỏi tự do.

## 8. Kết luận

Với phạm vi hiện tại, Jina không cần thiết cho luồng câu hỏi cố định. Nên dùng deterministic answer làm luồng chính. Vector hóa offline chỉ là tầng bổ sung nếu cần lấy nguồn tham khảo hoặc semantic retrieval.
