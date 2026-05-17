$APK_SRC  = "android\app\build\outputs\apk\release\app-release.apk"
$APK_DEST = "DailyMate-release.apk"

Write-Host "=== [1/2] Exporting JS bundle ===" -ForegroundColor Cyan
# --clear đã bị bỏ từ Expo SDK 51+ — xóa Metro cache thủ công nếu cần
npx expo export:embed `
  --platform android `
  --dev false `
  --entry-file node_modules/expo/AppEntry.js `
  --bundle-output android/app/src/main/assets/index.android.bundle `
  --assets-dest android/app/src/main/res

if ($LASTEXITCODE -ne 0) {
  Write-Host "Bundle export FAILED" -ForegroundColor Red; exit 1
}

Write-Host "=== [2/2] Building Release APK ===" -ForegroundColor Cyan
Set-Location android
.\gradlew assembleRelease
Set-Location ..

if ($LASTEXITCODE -ne 0) {
  Write-Host "Gradle build FAILED" -ForegroundColor Red; exit 1
}

Copy-Item $APK_SRC $APK_DEST -Force

Write-Host ""
Write-Host "BUILD SUCCESS" -ForegroundColor Green
Write-Host "APK: $APK_DEST" -ForegroundColor Yellow
