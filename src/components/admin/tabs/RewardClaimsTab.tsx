import React, { useState, useEffect } from 'react';
import { collection, getDocs, updateDoc, doc, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { RewardClaim } from '../../../types';
import { useAuth } from '../../../contexts/AuthContext';
import { CheckCircle, XCircle, Package, Clock, Filter } from 'lucide-react';
import Swal from 'sweetalert2';

const RewardClaimsTab: React.FC = () => {
  const { userData, user } = useAuth();
  const [claims, setClaims] = useState<RewardClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'delivered' | 'rejected'>('all');

  useEffect(() => {
    loadClaims();
  }, []);

  const loadClaims = async () => {
    if (!userData?.campusId) return;
    setLoading(true);
    const q = query(
      collection(db, 'rewardClaims'),
      where('campusId', '==', userData.campusId),
      orderBy('claimedAt', 'desc')
    );
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RewardClaim));
    setClaims(data);
    setLoading(false);
  };

  const handleApprove = async (claim: RewardClaim) => {
    const result = await Swal.fire({
      title: 'Talebi Onayla',
      text: `${claim.userName} kullanıcısının "${claim.rewardName}" talebi onaylanacak.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Onayla',
      cancelButtonText: 'İptal'
    });

    if (result.isConfirmed) {
      // Ödül stok kontrolü ve güncelleme
      const rewardRef = doc(db, 'physicalRewards', claim.rewardId);
      const rewardSnap = await getDocs(query(collection(db, 'physicalRewards'), where('__name__', '==', claim.rewardId)));
      
      if (!rewardSnap.empty) {
        const rewardData = rewardSnap.docs[0].data();
        const newStock = (rewardData.stock || 0) - 1;
        
        await updateDoc(rewardRef, {
          stock: Math.max(0, newStock),
          isActive: newStock > 0 ? rewardData.isActive : false
        });
      }

      await updateDoc(doc(db, 'rewardClaims', claim.id!), {
        status: 'approved',
        approvedBy: user?.uid,
        approvedAt: Timestamp.now()
      });
      Swal.fire('Onaylandı!', 'Talep onaylandı ve stok güncellendi.', 'success');
      loadClaims();
    }
  };

  const handleReject = async (claim: RewardClaim) => {
    const { value: reason } = await Swal.fire({
      title: 'Talebi Reddet',
      input: 'textarea',
      inputLabel: 'Red Nedeni',
      inputPlaceholder: 'Neden reddedildiğini açıklayın...',
      showCancelButton: true,
      confirmButtonText: 'Reddet',
      cancelButtonText: 'İptal'
    });

    if (reason) {
      // Reddedilen talep için kuponları geri ver
      const userCouponsRef = collection(db, 'users', claim.userId, 'rewardCoupons');
      const usedCouponsQuery = query(
        userCouponsRef,
        where('isUsed', '==', true),
        where('usedForRewardId', '==', claim.rewardId)
      );
      const usedCouponsSnap = await getDocs(usedCouponsQuery);
      
      // İlk N kuponu geri ver
      let returned = 0;
      for (const couponDoc of usedCouponsSnap.docs) {
        if (returned < claim.couponsUsed) {
          await updateDoc(couponDoc.ref, {
            isUsed: false,
            usedAt: null,
            usedForRewardId: null
          });
          returned++;
        }
      }

      await updateDoc(doc(db, 'rewardClaims', claim.id!), {
        status: 'rejected',
        rejectedReason: reason,
        approvedBy: user?.uid,
        approvedAt: Timestamp.now()
      });
      Swal.fire('Reddedildi!', 'Talep reddedildi ve kuponlar iade edildi.', 'success');
      loadClaims();
    }
  };

  const handleDeliver = async (claim: RewardClaim) => {
    const result = await Swal.fire({
      title: 'Teslim Edildi İşaretle',
      text: `${claim.userName} kullanıcısına ödül teslim edildi mi?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Evet, Teslim Edildi',
      cancelButtonText: 'İptal'
    });

    if (result.isConfirmed) {
      await updateDoc(doc(db, 'rewardClaims', claim.id!), {
        status: 'delivered',
        deliveredAt: Timestamp.now()
      });
      Swal.fire('Teslim Edildi!', 'Ödül teslim edildi olarak işaretlendi.', 'success');
      loadClaims();
    }
  };

  const filteredClaims = filterStatus === 'all' 
    ? claims 
    : claims.filter(c => c.status === filterStatus);

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-blue-100 text-blue-800',
    delivered: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800'
  };

  const statusLabels = {
    pending: 'Bekliyor',
    approved: 'Onaylandı',
    delivered: 'Teslim Edildi',
    rejected: 'Reddedildi'
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Ödül Talepleri</h2>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="flex-1 sm:flex-none px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm sm:text-base min-h-[44px] touch-manipulation"
          >
            <option value="all">Tümü</option>
            <option value="pending">Bekleyen</option>
            <option value="approved">Onaylanan</option>
            <option value="delivered">Teslim Edilen</option>
            <option value="rejected">Reddedilen</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kullanıcı</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ödül</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kupon</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarih</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredClaims.map(claim => (
                  <tr key={claim.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{claim.userName}</p>
                        <p className="text-xs text-gray-500">{claim.userClass}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{claim.rewardName}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{claim.couponsUsed}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {claim.claimedAt?.toDate().toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${statusColors[claim.status]}`}>
                        {statusLabels[claim.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {claim.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(claim)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg min-h-[44px] min-w-[44px] touch-manipulation"
                              title="Onayla"
                            >
                              <CheckCircle className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleReject(claim)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg min-h-[44px] min-w-[44px] touch-manipulation"
                              title="Reddet"
                            >
                              <XCircle className="w-5 h-5" />
                            </button>
                          </>
                        )}
                        {claim.status === 'approved' && (
                          <button
                            onClick={() => handleDeliver(claim)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg min-h-[44px] min-w-[44px] touch-manipulation"
                            title="Teslim Edildi"
                          >
                            <Package className="w-5 h-5" />
                          </button>
                        )}
                        {claim.status === 'rejected' && claim.rejectedReason && (
                          <button
                            onClick={() => Swal.fire('Red Nedeni', claim.rejectedReason, 'info')}
                            className="text-xs text-gray-600 hover:text-gray-800 min-h-[44px] touch-manipulation"
                          >
                            Nedeni Gör
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Mobile Cards */}
          <div className="md:hidden space-y-3 p-3">
            {filteredClaims.map(claim => (
              <div key={claim.id} className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-bold text-gray-900">{claim.userName}</p>
                    <p className="text-xs text-gray-500">{claim.userClass}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${statusColors[claim.status]}`}>
                    {statusLabels[claim.status]}
                  </span>
                </div>
                <div className="space-y-1 text-sm">
                  <p><span className="font-medium">Ödül:</span> {claim.rewardName}</p>
                  <p><span className="font-medium">Kupon:</span> {claim.couponsUsed}</p>
                  <p><span className="font-medium">Tarih:</span> {claim.claimedAt?.toDate().toLocaleDateString('tr-TR')}</p>
                </div>
                <div className="flex gap-2">
                  {claim.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleApprove(claim)}
                        className="flex-1 px-3 py-2 text-green-700 bg-green-50 hover:bg-green-100 rounded-lg font-medium text-sm min-h-[44px] touch-manipulation flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Onayla
                      </button>
                      <button
                        onClick={() => handleReject(claim)}
                        className="flex-1 px-3 py-2 text-red-700 bg-red-50 hover:bg-red-100 rounded-lg font-medium text-sm min-h-[44px] touch-manipulation flex items-center justify-center gap-2"
                      >
                        <XCircle className="w-4 h-4" />
                        Reddet
                      </button>
                    </>
                  )}
                  {claim.status === 'approved' && (
                    <button
                      onClick={() => handleDeliver(claim)}
                      className="w-full px-3 py-2 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg font-medium text-sm min-h-[44px] touch-manipulation flex items-center justify-center gap-2"
                    >
                      <Package className="w-4 h-4" />
                      Teslim Edildi
                    </button>
                  )}
                  {claim.status === 'rejected' && claim.rejectedReason && (
                    <button
                      onClick={() => Swal.fire('Red Nedeni', claim.rejectedReason, 'info')}
                      className="w-full px-3 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium text-sm min-h-[44px] touch-manipulation"
                    >
                      Nedeni Gör
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {filteredClaims.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              {filterStatus === 'all' ? 'Henüz talep yok.' : 'Bu durumda talep yok.'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RewardClaimsTab;
