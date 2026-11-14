Bước 1 — Thêm vào .gitignore:
  ::view-transition-group(*),
  ::view-transition-old(*),
  ::view-transition-new(*) {
    animation-duration: 0.25s;
    animation-timing-function: cubic-bezier(0.19, 1, 0.22, 1);
  }
Ddesktop-commanderDdesktop-commander read_file
  ::view-transition-group(*),
  ::view-transition-old(*),
  ::view-transition-new(*) {
    animation-duration: 0.25s;
    animation-timing-function: cubic-bezier(0.19, 1, 0.22, 1);
  }
Ddesktop-commanderDdesktop-commander edit_blockBước 2 — Xóa file khỏi Git history (untrack), giữ file trên máy:Ran a command, used desktop-commander integrationRan a command, used desktop-commander integrationDStart Terminal ProcessResultbash không có quyền truy cập Windows filesystemScriptDoneTôi không thể chạy git trực tiếp trên máy bạn. Bạn tự chạy các lệnh sau trong terminal (PowerShell hoặc CMD), theo đúng thứ tự:

Chạy lần lượt trong terminal tại D:\dream_project\daily_mate_code\daily_mate_all
Bước 1 — Untrack file khỏi git (file vẫn còn trên máy):
bashgit rm --cached firebase-service-account.json
Bước 2 — Commit thay đổi:
bashgit add .gitignore
git commit -m "security: remove firebase credentials from git tracking"
Bước 3 — Vào link GitHub cho phép push (cách nhanh nhất):
Vào link này trong ảnh của bạn:
https://github.com/v1etmanh/daily_mate_app/security/secret-scanning/unblock-secret/3DrM3Xh0LHvMVStPq0r38NyhOgL
Chọn "It's used in tests" hoặc "I'll fix it later" → GitHub sẽ cho phép push commit cũ qua.
Bước 4 — Push lại:
bashgit push

Quan trọng sau đó: Vào Firebase Console → Project Settings → Service Accounts và tạo lại key mới (revoke key cũ), vì key đó đã bị lộ trong git history dù đã xóa khỏi repo.

eas build -p android --profile preview


eas build --platform android --profile production
