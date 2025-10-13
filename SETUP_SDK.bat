@echo off
echo ========================================
echo Android SDK Kurulum Kontrol
echo ========================================
echo.
echo ANDROID_HOME ortam degiskeni kontrol ediliyor...
echo.

if defined ANDROID_HOME (
    echo [OK] ANDROID_HOME bulundu: %ANDROID_HOME%
) else (
    echo [HATA] ANDROID_HOME bulunamadi!
    echo.
    echo Lutfen Android Studio'yu acin ve SDK Manager'dan SDK yukleyin.
    echo Sonra Windows ortam degiskenlerine ANDROID_HOME ekleyin:
    echo.
    echo 1. Windows Arama'da "ortam degiskenleri" yazin
    echo 2. "Sistem ortam degiskenlerini duzenle" ac
    echo 3. "Ortam Degiskenleri" butonuna tikla
    echo 4. "Yeni" butonuna tikla
    echo 5. Degisken adi: ANDROID_HOME
    echo 6. Degisken degeri: C:\Android\Sdk
    echo 7. Tamam'a tikla ve bilgisayari yeniden baslat
)

echo.
echo ========================================
pause
