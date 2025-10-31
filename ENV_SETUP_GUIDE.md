# Environment Variables Setup Guide

## 📋 Genel Bakış

Bu proje Firebase credentials'larını güvenli bir şekilde saklamak için environment variables kullanır.

---

## 🚀 Hızlı Başlangıç

### 1. Development Ortamı

`.env` dosyası zaten mevcut ve development credentials'ları içeriyor:

```bash
# Dosya zaten var, herhangi bir işlem yapmanıza gerek yok
c:\Kutuphane Projesi\.env
```

### 2. Production Ortamı

Production için `.env.production` dosyası oluşturun:

```bash
# .env.production dosyası oluşturun
copy .env.example .env.production
```

Ardından production credentials'larınızı ekleyin:

```env
VITE_FIREBASE_API_KEY="your-production-api-key"
VITE_FIREBASE_AUTH_DOMAIN="your-production-project.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="your-production-project-id"
VITE_FIREBASE_STORAGE_BUCKET="your-production-project.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="your-production-sender-id"
VITE_FIREBASE_APP_ID="your-production-app-id"
VITE_RECAPTCHA_SITE_KEY="your-recaptcha-site-key"
NODE_ENV="production"
```

---

## 📁 Dosya Yapısı

```
.env                    # Development credentials (GIT'E COMMIT EDİLMEZ)
.env.example            # Template dosyası (GIT'E COMMIT EDİLİR)
.env.production         # Production credentials (GIT'E COMMIT EDİLMEZ)
.env.local.example      # Local development template
.gitignore              # .env dosyalarını içerir
```

---

## 🔑 Firebase Credentials Nasıl Alınır?

### 1. Firebase Console'a Gidin
https://console.firebase.google.com/

### 2. Projenizi Seçin
- Development: `data-49543`
- Production: Kendi production projeniz

### 3. Project Settings
1. Sol menüden ⚙️ (Settings) > Project settings
2. "Your apps" bölümüne gidin
3. Web app'inizi seçin (</> ikonu)
4. "SDK setup and configuration" > "Config" sekmesi
5. Credentials'ları kopyalayın

### 4. reCAPTCHA Site Key (App Check için)
1. https://www.google.com/recaptcha/admin
2. Yeni site ekleyin
3. reCAPTCHA v3 seçin
4. Domain'inizi ekleyin
5. Site key'i kopyalayın

---

## 🔒 Güvenlik Kontrol Listesi

### ✅ Yapılması Gerekenler:
- [x] `.env` dosyası `.gitignore`'da
- [x] `.env.production` dosyası `.gitignore`'da
- [x] `serviceAccountKey.json` dosyası `.gitignore`'da
- [x] Environment variables kullanılıyor
- [x] Hardcoded credentials kaldırıldı

### ❌ Yapılmaması Gerekenler:
- [ ] `.env` dosyasını Git'e commit etmeyin
- [ ] Credentials'ları kod içine yazmayın
- [ ] Public repository'de credentials paylaşmayın
- [ ] Screenshot'larda credentials göstermeyin

---

## 🛠️ Kullanım

### Development
```bash
npm run dev
# .env dosyası otomatik yüklenir
```

### Production Build
```bash
npm run build
# .env.production dosyası otomatik yüklenir
```

### Electron
```bash
npm start
# electron.cjs dosyası .env'den okur
```

---

## 🔍 Doğrulama

### 1. Environment Variables Yüklendi mi?
```javascript
console.log('API Key:', import.meta.env.VITE_FIREBASE_API_KEY);
console.log('Project ID:', import.meta.env.VITE_FIREBASE_PROJECT_ID);
```

### 2. Firebase Bağlantısı Çalışıyor mu?
```javascript
import { db } from './firebase/config';
import { collection, getDocs } from 'firebase/firestore';

const testConnection = async () => {
  try {
    const snapshot = await getDocs(collection(db, 'users'));
    console.log('✅ Firebase bağlantısı başarılı!');
  } catch (error) {
    console.error('❌ Firebase bağlantı hatası:', error);
  }
};
```

---

## 🐛 Sorun Giderme

### Problem: "Firebase API key is invalid"
**Çözüm:** 
1. `.env` dosyasındaki API key'i kontrol edin
2. Firebase Console'dan doğru key'i kopyalayın
3. Tırnak işaretlerini kontrol edin
4. Dev server'ı yeniden başlatın

### Problem: "Environment variables undefined"
**Çözüm:**
1. Dosya adının `.env` olduğundan emin olun
2. `VITE_` prefix'i kullanıldığından emin olun
3. Dev server'ı yeniden başlatın
4. Browser cache'i temizleyin

### Problem: "Permission denied"
**Çözüm:**
1. Firebase Security Rules'ı kontrol edin
2. Authentication durumunu kontrol edin
3. User role'ünü kontrol edin

---

## 📚 Ek Kaynaklar

- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Firebase Web Setup](https://firebase.google.com/docs/web/setup)
- [Firebase App Check](https://firebase.google.com/docs/app-check)
- [reCAPTCHA v3](https://developers.google.com/recaptcha/docs/v3)

---

## 🔄 Güncelleme

Credentials değiştiğinde:

1. `.env` dosyasını güncelleyin
2. Dev server'ı yeniden başlatın
3. Browser cache'i temizleyin
4. Test edin

---

## 📞 Destek

Sorun yaşıyorsanız:
1. Bu guide'ı tekrar okuyun
2. Firebase Console'u kontrol edin
3. Browser console'u kontrol edin
4. Network tab'ı kontrol edin

---

**Son Güncelleme:** ${new Date().toLocaleDateString('tr-TR')}
**Oluşturan:** Amazon Q Developer
