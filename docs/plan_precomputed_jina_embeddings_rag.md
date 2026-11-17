# Kế hoạch: Tiền vector hóa câu hỏi cố định để giảm gọi Jina runtime

## 1. Mục tiêu

Giữ lại cơ chế RAG hiện tại nhưng loại bỏ việc gọi Jina Embeddings API mỗi lần người dùng bấm một câu hỏi cố định.

Jina chỉ được gọi trong giai đoạn chuẩn bị dữ liệu hoặc khi có câu hỏi mới. Khi người dùng sử dụng app:

1. Backend nhận question_id.
2. Backend lấy vector đã lưu sẵn của câu hỏi đó.
3. Dùng vector này để tìm kiếm tài liệu liên quan trong vector database.
4. Gửi context tìm được cho LLM tạo câu trả lời.

Mobile không gọi Jina và không cần biết Jina API key.

## 2. Phạm vi thực hiện

AI backend cần xử lý:

- Xác định toàn bộ danh sách câu hỏi cố định.
- Tạo vector một lần cho từng câu hỏi.
- Lưu vector cùng question_id, model và số chiều.
- Sửa luồng trả lời để dùng vector đã lưu.
- Tạo script re-index khi câu hỏi hoặc model thay đổi.
- Giữ nguyên format API để mobile không phải sửa.

Không cần:

- Thay đổi giao diện mobile.
- Đưa Jina API key vào mobile.
- Gọi Jina trong request thông thường.
- Vector hóa lại cùng một câu hỏi ở mỗi lần người dùng bấm.

## 3. Luồng hiện tại và luồng mới

### Luồng hiện tại cần loại bỏ

~~~text
Mobile gửi question_id
    ↓
Backend lấy nội dung câu hỏi
    ↓
Backend gọi Jina để vector hóa câu hỏi
    ↓
Vector search
    ↓
LLM tạo câu trả lời
~~~

### Luồng mới

~~~text
Mobile gửi question_id
    ↓
Backend lấy vector đã lưu theo question_id
    ↓
Vector search
    ↓
LLM tạo câu trả lời
~~~

### Luồng dành cho câu hỏi mới hoặc ngoài danh sách

~~~text
Không tìm thấy vector đã lưu
    ↓
Không tự động gọi Jina trong request thông thường
    ↓
Dùng fallback an toàn hoặc đưa vào hàng đợi re-index
~~~

Có thể cho phép gọi Jina tạm thời ở môi trường development, nhưng production nên tắt fallback gọi Jina tự động để tránh phát sinh chi phí và độ trễ không kiểm soát.

## 4. Xác định danh sách câu hỏi cố định

Tạo một nguồn dữ liệu duy nhất cho các câu hỏi, ví dụ:

~~~json
[
  {
    "id": "calories",
    "text_vi": "Món này có bao nhiêu calo?",
    "text_en": "How many calories does this dish have?"
  },
  {
    "id": "diabetes",
    "text_vi": "Món này có phù hợp với người tiểu đường không?",
    "text_en": "Is this dish suitable for people with diabetes?"
  },
  {
    "id": "protein",
    "text_vi": "Món này có nhiều đạm không?",
    "text_en": "Is this dish high in protein?"
  }
]
~~~

Quy tắc:

- id phải ổn định, không dùng nội dung câu hỏi làm khóa chính.
- Có thể lưu nhiều ngôn ngữ cho cùng một question_id.
- Nếu tiếng Việt và tiếng Anh có ý nghĩa tương đương, nên tạo vector riêng cho từng text hoặc thống nhất một ngôn ngữ index.
- Không đổi nội dung câu hỏi mà không chạy lại script re-index.

## 5. Thiết kế dữ liệu vector câu hỏi

Có thể lưu trong bảng database hoặc file JSON/binary. Ưu tiên database nếu backend đang dùng PostgreSQL/pgvector.

Ví dụ bảng:

