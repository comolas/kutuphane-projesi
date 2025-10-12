import React from 'react';
import { useCoupons } from '../../contexts/CouponContext';
import { Ticket, Calendar, Tag, CheckCircle, XCircle } from 'lucide-react';

const MyCoupons: React.FC = () => {
  const { coupons, loading } = useCoupons();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-lg font-semibold text-gray-700">Kuponlar yükleniyor...</p>
        </div>
      </div>
    );
  }

  const activeCoupons = coupons.filter(c => !c.isUsed);
  const usedCoupons = coupons.filter(c => c.isUsed);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg p-6">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3 flex items-center gap-3">
            <Ticket className="w-8 h-8 text-indigo-600" />
            Kuponlarım
          </h2>
          <p className="text-gray-600 text-lg">Çark çevirerek kazandığınız indirim kuponları</p>
        </div>
      </div>

      {/* Aktif Kuponlar */}
      <div className="mb-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <CheckCircle className="w-6 h-6 text-green-600" />
          Aktif Kuponlar ({activeCoupons.length})
        </h3>

        {activeCoupons.length === 0 ? (
          <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg p-12 text-center">
            <Ticket className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">Henüz aktif kuponunuz yok</p>
            <p className="text-gray-400 text-sm mt-2">Çark çevirerek kupon kazanabilirsiniz!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                  <h4 className="text-xl font-bold mb-2">Ceza İndirimi</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4" />
                      <span>{coupon.category || 'Tüm Kategoriler'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>SKT: {coupon.expiryDate.toLocaleDateString('tr-TR')}</span>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/30">
                    <p className="text-xs opacity-90">
                      {Math.ceil((coupon.expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} gün kaldı
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
          <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <XCircle className="w-6 h-6 text-gray-600" />
            Kullanılmış Kuponlar ({usedCoupons.length})
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                  <h4 className="text-xl font-bold mb-2">Ceza İndirimi</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4" />
                      <span>{coupon.category || 'Tüm Kategoriler'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>Kullanıldı: {coupon.usedAt?.toLocaleDateString('tr-TR')}</span>
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
