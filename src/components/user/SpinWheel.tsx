import React, { useState, useRef, useEffect } from 'react';
import { SpinReward } from '../../types/spin';

interface SpinWheelProps {
  rewards: SpinReward[];
  rotation: number;
  isSpinning: boolean;
  onSpin?: () => void;
  winningReward?: SpinReward | null;
}

const SpinWheel: React.FC<SpinWheelProps> = ({ rewards, rotation, isSpinning, onSpin, winningReward }) => {
  const wheelRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showWinAnimation, setShowWinAnimation] = useState(false);
  const segmentAngle = 360 / rewards.length;

  useEffect(() => {
    setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  useEffect(() => {
    if (!isSpinning && winningReward) {
      setShowWinAnimation(true);
      const timer = setTimeout(() => setShowWinAnimation(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isSpinning, winningReward]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isSpinning || !onSpin) return;
    setTouchStart(e.touches[0].clientY);
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart || isSpinning || !onSpin) return;
    const touchEnd = e.changedTouches[0].clientY;
    const diff = touchStart - touchEnd;
    
    // Swipe down gesture (en az 50px)
    if (diff > 50) {
      onSpin();
      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
    }
    setTouchStart(null);
  };

  return (
    <div 
      className="relative w-full max-w-lg mx-auto p-2 sm:p-4 touch-none select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Mobil Swipe İpucu */}
      {isMobile && !isSpinning && onSpin && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10 bg-purple-600 text-white px-4 py-2 rounded-full text-xs font-semibold animate-bounce shadow-lg">
          👆 Aşağı kaydır
        </div>
      )}
      {/* Işık Efektleri - Arka Plan */}
      <div className="absolute inset-0 animate-pulse">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-radial from-yellow-300/30 via-orange-300/20 to-transparent rounded-full blur-3xl"></div>
      </div>

      {/* Sabit Ok/İşaretçi - Geliştirilmiş */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 animate-bounce">
        <div className="relative">
          <div className="w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-t-[40px] border-t-red-500 drop-shadow-2xl"></div>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[16px] border-l-transparent border-r-[16px] border-r-transparent border-t-[32px] border-t-red-400 blur-sm"></div>
        </div>
      </div>

      {/* Çark */}
      <div className="relative w-full aspect-square mt-12 sm:mt-8">
        {/* Glow Efekti */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-400/40 via-orange-400/40 to-pink-400/40 blur-2xl animate-pulse"></div>
        
        {/* 3D Çark Container */}
        <div
          ref={wheelRef}
          className={`absolute inset-0 rounded-full shadow-2xl transition-transform ${!isSpinning && winningReward ? 'animate-bounce-slow' : ''}`}
          style={{
            transform: `rotate(${rotation}deg) perspective(1000px) rotateX(5deg)`,
            transformStyle: 'preserve-3d',
            transitionDuration: isSpinning ? '4s' : '0s',
            transitionTimingFunction: 'cubic-bezier(0.17, 0.67, 0.12, 0.99)',
            boxShadow: showWinAnimation 
              ? '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 150px rgba(251, 191, 36, 0.8), inset 0 2px 20px rgba(255, 255, 255, 0.5)'
              : '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 100px rgba(251, 191, 36, 0.3), inset 0 2px 20px rgba(255, 255, 255, 0.3)',
          }}
        >
          {/* Çark Dilimleri */}
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {rewards.map((reward, index) => {
              const startAngle = index * segmentAngle - 90;
              const endAngle = startAngle + segmentAngle;
              
              const startRad = (startAngle * Math.PI) / 180;
              const endRad = (endAngle * Math.PI) / 180;
              
              const x1 = 50 + 50 * Math.cos(startRad);
              const y1 = 50 + 50 * Math.sin(startRad);
              const x2 = 50 + 50 * Math.cos(endRad);
              const y2 = 50 + 50 * Math.sin(endRad);
              
              const largeArc = segmentAngle > 180 ? 1 : 0;
              
              const pathData = `M 50 50 L ${x1} ${y1} A 50 50 0 ${largeArc} 1 ${x2} ${y2} Z`;
              
              const textAngle = startAngle + segmentAngle / 2;
              const textRad = (textAngle * Math.PI) / 180;
              const iconX = 50 + 30 * Math.cos(textRad);
              const iconY = 50 + 30 * Math.sin(textRad);
              const labelX = 50 + 38 * Math.cos(textRad);
              const labelY = 50 + 38 * Math.sin(textRad);

              const isWinning = showWinAnimation && winningReward?.id === reward.id;
              
              return (
                <g key={reward.id}>
                  <path
                    d={pathData}
                    fill={reward.color}
                    stroke="white"
                    strokeWidth="0.5"
                    className={isWinning ? 'animate-pulse-glow' : ''}
                    style={{
                      filter: isWinning ? 'brightness(1.3) drop-shadow(0 0 10px rgba(255, 255, 255, 0.8))' : 'none',
                    }}
                  />
                  <text
                    x={iconX}
                    y={iconY}
                    fill="white"
                    fontSize={rewards.length > 8 ? "5" : "6"}
                    fontWeight="bold"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    transform={`rotate(${textAngle + 90}, ${iconX}, ${iconY})`}
                  >
                    {reward.icon}
                  </text>
                  <text
                    x={labelX}
                    y={labelY}
                    fill="white"
                    fontSize={rewards.length > 8 ? "1.8" : "2.2"}
                    fontWeight="600"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    transform={`rotate(${textAngle + 90}, ${labelX}, ${labelY})`}
                  >
                    {reward.name}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Merkez Daire - Geliştirilmiş */}
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-gradient-to-br from-yellow-300 via-yellow-400 to-orange-500 rounded-full shadow-2xl flex items-center justify-center border-4 border-white ${showWinAnimation ? 'animate-spin-slow' : 'animate-pulse'}`} style={{
            boxShadow: '0 0 30px rgba(251, 191, 36, 0.8), inset 0 2px 10px rgba(255, 255, 255, 0.5)',
          }}>
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/40 to-transparent"></div>
            <span className="text-4xl relative z-10 drop-shadow-lg">{isSpinning ? '🌟' : '🎡'}</span>
          </div>

          {/* Dış Halka - Dekoratif */}
          <div className={`absolute inset-0 rounded-full border-8 ${showWinAnimation ? 'border-yellow-300 animate-ping' : 'border-yellow-400/50 animate-spin'}`} style={{ animationDuration: showWinAnimation ? '1s' : '20s' }}></div>
          <div className="absolute inset-2 rounded-full border-4 border-orange-400/30 animate-spin" style={{ animationDuration: '15s', animationDirection: 'reverse' }}></div>
          
          {/* Kazanma Işık Efekti */}
          {showWinAnimation && (
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-400 opacity-50 animate-pulse"></div>
          )}
        </div>

        {/* Shimmer Efekti */}
        {isSpinning && (
          <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" style={{
              animation: 'shimmer 1s infinite',
            }}></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SpinWheel;
