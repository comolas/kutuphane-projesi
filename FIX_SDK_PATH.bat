@echo off
echo ========================================
echo Android SDK Yol Duzeltme
echo ========================================
echo.
echo ONEMLI: Bu script yonetici olarak calistirilmali!
echo.
echo 1. C:\Android\Sdk klasorunu olusturun (yoksa)
echo 2. Android Studio'da SDK Location'i C:\Android\Sdk olarak degistirin
echo 3. Bu scripti YONETICI olarak calistirin
echo.
pause
echo.
echo ANDROID_HOME ortam degiskeni ayarlaniyor...
setx ANDROID_HOME "C:\Android\Sdk" /M
echo.
echo Path'e ekleniyor...
setx PATH "%PATH%;C:\Android\Sdk\platform-tools;C:\Android\Sdk\tools" /M
echo.
echo ========================================
echo [BASARILI] SDK yolu ayarlandi!
echo.
echo ONEMLI: Bilgisayari yeniden baslatin!
echo ========================================
pause
