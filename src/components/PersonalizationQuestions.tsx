import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, BookOpen, Heart, Newspaper, Users, Sparkles } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import Swal from 'sweetalert2';

interface PersonalizationQuestionsProps {
  onComplete: () => void;
}

const PersonalizationQuestions: React.FC<PersonalizationQuestionsProps> = ({ onComplete }) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({
    favoriteCategories: [] as string[],
    favoriteTopics: [] as string[],
    favoriteMagazines: [] as string[],
    readingInfluence: '',
    interests: [] as string[]
  });

  const questions = [
    {
      id: 'categories',
      icon: BookOpen,
      title: 'Hangi kategorilerde kitap okumayı seversin?',
      description: 'En az 1, en fazla 3 kategori seçebilirsin',
      type: 'multiple',
      max: 3,
      options: ['Roman', 'Araştırma/İnceleme', 'Hikâye', 'Tiyatro', 'Felsefe', 'Psikoloji', 'Tarih', 'Çizgi Roman', 'Manga'],
      key: 'favoriteCategories',
      color: 'from-indigo-600 to-purple-600'
    },
    {
      id: 'topics',
      icon: Heart,
      title: 'Hangi konularda kitap okumayı seversin?',
      description: 'En az 1, en fazla 3 konu seçebilirsin',
      type: 'multiple',
      max: 3,
      options: ['Dedektiflik', 'Polisiye/Suç', 'Korku', 'Aşk', 'Bilimkurgu', 'Fantastik', 'Arkeoloji', 'Psikoloji', 'Otobiyografi'],
      key: 'favoriteTopics',
      color: 'from-purple-600 to-pink-600'
    },
    {
      id: 'magazines',
      icon: Newspaper,
      title: 'Hangi dergi türlerini okumayı seversin?',
      description: 'İstediğin kadar seçebilirsin',
      type: 'multiple',
      max: 7,
      options: ['Tarih', 'Bilim', 'Edebiyat', 'Oyun', 'Teknoloji', 'Coğrafya', 'Mesleki'],
      key: 'favoriteMagazines',
      color: 'from-pink-600 to-rose-600'
    },
    {
      id: 'influence',
      icon: Users,
      title: 'Kitap okumanızda en etkili olan şey nedir?',
      description: 'Bir seçenek seçin',
      type: 'single',
      options: ['Öğretmen', 'Arkadaş', 'Aile', 'Sosyal Medya'],
      key: 'readingInfluence',
      color: 'from-orange-600 to-red-600'
    },
    {
      id: 'interests',
      icon: Sparkles,
      title: 'İlgi alanlarınız nedir?',
      description: 'İstediğin kadar seçebilirsin',
      type: 'multiple',
      max: 8,
      options: ['Spor', 'Makineler', 'Yazılım', 'Edebiyat', 'Sinema', 'Resim', 'Fotoğraf', 'Bilgisayar Oyunu'],
      key: 'interests',
      color: 'from-green-600 to-emerald-600'
    }
  ];

  const currentQuestion = questions[currentStep];
  const Icon = currentQuestion.icon;

  const handleOptionToggle = (option: string) => {
    const key = currentQuestion.key as keyof typeof answers;
    
    if (currentQuestion.type === 'single') {
      setAnswers({ ...answers, [key]: option });
    } else {
      const currentValues = answers[key] as string[];
      if (currentValues.includes(option)) {
        setAnswers({ ...answers, [key]: currentValues.filter(v => v !== option) });
      } else {
        if (currentValues.length < currentQuestion.max) {
          setAnswers({ ...answers, [key]: [...currentValues, option] });
        }
      }
    }
  };

  const isOptionSelected = (option: string) => {
    const key = currentQuestion.key as keyof typeof answers;
    if (currentQuestion.type === 'single') {
      return answers[key] === option;
    }
    return (answers[key] as string[]).includes(option);
  };

  const canProceed = () => {
    const key = currentQuestion.key as keyof typeof answers;
    if (currentQuestion.type === 'single') {
      return answers[key] !== '';
    }
    return (answers[key] as string[]).length > 0;
  };

  const handleNext = () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    if (!user) return;

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        personalization: {
          ...answers,
          completedAt: new Date(),
          isCompleted: true
        }
      });
      
      Swal.fire({
        title: 'Tebrikler! 🎉',
        text: 'Artık sana özel öneriler hazırlayabiliriz!',
        icon: 'success',
        confirmButtonText: 'Harika!',
        timer: 2000
      });
      
      onComplete();
    } catch (error) {
      console.error('Error saving personalization:', error);
      Swal.fire('Hata', 'Veriler kaydedilirken bir hata oluştu.', 'error');
    }
  };

  const selectedCount = currentQuestion.type === 'multiple' 
    ? (answers[currentQuestion.key as keyof typeof answers] as string[]).length 
    : 0;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 z-[10000] flex flex-col">
      {/* Header */}
      <div className={`bg-gradient-to-r ${currentQuestion.color} p-6 sm:p-8 text-white`}>
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-white/20 backdrop-blur-sm p-4 rounded-full">
              <Icon className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-center mb-2">
            {currentQuestion.title}
          </h2>
          <p className="text-sm sm:text-base text-white/90 text-center">
            {currentQuestion.description}
          </p>
          
          {/* Progress */}
          <div className="mt-6">
            <div className="flex justify-between text-xs sm:text-sm mb-2">
              <span>Soru {currentStep + 1}/{questions.length}</span>
              {currentQuestion.type === 'multiple' && (
                <span>{selectedCount}/{currentQuestion.max} seçildi</span>
              )}
            </div>
            <div className="w-full bg-white/20 rounded-full h-2">
              <div
                className="bg-white h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Options */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-3xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {currentQuestion.options.map((option) => {
              const selected = isOptionSelected(option);
              return (
                <button
                  key={option}
                  onClick={() => handleOptionToggle(option)}
                  className={`p-4 sm:p-5 rounded-xl font-semibold text-sm sm:text-base transition-all duration-300 min-h-[60px] sm:min-h-[70px] flex items-center justify-center text-center ${
                    selected
                      ? `bg-gradient-to-r ${currentQuestion.color} text-white shadow-lg scale-105`
                      : 'bg-white text-gray-700 hover:shadow-md hover:scale-102 border-2 border-gray-200'
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="p-4 sm:p-6 bg-white/80 backdrop-blur-sm border-t border-gray-200">
        <div className="max-w-3xl mx-auto flex gap-3 sm:gap-4">
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            className={`px-6 py-3 sm:py-4 rounded-xl font-bold text-sm sm:text-base transition-all flex items-center justify-center gap-2 min-h-[56px] ${
              currentStep === 0
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300 hover:scale-105'
            }`}
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Geri</span>
          </button>
          
          <button
            onClick={handleNext}
            disabled={!canProceed()}
            className={`flex-1 px-6 py-3 sm:py-4 rounded-xl font-bold text-sm sm:text-base transition-all flex items-center justify-center gap-2 min-h-[56px] ${
              canProceed()
                ? `bg-gradient-to-r ${currentQuestion.color} text-white hover:shadow-xl hover:scale-105`
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <span>{currentStep === questions.length - 1 ? 'Tamamla' : 'Devam'}</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PersonalizationQuestions;