~~~text
fixed_question_embeddings
- id
- question_id
- language
- question_text
- embedding
- embedding_model
- embedding_dimensions
- source_hash
- created_at
- updated_at
~~~

Ràng buộc:

- Unique theo question_id + language + embedding_model.
- embedding_dimensions phải khớp với vector database đang search.
- source_hash dùng để phát hiện nội dung câu hỏi đã thay đổi.
- Không lưu API key trong bảng.

Nếu đang dùng file:

~~~json
{
  "question_id": "calories",
  "language": "vi",
  "text": "Món này có bao nhiêu calo?",
  "embedding_model": "jina-embeddings-v3",
  "dimensions": 1024,
  "embedding": [0.0123, -0.0441]
}
~~~

Không nên lưu vector dạng rút gọn hoặc làm tròn quá mức vì có thể ảnh hưởng kết quả similarity search.

## 6. Script tạo vector offline

Tạo một script riêng, ví dụ:

~~~text
scripts/index_fixed_question_embeddings.py
~~~

Script cần thực hiện:

1. Đọc danh sách câu hỏi cố định.
2. Tạo hash từ question_id, ngôn ngữ và nội dung câu hỏi.
3. Kiểm tra bản ghi hiện có.
4. Nếu hash không đổi và model không đổi thì bỏ qua.
5. Nếu chưa có hoặc nội dung đã đổi thì gọi Jina.
6. Kiểm tra vector trả về có đúng số chiều.
7. Upsert vector vào bảng fixed_question_embeddings.
8. Ghi lại model, số chiều, hash và thời gian cập nhật.
9. In thống kê số câu hỏi mới, số câu hỏi được cập nhật và số câu hỏi bị lỗi.

Script phải có chế độ:

~~~text
--dry-run
--language vi
--language en
--force
~~~

Mặc định không dùng --force để tránh gọi Jina lại không cần thiết.

## 7. Kiểm tra tính tương thích vector

Trước khi chạy production, backend phải kiểm tra:

- Model tạo vector câu hỏi giống model đã tạo vector tài liệu.
- Số chiều vector giống nhau.
- Cách chuẩn hóa text giống nhau nếu pipeline hiện tại có normalize.
- Distance metric giống nhau, ví dụ cosine hoặc inner product.
- Vector câu hỏi không bị lưu dưới dạng string.

Nếu thay đổi model, số chiều hoặc distance metric:

1. Đánh dấu phiên bản vector cũ.
2. Vector hóa lại toàn bộ tài liệu.
3. Vector hóa lại toàn bộ câu hỏi.
4. Chạy kiểm thử chất lượng retrieval.
5. Sau đó mới chuyển production sang phiên bản mới.

Không được trộn vector từ hai model khác nhau trong cùng một index.

## 8. Sửa runtime API

Các endpoint hiện tại cần giữ nguyên contract để mobile không phải sửa, ví dụ:

~~~text
POST /api/v1/dishes/{dish_id}/health-question
POST /api/v1/dishes/{dish_id}/health-questions
~~~

Luồng xử lý endpoint trả lời:

1. Validate dish_id và question_id.
2. Lấy câu hỏi theo question_id.
3. Xác định ngôn ngữ từ Accept-Language hoặc lang.
4. Tìm vector trong fixed_question_embeddings.
5. Nếu tìm thấy, dùng vector đó để search RAG.
6. Lọc context theo món ăn, nguyên liệu và phạm vi dinh dưỡng.
7. Gọi LLM để tạo câu trả lời.
8. Trả response cũ cho mobile.

Không được gọi Jina ở bước tìm vector hoặc vector search runtime.

Response có thể thêm metadata nội bộ để dễ kiểm tra:

~~~json
{
  "question_id": "calories",
  "answer": "Món này có khoảng 450 kcal...",
  "sources": [],
  "retrieval": {
    "embedding_source": "precomputed",
    "embedding_model": "jina-embeddings-v3"
  }
}
~~~

