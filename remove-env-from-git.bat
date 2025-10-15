@echo off
echo ========================================
echo .env Dosyasini Git Gecmisinden Kaldirma
echo ========================================
echo.
echo UYARI: Bu islem Git gecmisini degistirir!
echo Devam etmeden once repository'yi yedekleyin.
echo.
pause

echo.
echo Adim 1: .env dosyasini Git cache'inden kaldiriliyor...
git rm --cached .env 2>nul
if %errorlevel% equ 0 (
    echo [OK] .env cache'den kaldirildi
) else (
    echo [BILGI] .env zaten cache'de yok
)

echo.
echo Adim 2: Degisiklikler commit ediliyor...
git add .gitignore
git commit -m "security: Remove .env from Git tracking"

echo.
echo Adim 3: .env dosyasi Git gecmisinden tamamen kaldiriliyor...
echo Bu islem biraz zaman alabilir...
git filter-branch --force --index-filter "git rm --cached --ignore-unmatch .env" --prune-empty --tag-name-filter cat -- --all

echo.
echo ========================================
echo TAMAMLANDI!
echo ========================================
echo.
echo Sonraki adimlar:
echo 1. git push origin --force --all
echo 2. git push origin --force --tags
echo 3. Ekip uyelerini bilgilendirin (repository'yi yeniden clone etmeliler)
echo.
echo ONEMLI: .env dosyanizi yedekleyin, sonra yeni .env olusturun:
echo   copy .env.example .env
echo   (Sonra .env dosyasina gercek degerlerinizi girin)
echo.
pause
