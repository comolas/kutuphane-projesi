@echo off
echo ========================================
echo AWS Anahtarlarini Git Gecmisinden Kaldirma
echo ========================================
echo.
echo UYARI: Bu islem Git gecmisini degistirir!
echo Devam etmeden once repository'yi yedekleyin.
echo.
pause

echo.
echo Adim 1: .env.data-49543 dosyasini Git cache'inden kaldiriliyor...
cd functions
git rm --cached .env.data-49543 2>nul
if %errorlevel% equ 0 (
    echo [OK] .env.data-49543 cache'den kaldirildi
) else (
    echo [BILGI] .env.data-49543 zaten cache'de yok
)
cd ..

echo.
echo Adim 2: Degisiklikler commit ediliyor...
git add functions/.gitignore functions/.env.example
git commit -m "security: Remove AWS credentials from Git tracking"

echo.
echo Adim 3: AWS anahtarlari Git gecmisinden tamamen kaldiriliyor...
echo Bu islem biraz zaman alabilir...
git filter-branch --force --index-filter "git rm --cached --ignore-unmatch functions/.env.data-49543" --prune-empty --tag-name-filter cat -- --all

echo.
echo ========================================
echo TAMAMLANDI!
echo ========================================
echo.
echo Sonraki adimlar:
echo 1. git push origin --force --all
echo 2. git push origin --force --tags
echo 3. AWS anahtarlarini DERHAL yenileyin (acikta kaldi!)
echo 4. Firebase Secret Manager'a yeni anahtarlari ekleyin
echo.
echo KRITIK: AWS Console'dan eski anahtarlari SILIN:
echo   https://console.aws.amazon.com/iam/home#/security_credentials
echo.
pause
