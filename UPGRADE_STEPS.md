# UPGRADE GUIDE — SDK 51 → SDK 54
# Chạy các lệnh sau theo thứ tự trong thư mục mobile_app

# BƯỚC 1: Xóa cache cũ
rmdir /s /q node_modules
del package-lock.json

# BƯỚC 2: Cài lại toàn bộ dependencies mới
npm install

# BƯỚC 3: Fix nếu có conflict
npx expo install --fix

# BƯỚC 4: Prebuild lại native (bắt buộc vì có thư mục android/)
npx expo prebuild --clean

# BƯỚC 5: Chạy thử
npx expo run:android
# hoặc:
npx expo start
