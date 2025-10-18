import React, { useState, useEffect } from 'react';
import { BookOpen, Users, Calendar, Trophy, Sparkles, ChevronRight, ChevronLeft, X } from 'lucide-react';

interface OnboardingProps {
  onFinish: () => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onFinish }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState<'left' | 'right'>('right');
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const steps = [
    {
      icon: BookOpen,
      title: 'Hoş Geldiniz! 📚',
      description: 'Data Koleji Kütüphanesi\'ne hoş geldiniz! 1000+ kitaba anında erişin, ödünç alın ve okuma serüveninize başlayın.',
      stats: ['1000+ Kitap', '7/24 Erişim', 'Ücretsiz'],
      color: 'from-indigo-600 to-purple-600',
      bgColor: 'bg-indigo-100',
      iconColor: 'text-indigo-600'
    },
    {
      icon: Trophy,
      title: 'Şans Çarkı 🎡',
      description: 'Her gün çarkı çevirin! Ceza indirimleri, süre uzatma hakları ve özel ödüller kazanın. İlk çevirme hakkınız hazır!',
      stats: ['Günlük Çark', 'Özel Ödüller', '%100 İndirim Şansı'],
      color: 'from-purple-600 to-pink-600',
      bgColor: 'bg-purple-100',
      iconColor: 'text-purple-600'
    },
    {
      icon: Sparkles,
      title: 'Hemen Başlayın! 🚀',
      description: 'Artık hazırsınız! Kataloğu keşfedin, etkinliklere katılın ve okuma topluluğumuzun bir parçası olun.',
      stats: ['Kolay Kullanım', 'Hızlı Başlangıç', 'Eğlenceli'],
      color: 'from-green-600 to-emerald-600',
      bgColor: 'bg-green-100',
      iconColor: 'text-green-600'
    }
  ];

  // Minimum swipe distance
  const minSwipeDistance = 50;

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && currentStep < steps.length - 1) {
        handleNext();
      } else if (e.key === 'ArrowLeft' && currentStep > 0) {
        handlePrev();
      } else if (e.key === 'Escape') {
        handleSkip();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStep]);

  // Touch handlers
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && currentStep < steps.length - 1) {
      handleNext();
    } else if (isRightSwipe && currentStep > 0) {
      handlePrev();
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setDirection('right');
      setCurrentStep(currentStep + 1);
    } else {
      onFinish();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setDirection('left');
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onFinish();
  };

  const currentStepData = steps[currentStep];
  const Icon = currentStepData.icon;

  return (
    <div 
      className="fixed inset-0 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 z-[10000] flex flex-col animate-fadeIn"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
        {/* Header */}
        <div 
          key={currentStep}
          className={`bg-gradient-to-r ${currentStepData.color} p-8 sm:p-12 md:p-16 relative flex-1 flex items-center justify-center transition-all duration-500 ${
            direction === 'right' ? 'animate-slideInRight' : 'animate-slideInLeft'
          }`}
        >
          <button
            onClick={handleSkip}
            className="absolute top-6 right-6 text-white/80 hover:text-white hover:bg-white/20 p-3 rounded-full transition-all z-10"
          >
            <X className="w-6 h-6 sm:w-7 sm:h-7" />
          </button>
          <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
            <div className={`${currentStepData.bgColor} p-6 sm:p-8 md:p-10 rounded-full mb-6 sm:mb-8 md:mb-10 shadow-2xl animate-scaleIn`}>
              <Icon className={`w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 ${currentStepData.iconColor} animate-float`} />
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 sm:mb-6 animate-fadeInUp">
              {currentStepData.title}
            </h2>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-white/90 max-w-2xl px-4 mb-6 sm:mb-8 animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
              {currentStepData.description}
            </p>
            {/* Special message for spin wheel step */}
            {currentStep === 1 && (
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 max-w-md mx-auto mb-4 animate-fadeInUp" style={{ animationDelay: '0.3s' }}>
                <p className="text-white text-sm sm:text-base font-semibold">
                  💡 İpucu: Çarkı çevirmek için ana sayfadaki çark ikonuna tıklayın!
                </p>
              </div>
            )}
            {/* Stats */}
            <div className="flex flex-wrap justify-center gap-3 sm:gap-4 px-4 animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
              {currentStepData.stats.map((stat, index) => (
                <div 
                  key={index}
                  className="bg-white/20 backdrop-blur-sm px-4 sm:px-6 py-2 sm:py-3 rounded-full border-2 border-white/30 hover:bg-white/30 transition-all hover:scale-110 cursor-default"
                >
                  <span className="text-white font-bold text-sm sm:text-base md:text-lg">{stat}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Progress Dots */}
        <div className="flex justify-center gap-2 sm:gap-3 py-8 sm:py-10 md:py-12 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm transition-all duration-300">
          {steps.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentStep(index)}
              className={`h-3 sm:h-4 rounded-full transition-all duration-300 ${
                index === currentStep
                  ? `w-12 sm:w-16 md:w-20 bg-gradient-to-r ${currentStepData.color} shadow-lg`
                  : 'w-3 sm:w-4 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
              }`}
            />
          ))}
        </div>

        {/* Navigation Buttons */}
        <div className="p-6 sm:p-8 md:p-10 flex flex-col sm:flex-row gap-4 sm:gap-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            className={`flex-1 px-8 py-4 sm:py-5 rounded-xl font-bold text-base sm:text-lg md:text-xl transition-all min-h-[56px] sm:min-h-[64px] flex items-center justify-center gap-3 shadow-lg ${
              currentStep === 0
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 hover:scale-105'
            }`}
          >
            <ChevronLeft className="w-6 h-6" />
            <span className="hidden sm:inline">Geri</span>
          </button>
          
          {currentStep < steps.length - 1 ? (
            <button
              onClick={handleNext}
              className={`flex-1 px-8 py-4 sm:py-5 bg-gradient-to-r ${currentStepData.color} text-white rounded-xl font-bold text-base sm:text-lg md:text-xl hover:shadow-2xl hover:scale-105 transition-all min-h-[56px] sm:min-h-[64px] flex items-center justify-center gap-3`}
            >
              <span>Devam</span>
              <ChevronRight className="w-6 h-6" />
            </button>
          ) : (
            <button
              onClick={handleNext}
              className={`flex-1 px-8 py-4 sm:py-5 bg-gradient-to-r ${currentStepData.color} text-white rounded-xl font-bold text-base sm:text-lg md:text-xl hover:shadow-2xl hover:scale-105 transition-all min-h-[56px] sm:min-h-[64px] flex items-center justify-center gap-3`}
            >
              <span>Başlayalım!</span>
              <Sparkles className="w-6 h-6" />
            </button>
          )}
        </div>
      </div>
  );
};

export default Onboarding;
