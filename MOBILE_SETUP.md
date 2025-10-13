# 📱 Mobil Uygulama İkon ve Splash Screen Kurulumu

## 🎨 Uygulama İkonu Değiştirme

### Adım 1: İkon Dosyası Hazırlama
1. **1024x1024 piksel** PNG formatında bir ikon oluşturun
2. Arka plan **şeffaf olmamalı** (Android için solid renk gerekli)
3. Tasarım basit ve net olmalı
4. Önerilen renkler: Indigo (#4F46E5) veya mor tonları

### Adım 2: Otomatik İkon Oluşturma (Önerilen)

```bash
# Cordova res yükleyin
npm install -g cordova-res

# resources klasörü oluşturun
mkdir resources

# icon.png dosyanızı resources/ klasörüne koyun (1024x1024)
# Ardından tüm boyutları otomatik oluşturun:
npx cordova-res android --skip-config --copy
```

### Adım 3: Manuel İkon Ekleme (Alternatif)

Eğer otomatik oluşturma çalışmazsa, manuel olarak şu klasörlere ikonları ekleyin:

```
android/app/src/main/res/
├── mipmap-mdpi/ic_launcher.png (48x48)
├── mipmap-hdpi/ic_launcher.png (72x72)
├── mipmap-xhdpi/ic_launcher.png (96x96)
├── mipmap-xxhdpi/ic_launcher.png (144x144)
└── mipmap-xxxhdpi/ic_launcher.png (192x192)
```

## 🌟 Splash Screen (Açılış Animasyonu)

### Mobil Splash Screen

Splash screen için görsel hazırlayın:

1. **2732x2732 piksel** PNG formatında splash görsel oluşturun
2. Arka plan rengi: `#4F46E5` (Indigo)
3. Ortada logo veya uygulama adı

```bash
# Splash screen oluşturma
# splash.png dosyanızı resources/ klasörüne koyun
npx cordova-res android --skip-config --copy
```

### Web Splash Screen

Web tarafında splash screen zaten eklenmiştir:
- `src/components/SplashScreen.tsx` - Splash screen komponenti
- `src/App.tsx` - Splash screen entegrasyonu
- İlk açılışta 2.5 saniye gösterilir
- Session boyunca bir kez gösterilir

## 🔧 Yapılandırma

`capacitor.config.ts` dosyası zaten yapılandırılmıştır:

```typescript
plugins: {
  SplashScreen: {
    launchShowDuration: 3000,        // 3 saniye göster
    launchAutoHide: true,            // Otomatik gizle
    launchFadeOutDuration: 500,      // 0.5 saniye fade out
    backgroundColor: '#4F46E5',      // Indigo arka plan
    androidSplashResourceName: 'splash',
    androidScaleType: 'CENTER_CROP',
    showSpinner: false,              // Loading spinner gösterme
    splashFullScreen: true,          // Tam ekran
    splashImmersive: true,           // Immersive mod
  }
}
```

## 📦 Build ve Test

### 1. Web Build
```bash
npm run build
```

### 2. Capacitor Sync
```bash
npx cap sync android
```

### 3. Android Studio'da Aç
```bash
npx cap open android
```

### 4. Test
- Android Studio'da emulator veya gerçek cihazda test edin
- İlk açılışta splash screen görünmeli
- Uygulama ikonu launcher'da görünmeli

## 🎨 Tasarım Önerileri

### İkon Tasarımı
- **Renk Paleti**: Indigo (#4F46E5), Purple (#8B5CF6), Pink (#EC4899)
- **Stil**: Modern, minimal, flat design
- **İçerik**: Kitap ikonu veya "DK" harfleri
- **Padding**: İkonun etrafında %10-15 boşluk bırakın

### Splash Screen Tasarımı
- **Arka Plan**: Gradient (indigo to purple)
- **Logo**: Beyaz veya açık renkli
- **Animasyon**: Fade in/out, bounce efekti
- **Süre**: 2-3 saniye (çok uzun olmamalı)

## 🛠️ Sorun Giderme

### İkon Görünmüyor
1. `android/app/src/main/res/` klasörünü kontrol edin
2. Tüm mipmap klasörlerinde `ic_launcher.png` olmalı
3. Android Studio'da "Clean Project" yapın
4. Uygulamayı yeniden build edin

### Splash Screen Görünmüyor
1. `capacitor.config.ts` yapılandırmasını kontrol edin
2. `npx cap sync android` komutunu çalıştırın
3. Android Studio'da "Invalidate Caches / Restart" yapın

### Splash Screen Çok Uzun
- `launchShowDuration` değerini azaltın (örn: 2000)
- `launchAutoHide: true` olduğundan emin olun

## 📱 Online Araçlar

### İkon Oluşturma
- [App Icon Generator](https://www.appicon.co/)
- [Icon Kitchen](https://icon.kitchen/)
- [MakeAppIcon](https://makeappicon.com/)

### Splash Screen Oluşturma
- [Ape Tools](https://apetools.webprofusion.com/app/#/tools/imagegorilla)
- [Figma](https://www.figma.com/) - Özel tasarım için

## ✅ Checklist

- [ ] 1024x1024 ikon hazırlandı
- [ ] resources/icon.png eklendi
- [ ] cordova-res ile ikonlar oluşturuldu
- [ ] 2732x2732 splash görsel hazırlandı
- [ ] resources/splash.png eklendi
- [ ] capacitor.config.ts yapılandırıldı
- [ ] npm run build çalıştırıldı
- [ ] npx cap sync android çalıştırıldı
- [ ] Android Studio'da test edildi
- [ ] İkon launcher'da görünüyor
- [ ] Splash screen ilk açılışta görünüyor

## 🎉 Tamamlandı!

Artık uygulamanızın özel ikonu ve splash screen'i var!
