# 📧 E-posta Şablonu Kurulum Rehberi

## Firebase Console'dan E-posta Şablonunu Güncelleme

### Adım 1: Firebase Console'a Giriş
1. [Firebase Console](https://console.firebase.google.com/) adresine gidin
2. Projenizi seçin

### Adım 2: Authentication Ayarları
1. Sol menüden **Authentication** seçin
2. Üst menüden **Templates** sekmesine tıklayın

### Adım 3: Şifre Sıfırlama Şablonunu Düzenle
1. **Password reset** (Şifre sıfırlama) şablonunu seçin
2. Sağ üstteki **Edit** (Düzenle) butonuna tıklayın

### Adım 4: Şablonu Özelleştir

#### Basit Metin Versiyonu (Hızlı):
```
Konu: Şifre Sıfırlama - Kütüphane Yönetim Sistemi

Merhaba,

%EMAIL% hesabınız için şifre sıfırlama talebinde bulundunuz.

Şifrenizi sıfırlamak için aşağıdaki linke tıklayın:
%LINK%

⚠️ Bu link 1 saat içinde geçerliliğini yitirecektir.

Eğer şifre sıfırlama talebinde bulunmadıysanız, bu e-postayı görmezden gelebilirsiniz.

Teşekkürler,
Kütüphane Yönetim Sistemi Ekibi
```

#### HTML Versiyonu (Profesyonel):
1. `email-templates/password-reset.html` dosyasını açın
2. Tüm içeriği kopyalayın
3. Firebase Console'da **Customize template** bölümüne yapıştırın

### Adım 5: Değişkenleri Kontrol Edin

Firebase otomatik olarak şu değişkenleri değiştirir:
- `%EMAIL%` → Kullanıcının e-posta adresi
- `%LINK%` → Şifre sıfırlama linki
- `%APP_NAME%` → Uygulama adı (Firebase ayarlarından)

### Adım 6: Test Edin
1. **Send test email** butonuna tıklayın
2. Test e-postanızı girin
3. E-postayı kontrol edin

### Adım 7: Kaydet
1. **Save** butonuna tıklayın
2. Değişiklikler hemen aktif olur

## Diğer E-posta Şablonları

Aynı şekilde şu şablonları da özelleştirebilirsiniz:

### Email Address Verification (E-posta Doğrulama)
- Yeni kullanıcı kaydında gönderilir
- E-posta adresini doğrulamak için kullanılır

### Email Change (E-posta Değişikliği)
- Kullanıcı e-posta adresini değiştirdiğinde gönderilir
- Yeni e-posta adresini doğrulamak için kullanılır

## İpuçları

1. **Mobil Uyumlu**: HTML şablonu tüm e-posta istemcilerinde çalışır
2. **Marka Uyumu**: Renkleri projenizin temasına göre değiştirin
3. **Dil**: Türkçe içerik kullanıcı deneyimini artırır
4. **Test**: Her değişiklikten sonra test e-postası gönderin

## Özelleştirme

### Renkleri Değiştirme
HTML şablonunda şu renkleri bulup değiştirin:
- `#667eea` → Ana renk (indigo)
- `#764ba2` → İkincil renk (mor)
- `#10b981` → Başarı rengi (yeşil)
- `#f59e0b` → Uyarı rengi (turuncu)

### Logo Ekleme
Header bölümüne logo eklemek için:
```html
<img src="https://your-domain.com/logo.png" alt="Logo" style="width: 120px; margin-bottom: 20px;">
```

## Sorun Giderme

**E-posta gönderilmiyor:**
- Firebase Authentication'ın etkin olduğundan emin olun
- SMTP ayarlarını kontrol edin (Firebase otomatik yönetir)

**Şablon görünmüyor:**
- Tarayıcı önbelleğini temizleyin
- Farklı e-posta istemcisinde test edin

**Değişkenler çalışmıyor:**
- `%EMAIL%` ve `%LINK%` tam olarak bu şekilde yazılmalı
- Büyük/küçük harf duyarlı

## Destek

Sorun yaşarsanız:
1. [Firebase Documentation](https://firebase.google.com/docs/auth/custom-email-handler)
2. Firebase Console > Support
