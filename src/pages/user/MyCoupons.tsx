import React from 'react';
import { useTranslation } from 'react-i18next';
import { useCoupons } from '../../contexts/CouponContext';
import { Ticket, Calendar, Tag, CheckCircle, XCircle, ChevronLeft } from 'lucide-react';

const MyCoupons: React.FC = () => {
  const { t } = useTranslation();
  const { coupons, loading } = useCoupons();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-lg font-semibold text-gray-700">{t('coupons.loading')}</p>
        </div>
      </div>
    );
  }

  const activeCoupons = coupons.filter(c => !c.isUsed);
  const usedCoupons = coupons.filter(c => c.isUsed);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
      {/* Geri Dön Butonu */}
      <div className="mb-4">
        <button
          onClick={() => window.history.back()}
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <ChevronLeft className="w-5 h-5 mr-1" />
          {t('common.back')}
        </button>
      </div>
      
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg p-4 sm:p-6">
          <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2 sm:mb-3 flex items-center gap-2 sm:gap-3">
            <Ticket className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-600" />
            {t('coupons.title')}
          </h2>
          <p className="text-gray-600 text-sm sm:text-lg">{t('coupons.description')}</p>
        </div>
      </div>

      {/* Aktif Kuponlar */}
      <div className="mb-6 sm:mb-8">
        <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
          {t('coupons.activeCoupons')} ({activeCoupons.length})
        </h3>

        {activeCoupons.length === 0 ? (
          <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg p-8 sm:p-12 text-center">
            <Ticket className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">{t('coupons.noActiveCoupons')}</p>
            <p className="text-gray-400 text-sm mt-2">{t('coupons.spinToWin')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {activeCoupons.map(coupon => (
              <div
                key={coupon.id}
                className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg p-6 text-white relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-5xl font-bold">%{coupon.discountPercent}</span>
                    <Ticket className="w-8 h-8" />
                  </div>
                  <h4 className="text-xl font-bold mb-2">{t('coupons.fineDiscount')}</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4" />
                      <span>{coupon.category || t('coupons.allCategories')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>{t('coupons.expiry')}: {coupon.expiryDate.toLocaleDateString('tr-TR')}</span>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/30">
                    <p className="text-xs opacity-90">
                      {t('coupons.daysLeft', { count: Math.ceil((coupon.expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Kullanılmış Kuponlar */}
      {usedCoupons.length > 0 && (
        <div>
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
            <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
            {t('coupons.usedCoupons')} ({usedCoupons.length})
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {usedCoupons.map(coupon => (
              <div
                key={coupon.id}
                className="bg-gray-300 rounded-2xl shadow-lg p-6 text-gray-600 relative overflow-hidden opacity-60"
              >
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-5xl font-bold">%{coupon.discountPercent}</span>
                    <Ticket className="w-8 h-8" />
                  </div>
                  <h4 className="text-xl font-bold mb-2">{t('coupons.fineDiscount')}</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4" />
                      <span>{coupon.category || t('coupons.allCategories')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>{t('coupons.used')}: {coupon.usedAt?.toLocaleDateString('tr-TR')}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MyCoupons;
