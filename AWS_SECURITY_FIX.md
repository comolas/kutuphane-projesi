# AWS Kimlik Bilgileri Güvenlik Düzeltmesi

## 🚨 KRİTİK DURUM

**AWS Access Key ve Secret Key Git'te açıkta kaldı!**

Mevcut anahtarlar:
- Access Key ID: `[GİZLENDİ]`
- Secret Access Key: `[GİZLENDİ]`

**Bu anahtarlar DERHAL yenilenmeli ve silinmelidir!**

---

## ✅ Yapılan Değişiklikler

### 1. Firebase Secret Manager Entegrasyonu
- ✅ `defineString` yerine `defineSecret` kullanılıyor
- ✅ AWS anahtarları artık güvenli Secret Manager'da saklanacak
- ✅ Fonksiyonlara `secrets` parametresi eklendi

### 2. .env Dosyası Güvenliği
- ✅ `functions/.env.example` şablonu oluşturuldu
- ✅ `functions/.gitignore` zaten .env dosyalarını ignore ediyor
- ✅ `remove-aws-keys-from-git.bat` scripti hazır

---

## 🚀 DERHAL Yapılması Gerekenler

### Adım 1: AWS Anahtarlarını YENİLEYİN (KRİTİK!)

#### 1.1. AWS Console'a Giriş Yapın
https://console.aws.amazon.com/iam/home#/security_credentials

#### 1.2. Yeni Access Key Oluşturun
1. "Access keys" bölümüne gidin
2. "Create access key" tıklayın
3. Use case: "Application running outside AWS" seçin
4. Yeni anahtarları kaydedin (bir daha göremezsiniz!)

#### 1.3. ESKİ Anahtarı SİLİN
1. Eski anahtarı bulun: `[GİZLENDİ]`
2. "Actions" > "Delete" tıklayın
3. Onaylayın

### Adım 2: Firebase Secret Manager'a Ekleyin

#### 2.1. Firebase CLI ile Secret Oluşturun
```bash
# AWS Access Key ID
firebase functions:secrets:set AWS_ACCESS_KEY_ID
# Prompt geldiğinde yeni access key'i yapıştırın

# AWS Secret Access Key
firebase functions:secrets:set AWS_SECRET_ACCESS_KEY
# Prompt geldiğinde yeni secret key'i yapıştırın
```

#### 2.2. Secret'ları Doğrulayın
```bash
# Mevcut secret'ları listele
firebase functions:secrets:access AWS_ACCESS_KEY_ID
firebase functions:secrets:access AWS_SECRET_ACCESS_KEY
```

### Adım 3: Git Geçmişinden Kaldırın
```bash
# Windows:
remove-aws-keys-from-git.bat

# Sonra force push:
git push origin --force --all
git push origin --force --tags
```

### Adım 4: Functions'ı Deploy Edin
```bash
cd functions
npm run build
firebase deploy --only functions
```

---

## 🔒 Güvenlik Karşılaştırması

### Önceki Durum (❌ ÇOOK GÜVENSİZ):
```typescript
// .env dosyasında düz metin
AWS_ACCESS_KEY_ID=[GİZLENDİ]
AWS_SECRET_ACCESS_KEY=[GİZLENDİ]

// defineString ile okunuyor (güvensiz)
const awsAccessKeyId = defineString("AWS_ACCESS_KEY_ID");
```

### Yeni Durum (✅ GÜVENLİ):
```typescript
// Firebase Secret Manager'da şifreli
// defineSecret ile okunuyor (güvenli)
const awsAccessKeyId = defineSecret("AWS_ACCESS_KEY_ID");

// Fonksiyonlara secrets parametresi eklendi
export const chatWithAssistant = onCall(
  { secrets: [awsAccessKeyId, awsSecretAccessKey] },
  async (request: any) => { ... }
);
```

---

## 📋 Firebase Secret Manager Komutları

### Secret Oluşturma
```bash
firebase functions:secrets:set SECRET_NAME
```

### Secret Okuma
```bash
firebase functions:secrets:access SECRET_NAME
```

### Secret Listeleme
```bash
firebase functions:secrets:list
```

