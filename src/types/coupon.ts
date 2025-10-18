import { Timestamp } from 'firebase/firestore';

export interface UserCoupon {
  id: string;
  userId: string;
  type: 'penalty-discount' | 'extension';
  discountPercent?: 5 | 10 | 20 | 50 | 100;
  category: string | null; // null ise tüm kategorilerde geçerli
  isUsed: boolean;
  usedAt: Date | null;
  usedForPenaltyId: string | null;
  createdAt: Date;
  expiryDate: Date;
  wonFromSpin: boolean;
  status?: 'active' | 'used' | 'expired';
}

export interface CouponCreateData {
  userId: string;
  type: 'penalty-discount' | 'extension';
  discountPercent?: 5 | 10 | 20 | 50 | 100;
  category: string | null;
  expiryDays?: number; // Varsayılan 30 gün
}
