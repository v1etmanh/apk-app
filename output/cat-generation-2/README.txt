BỘ MÈO 2 — 10 NHÂN VẬT LOTTIE
Ngày tạo: 2026-11-20
Công cụ: image_gen (ảnh tham chiếu), LottieFiles Creator MCP (vector và animation).

THÀNH VIÊN
0–5 tuổi: Bông (nam, mèo trắng tai vàng, ôm gấu); Sữa (nữ, mèo tam thể nhạt, vỗ tay và bong bóng).
6–11 tuổi: Bút Chì (nam, mèo mướp bạc, mở sách); Nơ (nữ, mèo xám trắng, chong chóng).
12–24 tuổi: Beat (nam, mèo tuxedo, nghe nhạc); Mây (nữ, mèo Xiêm, chụp ảnh và nháy mắt).
25–59 tuổi: Moka (nam, mèo nâu, nâng cà phê); Lá (nữ, mèo cam trắng, tưới cây).
60+ tuổi: Trà (nam, mèo bạc có kính/râu trắng, rót trà); Mai (nữ, mèo trắng pha bạc, thái cực quyền).
Các nhóm tuổi là phân loại thiết kế của bộ asset.

THÔNG SỐ
512 × 512 px, 30 fps, 90 frames / 3 giây, nền trong suốt, vòng lặp.
Vector thuần; không bitmap, font, URL hay tài nguyên bên ngoài trong JSON.
10 JSON: tổng 347305 bytes; mỗi file 27829–40235 bytes.

CẤU TRÚC
lottie/       10 JSON dùng trực tiếp với LottieView.
references/   10 ảnh tham chiếu PNG gốc.
previews/     gallery.png; motion-contact-sheet.png; PNG từng nhân vật ở 48/104/256 px; báo cáo render.
source/       manifest.json chứa mô tả, prompt, màu sắc và documentId Creator.
              create-character.js là script dựng; truyền một character record trong manifest qua params.
              Chạy script dựng chỉ trong document MỚI. Document đã tạo thì sửa tại chỗ bằng findByName.
              preview.html + qa-server.cjs là công cụ QA cục bộ dùng dependency dotlottie-web của dự án.
              validate.cjs kiểm tra JSON, vòng lặp và bản sao trong assets.
validation.json: dung lượng, SHA256 và kết quả kiểm tra từng file.

ĐÃ CÀI VÀO DỰ ÁN
assets/animations/plan/{key}.json
Bộ mới được bổ sung cùng tám asset có sẵn. Chưa đăng ký bộ mới vào resolver/Profile.

KIỂM TRA ĐÃ THỰC HIỆN
- Preview các tư thế bằng Creator.
- Render JSON thực tế bằng @lottiefiles/dotlottie-web trong dự án: 6 khung hình/nhân vật.
- Kiểm tra alpha nền, biên hình, tay và đạo cụ; chỉnh vai/cổ tay của Mây, Moka và Bút Chì.
- Xem bản thu nhỏ 48/104/256 px. Chi tiết nhỏ như giọt nước, hơi trà và vân sách hợp với kích thước lớn hơn.
- Kiểm tra toàn bộ keyframe: thứ tự thời gian, endpoint khớp (chong chóng quay 360° tương đương).
- Xác nhận JSON vector, không tài nguyên ngoài; SHA256 bản cài giống bản xuất.
- Chưa chạy trên thiết bị Android/iOS thật.

CHẠY LẠI QA TỪ THƯ MỤC GỐC DỰ ÁN
node output/cat-generation-2/source/qa-server.cjs
Mở http://127.0.0.1:8743/output/cat-generation-2/source/preview.html
Sau khi trang báo PASS:
node output/cat-generation-2/source/validate.cjs