### Secret Silme
```bash
firebase functions:secrets:destroy SECRET_NAME
```

### Secret Güncelleme
```bash
firebase functions:secrets:set SECRET_NAME --force
```

---

## 🧪 Test Etme

### 1. Secret'ların Doğru Çalıştığını Test Edin
```bash
# Functions shell'i başlat
firebase functions:shell

# Chat fonksiyonunu test et
chatWithAssistant({data: {message: "test"}})
```

### 2. Production'da Test Edin
```bash
# Deploy sonrası Firebase Console'dan test edin
# Functions > chatWithAssistant > Test
```

---

## ⚠️ Önemli Notlar

### AWS Bedrock Maliyetleri
- Claude 3 Haiku: ~$0.25 / 1M input tokens
- Claude 3.5 Sonnet: ~$3 / 1M input tokens
- Aylık limit belirleyin: AWS Console > Billing > Budgets

### Secret Manager Maliyetleri
- İlk 6 secret: Ücretsiz
- Sonraki her secret: $0.40/ay
- Secret erişimi: $0.03 / 10,000 erişim

### Güvenlik En İyi Uygulamaları
1. ✅ Secret'ları asla kod içinde saklamayın
2. ✅ Secret'ları asla Git'e commit etmeyin
3. ✅ Secret'ları düzenli olarak yenileyin (3-6 ayda bir)
4. ✅ Kullanılmayan secret'ları silin
5. ✅ AWS IAM policy'lerini minimum yetki ile ayarlayın

---

## 🔐 AWS IAM Policy Önerisi

Bedrock için minimum yetki policy'si:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel"
      ],
      "Resource": [
        "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-haiku-20240307-v1:0",
        "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-5-sonnet-20240620-v1:0"
      ]
    }
  ]
}
```

AWS Console'da uygulama:
1. IAM > Users > [Your User]
2. Permissions > Add inline policy
3. JSON sekmesi > Yukarıdaki policy'yi yapıştır
4. Review policy > Create policy

---

## 🆘 Sorun Giderme

### "Secret not found" Hatası
**Neden**: Secret henüz oluşturulmamış
**Çözüm**:
```bash
firebase functions:secrets:set AWS_ACCESS_KEY_ID
firebase functions:secrets:set AWS_SECRET_ACCESS_KEY
```

### "Permission denied" Hatası
**Neden**: Functions'ın secret'a erişim yetkisi yok
**Çözüm**:
```bash
# Functions'ı yeniden deploy edin
firebase deploy --only functions
```

### "Invalid credentials" Hatası
**Neden**: AWS anahtarları yanlış veya silinmiş
**Çözüm**:
1. AWS Console'dan yeni anahtar oluşturun
2. Secret'ları güncelleyin:
```bash
firebase functions:secrets:set AWS_ACCESS_KEY_ID --force
firebase functions:secrets:set AWS_SECRET_ACCESS_KEY --force
```

### Bedrock API Hatası
**Neden**: Bedrock region'u yanlış veya model erişimi yok
**Çözüm**:
1. AWS Console > Bedrock > Model access
2. Claude modellerine erişim isteyin (onay 1-2 dakika)
3. Region'u kontrol edin: `us-east-1`

---

## 📊 Güvenlik Durumu

### Tamamlanan:
- ✅ Admin rolü atama
- ✅ Firebase API anahtarları
- ✅ AWS kimlik bilgileri

### Sırada:
- ⏳ XSS koruması
- ⏳ Rate limiting güçlendirme
- ⏳ Şifre politikası
- ⏳ Input validation

---

## 📞 Kaynaklar

- **Firebase Secret Manager**: https://firebase.google.com/docs/functions/config-env#secret-manager
- **AWS IAM Best Practices**: https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html
- **AWS Bedrock Pricing**: https://aws.amazon.com/bedrock/pricing/
- **Git Filter-Branch**: https://git-scm.com/docs/git-filter-branch

---

**Son Güncelleme**: $(Get-Date -Format "yyyy-MM-dd HH:mm")
**Durum**: ⚠️ KRİTİK - AWS anahtarları DERHAL yenilenmeli!
