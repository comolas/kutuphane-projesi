# Error Boundary ve Loading States İyileştirmeleri

Bu dokümantasyon, uygulamaya eklenen Error Boundary ve geliştirilmiş Loading States özelliklerini açıklar.

## 🛡️ Error Boundary

### Nedir?
Error Boundary, React uygulamasında oluşan JavaScript hatalarını yakalayan ve kullanıcıya dostça bir hata sayfası gösteren bir component'tir.

### Özellikler
- ✅ Tüm uygulama hatalarını yakalar
- ✅ Kullanıcı dostu hata mesajı gösterir
- ✅ Geliştirici modunda detaylı hata bilgisi
- ✅ "Tekrar Dene" ve "Ana Sayfa" butonları
- ✅ Otomatik hata loglama

### Kullanım
```tsx
import ErrorBoundary from './components/common/ErrorBoundary';

<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>
```

### Özel Fallback UI
```tsx
<ErrorBoundary fallback={<CustomErrorPage />}>
  <YourComponent />
</ErrorBoundary>
```

## ⏳ Loading States

### 1. LoadingSpinner Component

#### Özellikler
- 4 farklı boyut: `sm`, `md`, `lg`, `xl`
- 4 farklı varyant: `spinner`, `dots`, `pulse`, `book`
- Full screen modu
- Özelleştirilebilir metin

#### Kullanım Örnekleri

**Basit Spinner:**
```tsx
import LoadingSpinner from './components/common/LoadingSpinner';

<LoadingSpinner />
```

**Özelleştirilmiş:**
```tsx
<LoadingSpinner 
  size="lg" 
  text="Yükleniyor..." 
  variant="dots"
/>
```

**Full Screen:**
```tsx
<LoadingSpinner 
  fullScreen 
  size="xl" 
  text="Veriler yükleniyor..."
  variant="book"
/>
```

### 2. SkeletonLoader Component

#### Özellikler
- 5 farklı varyant: `text`, `card`, `avatar`, `book`, `table`
- Çoklu skeleton desteği
- Özelleştirilebilir stil

#### Kullanım Örnekleri

**Kitap Kartları:**
```tsx
import SkeletonLoader from './components/common/SkeletonLoader';

<div className="grid grid-cols-4 gap-4">
  <SkeletonLoader variant="book" count={4} />
</div>
```

**Tablo:**
```tsx
<SkeletonLoader variant="table" />
```

**Kart:**
```tsx
<SkeletonLoader variant="card" count={3} />
```

## 📝 Uygulama Örnekleri

### Sayfa Loading State
```tsx
const MyPage = () => {
  const [loading, setLoading] = useState(true);

  if (loading) {
    return <LoadingSpinner fullScreen text="Sayfa yükleniyor..." />;
  }

  return <div>İçerik</div>;
};
```

### Liste Loading State
```tsx
const BookList = () => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  if (loading) {
    return (
      <div className="grid grid-cols-4 gap-4">
        <SkeletonLoader variant="book" count={8} />
      </div>
    );
  }

  return books.map(book => <BookCard key={book.id} book={book} />);
};
```

### Error Boundary ile Birlikte
```tsx
<ErrorBoundary>
  <Suspense fallback={<LoadingSpinner fullScreen />}>
    <LazyComponent />
  </Suspense>
</ErrorBoundary>
```

## 🎨 Stil Özelleştirme

### LoadingSpinner Renkleri
```tsx
// tailwind.config.js'de özelleştirin
colors: {
  indigo: { ... } // Spinner rengi
}
```

### SkeletonLoader Animasyonu
```css
/* index.css */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

## 🚀 Best Practices

1. **Her sayfa için loading state ekleyin**
2. **Kritik componentleri Error Boundary ile sarın**
3. **Skeleton loader'ı gerçek içerik yapısına benzer şekilde kullanın**
4. **Full screen loader'ı sadece sayfa yüklemelerinde kullanın**
5. **Loading text'i kullanıcıya ne olduğunu açıklayacak şekilde yazın**

## 📊 Performans İpuçları

- Skeleton loader gerçek içerikten daha hızlı render olur
- Error Boundary sadece production'da kritik hataları yakalar
- Loading state'leri minimum 300ms gösterin (flicker önlemek için)

## 🔧 Sorun Giderme

### Error Boundary çalışmıyor
- Class component olduğundan emin olun
- componentDidCatch metodunun doğru implement edildiğini kontrol edin

### Loading spinner görünmüyor
- z-index değerlerini kontrol edin
- fullScreen modunda position: fixed olduğundan emin olun

### Skeleton loader yanlış görünüyor
- Variant'ın doğru seçildiğini kontrol edin
- className prop'u ile özel stiller ekleyin

## 📚 Ek Kaynaklar

- [React Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [Loading UI Patterns](https://www.nngroup.com/articles/progress-indicators/)
- [Skeleton Screens](https://www.lukew.com/ff/entry.asp?1797)
