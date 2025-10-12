import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Confetti from 'react-confetti';
import { SpinResult } from '../../types/spin';
import { X } from 'lucide-react';

interface RewardModalProps {
  result: SpinResult;
  onClose: () => void;
}

const RewardModal: React.FC<RewardModalProps> = ({ result, onClose }) => {
  const navigate = useNavigate();
  const [showConfetti, setShowConfetti] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    if (result.reward.type !== 'pass') {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 8000);
    }

    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [result]);

  const handleCategoryRedirect = () => {
    if (result.category) {
      // Katalog sayfasına kategori filtresiyle yönlendir
      navigate('/catalog', { state: { selectedCategory: result.category } });
      onClose();
    }
  };

  const getRewardContent = () => {
    switch (result.reward.type) {
      case 'category':
        return {
          title: '🎯 Kategori Keşfi!',
          message: `Bugün senin için "${result.category}" kategorisini seçtik!`,
          description: 'Bu kategorideki harika kitapları keşfet.',
          buttonText: 'Kategoriye Git',
          buttonAction: handleCategoryRedirect,
          bgColor: 'from-blue-500 to-cyan-600',
        };

      case 'penalty-discount':
        return {
          title: '💰 Tebrikler!',
          message: `%${result.reward.value} Ceza İndirimi Kazandınız!`,
          description: result.category 
            ? `Bu kuponu "${result.category}" kategorisi kitaplarının cezalarında kullanabilirsiniz.`
            : 'Bu kuponu tüm kitapların cezalarında kullanabilirsiniz.',
          info: 'Son Kullanma: 30 gün',
          buttonText: 'Kuponlarım',
          buttonAction: () => { navigate('/fines'); onClose(); },
          bgColor: 'from-green-500 to-emerald-600',
        };

      case 'borrow-extension':
        return {
          title: '📚 Harika!',
          message: 'Ödünç Süresi Uzatma Hakkı Kazandınız!',
          description: 'Artık kitaplarınızı 2 kez uzatabilirsiniz! Bu özellik tüm aktif ödünç aldığınız kitaplara uygulanacaktır.',
          buttonText: 'Kitaplarım',
          buttonAction: () => { navigate('/borrowed-books'); onClose(); },
          bgColor: 'from-pink-500 to-rose-600',
        };

      case 'pass':
        return {
          title: '😔 Pas',
          message: 'Bu sefer şans yaver gitmedi!',
          description: 'Yarın tekrar dene, belki şansın yaver gider!',
          buttonText: 'Tamam',
          buttonAction: onClose,
          bgColor: 'from-gray-500 to-gray-600',
        };

      case 'spin-again':
        return {
          title: '🎊 SÜPER!',
          message: 'Bir Kez Daha Çevirebilirsin!',
          description: 'Ekstra çark hakkı kazandın!',
          buttonText: 'Harika!',
          buttonAction: onClose,
          bgColor: 'from-purple-500 to-pink-600',
        };

      default:
        return {
          title: '🎁 Ödül',
          message: result.reward.name,
          description: '',
          buttonText: 'Tamam',
          buttonAction: onClose,
          bgColor: 'from-indigo-500 to-purple-600',
        };
    }
  };

  const content = getRewardContent();

  return (
    <>
      {showConfetti && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={true}
          numberOfPieces={300}
          gravity={0.15}
          wind={0.01}
        />
      )}

      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-2 sm:p-4 animate-fade-in">
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-md w-full overflow-hidden max-h-[95vh] overflow-y-auto animate-scale-in">
          {/* Header */}
          <div className={`bg-gradient-to-r ${content.bgColor} p-6 sm:p-8 text-white text-center relative`}>
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="text-5xl sm:text-6xl mb-3 sm:mb-4 animate-bounce">{result.reward.icon}</div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-2">{content.title}</h2>
            <p className="text-lg sm:text-xl font-semibold">{content.message}</p>
          </div>

          {/* Content */}
          <div className="p-6 sm:p-8 text-center space-y-4">
            <p className="text-gray-700 text-base sm:text-lg">{content.description}</p>
            
            {content.info && (
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-3">
                <p className="text-sm text-yellow-800 font-semibold">{content.info}</p>
              </div>
            )}

            <button
              onClick={content.buttonAction}
              className={`w-full px-6 py-3 sm:py-4 bg-gradient-to-r ${content.bgColor} text-white rounded-xl font-bold text-base sm:text-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300 touch-manipulation min-h-[48px]`}
            >
              {content.buttonText}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default RewardModal;
