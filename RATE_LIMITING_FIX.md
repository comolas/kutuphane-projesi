# Rate Limiting Güvenlik Düzeltmesi

## ✅ Yapılan Değişiklikler

### 1. Kullanıcı Rate Limiting Güçlendirildi

| Limit Türü | Önceki | Yeni | Değişim |
|------------|--------|------|---------|
| Dakikalık | ❌ Yok | ✅ 3 mesaj | +Yeni |
| Saatlik | 20 mesaj | ✅ 10 mesaj | -50% |
| Günlük | 100 mesaj | ✅ 30 mesaj | -70% |

### 2. Admin Rate Limiting Eklendi

| Limit Türü | Limit | Açıklama |
|------------|-------|----------|
| Dakikalık | 10 mesaj | Chat için |
| Saatlik | 50 mesaj | Chat için |
| Günlük | 200 mesaj | Chat için |
| Kritik İşlem | 5/saat | Admin atama, kullanıcı silme |

### 3. Yeni Rate Limit Fonksiyonları

- ✅ `checkRateLimit()` - Normal kullanıcılar için (3 seviye: dakika, saat, gün)
- ✅ `checkAdminRateLimit()` - Admin chat için (daha yüksek limitler)
- ✅ `checkAdminActionRateLimit()` - Kritik admin işlemleri için

---

## 🛡️ Korunan Fonksiyonlar

### Kullanıcı Fonksiyonları:
- ✅ `chatWithAssistant` - 3/dakika, 10/saat, 30/gün

### Admin Fonksiyonları:
- ✅ `chatWithAdminAssistant` - 10/dakika, 50/saat, 200/gün
- ✅ `setAdminRole` - 5/saat (kritik işlem)

---

## 📊 Rate Limit Karşılaştırması

### Önceki Durum (❌ Zayıf):
```
Kullanıcı:
- Dakikalık limit: YOK ❌
- Saatlik limit: 20 mesaj
- Günlük limit: 100 mesaj
- Toplam maliyet riski: Yüksek 💰💰💰

Admin:
- Rate limiting: YOK ❌
- Kritik işlem koruması: YOK ❌
```

### Yeni Durum (✅ Güçlü):
```
Kullanıcı:
- Dakikalık limit: 3 mesaj ✅
- Saatlik limit: 10 mesaj ✅
- Günlük limit: 30 mesaj ✅
- Toplam maliyet riski: Düşük 💰

Admin:
- Dakikalık limit: 10 mesaj ✅
- Saatlik limit: 50 mesaj ✅
- Günlük limit: 200 mesaj ✅
- Kritik işlem: 5/saat ✅
```

---

## 💰 Maliyet Tasarrufu

### AWS Bedrock Maliyeti (Claude 3 Haiku):
- Input: $0.25 / 1M tokens
- Output: $1.25 / 1M tokens
- Ortalama mesaj: ~1000 token (input + output)

### Önceki Limitlerle (100 kullanıcı):
```
Günlük: 100 kullanıcı × 100 mesaj = 10,000 mesaj
Aylık: 10,000 × 30 = 300,000 mesaj
Token: 300,000 × 1000 = 300M token
Maliyet: ~$375/ay 💸
```

### Yeni Limitlerle (100 kullanıcı):
```
Günlük: 100 kullanıcı × 30 mesaj = 3,000 mesaj
Aylık: 3,000 × 30 = 90,000 mesaj
Token: 90,000 × 1000 = 90M token
Maliyet: ~$112/ay 💰
Tasarruf: $263/ay (%70) ✅
```

---

## 🔒 Güvenlik İyileştirmeleri

### 1. DDoS Koruması
```typescript
// Dakikalık limit - Hızlı saldırıları engeller
if (minuteMessages.length >= MINUTE_LIMIT) {
  throw new HttpsError("resource-exhausted", "Çok hızlı mesaj gönderiyorsunuz");
}
```

### 2. Brute Force Koruması
```typescript
// Kritik işlemler için özel limit
if (hourlyActions.length >= ACTION_LIMIT) {
  throw new HttpsError("resource-exhausted", "Bu işlemi çok sık yaptınız");
}
```

### 3. Maliyet Kontrolü
```typescript
// Günlük limit - Aşırı kullanımı engeller
if (dailyMessages.length >= DAILY_LIMIT) {
  throw new HttpsError("resource-exhausted", "Günlük limitiniz doldu");
}
```

---

## 🧪 Test Senaryoları

### Test 1: Dakikalık Limit
```bash
# 3 mesaj gönder (başarılı)
curl -X POST [function-url] -d '{"message":"test1"}'
curl -X POST [function-url] -d '{"message":"test2"}'
curl -X POST [function-url] -d '{"message":"test3"}'

# 4. mesaj (başarısız)
curl -X POST [function-url] -d '{"message":"test4"}'
# Beklenen: "Çok hızlı mesaj gönderiyorsunuz"
```

### Test 2: Saatlik Limit
```bash
# 10 mesaj gönder (1 dakika arayla)
for i in {1..10}; do
  curl -X POST [function-url] -d "{\"message\":\"test$i\"}"
  sleep 60
done

# 11. mesaj (başarısız)
curl -X POST [function-url] -d '{"message":"test11"}'
# Beklenen: "Saatlik limitiniz doldu"
```

### Test 3: Admin Kritik İşlem
```bash
# 5 admin atama (başarılı)
for i in {1..5}; do
  curl -X POST [setAdminRole-url] -d "{\"email\":\"user$i@test.com\"}"
done

# 6. atama (başarısız)
curl -X POST [setAdminRole-url] -d '{"email":"user6@test.com"}'
# Beklenen: "Bu işlemi çok sık yaptınız"
```

