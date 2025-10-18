import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, BookOpen, Search, Calendar, Settings, MessageSquare, Award } from 'lucide-react';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  highlight?: string;
}

interface OnboardingTourProps {
  isOpen: boolean;
  onClose: (dontShowAgain: boolean) => void; // Modified to accept dontShowAgain boolean
  onComplete: (dontShowAgain: boolean) => void; // Modified to accept dontShowAgain boolean
}

const OnboardingTour: React.FC<OnboardingTourProps> = ({ isOpen, onClose, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false); // New state for the checkbox

  const steps: OnboardingStep[] = [
    {
      id: 'catalog',
      title: 'Kitap Kataloğu 📚',
      description: 'Sol menüden "Katalog" seçeneğine tıklayarak binlerce kitaba erişin. Arama yapabilir, kategorilere göre filtreleyebilir ve kitap detaylarını inceleyebilirsiniz.',
      icon: <Search className="w-8 h-8 text-indigo-600" />,
      highlight: 'catalog'
    },
    {
      id: 'spin-wheel',
      title: 'Şans Çarkı 🎡',
      description: 'Ana sayfadaki çark ikonuna tıklayarak her gün şansınızı deneyin! Ceza indirimleri, süre uzatma hakları ve özel ödüller kazanabilirsiniz.',
      icon: <Award className="w-8 h-8 text-purple-600" />,
      highlight: 'dashboard'
    },
    {
      id: 'borrowed',
      title: 'Ödünç Kitaplarım 📖',
      description: 'Ödünç aldığınız kitapları "Kitaplarım" bölümünden takip edin. Süre uzatabilir, iade talebinde bulunabilir ve okuma istatistiklerinizi görebilirsiniz.',
      icon: <BookOpen className="w-8 h-8 text-indigo-600" />,
      highlight: 'borrowed-books'
    },
    {
      id: 'events',
      title: 'Etkinlikler 🎭',
      description: 'Kütüphane etkinliklerine katılın. Yazar söyleşileri, kitap kulübü ve okuma atölyelerine "Etkinliklerim" sayfasından kayıt olabilirsiniz.',
      icon: <Calendar className="w-8 h-8 text-indigo-600" />,
      highlight: 'my-events'
    },
    {
      id: 'complete',
      title: 'Hazırsınız! 🚀',
      description: 'Tebrikler! Artık tüm özellikleri kullanabilirsiniz. İlk işiniz olarak çarkı çevirmeyi unutmayın! İyi okumalar dileriz.',
      icon: <BookOpen className="w-8 h-8 text-green-600" />
    }
  ];

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(currentStep + 1);
        setIsAnimating(false);
      }, 150);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(currentStep - 1);
        setIsAnimating(false);
      }, 150);
    }
  };

  const handleComplete = () => {
    onComplete(dontShowAgain); // Pass dontShowAgain state
    onClose(dontShowAgain); // Pass dontShowAgain state
  };

  const handleSkip = () => {
    onClose(dontShowAgain); // Pass dontShowAgain state
  };

  if (!isOpen) return null;

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 relative">
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          
          <div className="text-center">
            <div className="mb-4 flex justify-center animate-bounce">
              {currentStepData.icon}
            </div>
            <h2 className="text-xl font-bold mb-2">{currentStepData.title}</h2>
            
            {/* Progress Bar */}
            <div className="w-full bg-white/20 rounded-full h-2 mb-2">
              <div
                className="bg-white h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              />
            </div>
            <p className="text-sm text-white/80">
              {currentStep + 1} / {steps.length}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className={`transition-opacity duration-150 ${isAnimating ? 'opacity-0' : 'opacity-100'}`}>
            <p className="text-gray-700 leading-relaxed mb-6">
              {currentStepData.description}
            </p>

            {/* Feature Highlights */}
            {currentStep === 0 && (
              <div className="bg-indigo-50 rounded-lg p-4 mb-4">
                <h4 className="font-semibold text-indigo-900 mb-2">💡 Hızlı İpuçları:</h4>
                <ul className="text-sm text-indigo-700 space-y-1">
                  <li>• Arama çubuğunu kullanarak hızlıca kitap bulun</li>
                  <li>• Kategorilere göre filtreleyin</li>
                  <li>• Kitap kapağına tıklayarak detayları görün</li>
                </ul>
              </div>
            )}

            {currentStep === 1 && (
              <div className="bg-purple-50 rounded-lg p-4 mb-4">
                <h4 className="font-semibold text-purple-900 mb-2">🎁 Kazanabileceğiniz Ödüller:</h4>
                <ul className="text-sm text-purple-700 space-y-1">
                  <li>• %5 - %100 ceza indirimleri</li>
                  <li>• Süre uzatma hakları (2x uzatma)</li>
                  <li>• Yeniden çevirme hakkı</li>
                  <li>• Kategori keşfi fırsatları</li>
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-between items-center">
          <button
            onClick={prevStep}
            disabled={currentStep === 0}
            className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Önceki
          </button>

          <div className="flex space-x-2">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`w-2 h-2 rounded-full transition-colors ${ index === currentStep
                    ? 'bg-indigo-600'
                    : index < currentStep
                    ? 'bg-indigo-300'
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>

          {isLastStep ? (
            <button
              onClick={handleComplete}
              className="flex items-center px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              Başlayalım!
              <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          ) : (
            <button
              onClick={nextStep}
              className="flex items-center px-4 py-2 text-indigo-600 hover:text-indigo-800 transition-colors font-medium"
            >
              Sonraki
              <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          )}
        </div>

        {/* "Don't Show Again" checkbox - Only show on last step */}
        {isLastStep && (
          <div className="p-4 bg-gray-100 flex items-center justify-center">
            <input
              type="checkbox"
              id="dontShowAgain"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="form-checkbox h-4 w-4 text-indigo-600 transition duration-150 ease-in-out rounded"
            />
            <label htmlFor="dontShowAgain" className="ml-2 text-sm text-gray-700">
              Bu turu bir daha gösterme
            </label>
          </div>
        )}
      </div>
    </div>
  );
};

export default OnboardingTour;
