import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { doc, updateDoc, increment, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useSpinWheel } from '../../contexts/SpinWheelContext';
import { useCoupons } from '../../contexts/CouponContext';
import { useAuth } from '../../contexts/AuthContext';
import SpinWheel from './SpinWheel';
import RewardModal from './RewardModal';
import { SpinResult } from '../../types/spin';
import Swal from 'sweetalert2';

interface SpinWheelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SpinWheelModal: React.FC<SpinWheelModalProps> = ({ isOpen, onClose }) => {
  const { settings, userSpinData, canSpin, spinWheel, getTimeUntilNextSpin } = useSpinWheel();
  const { createCoupon } = useCoupons();
  const { user } = useAuth();
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [spinResult, setSpinResult] = useState<SpinResult | null>(null);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [countdown, setCountdown] = useState('00:00:00');
  const [winningReward, setWinningReward] = useState<SpinResult['reward'] | null>(null);



  const handleSpin = async () => {
    if (isSpinning || !user) return;
    setIsSpinning(true);
    const result = await spinWheel();
    console.log('Spin result:', result);

    if (!result) {
      setIsSpinning(false);
      return;
    }

    setRotation(result.rotation);
    setSpinResult(result);

    const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
    await delay(4000); // Wait for spin animation to finish

    setIsSpinning(false);
    setWinningReward(result.reward);

    // Handle the reward
    try {
      const userSpinDocRef = doc(db, 'users', user.uid, 'spinData', 'current');

      if (result.reward.type === 'spin-again') {
        await updateDoc(userSpinDocRef, {
          extraSpins: increment(1)
        });
        Swal.fire({
          title: 'Tebrikler!',
          text: 'Bir çevirme hakkı daha kazandınız!',
          icon: 'success',
          confirmButtonText: 'Harika!'
        });
        setWinningReward(null);
        setSpinResult(null);
        return; // Skip reward modal
      }

      if ((result.reward.type === 'penalty-discount' || result.reward.type === 'shop-discount') && result.reward.value) {
        await createCoupon({
          userId: user.uid,
          type: result.reward.type,
          discountPercent: result.reward.value as 5 | 10 | 20 | 50 | 100,
          category: result.category || null,
        });
      }

      if (result.reward.type === 'borrow-extension') {
        // Tüm aktif ödünç alınan kitapların maxExtensions değerini 2 yap
        const borrowedBooksRef = collection(db, 'borrowedBooks');
        const q = query(borrowedBooksRef, where('userId', '==', user.uid), where('returnStatus', '==', 'borrowed'));
        const snapshot = await getDocs(q);
        
        const batch = writeBatch(db);
        snapshot.docs.forEach(docSnap => {
          batch.update(docSnap.ref, { maxExtensions: 2 });
        });
        await batch.commit();
      }

    } catch (error) {
      console.error('Error processing spin reward:', error);
      Swal.fire('Hata', 'Ödül işlenirken bir hata oluştu.', 'error');
    }

    // Show reward modal for all other rewards
    await delay(2000); // Wait for win animation
    setShowRewardModal(true);
    setWinningReward(null);
  };

  const handleRewardModalClose = () => {
    setShowRewardModal(false);
    setSpinResult(null);
  };

  if (!isOpen) return null;

  const activeRewards = settings?.rewards.filter(r => r.isActive) || [];

  return (
    <>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4">
        <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-yellow-50 rounded-2xl sm:rounded-3xl shadow-2xl max-w-2xl w-full border-2 sm:border-4 border-white/50 relative overflow-hidden max-h-[95vh] overflow-y-auto" style={{
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 100px rgba(168, 85, 247, 0.4)',
        }}>
          {/* Dekoratif Arka Plan - Animasyonlu */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-200/30 via-pink-200/30 to-yellow-200/30 pointer-events-none animate-pulse"></div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-radial from-yellow-300/20 to-transparent rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-radial from-purple-300/20 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>

          {/* Header */}
          <div className="relative bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 p-4 sm:p-6 text-white" style={{
            boxShadow: 'inset 0 -2px 10px rgba(0, 0, 0, 0.2)',
          }}>
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <h2 className="text-2xl sm:text-3xl font-bold flex items-center gap-2 sm:gap-3">
              <span className="text-3xl sm:text-4xl">🎡</span>
              Şans Çarkı
            </h2>
            <p className="text-white/90 mt-1 sm:mt-2 text-sm sm:text-base">Bugünkü şansını dene ve ödül kazan!</p>
          </div>

          {/* Content */}
          <div className="relative p-4 sm:p-8">
            <SpinWheel
              rewards={activeRewards}
              rotation={rotation}
              isSpinning={isSpinning}
              onSpin={handleSpin}
              winningReward={winningReward}
            />

            {/* Bilgi ve Buton */}
            <div className="mt-8 text-center space-y-4">
              <div className="flex items-center justify-center gap-2 text-green-600 font-semibold">
                <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                Çark hakkınız var!
              </div>
              <button
                onClick={handleSpin}
                disabled={isSpinning}
                className="px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold text-base sm:text-lg hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 touch-manipulation min-h-[48px]"
              >
                {isSpinning ? 'Çark Dönüyor...' : 'ÇEVİR! 🎯'}
              </button>

            </div>

            {/* İstatistikler */}
            {userSpinData && (
              <div className="mt-6 bg-white/60 backdrop-blur-sm rounded-xl p-4 border-2 border-purple-200">
                <p className="text-sm text-gray-600 text-center">
                  Toplam Çevirme: <span className="font-bold text-purple-600">{userSpinData.spinCount}</span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ödül Modal */}
      {showRewardModal && spinResult && (
        <RewardModal
          result={spinResult}
          onClose={handleRewardModalClose}
        />
      )}
    </>
  );
};

export default SpinWheelModal;