Metadata có thể ẩn khỏi mobile nếu contract hiện tại không cần, nhưng nên ghi log nội bộ ở môi trường development.

## 9. Xử lý khi thiếu vector

Nếu question_id chưa có vector:

1. Ghi log rõ missing_precomputed_embedding.
2. Trả lỗi có thể xử lý được hoặc dùng câu trả lời fallback.
3. Không gọi Jina tự động trong production.
4. Đưa question_id vào danh sách cần re-index.

Chỉ cho phép fallback gọi Jina nếu có biến môi trường riêng:

~~~env
ALLOW_RUNTIME_JINA_FALLBACK=false
~~~

Production đặt false. Development có thể đặt true để phát hiện câu hỏi bị thiếu, nhưng phải giới hạn log và quota.

## 10. Cấu hình môi trường

Backend giữ Jina key ở server:

~~~env
JINA_API_KEY=...
JINA_EMBEDDING_MODEL=jina-embeddings-v3
JINA_EMBEDDING_DIMENSIONS=1024
ALLOW_RUNTIME_JINA_FALLBACK=false
~~~

Jina key chỉ cần cho script indexing hoặc job quản trị. Không gửi key trong response và không đưa key vào mobile.

## 11. Kiểm thử bắt buộc

### Indexing

- Chạy script lần đầu tạo đủ vector cho toàn bộ câu hỏi.
- Chạy lần hai không gọi Jina lại nếu hash không đổi.
- Sửa một câu hỏi thì chỉ câu hỏi đó được vector hóa lại.
- Chạy --force thì vector hóa lại đúng phạm vi.
- Vector sai số chiều bị đánh dấu lỗi, không ghi vào index.

### Runtime

- Bấm câu hỏi đã index: backend trả lời thành công.
- Kiểm tra log không có request Jina.
- Jina key bị vô hiệu hóa nhưng câu hỏi đã index vẫn hoạt động.
- Câu hỏi thiếu vector trả fallback hoặc lỗi rõ ràng.
- Đổi ngôn ngữ sử dụng đúng vector của ngôn ngữ tương ứng.
- Kết quả retrieval vẫn đúng tài liệu liên quan đến món ăn.

### Regression

- Giữ nguyên response của health-question để mobile hiện tại không lỗi.
- Không ảnh hưởng recommendation, dish detail và các API khác.
- Không làm thay đổi logic nutrition đã có.

## 12. Đo lường sau khi triển khai

Theo dõi:

- Số request Jina runtime mỗi ngày, mục tiêu production là gần bằng 0.
- Số câu hỏi dùng embedding_source = precomputed.
- Tỷ lệ request thiếu vector.
- Thời gian phản hồi trước và sau thay đổi.
- Top kết quả retrieval của một số câu hỏi mẫu.
- Chi phí Jina trước và sau thay đổi.

Mục tiêu:

- 100% câu hỏi cố định có vector trước khi deploy.
- Runtime không gọi Jina cho câu hỏi đã index.
- Không có vector trộn model hoặc sai số chiều.
- Không làm giảm chất lượng câu trả lời RAG.

## 13. Tiêu chí hoàn thành

- Có danh sách câu hỏi cố định với question_id ổn định.
- Có bảng hoặc file lưu vector theo question_id và language.
- Có script index/re-index idempotent.
- Runtime lấy vector lưu sẵn thay vì gọi Jina.
- Có cơ chế phát hiện thiếu vector.
- Production tắt runtime Jina fallback.
- Mobile giữ nguyên API contract.
- Có log hoặc metric chứng minh Jina không còn bị gọi trong request thông thường.

## 14. Kết luận

Đây là phương án giảm chi phí và độ trễ nhưng vẫn giữ RAG. Jina chỉ làm nhiệm vụ tạo embedding khi chuẩn bị dữ liệu; backend runtime dùng lại embedding đã lưu để search. Cách này không loại bỏ RAG, chỉ chuyển phần vector hóa câu hỏi từ runtime sang offline indexing.
