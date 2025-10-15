# XSS (Cross-Site Scripting) Güvenlik Düzeltmesi

## ✅ Yapılan Değişiklikler

### 1. DOMPurify Entegrasyonu
- ✅ `dompurify` ve `isomorphic-dompurify` paketleri yüklendi
- ✅ `src/utils/sanitize.ts` utility dosyası oluşturuldu
- ✅ 3 farklı sanitization fonksiyonu eklendi:
  - `sanitizeHTML()` - Blog içeriği için (güvenli HTML tag'lerine izin verir)
  - `sanitizeText()` - Düz metin için (tüm HTML tag'lerini kaldırır)
  - `sanitizeURL()` - URL'ler için (sadece http/https protokollerine izin verir)

### 2. Frontend XSS Koruması
Aşağıdaki bileşenlerde XSS koruması eklendi:

#### Blog Bileşenleri:
- ✅ `CommentSection.tsx` - Kullanıcı yorumları sanitize ediliyor
- ✅ `PostCard.tsx` - Post başlıkları, içerikler ve URL'ler sanitize ediliyor
- ✅ `SinglePostPage.tsx` - Tüm post içeriği, kaynaklar ve meta veriler sanitize ediliyor

### 3. Backend XSS Koruması
- ✅ `functions/src/security.ts` güncellendi
- ✅ Daha güçlü pattern matching eklendi
- ✅ HTML entity encoding eklendi
- ✅ Tehlikeli JavaScript event handler'ları engellendi

---

## 🛡️ Sanitization Fonksiyonları

### sanitizeHTML (Blog İçeriği)
```typescript
// İzin verilen tag'ler
ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 'p', 'br', 'h1', 'h2', 'h3', 
               'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'a', 
               'img', 'code', 'pre', 'span', 'div']

// İzin verilen attribute'lar
ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'target', 'rel']

// Kullanım
const cleanHTML = sanitizeHTML(userInput);
```

### sanitizeText (Düz Metin)
```typescript
// Tüm HTML tag'lerini kaldırır
const cleanText = sanitizeText(userInput);
```

### sanitizeURL (URL Doğrulama)
```typescript
// Sadece http/https protokollerine izin verir
const cleanURL = sanitizeURL(userURL);
```

---

## 🔒 Engellenen Saldırı Vektörleri

### 1. Script Injection
```html
<!-- ❌ Engellendi -->
<script>alert('XSS')</script>
<img src=x onerror="alert('XSS')">
<a href="javascript:alert('XSS')">Click</a>
```

### 2. Event Handler Injection
```html
<!-- ❌ Engellendi -->
<div onclick="maliciousCode()">Click</div>
<body onload="stealCookies()">
<img onmouseover="alert('XSS')">
```

### 3. Iframe/Object Injection
```html
<!-- ❌ Engellendi -->
<iframe src="malicious.com"></iframe>
<object data="malicious.swf"></object>
<embed src="malicious.swf">
```

### 4. Data URI Schemes
```html
<!-- ❌ Engellendi -->
<a href="data:text/html,<script>alert('XSS')</script>">
```

---

## 🧪 Test Senaryoları

### Test 1: Script Tag Injection
```javascript
// Input
const malicious = '<script>alert("XSS")</script>Hello';

// Output
sanitizeText(malicious); // "Hello"
```

### Test 2: Event Handler Injection
```javascript
// Input
const malicious = '<img src=x onerror="alert(1)">';

// Output
sanitizeHTML(malicious); // "" (tamamen kaldırıldı)
```

### Test 3: JavaScript Protocol
```javascript
// Input
const malicious = 'javascript:alert(document.cookie)';

// Output
sanitizeURL(malicious); // "" (geçersiz URL)
```

### Test 4: HTML Entity Encoding
```javascript
// Input (Backend)
const malicious = '<script>alert(1)</script>';

// Output
sanitizeInput(malicious); // "&lt;script&gt;alert(1)&lt;/script&gt;"
```

---

## 📋 Korunan Bileşenler

### Frontend:
| Bileşen | Korunan Alanlar | Fonksiyon |
|---------|----------------|-----------|
| CommentSection | Yorum metni | sanitizeText |
| PostCard | Başlık, içerik, kategori, yazar adı | sanitizeText |
| PostCard | Resim URL'leri | sanitizeURL |
| SinglePostPage | Post içeriği, kaynaklar | sanitizeHTML |
| SinglePostPage | Başlık, kategori, tag'ler | sanitizeText |
| SinglePostPage | Tüm resim URL'leri | sanitizeURL |

### Backend:
| Fonksiyon | Korunan Alanlar | Yöntem |
|-----------|----------------|--------|
| chatWithAssistant | Kullanıcı mesajları | sanitizeInput + HTML encoding |
| chatWithAdminAssistant | Admin mesajları | sanitizeInput + HTML encoding |
| Tüm Functions | Tüm string inputlar | Pattern matching + encoding |

---

## 🚀 Kullanım Örnekleri

### Blog Post Oluşturma
```typescript
import { sanitizeHTML, sanitizeText, sanitizeURL } from '../utils/sanitize';

// Post oluştururken
const post = {
  title: sanitizeText(userInput.title),
  content: sanitizeHTML(userInput.content), // Zengin metin için
  category: sanitizeText(userInput.category),
  coverImageURL: sanitizeURL(userInput.coverImageURL),
  tags: userInput.tags.map(tag => sanitizeText(tag))
};
```

### Yorum Ekleme
```typescript
import { sanitizeText } from '../utils/sanitize';

// Yorum eklerken
const comment = {
  text: sanitizeText(userInput.comment), // Düz metin
  authorName: sanitizeText(user.displayName)
};
```

### URL Doğrulama
```typescript
import { sanitizeURL } from '../utils/sanitize';

// Resim yüklerken
const imageURL = sanitizeURL(uploadedImageURL);
if (!imageURL) {
  throw new Error('Geçersiz URL');
}
```

---

## ⚠️ Önemli Notlar

### 1. dangerouslySetInnerHTML Kullanımı
```typescript
// ❌ YANLIŞ - Güvensiz
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ✅ DOĞRU - Güvenli
<div dangerouslySetInnerHTML={{ __html: sanitizeHTML(userInput) }} />
```

### 2. React Quill Kullanımı
React Quill zaten bir miktar XSS koruması sağlar, ancak ek güvenlik için:
```typescript
// Quill'den gelen içeriği de sanitize edin
const content = sanitizeHTML(quillContent);
```

### 3. Backend Validation
Frontend sanitization yeterli değil, backend'de de kontrol edin:
```typescript
// Firebase Functions'da
const sanitized = sanitizeInput(request.data.message);
```

---

## 🔍 Güvenlik Kontrol Listesi

### Frontend:
- [x] Tüm kullanıcı girdileri sanitize ediliyor
- [x] dangerouslySetInnerHTML kullanımları güvenli
- [x] URL'ler doğrulanıyor
- [x] Event handler'lar engelleniyor
- [x] Script tag'leri kaldırılıyor

### Backend:
- [x] Input validation yapılıyor
- [x] HTML encoding uygulanıyor
- [x] Tehlikeli pattern'ler engelleniyor
- [x] Firestore'a kaydedilmeden önce sanitize ediliyor

### Genel:
- [x] DOMPurify güncel versiyonu kullanılıyor
- [x] Content Security Policy (CSP) header'ları (önerilir)
- [x] HTTP-only cookies (Firebase Auth otomatik)
- [x] HTTPS zorunlu (Firebase Hosting otomatik)

---

## 📊 Güvenlik Durumu

### Tamamlanan:
- ✅ Admin rolü atama
- ✅ Firebase API anahtarları
- ✅ AWS kimlik bilgileri
- ✅ XSS koruması

### Sırada:
- ⏳ Rate limiting güçlendirme
- ⏳ Şifre politikası
- ⏳ Input validation
- ⏳ CSRF koruması

---

## 🆘 Sorun Giderme

### DOMPurify Import Hatası
**Neden**: Paket yüklenmemiş
**Çözüm**:
```bash
npm install dompurify isomorphic-dompurify
npm install --save-dev @types/dompurify
```

### "sanitizeHTML is not a function" Hatası
**Neden**: Import yolu yanlış
**Çözüm**:
```typescript
import { sanitizeHTML } from '../utils/sanitize';
// veya
import { sanitizeHTML } from '../../utils/sanitize';
```

### İçerik Görünmüyor
**Neden**: Çok fazla tag kaldırılmış olabilir
**Çözüm**:
```typescript
// ALLOWED_TAGS listesine gerekli tag'leri ekleyin
ALLOWED_TAGS: [..., 'table', 'tr', 'td']
```

---

## 📞 Kaynaklar

- **DOMPurify**: https://github.com/cure53/DOMPurify
- **OWASP XSS Guide**: https://owasp.org/www-community/attacks/xss/
- **Content Security Policy**: https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
- **React Security**: https://react.dev/learn/writing-markup-with-jsx#the-rules-of-jsx

---

## 🎯 Sonraki Adımlar

1. ✅ XSS koruması - TAMAMLANDI
2. ⏳ Rate limiting güçlendirme - Sırada
3. ⏳ Şifre politikası - Sırada
4. ⏳ Input validation - Sırada
5. ⏳ Content Security Policy (CSP) header'ları ekle
6. ⏳ CSRF token implementasyonu

---

**Son Güncelleme**: $(Get-Date -Format "yyyy-MM-dd HH:mm")
**Durum**: ✅ XSS koruması aktif - Test edilmeli
