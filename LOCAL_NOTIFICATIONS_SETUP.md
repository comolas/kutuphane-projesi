# 📱 Local Notifications Kurulum Rehberi (Kolay Yöntem!)

## ✅ Avantajlar

- ✅ Firebase Cloud Functions'a gerek yok
- ✅ Sunucu maliyeti yok
- ✅ Daha kolay kurulum
- ✅ Uygulama içinde her şey çalışır
- ✅ Offline çalışır

## 🎯 Bildirim Senaryoları

1. **Kitap İade Tarihi** - 3 gün, 1 gün ve iade günü
2. **Yeni Kitaplar** - Gerçek zamanlı
3. **Yeni Duyuru** - Gerçek zamanlı
4. **Yeni Anket** - Gerçek zamanlı
5. **Yeni Etkinlik** - Gerçek zamanlı

## 🔧 Kurulum Adımları

### 1. Paketler Yüklendi ✅
```bash
npm install @capacitor/local-notifications
```

### 2. Context ve Hook Oluşturuldu ✅
- `LocalNotificationContext.tsx` - Bildirim yönetimi
- `useContentNotifications.ts` - Yeni içerik dinleyicisi

### 3. App.tsx'e Eklendi ✅
- Context provider eklendi
- Hook entegre edildi

### 4. Capacitor Config Güncellendi ✅
```typescript
LocalNotifications: {
  smallIcon: 'ic_notification',
  iconColor: '#4F46E5',
  sound: 'default',
}
```

## 📱 Android Ayarları

### AndroidManifest.xml
`android/app/src/main/AndroidManifest.xml` dosyasına ekleyin:

```xml
<manifest>
  <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
  <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
</manifest>
```

### Bildirim İkonu
`android/app/src/main/res/drawable/` klasörüne `ic_notification.png` ekleyin:
- drawable-mdpi: 24x24
- drawable-hdpi: 36x36
- drawable-xhdpi: 48x48
- drawable-xxhdpi: 72x72
- drawable-xxxhdpi: 96x96

Veya basit bir XML ikonu:
`android/app/src/main/res/drawable/ic_notification.xml`:
```xml
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="#FFFFFF"
        android:pathData="M12,2C6.48,2 2,6.48 2,12s4.48,10 10,10 10,-4.48 10,-10S17.52,2 12,2zM13,17h-2v-6h2v6zM13,9h-2L11,7h2v2z"/>
</vector>
```

## 🎯 Nasıl Çalışır?

### 1. Kitap İade Bildirimleri
```typescript
// Kullanıcı uygulamayı açtığında:
- Ödünç alınan kitaplar kontrol edilir
- 3 gün, 1 gün ve iade günü için bildirimler planlanır
- Her gün saat 09:00'da bildirim gönderilir
```

### 2. Yeni İçerik Bildirimleri
```typescript
// Firestore dinleyicileri:
- Yeni kitap eklendiğinde → Anında bildirim
- Yeni duyuru eklendiğinde → Anında bildirim
- Yeni etkinlik eklendiğinde → Anında bildirim
- Yeni anket eklendiğinde → Anında bildirim
```

### 3. Günlük Kontrol Bildirimleri
```typescript
// Her gün otomatik:
- 18:00 → "Yeni kitaplar var mı kontrol et"
- 10:00 → "Yeni duyuru/etkinlik var mı kontrol et"
```

## 🧪 Test Etme

### 1. Build ve Sync
```bash
npm run build
npx cap sync android
npx cap open android
```

### 2. Android Studio'da Test
- Uygulamayı çalıştırın
- Giriş yapın
- Bildirim izni verin
- Arka plana alın
- Bildirimleri bekleyin

### 3. Manuel Test
```typescript
// Test bildirimi gönder
import { LocalNotifications } from '@capacitor/local-notifications';

LocalNotifications.schedule({
  notifications: [{
    id: 1,
    title: 'Test Bildirimi',
    body: 'Bu bir test bildirimidir',
    schedule: { at: new Date(Date.now() + 5000) }, // 5 saniye sonra
  }]
});
```

