# Firebase Güvenlik Yapılandırması

## ✅ Yapılan Değişiklikler

### 1. .env Dosyası Güvenliği
- ✅ `.env.example` dosyası oluşturuldu (gerçek değerler olmadan)
- ✅ `.gitignore` güncellendi - `.env` dosyası kesinlikle ignore ediliyor
- ⚠️ **ÖNEMLİ**: Mevcut `.env` dosyası Git geçmişinden temizlenmeli!

### 2. Firestore Rules Sıkılaştırıldı
- ✅ `books` - Sadece authenticated kullanıcılar okuyabilir
- ✅ `authors` - Sadece authenticated kullanıcılar okuyabilir
- ✅ `magazines` - Sadece authenticated kullanıcılar okuyabilir
- ✅ `announcements` - Sadece authenticated kullanıcılar okuyabilir
- ✅ `appInfo` - Sadece authenticated kullanıcılar okuyabilir
- ✅ `transactions` - Sadece admin ve ilgili kullanıcı erişebilir

## 🚨 KRİTİK: Git Geçmişinden .env Dosyasını Temizleme

### Adım 1: Git Geçmişinden Kaldırma
```bash
# .env dosyasını Git geçmişinden tamamen kaldır
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env" \
  --prune-empty --tag-name-filter cat -- --all

# Veya daha modern yöntem (git-filter-repo kullanarak):
# pip install git-filter-repo
# git filter-repo --path .env --invert-paths
```

### Adım 2: Remote'a Force Push
```bash
# Tüm branch'leri force push et
git push origin --force --all
git push origin --force --tags
```

### Adım 3: Diğer Geliştiricileri Bilgilendir
Ekipteki herkes repository'yi yeniden clone etmeli:
```bash
git clone https://github.com/comolas/kutuphane-projesi.git
```

## 🔐 Firebase API Anahtarlarını Yenileme (ÖNERİLİR)

### Adım 1: Firebase Console'a Git
1. https://console.firebase.google.com
2. Projenizi seçin: **data-49543**
3. ⚙️ Project Settings > General

### Adım 2: Web App'i Yeniden Oluştur
1. "Your apps" bölümünde mevcut web app'i silin
2. "Add app" > Web (</>) tıklayın
3. Yeni bir app adı verin
4. Yeni API anahtarlarını kopyalayın
5. `.env` dosyanıza yapıştırın

### Adım 3: Eski API Anahtarını Devre Dışı Bırak
1. Google Cloud Console'a gidin: https://console.cloud.google.com
2. Projenizi seçin
3. APIs & Services > Credentials
4. Eski API anahtarını bulun ve "Delete" tıklayın

## 🛡️ Firebase App Check Kurulumu (ÖNERİLİR)

Firebase App Check, API anahtarınızın sadece sizin uygulamanızdan kullanılmasını sağlar.

### Adım 1: Firebase Console'da Aktif Et
1. Firebase Console > Build > App Check
2. "Get started" tıklayın
3. Web app'inizi seçin
4. reCAPTCHA v3 seçin
5. reCAPTCHA site key alın: https://www.google.com/recaptcha/admin

### Adım 2: Kodu Güncelle
```typescript
// src/firebase/config.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);

// App Check'i aktif et
if (import.meta.env.PROD) {
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider('YOUR_RECAPTCHA_SITE_KEY'),
    isTokenAutoRefreshEnabled: true
  });
}

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);
```

### Adım 3: .env Dosyasına Ekle
```bash
VITE_RECAPTCHA_SITE_KEY="your-recaptcha-site-key"
```

### Adım 4: Package Yükle
```bash
npm install firebase@latest
```

## 🔒 Firebase Security Rules Deploy

Güncellenmiş güvenlik kurallarını deploy edin:

```bash
# Firestore rules
firebase deploy --only firestore:rules

# Storage rules
firebase deploy --only storage

# Tüm rules
firebase deploy --only firestore:rules,storage
```

## 📋 Güvenlik Kontrol Listesi

### Hemen Yapılması Gerekenler:
- [ ] `.env` dosyasını Git geçmişinden temizle
- [ ] Firebase API anahtarlarını yenile
- [ ] Güncellenmiş Firestore rules'u deploy et
- [ ] `.env.example` dosyasını kullanarak yeni `.env` oluştur
- [ ] Ekip üyelerini bilgilendir

### Önerilen Ek Güvenlik:
- [ ] Firebase App Check'i aktif et
- [ ] reCAPTCHA v3 entegre et
- [ ] API kullanım limitlerini ayarla (Firebase Console > Usage and billing)
- [ ] Firestore güvenlik kurallarını test et
- [ ] Storage güvenlik kurallarını test et

## 🧪 Güvenlik Kurallarını Test Etme

### Firebase Console'dan Test:
1. Firebase Console > Firestore Database
2. Rules sekmesine git
3. "Rules Playground" kullan
4. Farklı senaryoları test et:
   - Authenticated kullanıcı kitap okuma ✅
   - Unauthenticated kullanıcı kitap okuma ❌
   - Admin kullanıcı kitap ekleme ✅
   - Normal kullanıcı kitap ekleme ❌

### Kod ile Test:
```bash
# Firebase emulator ile test
firebase emulators:start --only firestore

# Test senaryolarını çalıştır
npm test
```

## 📊 Güvenlik Durumu

### Önceki Durum:
- ❌ API anahtarları Git'te açıkta
- ❌ Herkes veritabanını okuyabilir
- ❌ App Check yok
- ❌ Rate limiting yok

### Şimdiki Durum:
- ✅ `.env` dosyası ignore ediliyor
- ✅ Sadece authenticated kullanıcılar veri okuyabilir
- ✅ Transactions koleksiyonu korumalı
- ⏳ App Check kurulmalı (önerilen)
- ⏳ API anahtarları yenilenmeli (önerilen)

## 🆘 Sorun Giderme

### "Permission denied" Hatası:
- Kullanıcının giriş yapmış olduğundan emin olun
- Firestore rules'un deploy edildiğini kontrol edin
- Firebase Console > Firestore > Rules sekmesinden kuralları kontrol edin

### API Anahtarı Çalışmıyor:
- `.env` dosyasının doğru konumda olduğundan emin olun
- `npm run dev` komutunu yeniden başlatın
- Browser cache'i temizleyin

### Git Geçmişi Temizleme Sorunu:
- Repository'yi yedekleyin
- `git-filter-repo` aracını kullanın (daha güvenli)
- Gerekirse yeni bir repository oluşturun

## 📞 Destek

Sorun yaşarsanız:
- Firebase Console > Support
- Firebase Documentation: https://firebase.google.com/docs/security
- Stack Overflow: firebase-security tag
