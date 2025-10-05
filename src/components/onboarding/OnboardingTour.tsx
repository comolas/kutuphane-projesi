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
      id: 'welcome',
      title: 'Data Koleji Kütüphanesi\'ne Hoş Geldiniz! 🎉',
      description: 'Dijital kütüphane sisteminize hoş geldiniz. Size kısa bir tur yapalım ve temel özellikleri tanıtalım.',
      icon: <BookOpen className="w-8 h-8 text-indigo-600" />
    },
    {
      id: 'catalog',
      title: 'Kitap Kataloğu 📚',
      description: 'Binlerce kitaba erişim sağlayın. Arama yapın, filtreleyin ve istediğiniz kitapları bulun. Kitap detaylarını inceleyebilir ve ödünç alma talebinde bulunabilirsiniz.',
      icon: <Search className="w-8 h-8 text-indigo-600" />,
      highlight: 'catalog'
    },
    {
      id: 'borrowed',
      title: 'Ödünç Aldığım Kitaplar 📖',
      description: 'Ödünç aldığınız kitapları takip edin. Teslim tarihlerini görün, süre uzatma talebinde bulunun ve iade işlemlerinizi yönetin.',
      icon: <BookOpen className="w-8 h-8 text-indigo-600" />,
      highlight: 'borrowed-books'
    },
    {
      id: 'events',
      title: 'Etkinlikler ve Duyurular 🎭',
      description: 'Kütüphane etkinliklerine katılın. Yazar söyleşileri, kitap kulübü buluşmaları ve okuma atölyelerine kayıt olun.',
      icon: <Calendar className="w-8 h-8 text-indigo-600" />,
      highlight: 'my-events'
    },
    {
      id: 'requests',
      title: 'Talep Sistemi 💬',
      description: 'Kütüphane yönetimine talepte bulunun. Kitap önerileri, şikayetler veya önerilerinizi iletebilirsiniz.',
      icon: <MessageSquare className="w-8 h-8 text-indigo-600" />,
      highlight: 'requests'
    },
    {
      id: 'gamification',
      title: 'Görevler ve Başarımlar 🏆',
      description: 'Günlük ve haftalık görevleri tamamlayarak XP kazanın. Seviye atlayın ve özel başarımlar elde edin.',
      icon: <Award className="w-8 h-8 text-indigo-600" />,
      highlight: 'settings'
    },
    {
      id: 'settings',
      title: 'Kişiselleştirme ⚙️',
      description: 'Profil bilgilerinizi güncelleyin, bildirim tercihlerinizi ayarlayın ve sistemi kendinize göre özelleştirin.',
      icon: <Settings className="w-8 h-8 text-indigo-600" />,
      highlight: 'settings'
    },
    {
      id: 'complete',
      title: 'Hazırsınız! 🚀',
      description: 'Tebrikler! Artık kütüphane sisteminin tüm özelliklerini kullanabilirsiniz. İyi okumalar dileriz!',
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
            <div className="mb-4 flex justify-center">
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
            {currentStep === 1 && (
              <div className="bg-indigo-50 rounded-lg p-4 mb-4">
                <h4 className="font-semibold text-indigo-900 mb-2">Katalog Özellikleri:</h4>
                <ul className="text-sm text-indigo-700 space-y-1">
                  <li>• Gelişmiş arama ve filtreleme</li>
                  <li>• Kitap detayları ve önizleme</li>
                  <li>• Kategori bazlı tarama</li>
                </ul>
              </div>
            )}

            {currentStep === 5 && (
              <div className="bg-green-50 rounded-lg p-4 mb-4">
                <h4 className="font-semibold text-green-900 mb-2">Görev Türleri:</h4>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• Günlük okuma görevi (50 XP)</li>
                  <li>• Haftalık kitap bitirme (200 XP)</li>
                  <li>• Etkinlik katılımı (150 XP)</li>
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

        {/* "Don't Show Again" checkbox */}
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
      </div>
    </div>
  );
};

export default OnboardingTour;