---

## 📋 Firestore Koleksiyonları

### rateLimits (Kullanıcı)
```json
{
  "userId": "user123",
  "minuteMessages": [Timestamp, Timestamp, Timestamp],
  "hourlyMessages": [Timestamp, ...],
  "dailyMessages": [Timestamp, ...],
  "lastUpdated": Timestamp
}
```

### adminRateLimits (Admin Chat)
```json
{
  "adminId": "admin123",
  "minuteMessages": [Timestamp, ...],
  "hourlyMessages": [Timestamp, ...],
  "dailyMessages": [Timestamp, ...],
  "lastUpdated": Timestamp
}
```

### adminActionLimits (Kritik İşlemler)
```json
{
  "adminId_action": "admin123_setAdminRole",
  "hourlyActions": [Timestamp, ...],
  "lastUpdated": Timestamp
}
```

---

## ⚙️ Limit Özelleştirme

### Limitleri Değiştirme
```typescript
// functions/src/index.ts

// Kullanıcı limitleri
const HOURLY_LIMIT = 10;  // İstediğiniz değer
const DAILY_LIMIT = 30;   // İstediğiniz değer
const MINUTE_LIMIT = 3;   // İstediğiniz değer

// Admin limitleri
const ADMIN_HOURLY_LIMIT = 50;
const ADMIN_DAILY_LIMIT = 200;
const ADMIN_MINUTE_LIMIT = 10;
```

### Önerilen Limitler

| Kullanıcı Tipi | Dakika | Saat | Gün | Kullanım Senaryosu |
|----------------|--------|------|-----|-------------------|
| Ücretsiz | 2 | 5 | 15 | Minimal kullanım |
| Standart | 3 | 10 | 30 | Normal kullanım (mevcut) |
| Premium | 5 | 20 | 100 | Yoğun kullanım |
| Admin | 10 | 50 | 200 | Yönetim işlemleri |

---

## 🚀 Deploy ve Test

### 1. Functions'ı Deploy Edin
```bash
cd functions
npm run build
firebase deploy --only functions
```

### 2. Rate Limit'i Test Edin
```bash
# Firebase Console > Functions > chatWithAssistant
# Hızlıca 4 mesaj gönderin
# 4. mesaj "resource-exhausted" hatası vermeli
```

### 3. Firestore'u Kontrol Edin
```bash
# Firebase Console > Firestore
# rateLimits koleksiyonunu kontrol edin
# Timestamp'lerin doğru kaydedildiğini doğrulayın
```

---

## 📊 İzleme ve Analiz

### Firebase Console'dan İzleme
1. Functions > Metrics
2. Invocations grafiğini kontrol edin
3. Error rate'i izleyin
4. "resource-exhausted" hatalarını takip edin

### Firestore Query
```javascript
// En çok mesaj gönderen kullanıcılar
db.collection('rateLimits')
  .orderBy('dailyMessages', 'desc')
  .limit(10)
  .get();

// Limit aşan kullanıcılar
db.collection('rateLimits')
  .where('dailyMessages.length', '>=', DAILY_LIMIT)
  .get();
```

---

## ⚠️ Önemli Notlar

### 1. Timestamp Temizleme
Eski timestamp'ler otomatik temizleniyor:
- Dakikalık: 1 dakikadan eski olanlar
- Saatlik: 1 saatten eski olanlar
- Günlük: 24 saatten eski olanlar

### 2. Firestore Maliyeti
Rate limiting için Firestore kullanımı:
- Her mesaj: 1 read + 1 write
- Aylık (100 kullanıcı × 30 mesaj): 6,000 işlem
- Maliyet: ~$0.04/ay (ihmal edilebilir)

### 3. Admin Bypass
Admin'ler için daha yüksek limitler var, ancak tamamen bypass edilmiyor.
Gerekirse admin'leri tamamen bypass etmek için:
```typescript
if (request.auth?.token.role === "admin") {
  // Rate limiting'i atla
  return { allowed: true, remaining: 999, resetTime: new Date() };
}
```

---

## 🆘 Sorun Giderme

### "resource-exhausted" Hatası
**Neden**: Kullanıcı limiti aştı
**Çözüm**:
```typescript
// Kullanıcıya kalan süreyi göster
const resetTime = error.details.resetTime;
console.log(`Lütfen ${resetTime} sonra tekrar deneyin`);
```

### Rate Limit Sıfırlama
**Manuel sıfırlama** (acil durumlarda):
```javascript
// Firebase Console > Firestore
// rateLimits/[userId] dokümanını silin
```

### Limit Artırma
**Belirli bir kullanıcı için**:
```typescript
// Özel limit koleksiyonu oluşturun
db.collection('customLimits').doc(userId).set({
  hourlyLimit: 50,
  dailyLimit: 200
});

// checkRateLimit fonksiyonunda kontrol edin
const customLimit = await db.collection('customLimits').doc(userId).get();
const limit = customLimit.exists ? customLimit.data().hourlyLimit : HOURLY_LIMIT;
```

---

## 📊 Güvenlik Durumu

### Tamamlanan:
- ✅ Admin rolü atama
- ✅ Firebase API anahtarları
- ✅ AWS kimlik bilgileri
- ✅ XSS koruması
- ✅ Rate limiting

### Sırada:
- ⏳ Şifre politikası
- ⏳ Input validation
- ⏳ CSRF koruması

---

**Son Güncelleme**: $(Get-Date -Format "yyyy-MM-dd HH:mm")
**Durum**: ✅ Rate limiting güçlendirildi - Deploy edilmeli
**Maliyet Tasarrufu**: %70 ($263/ay)
