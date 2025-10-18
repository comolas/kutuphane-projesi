# Mobil Güncelleme Sistemi Kurulum Rehberi

## Kurulum Adımları

### 1. Capacitor Browser Eklentisini Kurun
```bash
npm install @capacitor/browser
npx cap sync
```

### 2. Firebase'de Versiyon Dokümanı Oluşturun

Firestore'da `appInfo` koleksiyonunda `mobileVersion` dokümanı oluşturun:

```json
{
  "version": "1.1.0",
  "downloadUrl": "https://your-site.com/app-v1.1.0.apk",
  "forceUpdate": false
}
```

### 3. APK Build ve Yayınlama

```bash
# Build al
npm run build
npx cap sync

# Android Studio'da build
npx cap open android
# Build > Generate Signed Bundle / APK

# APK'yı sunucunuza yükleyin
```

### 4. Güncelleme Yayınlama Süreci

1. **Kod değişikliklerini yap**
2. **package.json'da versiyonu artır** (örn: 1.1.0 → 1.2.0)
3. **Build al**: `npm run mobile:build`
4. **APK oluştur**: Android Studio'da signed APK
5. **APK'yı yükle**: Sunucunuza veya Firebase Storage'a
6. **Firebase'i güncelle**:
   ```javascript
   {
     "version": "1.2.0",
     "downloadUrl": "https://your-site.com/app-v1.2.0.apk",
     "forceUpdate": false  // true yaparsanız zorunlu güncelleme
   }
   ```
7. **Kullanıcılar uygulamayı açtığında otomatik bildirim alır**

## Özellikler

- ✅ Otomatik versiyon kontrolü
- ✅ Zorunlu/opsiyonel güncelleme desteği
- ✅ Kullanıcı dostu modal
- ✅ Direkt APK indirme
- ✅ Firebase entegrasyonu

## Notlar

- `forceUpdate: true` yaparsanız kullanıcı güncellemeden uygulamayı kullanamaz
- APK'yı HTTPS üzerinden sunun
- Android'de "Bilinmeyen kaynaklardan yükleme" izni gerekir
