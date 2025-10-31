# 🔔 Bildirim Sistemi Dokümantasyonu

## ✅ Tamamlanan Özellikler

### 1. Frontend Bileşenleri
- ✅ **NotificationContext** - Merkezi bildirim yönetimi
- ✅ **NotificationBell** - Navbar'da bildirim ikonu (badge ile)
- ✅ **NotificationDropdown** - Son 5 bildirimi gösteren dropdown
- ✅ **NotificationCenter** - Tüm bildirimleri gösteren sayfa
- ✅ Header ve AdminHeader'a entegrasyon

### 2. Backend (Firebase Functions)
- ✅ **createNotification** - Yardımcı fonksiyon
- ✅ **notifyBookDueSoon** - İade tarihi yaklaşan kitaplar (günlük 09:00)
- ✅ **notifyOverdueBooks** - Gecikmiş iadeler (günlük 10:00)
- ✅ **notifyLevelUp** - Seviye atlama bildirimi (Firestore trigger)
- ✅ **notifyNewBook** - Yeni kitap eklendi (Firestore trigger)

### 3. Firestore
- ✅ **notifications** koleksiyonu
- ✅ Güvenlik kuralları (sadece kendi bildirimlerini görebilir)

## 📊 Bildirim Tipleri

| Tip | İkon | Renk | Kullanım |
|-----|------|------|----------|
| `book` | 📚 | Mavi | Kitap işlemleri |
| `penalty` | ⚠️ | Kırmızı | Cezalar ve uyarılar |
| `achievement` | 🎉 | Yeşil | Başarılar ve seviye |
| `social` | 💬 | Pembe | Sosyal etkileşimler |
| `admin` | 🔧 | Mor | Sistem bildirimleri |
| `system` | 🔔 | Gri | Genel sistem |

## 🎯 Kullanım

### Frontend'de Bildirim Oluşturma
```typescript
import { useNotifications } from '../contexts/NotificationContext';

const { notifications, unreadCount, markAsRead, deleteNotification } = useNotifications();
```

### Backend'de Bildirim Oluşturma
```typescript
await createNotification(
  userId,
  'book',
  '📚 Kitap İadesi Yaklaşıyor',
  'Kitabınızın iade tarihi 3 gün sonra.',
  '📚',
  '/borrowed-books',
  { bookId: 'abc123' }
);
```

## 🚀 Deployment

### 1. Firestore Rules Deploy
```bash
firebase deploy --only firestore:rules
```

### 2. Functions Deploy
```bash
cd functions
npm install
npm run build
firebase deploy --only functions
```

### 3. Frontend Build
```bash
npm install
npm run build
```

## 📱 Özellikler

### Kullanıcı Özellikleri
- ✅ Real-time bildirimler (Firestore onSnapshot)
- ✅ Okunmamış sayısı badge
- ✅ Bildirim dropdown (son 5)
- ✅ Bildirim merkezi (tüm bildirimler)
- ✅ Filtreleme (tümü, okunmamış, tip bazlı)
- ✅ Tarih gruplandırması (bugün, dün, bu hafta, daha eski)
- ✅ Okundu işaretleme (tek/toplu)
- ✅ Silme (tek/toplu)
- ✅ Tıklanabilir bildirimler (actionUrl)
- ✅ Mobil uyumlu (responsive + local notifications)

### Admin Özellikleri
- ✅ Tüm kullanıcılara bildirim gönderme (yeni kitap)
- ✅ Kampüs bazlı bildirimler
- ✅ Otomatik bildirimler (cron jobs)
- ✅ Manuel toplu bildirim gönderme (tüm kampüs/sınıf/kullanıcı)
- ✅ Arama özelliği (sınıf ve kullanıcı)
- ✅ SweetAlert2 entegrasyonu

## 🔮 Gelecek Geliştirmeler

### Faz 2 (Öncelikli)
- [ ] Bildirim ayarları (kullanıcı tercihleri)
- [ ] E-posta bildirimleri
- [ ] Meydan okuma davetleri bildirimi
- [ ] Yorum/beğeni bildirimleri
- [ ] Admin onay bekleyen işlemler bildirimi

### Faz 3 (İleri Seviye)
- [ ] Web Push Notifications (FCM)
- [ ] Bildirim sesleri
- [ ] Bildirim önizleme
- [ ] Bildirim istatistikleri
- [ ] Toplu bildirim gönderme (admin panel)

## 📱 Mobil Entegrasyon

### Android/iOS
- Firestore bildirimlerini dinler
- Yeni bildirim geldiğinde local notification gösterir
- Capacitor Local Notifications kullanır
- Ses ve titreşim desteği

### Web/Masaüstü
- Sadece uygulama içi bildirimler
- Real-time güncelleme
- Responsive tasarım

## 🐛 Bilinen Sorunlar
- Yok (şu an için)

## 📝 Notlar
- Bildirimler Firestore'da saklanır (maliyet optimizasyonu için 30 gün sonra silinebilir)
- Cron job'lar Firebase Functions ile çalışır (Blaze planı gerektirir)
- Real-time güncellemeler için Firestore onSnapshot kullanılır
- Performans için son 50 bildirim dinlenir, eski olanlar sayfalama ile

## 🔗 İlgili Dosyalar
- `src/contexts/NotificationContext.tsx`
- `src/components/common/NotificationBell.tsx`
- `src/components/common/NotificationDropdown.tsx`
- `src/pages/NotificationCenter.tsx`
- `functions/src/index.ts` (bildirim fonksiyonları)
- `firestore.rules` (notifications kuralları)
