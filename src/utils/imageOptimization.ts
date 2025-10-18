/**
 * Image optimization utilities
 */

// Cloudinary veya benzeri CDN kullanıyorsanız URL'yi optimize eder
export const optimizeImageUrl = (url: string, options?: {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'avif' | 'jpg' | 'png';
}): string => {
  if (!url) return '';
  
  // Firebase Storage URL'leri için
  if (url.includes('firebasestorage.googleapis.com')) {
    const params = new URLSearchParams();
    
    if (options?.width) params.append('w', options.width.toString());
    if (options?.height) params.append('h', options.height.toString());
    
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}${params.toString()}`;
  }
  
  return url;
};

// Resim boyutunu hesaplar (responsive)
export const getResponsiveImageSize = (containerWidth: number): number => {
  if (containerWidth <= 640) return 400;  // mobile
  if (containerWidth <= 768) return 600;  // tablet
  if (containerWidth <= 1024) return 800; // desktop
  return 1200; // large desktop
};

// WebP desteğini kontrol eder
export const supportsWebP = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const canvas = document.createElement('canvas');
  if (canvas.getContext && canvas.getContext('2d')) {
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  }
  return false;
};

// Placeholder blur data URL oluşturur
export const generatePlaceholder = (width: number = 400, height: number = 300): string => {
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${width} ${height}'%3E%3Crect fill='%23f3f4f6' width='${width}' height='${height}'/%3E%3C/svg%3E`;
};

// Resmi preload eder
export const preloadImage = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
};

// Birden fazla resmi preload eder
export const preloadImages = async (urls: string[]): Promise<void> => {
  await Promise.all(urls.map(url => preloadImage(url)));
};

// Resim formatını tespit eder
export const getImageFormat = (url: string): string => {
  const extension = url.split('.').pop()?.toLowerCase();
  return extension || 'unknown';
};

// Resim boyutunu optimize eder (max width/height)
export const getOptimizedDimensions = (
  originalWidth: number,
  originalHeight: number,
  maxWidth: number = 1200,
  maxHeight: number = 1200
): { width: number; height: number } => {
  let width = originalWidth;
  let height = originalHeight;

  if (width > maxWidth) {
    height = (height * maxWidth) / width;
    width = maxWidth;
  }

  if (height > maxHeight) {
    width = (width * maxHeight) / height;
    height = maxHeight;
  }

  return { width: Math.round(width), height: Math.round(height) };
};
