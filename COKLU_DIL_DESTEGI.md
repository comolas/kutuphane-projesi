# 🌍 Çoklu Dil Desteği Dokümantasyonu

## Kurulum Tamamlandı ✅

Kütüphane projesine başarıyla çoklu dil desteği eklendi!

## Desteklenen Diller

- 🇹🇷 **Türkçe** (tr) - Varsayılan
- 🇬🇧 **İngilizce** (en)
- 🇸🇦 **Arapça** (ar) - RTL desteği ile
- 🇷🇺 **Rusça** (ru)
- 🇩🇪 **Almanca** (de)

## Kullanım

### 1. Login Sayfasında Dil Seçimi

Kullanıcılar login sayfasında butonlar ile dil seçebilir. Seçilen dil:
- `localStorage`'da saklanır
- Sayfa yenilense bile hatırlanır
- Arapça seçildiğinde otomatik RTL (sağdan sola) moda geçer

### 2. Component'lerde Çeviri Kullanımı

```tsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('login.title')}</h1>
      <button>{t('common.save')}</button>
    </div>
  );
}
```

### 3. Dil Değiştirme

```tsx
import { useTranslation } from 'react-i18next';

function LanguageSwitcher() {
  const { i18n } = useTranslation();
  
  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('language', lng);
  };
  
  return (
    <button onClick={() => changeLanguage('en')}>
      English
    </button>
  );
}
```

## Dosya Yapısı

```
src/
├── i18n.ts                          # i18n yapılandırması
├── locales/                         # Dil dosyaları
│   ├── tr.json                      # Türkçe çeviriler
│   ├── en.json                      # İngilizce çeviriler
│   ├── ar.json                      # Arapça çeviriler
│   ├── ru.json                      # Rusça çeviriler
│   └── de.json                      # Almanca çeviriler
└── components/
    └── common/
        └── LanguageSelector.tsx     # Dil seçici component
```

## Yeni Çeviri Ekleme

### 1. Dil Dosyalarına Ekleyin

Her dil dosyasına (`tr.json`, `en.json`, vb.) yeni anahtarları ekleyin:

```json
{
  "myNewSection": {
    "title": "Başlık",
    "description": "Açıklama"
  }
}
```

### 2. Component'te Kullanın

```tsx
const { t } = useTranslation();
<h1>{t('myNewSection.title')}</h1>
```

## Mevcut Çeviriler

### Login Modülü
- `login.title` - Başlık
- `login.subtitle` - Alt başlık
- `login.email` - E-posta
- `login.password` - Şifre
- `login.loginButton` - Giriş butonu
- `login.googleLogin` - Google ile giriş
- `login.forgotPassword` - Şifremi unuttum
- `login.noAccount` - Hesabınız yok mu?
- `login.register` - Kayıt ol
- `login.selectLanguage` - Dil seçin

### Ortak Modül
- `common.loading` - Yükleniyor
- `common.save` - Kaydet
- `common.cancel` - İptal
- `common.delete` - Sil
- `common.edit` - Düzenle
- `common.search` - Ara
- `common.filter` - Filtrele
- `common.close` - Kapat
- `common.yes` - Evet
- `common.no` - Hayır
- `common.success` - Başarılı
- `common.error` - Hata
- `common.warning` - Uyarı
- `common.info` - Bilgi

### Dashboard Modülü
- `dashboard.welcome` - Hoş geldiniz
- `dashboard.myBooks` - Kitaplarım
- `dashboard.catalog` - Katalog
- `dashboard.borrowed` - Ödünç alınan
- `dashboard.favorites` - Favoriler
- `dashboard.profile` - Profil
- `dashboard.settings` - Ayarlar
- `dashboard.logout` - Çıkış yap

### Kitaplar Modülü
- `books.title` - Kitaplar
- `books.addBook` - Kitap ekle
- `books.editBook` - Kitap düzenle
- `books.deleteBook` - Kitap sil
- `books.bookTitle` - Kitap adı
- `books.author` - Yazar
- `books.publisher` - Yayınevi
- `books.category` - Kategori
- `books.isbn` - ISBN
- `books.status` - Durum
- `books.available` - Mevcut
- `books.borrowed` - Ödünç verildi
- `books.lost` - Kayıp
- `books.location` - Konum
- `books.addedDate` - Eklenme tarihi

