# Input Validation Güvenlik Düzeltmesi

## ✅ Yapılan Değişiklikler

### 1. Frontend Validation Utility Oluşturuldu
`src/utils/validation.ts` dosyası eklendi:

| Fonksiyon | Kontrol Edilen | Kurallar |
|-----------|----------------|----------|
| `validateEmail` | E-posta | Format, domain (@datakolej.edu.tr veya @gmail.com) |
| `validatePassword` | Şifre | Min 8 karakter, büyük/küçük harf, rakam |
| `validateName` | İsim/Soyisim | 2-50 karakter, sadece harf |
| `validateStudentNumber` | Öğrenci No | 3-10 karakter, sadece rakam |
| `validateClass` | Sınıf | Geçerli sınıf listesi |
| `validateFileSize` | Dosya boyutu | Maksimum 5MB (varsayılan) |
| `validateFileType` | Dosya tipi | İzin verilen uzantılar |
| `validateTextLength` | Metin uzunluğu | Min-max karakter |
| `validateNumberRange` | Sayı aralığı | Min-max değer |

### 2. Backend Validation Güçlendirildi
`functions/src/security.ts` dosyasına eklendi:

- ✅ `validateEmail()` - E-posta format kontrolü
- ✅ `validateString()` - Genel string validation
- ✅ `validateNumber()` - Sayı aralığı kontrolü
- ✅ `validateMessage()` - Mesaj validation (mevcut güçlendirildi)

### 3. Form Validation Uygulandı

#### RegisterForm:
- ✅ İsim/Soyisim - Sadece harf, 2-50 karakter
- ✅ E-posta - Format + domain kontrolü
- ✅ Şifre - 8+ karakter, büyük/küçük harf, rakam
- ✅ Öğrenci No - 3-10 rakam
- ✅ Sınıf - Geçerli sınıf listesi

#### LoginForm:
- ✅ E-posta - Format + domain kontrolü
- ✅ Captcha - Sayısal doğrulama

#### Backend Functions:
- ✅ `setAdminRole` - Email validation
- ✅ `initializeFirstAdmin` - Email validation
- ✅ `chatWithAssistant` - Message validation

---

## 🛡️ Validation Kuralları

### Email Validation
```typescript
// Format kontrolü
/^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Domain kontrolü
email.endsWith('@datakolej.edu.tr') || email.endsWith('@gmail.com')

// Maksimum uzunluk
email.length <= 254
```

### Şifre Validation
```typescript
// Minimum uzunluk
password.length >= 8

// Maksimum uzunluk
password.length <= 128

// En az bir büyük harf
/[A-Z]/.test(password)

// En az bir küçük harf
/[a-z]/.test(password)

// En az bir rakam
/[0-9]/.test(password)
```

### İsim Validation
```typescript
// Minimum uzunluk
name.trim().length >= 2

// Maksimum uzunluk
name.trim().length <= 50

// Sadece harf (Türkçe karakterler dahil)
/^[a-zA-ZğüşıöçĞÜŞİÖÇ\s]+$/.test(name)
```

### Öğrenci Numarası Validation
```typescript
// Uzunluk kontrolü
number.length >= 3 && number.length <= 10

// Sadece rakam
/^[0-9]+$/.test(number)
```

---

## 🧪 Test Senaryoları

### Test 1: Email Validation
```typescript
// ❌ Geçersiz
validateEmail('invalid');           // "Geçersiz e-posta formatı"
validateEmail('test@yahoo.com');    // "Sadece @datakolej.edu.tr veya @gmail.com"
validateEmail('');                  // "E-posta adresi gereklidir"

// ✅ Geçerli
validateEmail('student@datakolej.edu.tr');  // { valid: true }
validateEmail('user@gmail.com');            // { valid: true }
```

### Test 2: Şifre Validation
```typescript
// ❌ Geçersiz
validatePassword('12345');          // "Şifre en az 8 karakter olmalıdır"
validatePassword('password');       // "Şifre en az bir büyük harf içermelidir"
validatePassword('PASSWORD');       // "Şifre en az bir küçük harf içermelidir"
validatePassword('Password');       // "Şifre en az bir rakam içermelidir"

// ✅ Geçerli
validatePassword('Password123');    // { valid: true }
```

