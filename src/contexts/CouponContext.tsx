import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, Timestamp, orderBy, collectionGroup } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from './AuthContext';
import { UserCoupon, CouponCreateData } from '../types/coupon';
import Swal from 'sweetalert2';

interface CouponContextType {
  coupons: UserCoupon[];
  loading: boolean;
  createCoupon: (data: CouponCreateData) => Promise<void>;
  useCoupon: (couponId: string, penaltyId: string, userId: string) => Promise<void>;
  getAvailableCouponsForCategory: (category: string) => UserCoupon[];
  refreshCoupons: () => Promise<void>;
}

const CouponContext = createContext<CouponContextType | undefined>(undefined);

export const CouponProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user: currentUser } = useAuth();
  const [coupons, setCoupons] = useState<UserCoupon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser) {
      loadCoupons();
    } else {
      setCoupons([]);
      setLoading(false);
    }
  }, [currentUser]);

  const loadCoupons = async () => {
    if (!currentUser) return;

    setLoading(true);
    try {
      let snapshot;
      if (currentUser.role === 'admin') {
        const couponsRef = collectionGroup(db, 'coupons');
        snapshot = await getDocs(query(couponsRef, orderBy('createdAt', 'desc')));
      } else {
        const couponsRef = collection(db, 'users', currentUser.uid, 'coupons');
        snapshot = await getDocs(query(couponsRef, orderBy('createdAt', 'desc')));
      }

      const loadedCoupons: UserCoupon[] = snapshot.docs.map(doc => {
        const data = doc.data();
        const userId = currentUser.role === 'admin' ? doc.ref.parent.parent!.id : currentUser.uid;
        return {
          id: doc.id,
          userId: userId,
          type: data.type,
          discountPercent: data.discountPercent,
          category: data.category,
          isUsed: data.isUsed,
          usedAt: data.usedAt?.toDate() || null,
          usedForPenaltyId: data.usedForPenaltyId || null,
          createdAt: data.createdAt.toDate(),
          expiryDate: data.expiryDate.toDate(),
          wonFromSpin: data.wonFromSpin || false,
          status: data.status || 'active',
        };
      });

      setCoupons(loadedCoupons);
    } catch (error) {
      console.error('Error loading coupons:', error);
      Swal.fire('Hata', 'Kuponlar yüklenirken bir hata oluştu.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const createCoupon = async (data: CouponCreateData) => {
    try {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + (data.expiryDays || 30));

      const couponData: any = {
        userId: data.userId,
        type: data.type,
        category: data.category,
        isUsed: false,
        usedAt: null,
        usedForPenaltyId: null,
        createdAt: Timestamp.now(),
        expiryDate: Timestamp.fromDate(expiryDate),
        wonFromSpin: true,
        status: 'active',
      };

      if (data.type === 'penalty-discount' && data.discountPercent) {
        couponData.discountPercent = data.discountPercent;
      }

      await addDoc(collection(db, 'users', data.userId, 'coupons'), couponData);
      
      await loadCoupons();

    } catch (error) {
      console.error('Error creating coupon:', error);
      throw error;
    }
  };

  const useCoupon = async (couponId: string, penaltyId: string, userId: string) => {
    try {
      const couponRef = doc(db, 'users', userId, 'coupons', couponId);
      await updateDoc(couponRef, {
        isUsed: true,
        usedAt: Timestamp.now(),
        usedForPenaltyId: penaltyId,
      });

      await loadCoupons();
    } catch (error) {
      console.error('Error using coupon:', error);
      throw error;
    }
  };

  const getAvailableCouponsForCategory = (category: string): UserCoupon[] => {
    return coupons.filter(coupon => 
      !coupon.isUsed && 
      (coupon.category === null || coupon.category === category) &&
      coupon.expiryDate > new Date()
    );
  };

  const refreshCoupons = async () => {
    await loadCoupons();
  };

  return (
    <CouponContext.Provider value={{
      coupons,
      loading,
      createCoupon,
      useCoupon,
      getAvailableCouponsForCategory,
      refreshCoupons,
    }}>
      {children}
    </CouponContext.Provider>
  );
};

export const useCoupons = () => {
  const context = useContext(CouponContext);
  if (!context) {
    throw new Error('useCoupons must be used within CouponProvider');
  }
  return context;
};
