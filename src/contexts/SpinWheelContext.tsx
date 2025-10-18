import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { collection, doc, getDoc, setDoc, updateDoc, Timestamp, addDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from './AuthContext';
import { SpinReward, UserSpinData, SpinWheelSettings, SpinResult } from '../types/spin';
import Swal from 'sweetalert2';

interface SpinWheelContextType {
  settings: SpinWheelSettings | null;
  userSpinData: UserSpinData | null;
  loading: boolean;
  canSpin: boolean;
  spinWheel: () => Promise<SpinResult | null>;
  getTimeUntilNextSpin: () => string;
}

const SpinWheelContext = createContext<SpinWheelContextType | undefined>(undefined);

const DEFAULT_REWARDS: SpinReward[] = [
  { id: 'category', name: 'Kategori Keşfi', type: 'category', probability: 35, isActive: true, icon: '🎯', color: '#3B82F6' },
  { id: 'discount-5', name: '%5 Ceza İndirimi', type: 'penalty-discount', value: 5, probability: 25, isActive: true, icon: '💰', color: '#10B981' },
  { id: 'borrow-ext', name: 'Ödünç Süresi +7 gün', type: 'borrow-extension', probability: 15, isActive: true, icon: '📚', color: '#EC4899' },
  { id: 'discount-10', name: '%10 Ceza İndirimi', type: 'penalty-discount', value: 10, probability: 12, isActive: true, icon: '💰', color: '#059669' },
  { id: 'discount-20', name: '%20 Ceza İndirimi', type: 'penalty-discount', value: 20, probability: 8, isActive: true, icon: '💰', color: '#F59E0B' },
  { id: 'pass', name: 'Pas', type: 'pass', probability: 2, isActive: true, icon: '📊', color: '#6B7280' },
  { id: 'discount-50', name: '%50 Ceza İndirimi', type: 'penalty-discount', value: 50, probability: 1.5, isActive: true, icon: '💰', color: '#EAB308' },
  { id: 'spin-again', name: 'Yeniden Çevir', type: 'spin-again', probability: 1, isActive: true, icon: '🔄', color: '#8B5CF6' },
  { id: 'discount-100', name: '%100 Ceza İndirimi', type: 'penalty-discount', value: 100, probability: 0.5, isActive: true, icon: '💰', color: '#A855F7' },
];

export const SpinWheelProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user: currentUser } = useAuth();
  const [settings, setSettings] = useState<SpinWheelSettings | null>(null);
  const [userSpinData, setUserSpinData] = useState<UserSpinData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadUserSpinData();
    }
  }, [currentUser]);

  const loadSettings = async () => {
    try {
      const settingsDoc = await getDoc(doc(db, 'settings', 'spinWheel'));
      if (settingsDoc.exists()) {
        setSettings(settingsDoc.data() as SpinWheelSettings);
      } else {
        const defaultSettings: SpinWheelSettings = {
          rewards: DEFAULT_REWARDS,
          isActive: true,
          dailySpinLimit: 1,
        };
        await setDoc(doc(db, 'settings', 'spinWheel'), defaultSettings);
        setSettings(defaultSettings);
      }
    } catch (error) {
      console.error('Error loading spin wheel settings:', error);
    }
  };

  const loadUserSpinData = async () => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      const userSpinDocRef = doc(db, 'users', currentUser.uid, 'spinData', 'current');
      const userSpinDoc = await getDoc(userSpinDocRef);
      
      if (userSpinDoc.exists()) {
        const data = userSpinDoc.data();
        const lastSpinDate = data.lastSpinDate?.toDate() || null;
        const hasSpinToday = lastSpinDate ? isToday(lastSpinDate) : false;
        
        setUserSpinData({
          lastSpinDate,
          spinCount: data.spinCount || 0,
          hasSpinToday,
          extraSpins: data.extraSpins || 0,
          borrowExtensionCount: data.borrowExtensionCount || 1,
        });
      } else {
        const initialData: UserSpinData = {
          lastSpinDate: null,
          spinCount: 0,
          hasSpinToday: false,
          extraSpins: 0,
          borrowExtensionCount: 1,
        };
        await setDoc(userSpinDocRef, {
          lastSpinDate: null,
          spinCount: 0,
          extraSpins: 0,
          borrowExtensionCount: 1,
        });
        setUserSpinData(initialData);
      }
    } catch (error) {
      console.error('Error loading user spin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    const compareDate = new Date(date);

    return (
      today.getUTCFullYear() === compareDate.getUTCFullYear() &&
      today.getUTCMonth() === compareDate.getUTCMonth() &&
      today.getUTCDate() === compareDate.getUTCDate()
    );
  };

  const canSpin = (): boolean => {
    if (!userSpinData || !settings?.isActive) return false;
    
    // Test için: Her zaman çevirebilir
    return true;
  };

  const selectReward = (): SpinReward | null => {
    if (!settings) return null;
    
    const activeRewards = settings.rewards.filter(r => r.isActive);
    const totalProbability = activeRewards.reduce((sum, r) => sum + r.probability, 0);
    const random = Math.random() * totalProbability;
    
    let cumulative = 0;
    for (const reward of activeRewards) {
      cumulative += reward.probability;
      if (random <= cumulative) {
        return reward;
      }
    }
    
    return activeRewards[0];
  };

  const spinWheel = async (): Promise<SpinResult | null> => {
    if (!currentUser || !settings) {
      Swal.fire('Uyarı', 'Şu anda çark çeviremezsiniz.', 'warning');
      return null;
    }

    try {
      const reward = selectReward();
      if (!reward) return null;

      const categories = ['D-RMN', 'D-TY', 'D-DĞ', 'D-HK', 'DRG', 'MNG', 'TR-DĞ', 'TR-RMN', 'TR-HK', 'TR-ŞR', 'TR-TY', 'Ç-RMN', 'İNG'];
      const randomCategory = reward.type === 'category' 
        ? categories[Math.floor(Math.random() * categories.length)]
        : undefined;

      const activeRewards = settings.rewards.filter(r => r.isActive);
      const rewardIndex = activeRewards.findIndex(r => r.id === reward.id);
      const segmentAngle = 360 / activeRewards.length;
      const baseRotation = 360 * 5; // 5 tam tur
      const targetAngle = 360 - (rewardIndex * segmentAngle + segmentAngle / 2);
      const rotation = baseRotation + targetAngle;

      const now = new Date();
      const updateData: any = {
        lastSpinDate: Timestamp.fromDate(now),
        spinCount: (userSpinData?.spinCount || 0) + 1,
      };

      // Yeniden Çevir ödülü kazandıysa extraSpins artır
      if (reward.type === 'spin-again') {
        updateData.extraSpins = (userSpinData?.extraSpins || 0) + 1;
      } else if (userSpinData?.extraSpins && userSpinData.extraSpins > 0) {
        // Extra spin kullanıldıysa azalt
        updateData.extraSpins = userSpinData.extraSpins - 1;
      }

      // Süre uzatma ödülü kazandıysa borrowExtensionCount'u 2 yap
      if (reward.type === 'borrow-extension') {
        updateData.borrowExtensionCount = 2;
      }

      const userSpinDocRef = doc(db, 'users', currentUser.uid, 'spinData', 'current');
      await updateDoc(userSpinDocRef, updateData);

      // Spin log kaydet
      await addDoc(collection(db, 'spinLogs'), {
        userId: currentUser.uid,
        rewardId: reward.id,
        rewardName: reward.name,
        rewardType: reward.type,
        rewardValue: reward.value || null,
        category: randomCategory || null,
        timestamp: Timestamp.now(),
      });

      await loadUserSpinData();

      return {
        reward,
        category: randomCategory,
        rotation,
      };
    } catch (error) {
      console.error('Error spinning wheel:', error);
      Swal.fire('Hata', 'Çark çevrilirken bir hata oluştu.', 'error');
      return null;
    }
  };

  const getTimeUntilNextSpin = (): string => {
    if (!userSpinData?.lastSpinDate || userSpinData.extraSpins > 0) return '00:00:00';

    const now = new Date();
    
    // Bir sonraki gece yarısını hesapla (lokal saat)
    const tomorrow = new Date(now);
    tomorrow.setHours(24, 0, 0, 0);

    const diff = tomorrow.getTime() - now.getTime();
    if (diff <= 0) return '00:00:00';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const canSpinValue = canSpin();

  return (
    <SpinWheelContext.Provider value={{
      settings,
      userSpinData,
      loading,
      canSpin: canSpinValue,
      spinWheel,
      getTimeUntilNextSpin,
    }}>
      {children}
    </SpinWheelContext.Provider>
  );
};

export const useSpinWheel = () => {
  const context = useContext(SpinWheelContext);
  if (!context) {
    throw new Error('useSpinWheel must be used within SpinWheelProvider');
  }
  return context;
};
