import React, { useEffect, useState } from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

interface SplashScreenProps {
  onFinish: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [fadeOut, setFadeOut] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTextIndex, setCurrentTextIndex] = useState(0);

  const rotatingTexts = [
    'Kitaplar Yükleniyor...',
    'Kütüphane Hazırlanıyor...',
    'Raflar Düzenleniyor...',
    'Yazarlar Yerlerini Alıyor...',
    'Hoş Geldiniz...'
  ];

  useEffect(() => {
    // Progress bar animation (10 seconds)
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 1;
      });
    }, 95); // 100 steps * 95ms = 9.5 seconds

    // Rotating text (every 2 seconds)
    const textInterval = setInterval(() => {
      setCurrentTextIndex(prev => (prev + 1) % rotatingTexts.length);
    }, 2000);

    // Finish animation (10 seconds)
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(onFinish, 500);
    }, 10000);

    return () => {
      clearInterval(progressInterval);
      clearInterval(textInterval);
      clearTimeout(timer);
    };
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 flex flex-col items-center justify-center z-[9999] transition-opacity duration-500 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Lottie Animation - Centered */}
      <div className="mb-3">
        <DotLottieReact
          src="https://lottie.host/2fb250f3-0d56-4510-8f8d-fa5b24da720b/NSVmDVZtBy.lottie"
          loop
          autoplay
          style={{ width: '300px', height: '300px' }}
        />
      </div>

      {/* App Name - Fun Font */}
      <h1 className="text-5xl sm:text-6xl font-bold text-white mb-3 tracking-wide" style={{ fontFamily: '"Fredoka", "Nunito", sans-serif' }}>
        Data Koleji
      </h1>
      <p className="text-2xl sm:text-3xl text-white/90 mb-12" style={{ fontFamily: '"Fredoka", "Nunito", sans-serif' }}>
        Bilgiye Erişimin En Kolay Yolu
      </p>

      {/* Rotating Text - Bigger */}
      <div className="h-12 mb-8">
        <p 
          key={currentTextIndex}
          className="text-white/90 text-xl sm:text-2xl font-semibold animate-fade-in"
          style={{ fontFamily: '"Fredoka", "Nunito", sans-serif' }}
        >
          {rotatingTexts[currentTextIndex]}
        </p>
      </div>

      {/* Pixel Progress Bar - Bigger & Fun */}
      <div className="w-80 sm:w-96 mx-auto px-4">
        <div className="relative h-8 bg-indigo-900/50 border-4 border-white/30 rounded-lg overflow-hidden" style={{ imageRendering: 'pixelated' }}>
          {/* Pixel blocks */}
          <div className="absolute inset-0 flex">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className={`flex-1 transition-all duration-300 ${
                  progress >= (i + 1) * 5
                    ? 'bg-gradient-to-b from-yellow-300 via-green-400 to-green-500'
                    : 'bg-transparent'
                }`}
                style={{
                  borderRight: i < 19 ? '2px solid rgba(255,255,255,0.2)' : 'none',
                }}
              >
                {progress >= (i + 1) * 5 && (
                  <div className="w-full h-full bg-white/20 animate-pulse"></div>
                )}
              </div>
            ))}
          </div>
        </div>
        <p className="text-white text-xl font-bold mt-3 text-center" style={{ fontFamily: '"Fredoka", "Nunito", sans-serif' }}>
          {progress}%
        </p>
      </div>
    </div>
  );
};

export default SplashScreen;