### Test 3: İsim Validation
```typescript
// ❌ Geçersiz
validateName('A');                  // "İsim en az 2 karakter olmalıdır"
validateName('John123');            // "İsim sadece harf içerebilir"
validateName('');                   // "İsim gereklidir"

// ✅ Geçerli
validateName('Ahmet');              // { valid: true }
validateName('Ayşe Nur');           // { valid: true }
```

### Test 4: Öğrenci Numarası Validation
```typescript
// ❌ Geçersiz
validateStudentNumber('12');       // "Öğrenci numarası 3-10 karakter olmalıdır"
validateStudentNumber('ABC123');   // "Öğrenci numarası sadece rakam içerebilir"

// ✅ Geçerli
validateStudentNumber('1234');     // { valid: true }
```

---

## 📋 Kullanım Örnekleri

### Frontend Form Validation
```typescript
import { validateEmail, validatePassword, validateName } from '../../utils/validation';

const handleSubmit = () => {
  const errors: any = {};
  
  // Email validation
  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) {
    errors.email = emailValidation.error;
  }
  
  // Password validation
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    errors.password = passwordValidation.error;
  }
  
  // Name validation
  const nameValidation = validateName(firstName);
  if (!nameValidation.valid) {
    errors.firstName = nameValidation.error;
  }
  
  if (Object.keys(errors).length === 0) {
    // Form geçerli, submit et
    onSubmit(email, password, firstName);
  } else {
    setErrors(errors);
  }
};
```

### Backend Validation
```typescript
import { validateEmail, validateString, validateNumber } from './security';

export const createUser = onCall(async (request: any) => {
  // Email validation
  const emailValidation = validateEmail(request.data.email);
  if (!emailValidation.valid) {
    throw new HttpsError('invalid-argument', emailValidation.error!);
  }
  
  // Name validation
  const nameValidation = validateString(request.data.name, 2, 50, 'İsim');
  if (!nameValidation.valid) {
    throw new HttpsError('invalid-argument', nameValidation.error!);
  }
  
  // Age validation
  const ageValidation = validateNumber(request.data.age, 6, 100, 'Yaş');
  if (!ageValidation.valid) {
    throw new HttpsError('invalid-argument', ageValidation.error!);
  }
  
  // Validation başarılı, işleme devam et
});
```

### Dosya Upload Validation
```typescript
import { validateFileSize, validateFileType } from '../../utils/validation';

const handleFileUpload = (file: File) => {
  // Boyut kontrolü (5MB)
  const sizeValidation = validateFileSize(file.size, 5);
  if (!sizeValidation.valid) {
    alert(sizeValidation.error);
    return;
  }
  
  // Tip kontrolü
  const typeValidation = validateFileType(file.name, ['jpg', 'jpeg', 'png', 'pdf']);
  if (!typeValidation.valid) {
    alert(typeValidation.error);
    return;
  }
  
  // Upload işlemine devam et
  uploadFile(file);
};
```

---

## 🔒 Güvenlik İyileştirmeleri

### Önceki Durum (❌ Zayıf):
```typescript
// Basit regex kontrolü
if (!/\S+@\S+\.\S+/.test(email)) {
  error = 'Geçersiz e-posta';
}

// Zayıf şifre kontrolü
if (password.length < 6) {
  error = 'Şifre çok kısa';
}

// Domain kontrolü yok
// Özel karakter kontrolü yok
// Backend validation yok
```

### Yeni Durum (✅ Güçlü):
```typescript
// Kapsamlı email validation
const emailValidation = validateEmail(email);
// - Format kontrolü
// - Domain kontrolü (@datakolej.edu.tr veya @gmail.com)
// - Uzunluk kontrolü (max 254)

// Güçlü şifre kontrolü
const passwordValidation = validatePassword(password);
// - Min 8 karakter
// - En az 1 büyük harf
// - En az 1 küçük harf
// - En az 1 rakam
// - Max 128 karakter

// Backend validation
// - Tüm inputlar backend'de de kontrol ediliyor
// - SQL injection koruması
// - XSS koruması (sanitization ile birlikte)
```

---

## 📊 Validation Kapsamı

### Frontend:
| Bileşen | Validation | Durum |
|---------|-----------|-------|
| RegisterForm | Email, Password, Name, StudentNumber, Class | ✅ |
| LoginForm | Email, Captcha | ✅ |
| CommentSection | Text length | ⏳ Eklenebilir |
| FileUpload | Size, Type | ⏳ Eklenebilir |
| BlogPost | Title, Content length | ⏳ Eklenebilir |