### Kullanıcılar Modülü
- `users.title` - Kullanıcılar
- `users.addUser` - Kullanıcı ekle
- `users.editUser` - Kullanıcı düzenle
- `users.deleteUser` - Kullanıcı sil
- `users.name` - Ad soyad
- `users.email` - E-posta
- `users.role` - Rol
- `users.student` - Öğrenci
- `users.teacher` - Öğretmen
- `users.admin` - Yönetici
- `users.class` - Sınıf
- `users.status` - Durum
- `users.active` - Aktif
- `users.inactive` - Pasif

## Sonraki Adımlar

### 1. Tüm Sayfaları Çeviriye Hazırlayın

Şu anda sadece login sayfası çevrildi. Diğer sayfalar için:

1. İlgili component'i açın
2. `useTranslation` hook'unu import edin
3. Sabit metinleri `t('key')` ile değiştirin
4. Tüm dil dosyalarına çevirileri ekleyin

### 2. Header'a Dil Seçici Ekleyin

```tsx
import LanguageSelector from '../components/common/LanguageSelector';

// Header component'inde
<LanguageSelector variant="dropdown" />
```

### 3. Dinamik İçerikler

Veritabanından gelen içerikler için:
- Çoklu dil alanları ekleyin (title_tr, title_en, vb.)
- Veya ayrı bir translations tablosu oluşturun

### 4. Tarih ve Sayı Formatları

```tsx
import { useTranslation } from 'react-i18next';

const { i18n } = useTranslation();

// Tarih formatı
const formattedDate = new Date().toLocaleDateString(i18n.language);

// Sayı formatı
const formattedNumber = (12345.67).toLocaleString(i18n.language);
```

## RTL (Right-to-Left) Desteği

Arapça seçildiğinde otomatik olarak:
- `document.documentElement.dir = 'rtl'` ayarlanır
- Tailwind CSS otomatik RTL desteği sağlar
- Layout sağdan sola döner

## Test Etme

1. Uygulamayı başlatın: `npm run dev`
2. Login sayfasına gidin
3. Dil butonlarına tıklayın
4. Metinlerin değiştiğini gözlemleyin
5. Arapça seçip RTL modunu test edin
6. Sayfayı yenileyin - dil seçimi hatırlanmalı

## Performans

- Tüm çeviriler build sırasında bundle'a dahil edilir
- Lazy loading kullanılmadı (küçük dosyalar için gerekli değil)
- localStorage kullanımı minimal overhead

## Katkıda Bulunma

Yeni dil eklemek için:

1. `src/locales/` altında yeni JSON dosyası oluşturun (örn: `fr.json`)
2. `src/i18n.ts` dosyasına import edin
3. `LanguageSelector.tsx` içindeki `languages` dizisine ekleyin
4. Tüm çevirileri tamamlayın

## Sorun Giderme

### Çeviriler Görünmüyor
- `main.tsx` içinde `import './i18n'` olduğundan emin olun
- Browser console'da hata var mı kontrol edin
- localStorage'da `language` key'ini kontrol edin

### RTL Çalışmıyor
- Arapça seçildiğinde `document.documentElement.dir` kontrol edin
- Tailwind CSS'in RTL desteği aktif mi kontrol edin

### Dil Değişmiyor
- `i18n.changeLanguage()` çağrıldığından emin olun
- localStorage'a kaydedildiğinden emin olun
- Component'in re-render olduğunu kontrol edin

## Kaynaklar

- [react-i18next Dokümantasyonu](https://react.i18next.com/)
- [i18next Dokümantasyonu](https://www.i18next.com/)
- [Tailwind CSS RTL](https://tailwindcss.com/docs/hover-focus-and-other-states#rtl-support)

---

**Hazırlayan**: Amazon Q Developer  
**Tarih**: 2024  
**Versiyon**: 1.0
