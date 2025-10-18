# Image Optimization Dokümantasyonu

Bu dokümantasyon, uygulamaya eklenen image optimization özelliklerini açıklar.

## 🖼️ OptimizedImage Component

### Özellikler

- ✅ **Lazy Loading**: Resimleri sadece görünür olduklarında yükler
- ✅ **Blur Placeholder**: Yüklenirken blur efekti
- ✅ **Error Handling**: Yüklenemeyen resimler için fallback UI
- ✅ **Progressive Loading**: Önce düşük kalite, sonra yüksek kalite
- ✅ **Async Decoding**: Tarayıcı performansını artırır

### Kullanım

#### Basit Kullanım
```tsx
import OptimizedImage from './components/common/OptimizedImage';

<OptimizedImage 
  src="https://example.com/image.jpg" 
  alt="Açıklama" 
/>
```

#### Tam Özelliklerle
```tsx
<OptimizedImage 
  src="https://example.com/image.jpg" 
  alt="Kitap kapağı"
  width={400}
  height={600}
  className="rounded-lg shadow-md"
  lazy={true}
  placeholder="data:image/svg+xml,..."
  onError={() => console.log('Resim yüklenemedi')}
/>
```

### Props

| Prop | Tip | Varsayılan | Açıklama |
|------|-----|-----------|----------|
| `src` | string | - | Resim URL'i (zorunlu) |
| `alt` | string | - | Alt text (zorunlu) |
| `className` | string | '' | CSS sınıfları |
| `width` | number | - | Genişlik (px) |
| `height` | number | - | Yükseklik (px) |
| `lazy` | boolean | true | Lazy loading aktif/pasif |
| `placeholder` | string | SVG | Yüklenirken gösterilecek placeholder |
| `onError` | function | - | Hata durumunda çağrılacak fonksiyon |

## 🛠️ Utility Fonksiyonlar

### optimizeImageUrl

Firebase Storage veya CDN URL'lerini optimize eder:

```tsx
import { optimizeImageUrl } from './utils/imageOptimization';

const optimizedUrl = optimizeImageUrl(originalUrl, {
  width: 800,
  height: 600,
  quality: 80,
  format: 'webp'
});
```

### getResponsiveImageSize

Ekran boyutuna göre optimal resim boyutu hesaplar:

```tsx
import { getResponsiveImageSize } from './utils/imageOptimization';

const containerWidth = window.innerWidth;
const imageSize = getResponsiveImageSize(containerWidth);
// Mobile: 400px, Tablet: 600px, Desktop: 800px, Large: 1200px
```

### preloadImage

Kritik resimleri önceden yükler:

```tsx
import { preloadImage, preloadImages } from './utils/imageOptimization';

// Tek resim
await preloadImage('https://example.com/hero.jpg');

// Birden fazla resim
await preloadImages([
  'https://example.com/image1.jpg',
  'https://example.com/image2.jpg',
  'https://example.com/image3.jpg'
]);
```

### supportsWebP

Tarayıcının WebP desteğini kontrol eder:

```tsx
import { supportsWebP } from './utils/imageOptimization';

if (supportsWebP()) {
  // WebP formatını kullan
} else {
  // JPEG/PNG kullan
}
```

### generatePlaceholder

SVG placeholder oluşturur:

```tsx
import { generatePlaceholder } from './utils/imageOptimization';

const placeholder = generatePlaceholder(400, 300);
// data:image/svg+xml,%3Csvg...
```

### getOptimizedDimensions

Resim boyutlarını optimize eder (max width/height):

```tsx
import { getOptimizedDimensions } from './utils/imageOptimization';

const { width, height } = getOptimizedDimensions(
  2000, // original width
  1500, // original height
  1200, // max width
  1200  // max height
);
// { width: 1200, height: 900 }
```

## 📊 Performans İyileştirmeleri

### Önce
- Tüm resimler sayfa yüklenirken indirilir
- Büyük resimler bandwidth tüketir
- Yavaş bağlantılarda uzun yükleme süreleri
- Hatalı resimler boş alan bırakır

### Sonra
- Resimler sadece görünür olduklarında yüklenir ⚡
- Responsive boyutlar bandwidth tasarrufu sağlar 💾
- Blur placeholder kullanıcı deneyimini iyileştirir ✨
- Error handling ile profesyonel görünüm 🎨

## 🎯 Best Practices

### 1. Her Zaman Alt Text Kullanın

```tsx
// ✅ Doğru
<OptimizedImage src="book.jpg" alt="Harry Potter kitap kapağı" />

// ❌ Yanlış
<OptimizedImage src="book.jpg" alt="" />
```

### 2. Boyutları Belirtin

```tsx
// ✅ Doğru - Layout shift önlenir
<OptimizedImage 
  src="book.jpg" 
  alt="Kitap"
  width={400}
  height={600}
/>

// ⚠️ Dikkat - Layout shift olabilir
<OptimizedImage src="book.jpg" alt="Kitap" />
```