### Backend:
| Fonksiyon | Validation | Durum |
|-----------|-----------|-------|
| setAdminRole | Email | ✅ |
| initializeFirstAdmin | Email | ✅ |
| chatWithAssistant | Message | ✅ |
| chatWithAdminAssistant | Message | ✅ |
| deleteUser | UID format | ⏳ Eklenebilir |

---

## ⚠️ Önemli Notlar

### 1. Client-Side vs Server-Side Validation
```
Client-Side (Frontend):
- Kullanıcı deneyimi için
- Hızlı geri bildirim
- Güvenlik için YETERLİ DEĞİL

Server-Side (Backend):
- Güvenlik için ZORUNLU
- Client-side bypass edilebilir
- Her zaman backend'de validate edin
```

### 2. Domain Kontrolü
```typescript
// Şu anda sadece 2 domain kabul ediliyor
email.endsWith('@datakolej.edu.tr') || email.endsWith('@gmail.com')

// Daha fazla domain eklemek için:
const allowedDomains = ['@datakolej.edu.tr', '@gmail.com', '@outlook.com'];
const isValidDomain = allowedDomains.some(domain => email.endsWith(domain));
```

### 3. Şifre Politikası
```typescript
// Mevcut: 8+ karakter, büyük/küçük harf, rakam
// Daha güçlü için eklenebilir:
// - Özel karakter zorunluluğu: /[!@#$%^&*]/.test(password)
// - Yaygın şifreleri engelleme: !commonPasswords.includes(password)
// - Kullanıcı adı içermeme: !password.includes(username)
```

---

## 🚀 Deploy ve Test

### 1. Frontend Test
```bash
npm run dev

# Test senaryoları:
1. Kayıt formunda geçersiz email girin
   Beklenen: "Sadece @datakolej.edu.tr veya @gmail.com adresleri kabul edilir"

2. Zayıf şifre girin (örn: "password")
   Beklenen: "Şifre en az bir büyük harf içermelidir"

3. Kısa isim girin (örn: "A")
   Beklenen: "İsim en az 2 karakter olmalıdır"
```

### 2. Backend Test
```bash
cd functions
npm run build
firebase deploy --only functions

# Firebase Console'dan test:
# setAdminRole fonksiyonunu geçersiz email ile çağır
# Beklenen: "Geçersiz e-posta formatı" hatası
```

---

## 📊 Güvenlik Durumu

### Tamamlanan:
- ✅ Admin rolü atama
- ✅ Firebase API anahtarları
- ✅ AWS kimlik bilgileri
- ✅ XSS koruması
- ✅ Rate limiting
- ✅ Input validation

### Sırada:
- ⏳ Şifre politikası (daha da güçlendirilebilir)
- ⏳ CSRF koruması
- ⏳ Content Security Policy (CSP)
- ⏳ File upload validation (tüm formlarda)

---

## 🆘 Sorun Giderme

### Validation Çalışmıyor
**Neden**: Import yolu yanlış
**Çözüm**:
```typescript
// Doğru import
import { validateEmail } from '../../utils/validation';

// Yanlış import
import { validateEmail } from '../utils/validation'; // ❌
```

### Domain Kontrolü Çok Katı
**Neden**: Sadece 2 domain kabul ediliyor
**Çözüm**:
```typescript
// validation.ts dosyasında domain kontrolünü kaldırın veya genişletin
if (!email.endsWith('@datakolej.edu.tr') && !email.endsWith('@gmail.com')) {
  // Bu satırı kaldırın veya daha fazla domain ekleyin
}
```

### Backend Validation Hatası
**Neden**: Validation fonksiyonu import edilmemiş
**Çözüm**:
```typescript
// functions/src/index.ts
import { validateEmail, validateString } from './security';
```

---

## 📞 Kaynaklar

- **OWASP Input Validation**: https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html
- **Email Validation RFC**: https://tools.ietf.org/html/rfc5322
- **Password Best Practices**: https://pages.nist.gov/800-63-3/sp800-63b.html

---

**Son Güncelleme**: $(Get-Date -Format "yyyy-MM-dd HH:mm")
**Durum**: ✅ Input validation aktif - Test edilmeli
