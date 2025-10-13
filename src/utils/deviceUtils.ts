import { useState, useEffect } from 'react';

// Cihaz tipini kontrol et
export const useDeviceType = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  return { isMobile, isTablet, isDesktop: !isMobile && !isTablet };
};

// Capacitor (mobil uygulama) kontrolü
export const isNativeApp = () => {
  return window.location.protocol === 'capacitor:' || 
         window.location.protocol === 'ionic:' ||
         (window as any).Capacitor !== undefined;
};