### 3. Kritik Resimleri Preload Edin

```tsx
// Hero image gibi kritik resimler için
useEffect(() => {
  preloadImage('/hero-image.jpg');
}, []);
```

### 4. Lazy Loading'i Akıllıca Kullanın

```tsx
// ✅ Above the fold için lazy={false}
<OptimizedImage src="hero.jpg" alt="Hero" lazy={false} />

// ✅ Below the fold için lazy={true}
<OptimizedImage src="gallery.jpg" alt="Gallery" lazy={true} />
```

### 5. Error Handling Ekleyin

```tsx
<OptimizedImage 
  src={book.coverImage} 
  alt={book.title}
  onError={() => {
    console.error('Kitap kapağı yüklenemedi:', book.id);
    // Analytics'e gönder
  }}
/>
```

## 🚀 İleri Seviye Optimizasyonlar

### 1. Responsive Images

```tsx
const ResponsiveBookCover = ({ book }) => {
  const [imageSize, setImageSize] = useState(400);

  useEffect(() => {
    const handleResize = () => {
      setImageSize(getResponsiveImageSize(window.innerWidth));
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <OptimizedImage 
      src={optimizeImageUrl(book.coverImage, { width: imageSize })}
      alt={book.title}
      width={imageSize}
    />
  );
};
```

### 2. Intersection Observer ile Custom Lazy Loading

```tsx
const LazyImage = ({ src, alt }) => {
  const [isVisible, setIsVisible] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '50px' }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={imgRef}>
      {isVisible && <OptimizedImage src={src} alt={alt} />}
    </div>
  );
};
```

### 3. Progressive Image Loading

```tsx
const ProgressiveImage = ({ src, alt }) => {
  const [currentSrc, setCurrentSrc] = useState(
    optimizeImageUrl(src, { width: 50, quality: 10 })
  );

  useEffect(() => {
    const img = new Image();
    img.src = src;
    img.onload = () => setCurrentSrc(src);
  }, [src]);

  return (
    <OptimizedImage 
      src={currentSrc}
      alt={alt}
      className={currentSrc === src ? '' : 'blur-sm'}
    />
  );
};
```

## 📱 Mobil Optimizasyon

### Bandwidth Tasarrufu

```tsx
const isMobile = window.innerWidth < 768;
const imageQuality = isMobile ? 60 : 80;

<OptimizedImage 
  src={optimizeImageUrl(book.coverImage, { 
    quality: imageQuality,
    width: isMobile ? 400 : 800
  })}
  alt={book.title}
/>
```

### Touch-friendly Loading

```tsx
// Mobilde daha agresif lazy loading
const lazyLoadThreshold = isMobile ? '200px' : '50px';
```

## 🐛 Sorun Giderme

### Resimler yüklenmiyor

1. CORS ayarlarını kontrol edin
2. URL'lerin doğru olduğundan emin olun
3. Network tab'ında hataları inceleyin

### Layout shift oluyor

```tsx
// Aspect ratio ile çözüm
<div className="aspect-[2/3]">
  <OptimizedImage 
    src={src} 
    alt={alt}
    className="w-full h-full object-cover"
  />
</div>
```

### Blur efekti çalışmıyor

```tsx
// Tailwind config'e ekleyin
module.exports = {
  theme: {
    extend: {
      transitionProperty: {
        'filter': 'filter',
      }
    }
  }
}
```

## 📚 Ek Kaynaklar

- [Web.dev - Image Optimization](https://web.dev/fast/#optimize-your-images)
- [MDN - Lazy Loading](https://developer.mozilla.org/en-US/docs/Web/Performance/Lazy_loading)
- [Google - WebP Format](https://developers.google.com/speed/webp)
- [Cloudinary - Image Optimization](https://cloudinary.com/documentation/image_optimization)

## 🎨 Örnek Kullanımlar

### Kitap Kataloğu

```tsx
<div className="grid grid-cols-4 gap-4">
  {books.map(book => (
    <OptimizedImage
      key={book.id}
      src={book.coverImage}
      alt={book.title}
      width={300}
      height={450}
      className="rounded-lg shadow-md hover:scale-105 transition-transform"
    />
  ))}
</div>
```

### Profil Fotoğrafı

```tsx
<OptimizedImage
  src={user.photoURL}
  alt={user.displayName}
  width={128}
  height={128}
  className="rounded-full border-4 border-white shadow-lg"
  lazy={false}
/>
```

### Hero Banner

```tsx
<OptimizedImage
  src="/hero-banner.jpg"
  alt="Kütüphane"
  width={1920}
  height={600}
  className="w-full h-auto"
  lazy={false}
  onError={() => console.error('Hero banner yüklenemedi')}
/>
```
