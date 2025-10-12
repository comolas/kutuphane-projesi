export type RewardType = 'category' | 'penalty-discount' | 'borrow-extension' | 'pass' | 'spin-again';

export interface SpinReward {
  id: string;
  name: string;
  type: RewardType;
  value?: number; // İndirim yüzdesi veya kategori için
  probability: number; // 0-100 arası
  isActive: boolean;
  icon: string;
  color: string;
  description?: string;
}

export interface UserSpinData {
  lastSpinDate: Date | null;
  spinCount: number;
  hasSpinToday: boolean;
  extraSpins: number; // "Yeniden Çevir" ödülü için
  borrowExtensionCount: 1 | 2; // Normal: 1, Ödül: 2
}

export interface SpinWheelSettings {
  id?: string;
  name?: string;
  rewards: SpinReward[];
  isActive: boolean;
  dailySpinLimit: number;
  createdAt?: Date;
}

export interface SpinResult {
  reward: SpinReward;
  category?: string; // Kategori keşfi için rastgele seçilen kategori
  rotation: number; // Çarkın döneceği açı
}
