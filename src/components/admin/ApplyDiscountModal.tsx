import React, { useState, useEffect } from 'react';
import { X, Ticket } from 'lucide-react';
import { UserCoupon } from '../../types/coupon';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';

interface ApplyDiscountModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  bookCategory: string;
  originalAmount: number;
  onApply: (couponId: string, discountPercent: number) => void;
}

const ApplyDiscountModal: React.FC<ApplyDiscountModalProps> = ({
  isOpen,
  onClose,
  userId,
  bookCategory,
  originalAmount,
  onApply,
}) => {
  const [selectedCoupon, setSelectedCoupon] = useState<string | null>(null);
  const [availableCoupons, setAvailableCoupons] = useState<UserCoupon[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadUserCoupons = async () => {
      if (!isOpen || !userId) return;
      
      setLoading(true);
      try {
        const couponsRef = collection(db, 'users', userId, 'coupons');
        const q = query(couponsRef, where('isUsed', '==', false));
        const snapshot = await getDocs(q);
        
        const now = new Date();
        const userCoupons: UserCoupon[] = snapshot.docs
          .map(doc => {
            const data = doc.data();
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
            };
          })
          .filter(c => 
            c.expiryDate > now &&
            (c.category === null || c.category === bookCategory)
          );
        
        setAvailableCoupons(userCoupons);
        setSelectedCoupon(null);
      } catch (error) {
        console.error('Error loading user coupons:', error);
        setAvailableCoupons([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadUserCoupons();
  }, [isOpen, userId, bookCategory]);

  const handleApply = () => {
    if (!selectedCoupon) return;
    const coupon = availableCoupons.find(c => c.id === selectedCoupon);
    if (coupon) {
      onApply(coupon.id, coupon.discountPercent);
      onClose();
    }
  };

  const calculateDiscount = (percent: number) => {
    return (originalAmount * percent) / 100;
  };

  const calculateFinalAmount = (percent: number) => {
    return originalAmount - calculateDiscount(percent);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6 text-white rounded-t-2xl">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Ticket className="w-6 h-6" />
              İndirim Kuponu Uygula
            </h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Ceza Tutarı:</span>
              <span className="text-lg font-bold text-gray-900">{originalAmount} TL</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Kategori:</span>
              <span className="text-sm font-semibold text-gray-700">{bookCategory}</span>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-green-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Kuponlar yükleniyor...</p>
            </div>
          ) : availableCoupons.length === 0 ? (
            <div className="text-center py-8">
              <Ticket className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">Bu kullanıcının kullanılabilir kuponu yok</p>
            </div>
          ) : (
            <>
              <h4 className="text-sm font-bold text-gray-700 mb-3">Kullanılabilir Kuponlar:</h4>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {availableCoupons.map(coupon => (
                  <label
                    key={coupon.id}
                    className={`block p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedCoupon === coupon.id
                        ? 'border-green-600 bg-green-50'
                        : 'border-gray-200 hover:border-green-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="coupon"
                        value={coupon.id}
                        checked={selectedCoupon === coupon.id}
                        onChange={() => setSelectedCoupon(coupon.id)}
                        className="mt-1 w-4 h-4 text-green-600"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-2xl font-bold text-green-600">%{coupon.discountPercent}</span>
                          <span className="text-xs text-gray-500">
                            SKT: {coupon.expiryDate.toLocaleDateString('tr-TR')}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 mb-1">
                          {coupon.category || 'Tüm Kategoriler'}
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">İndirim:</span>
                          <span className="font-bold text-green-600">-{calculateDiscount(coupon.discountPercent).toFixed(2)} TL</span>
                        </div>
                        <div className="flex justify-between items-center text-sm mt-1">
                          <span className="text-gray-600">Yeni Tutar:</span>
                          <span className="font-bold text-gray-900">{calculateFinalAmount(coupon.discountPercent).toFixed(2)} TL</span>
                        </div>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all font-semibold"
          >
            İptal
          </button>
          <button
            onClick={handleApply}
            disabled={!selectedCoupon}
            className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            Kuponu Uygula
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApplyDiscountModal;
