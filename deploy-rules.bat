@echo off
echo Firestore kuralları deploy ediliyor...
firebase deploy --only firestore:rules
echo.
echo Deploy tamamlandı!
pause