## 📊 Bildirim Tipleri

### Zamanlanmış Bildirimler
```typescript
schedule: { at: new Date('2024-12-25 09:00:00') }
```

### Tekrarlayan Bildirimler
```typescript
schedule: { 
  at: new Date('2024-12-25 09:00:00'),
  every: 'day' // 'hour', 'day', 'week', 'month', 'year'
}
```

### Anında Bildirimler
```typescript
schedule: { at: new Date(Date.now() + 1000) } // 1 saniye sonra
```

## 🔔 Bildirim Özellikleri

```typescript
{
  id: 1,                          // Benzersiz ID
  title: 'Başlık',                // Bildirim başlığı
  body: 'İçerik',                 // Bildirim içeriği
  schedule: { at: new Date() },   // Zamanlama
  sound: 'default',               // Ses
  smallIcon: 'ic_notification',   // İkon
  largeIcon: 'ic_launcher',       // Büyük ikon
  iconColor: '#4F46E5',           // İkon rengi
  attachments: [],                // Resim/video
  actionTypeId: 'OPEN_APP',       // Aksiyon tipi
  extra: { data: 'value' },       // Ekstra veri
}
```

## 🎨 Bildirim Kanalları (Android 8+)

```typescript
import { LocalNotifications } from '@capacitor/local-notifications';

await LocalNotifications.createChannel({
  id: 'due_dates',
  name: 'İade Tarihi Hatırlatmaları',
  description: 'Kitap iade tarihi yaklaştığında bildirim',
  importance: 5,
  visibility: 1,
  sound: 'default',
  vibration: true,
});
```

## 🔍 Debug

### Planlanan Bildirimleri Görüntüle
```typescript
const pending = await LocalNotifications.getPending();
console.log('Planlanan bildirimler:', pending);
```

### Bildirimleri İptal Et
```typescript
// Tümünü iptal et
await LocalNotifications.cancel({ notifications: await LocalNotifications.getPending() });

// Belirli ID'yi iptal et
await LocalNotifications.cancel({ notifications: [{ id: 1 }] });
```

## ⚡ Performans İpuçları

1. **Bildirim Sayısını Sınırlayın**
   - Maksimum 50-100 bildirim planlanmalı
   - Eski bildirimleri temizleyin

2. **Batarya Optimizasyonu**
   - Gereksiz bildirimleri iptal edin
   - Tekrarlayan bildirimleri akıllıca kullanın

3. **Kullanıcı Deneyimi**
   - Çok fazla bildirim göndermeyin
   - Önemli bildirimlere öncelik verin
   - Kullanıcıya bildirim ayarları sunun

## 🎯 Kullanıcı Ayarları (Opsiyonel)

```typescript
// Kullanıcı bildirim tercihlerini kaydet
interface NotificationSettings {
  dueDateReminders: boolean;
  newBooks: boolean;
  announcements: boolean;
  events: boolean;
  surveys: boolean;
}

// Firestore'da sakla
await setDoc(doc(db, 'users', userId), {
  notificationSettings: {
    dueDateReminders: true,
    newBooks: true,
    announcements: true,
    events: true,
    surveys: false,
  }
}, { merge: true });
```

## ✅ Checklist

- [x] @capacitor/local-notifications yüklendi
- [x] LocalNotificationContext oluşturuldu
- [x] useContentNotifications hook'u oluşturuldu
- [x] App.tsx'e entegre edildi
- [x] Capacitor config güncellendi
- [ ] AndroidManifest.xml güncellendi
- [ ] Bildirim ikonu eklendi
- [ ] Build ve test edildi

## 🚀 Production'a Alma

1. Tüm bildirimleri test edin
2. Kullanıcı geri bildirimlerini toplayın
3. Bildirim sıklığını optimize edin
4. Analytics ekleyin (kaç bildirim açıldı?)
5. A/B test yapın (hangi mesajlar daha etkili?)

## 🎉 Tamamlandı!

Artık kullanıcılarınıza local notification gönderebilirsiniz!
Firebase Cloud Functions'a gerek yok, her şey uygulama içinde çalışıyor! 🚀
