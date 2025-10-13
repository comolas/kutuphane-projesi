@echo off
echo ========================================
echo Kutupahne Projesi - Android Test
echo ========================================
echo.
echo 1. Build yapiliyor...
call npm run build
echo.
echo 2. Capacitor sync yapiliyor...
call npx cap sync
echo.
echo 3. Android Studio aciliyor...
call npx cap open android
echo.
echo ========================================
echo Android Studio acildi!
echo Emulator olusturun ve Run butonuna basin.
echo ========================================
pause
