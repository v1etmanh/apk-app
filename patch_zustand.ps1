$zustandEsm = "D:\dream_project\daily_mate_code\daily_mate_all\mobile_app\node_modules\zustand\esm"

Get-ChildItem $zustandEsm -Filter "*.mjs" | ForEach-Object {
    $file = $_.FullName
    $content = Get-Content $file -Raw
    
    # Replace all import.meta.env ? import.meta.env.MODE : void 0
    $patched = $content -replace 'import\.meta\.env \? import\.meta\.env\.MODE : void 0', '(process.env.NODE_ENV !== undefined ? process.env.NODE_ENV : void 0)'
    
    # Replace remaining import.meta references
    $patched = $patched -replace 'import\.meta\.env', 'process.env'
    
    if ($content -ne $patched) {
        Set-Content -Path $file -Value $patched -NoNewline
        Write-Host "Patched: $($_.Name)"
    } else {
        Write-Host "No changes: $($_.Name)"
    }
}

Write-Host "Done."
