import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { collection, getDocs, addDoc, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { PhysicalReward, RewardCoupon, RewardClaim } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Gift, Package, Clock, CheckCircle, XCircle, Award, ArrowLeft } from 'lucide-react';
import Swal from 'sweetalert2';

const RewardStorePage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { userData, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'rewards' | 'coupons' | 'claims'>('rewards');
  const [rewards, setRewards] = useState<PhysicalReward[]>([]);
  const [coupons, setCoupons] = useState<RewardCoupon[]>([]);
  const [claims, setClaims] = useState<RewardClaim[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!userData?.campusId || !user?.uid) return;
    setLoading(true);

    const rewardsQ = query(
      collection(db, 'physicalRewards'),
      where('campusId', '==', userData.campusId),
      where('isActive', '==', true)
    );
    const couponsQ = query(
      collection(db, 'rewardCoupons'),
      where('userId', '==', user.uid),
      orderBy('earnedAt', 'desc')
    );
    const claimsQ = query(
      collection(db, 'rewardClaims'),
      where('userId', '==', user.uid),
      orderBy('claimedAt', 'desc')
    );

    const [rewardsSnap, couponsSnap, claimsSnap] = await Promise.all([
      getDocs(rewardsQ),
      getDocs(couponsQ),
      getDocs(claimsQ)
    ]);

    setRewards(rewardsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PhysicalReward)));
    setCoupons(couponsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as RewardCoupon)));
    setClaims(claimsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as RewardClaim)));
    setLoading(false);
  };

  const availableCoupons = coupons.filter(c => !c.isUsed).length;

  const handleClaimReward = async (reward: PhysicalReward) => {
    if (availableCoupons < reward.requiredCoupons) {
      Swal.fire(t('rewardStore.insufficientCoupons'), t('rewardStore.insufficientCouponsText', { count: reward.requiredCoupons }), 'error');
      return;
    }

    if (reward.stock <= 0) {
      Swal.fire(t('rewardStore.outOfStockTitle'), t('rewardStore.outOfStockText'), 'error');
      return;
    }

    const result = await Swal.fire({
      title: t('rewardStore.claimRewardTitle'),
      html: t('rewardStore.claimRewardText', { name: reward.name, count: reward.requiredCoupons }),
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: t('rewardStore.confirmClaim'),
      cancelButtonText: t('rewardStore.cancel')
    });

    if (result.isConfirmed) {
      await addDoc(collection(db, 'rewardClaims'), {
        userId: user!.uid,
        userName: userData!.displayName,
        userEmail: user!.email,
        userClass: userData!.studentClass,
        rewardId: reward.id,
        rewardName: reward.name,
        couponsUsed: reward.requiredCoupons,
        claimedAt: Timestamp.now(),
        status: 'pending',
        campusId: userData!.campusId
      });

      // Kuponları kullanıldı olarak işaretle
      const unusedCoupons = coupons.filter(c => !c.isUsed).slice(0, reward.requiredCoupons);
      for (const coupon of unusedCoupons) {
        const couponRef = collection(db, 'rewardCoupons');
        const couponDoc = query(couponRef, where('__name__', '==', coupon.id));
        const snapshot = await getDocs(couponDoc);
        if (!snapshot.empty) {
          const docRef = snapshot.docs[0].ref;
          await docRef.update({
            isUsed: true,
            usedAt: Timestamp.now(),
            usedForRewardId: reward.id
          });
        }
      }

      Swal.fire(t('rewardStore.claimSuccess'), t('rewardStore.claimSuccessText'), 'success');
      loadData();
    }
  };

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-blue-100 text-blue-800',
    delivered: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-4 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => window.history.back()}
          className="mb-4 flex items-center text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          {t('rewardStore.backButton')}
        </button>

        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{t('rewardStore.title')}</h1>
          <p className="text-sm sm:text-base text-gray-600">{t('rewardStore.description')}</p>
        </div>

        {/* Kupon Sayısı */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl shadow-lg p-4 sm:p-6 mb-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm opacity-90">{t('rewardStore.availableCoupons')}</p>
              <p className="text-3xl sm:text-4xl font-bold">{availableCoupons}</p>
            </div>
            <Gift className="w-12 h-12 sm:w-16 sm:h-16 opacity-50" />
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-lg mb-6">
          <div className="flex border-b overflow-x-auto">
            <button
              onClick={() => setActiveTab('rewards')}
              className={`flex-1 px-3 sm:px-6 py-3 sm:py-4 text-sm sm:text-base font-semibold transition-colors whitespace-nowrap ${
                activeTab === 'rewards'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Award className="w-4 h-4 sm:w-5 sm:h-5 inline mr-1 sm:mr-2" />
              {t('rewardStore.tabs.rewards')}
            </button>
            <button
              onClick={() => setActiveTab('coupons')}
              className={`flex-1 px-3 sm:px-6 py-3 sm:py-4 text-sm sm:text-base font-semibold transition-colors whitespace-nowrap ${
                activeTab === 'coupons'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Gift className="w-4 h-4 sm:w-5 sm:h-5 inline mr-1 sm:mr-2" />
              {t('rewardStore.tabs.coupons')}
            </button>
            <button
              onClick={() => setActiveTab('claims')}
              className={`flex-1 px-3 sm:px-6 py-3 sm:py-4 text-sm sm:text-base font-semibold transition-colors whitespace-nowrap ${
                activeTab === 'claims'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Package className="w-4 h-4 sm:w-5 sm:h-5 inline mr-1 sm:mr-2" />
              {t('rewardStore.tabs.claims')}
            </button>
          </div>

          <div className="p-4 sm:p-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              </div>
            ) : (
              <>
                {/* Ödüller Tab */}
                {activeTab === 'rewards' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {rewards.map(reward => (
                      <div key={reward.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-xl transition-shadow">
                        <img src={reward.image} alt={reward.name} className="w-full h-40 sm:h-48 object-cover" />
                        <div className="p-3 sm:p-4">
                          <span className="text-xs font-medium text-gray-500">{t(`rewardStore.categories.${reward.category}`)}</span>
                          <h3 className="text-base sm:text-lg font-bold text-gray-900 mt-1 mb-2 line-clamp-1">{reward.name}</h3>
                          <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4 line-clamp-2">{reward.description}</p>
                          <div className="flex items-center justify-between mb-3 sm:mb-4">
                            <div className="flex items-center">
                              <Gift className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-600 mr-1" />
                              <span className="text-xs sm:text-sm font-semibold text-indigo-600">{reward.requiredCoupons} {t('rewardStore.couponLabel')}</span>
                            </div>
                            <span className="text-xs text-gray-500">{t('rewardStore.stock')}: {reward.stock}</span>
                          </div>
                          <button
                            onClick={() => handleClaimReward(reward)}
                            disabled={availableCoupons < reward.requiredCoupons || reward.stock <= 0}
                            className="w-full px-4 py-2 text-sm sm:text-base bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {reward.stock <= 0 ? t('rewardStore.outOfStock') : t('rewardStore.claim')}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Kuponlarım Tab */}
                {activeTab === 'coupons' && (
                  <div>
                    <div className="mb-4 sm:mb-6 text-center">
                      <p className="text-4xl sm:text-5xl font-bold text-indigo-600">{availableCoupons}</p>
                      <p className="text-sm sm:text-base text-gray-600 mt-2">{t('rewardStore.availableCouponsCount')}</p>
                    </div>
                    <div className="space-y-3">
                      {coupons.map(coupon => (
                        <div key={coupon.id} className={`p-3 sm:p-4 rounded-lg border ${coupon.isUsed ? 'bg-gray-50 border-gray-200' : 'bg-green-50 border-green-200'}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm sm:text-base font-semibold text-gray-900">
                                {coupon.isUsed ? t('rewardStore.usedCoupon') : t('rewardStore.activeCoupon')}
                              </p>
                              <p className="text-xs sm:text-sm text-gray-600">
                                {t('rewardStore.earnedOn')}: {coupon.earnedAt?.toDate().toLocaleDateString(i18n.language === 'tr' ? 'tr-TR' : 'en-US')}
                              </p>
                              {coupon.isUsed && coupon.usedAt && (
                                <p className="text-xs text-gray-500">
                                  {t('rewardStore.usedOn')}: {coupon.usedAt.toDate().toLocaleDateString(i18n.language === 'tr' ? 'tr-TR' : 'en-US')}
                                </p>
                              )}
                            </div>
                            {coupon.isUsed ? (
                              <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400 flex-shrink-0 ml-2" />
                            ) : (
                              <Gift className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 flex-shrink-0 ml-2" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    {coupons.length === 0 && (
                      <div className="text-center py-12 text-sm sm:text-base text-gray-500">
                        {t('rewardStore.noCoupons')}
                      </div>
                    )}
                  </div>
                )}

                {/* Taleplerim Tab */}
                {activeTab === 'claims' && (
                  <div className="space-y-3 sm:space-y-4">
                    {claims.map(claim => (
                      <div key={claim.id} className="border border-gray-200 rounded-lg p-3 sm:p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm sm:text-base font-bold text-gray-900 line-clamp-1">{claim.rewardName}</h3>
                            <p className="text-xs sm:text-sm text-gray-600 mt-1">
                              {t('rewardStore.couponsUsed', { count: claim.couponsUsed })}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {t('rewardStore.claimDate')}: {claim.claimedAt?.toDate().toLocaleDateString(i18n.language === 'tr' ? 'tr-TR' : 'en-US')}
                            </p>
                            {claim.status === 'approved' && (
                              <p className="text-xs sm:text-sm text-blue-600 mt-2">
                                {t('rewardStore.approved')}
                              </p>
                            )}
                            {claim.status === 'delivered' && claim.deliveredAt && (
                              <p className="text-xs sm:text-sm text-green-600 mt-2">
                                {t('rewardStore.delivered', { date: claim.deliveredAt.toDate().toLocaleDateString(i18n.language === 'tr' ? 'tr-TR' : 'en-US') })}
                              </p>
                            )}
                            {claim.status === 'rejected' && claim.rejectedReason && (
                              <p className="text-xs sm:text-sm text-red-600 mt-2">
                                {t('rewardStore.rejected', { reason: claim.rejectedReason })}
                              </p>
                            )}
                          </div>
                          <span className={`px-2 sm:px-3 py-1 rounded text-xs font-semibold whitespace-nowrap flex-shrink-0 ${statusColors[claim.status]}`}>
                            {t(`rewardStore.status.${claim.status}`)}
                          </span>
                        </div>
                      </div>
                    ))}
                    {claims.length === 0 && (
                      <div className="text-center py-12 text-sm sm:text-base text-gray-500">
                        {t('rewardStore.noClaims')}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RewardStorePage;
