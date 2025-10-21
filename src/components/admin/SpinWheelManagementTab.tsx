import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useSpinWheel } from '../../contexts/SpinWheelContext';
import { BarChart3, Users, Ticket, TrendingUp, Settings, Search, Download, Plus, Edit2, Trash2, Power } from 'lucide-react';
import { UserCoupon } from '../../types/coupon';
import { SpinReward } from '../../types/spin';
import Swal from 'sweetalert2';

const SpinWheelManagementTab: React.FC = () => {
  const { settings } = useSpinWheel();
  const [allCoupons, setAllCoupons] = useState<(UserCoupon & { userName: string })[]>([]);
  const [filteredCoupons, setFilteredCoupons] = useState<(UserCoupon & { userName: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [rewardProbabilities, setRewardProbabilities] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showAddRewardModal, setShowAddRewardModal] = useState(false);
  const [editingReward, setEditingReward] = useState<SpinReward | null>(null);
  const [newReward, setNewReward] = useState<Partial<SpinReward>>({
    name: '',
    type: 'penalty-discount',
    probability: 0,
    isActive: true,
    icon: '💰',
    color: '#10B981',
  });
  const [allWheels, setAllWheels] = useState<any[]>([]);
  const [selectedWheelId, setSelectedWheelId] = useState<string>('spinWheel');
  const [currentWheelSettings, setCurrentWheelSettings] = useState<any>(null);
  const [showCreateWheelModal, setShowCreateWheelModal] = useState(false);
  const [newWheelName, setNewWheelName] = useState('');

  useEffect(() => {
    loadAllCoupons();
    loadAllWheels();
  }, []);

  useEffect(() => {
    loadWheelSettings();
  }, [selectedWheelId]);

  useEffect(() => {
    if (settings) {
      const probs: Record<string, number> = {};
      settings.rewards.forEach(r => probs[r.id] = r.probability);
      setRewardProbabilities(probs);
    }
  }, [settings]);



  useEffect(() => {
    filterCoupons();
  }, [searchQuery, categoryFilter, allCoupons]);

  const loadAllCoupons = async () => {
    setLoading(true);
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const allCouponsData: (UserCoupon & { userName: string })[] = [];

      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const couponsSnapshot = await getDocs(collection(db, 'users', userDoc.id, 'coupons'));
        
        couponsSnapshot.docs.forEach(couponDoc => {
          const couponData = couponDoc.data();
          if (!couponData.isUsed) {
            allCouponsData.push({
              id: couponDoc.id,
              userId: userDoc.id,
              userName: userData.displayName || 'Bilinmeyen',
              type: couponData.type,
              discountPercent: couponData.discountPercent,
              category: couponData.category,
              isUsed: couponData.isUsed,
              usedAt: couponData.usedAt?.toDate() || null,
              usedForPenaltyId: couponData.usedForPenaltyId || null,
              createdAt: couponData.createdAt.toDate(),
              expiryDate: couponData.expiryDate.toDate(),
              wonFromSpin: couponData.wonFromSpin || false,
            });
          }
        });
      }

      setAllCoupons(allCouponsData);
      setFilteredCoupons(allCouponsData);
    } catch (error) {
      console.error('Error loading coupons:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterCoupons = () => {
    let filtered = allCoupons;

    if (searchQuery) {
      filtered = filtered.filter(c => 
        c.userName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(c => c.category === categoryFilter);
    }

    setFilteredCoupons(filtered);
  };

  const handleSaveProbabilities = async () => {
    const total = Object.values(rewardProbabilities).reduce((sum, val) => sum + val, 0);
    
    if (Math.abs(total - 100) > 0.1) {
      Swal.fire('Hata', 'Toplam olasılık %100 olmalıdır!', 'error');
      return;
    }

    try {
      const updatedRewards = settings!.rewards.map(r => ({
        ...r,
        probability: rewardProbabilities[r.id] || r.probability,
      }));

      await updateDoc(doc(db, 'settings', selectedWheelId), {
        rewards: updatedRewards,
      });

      Swal.fire('Başarılı', 'Ödül oranları güncellendi!', 'success');
    } catch (error) {
      console.error('Error updating probabilities:', error);
      Swal.fire('Hata', 'Güncelleme sırasında bir hata oluştu.', 'error');
    }
  };

  const toggleRewardActive = async (rewardId: string) => {
    try {
      const updatedRewards = settings!.rewards.map(r => 
        r.id === rewardId ? { ...r, isActive: !r.isActive } : r
      );

      await updateDoc(doc(db, 'settings', selectedWheelId), {
        rewards: updatedRewards,
      });

      Swal.fire('Başarılı', 'Ödül durumu güncellendi!', 'success');
      window.location.reload();
    } catch (error) {
      console.error('Error toggling reward:', error);
      Swal.fire('Hata', 'Güncelleme sırasında bir hata oluştu.', 'error');
    }
  };

  const handleAddReward = async () => {
    if (!newReward.name || !newReward.probability) {
      Swal.fire('Hata', 'Lütfen tüm alanları doldurun!', 'error');
      return;
    }

    try {
      const rewardId = `custom-${Date.now()}`;
      const reward: SpinReward = {
        id: rewardId,
        name: newReward.name!,
        type: newReward.type!,
        value: newReward.value,
        probability: newReward.probability!,
        isActive: newReward.isActive!,
        icon: newReward.icon!,
        color: newReward.color!,
      };

      const updatedRewards = [...settings!.rewards, reward];
      await updateDoc(doc(db, 'settings', selectedWheelId), {
        rewards: updatedRewards,
      });

      Swal.fire('Başarılı', 'Yeni ödül eklendi!', 'success');
      setShowAddRewardModal(false);
      setNewReward({
        name: '',
        type: 'penalty-discount',
        probability: 0,
        isActive: true,
        icon: '💰',
        color: '#10B981',
      });
      window.location.reload();
    } catch (error) {
      console.error('Error adding reward:', error);
      Swal.fire('Hata', 'Ödül eklenirken bir hata oluştu.', 'error');
    }
  };

  const handleEditReward = async () => {
    if (!editingReward) return;

    try {
      const updatedRewards = settings!.rewards.map(r => 
        r.id === editingReward.id ? editingReward : r
      );

      await updateDoc(doc(db, 'settings', selectedWheelId), {
        rewards: updatedRewards,
      });

      Swal.fire('Başarılı', 'Ödül güncellendi!', 'success');
      setEditingReward(null);
      window.location.reload();
    } catch (error) {
      console.error('Error editing reward:', error);
      Swal.fire('Hata', 'Ödül güncellenirken bir hata oluştu.', 'error');
    }
  };

  const handleDeleteReward = async (rewardId: string) => {
    const result = await Swal.fire({
      title: 'Emin misiniz?',
      text: 'Bu ödülü silmek istediğinizden emin misiniz?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Evet, sil!',
      cancelButtonText: 'Vazgeç',
    });

    if (result.isConfirmed) {
      try {
        const updatedRewards = settings!.rewards.filter(r => r.id !== rewardId);
        await updateDoc(doc(db, 'settings', selectedWheelId), {
          rewards: updatedRewards,
        });

        Swal.fire('Başarılı', 'Ödül silindi!', 'success');
        window.location.reload();
      } catch (error) {
        console.error('Error deleting reward:', error);
        Swal.fire('Hata', 'Ödül silinirken bir hata oluştu.', 'error');
      }
    }
  };

  const toggleWheelActive = async () => {
    try {
      await updateDoc(doc(db, 'settings', selectedWheelId), {
        isActive: !settings!.isActive,
      });

      Swal.fire('Başarılı', `Çark ${!settings!.isActive ? 'aktif' : 'pasif'} edildi!`, 'success');
      window.location.reload();
    } catch (error) {
      console.error('Error toggling wheel:', error);
      Swal.fire('Hata', 'Güncelleme sırasında bir hata oluştu.', 'error');
    }
  };

  const loadAllWheels = async () => {
    try {
      const settingsSnapshot = await getDocs(collection(db, 'settings'));
      const wheels = settingsSnapshot.docs
        .filter(doc => doc.data().rewards !== undefined)
        .map(doc => ({ id: doc.id, ...doc.data() }));
      setAllWheels(wheels);
    } catch (error) {
      console.error('Error loading wheels:', error);
    }
  };



  const handleCreateWheel = async () => {
    if (!newWheelName.trim()) {
      Swal.fire('Hata', 'Lütfen çark adı girin!', 'error');
      return;
    }

    try {
      const wheelId = `wheel-${Date.now()}`;
      const newWheel = {
        name: newWheelName,
        rewards: [],
        isActive: false,
        dailySpinLimit: 1,
      };

      await setDoc(doc(db, 'settings', wheelId), newWheel);
      Swal.fire('Başarılı', 'Yeni çark oluşturuldu!', 'success');
      setShowCreateWheelModal(false);
      setNewWheelName('');
      await loadAllWheels();
      setSelectedWheelId(wheelId);
    } catch (error) {
      console.error('Error creating wheel:', error);
      Swal.fire('Hata', 'Çark oluşturulurken bir hata oluştu.', 'error');
    }
  };

  const handleSwitchWheel = (wheelId: string) => {
    setSelectedWheelId(wheelId);
  };

  const loadWheelSettings = async () => {
    try {
      const wheelDoc = await getDoc(doc(db, 'settings', selectedWheelId));
      if (wheelDoc.exists()) {
        setCurrentWheelSettings(wheelDoc.data());
      }
    } catch (error) {
      console.error('Error loading wheel settings:', error);
    }
  };

  const exportToCSV = () => {
    const headers = ['Kullanıcı', 'İndirim', 'Kategori', 'Oluşturma', 'SKT'];
    const rows = filteredCoupons.map(c => [
      c.userName,
      `%${c.discountPercent}`,
      c.category || 'Tüm Kategoriler',
      c.createdAt.toLocaleDateString('tr-TR'),
      c.expiryDate.toLocaleDateString('tr-TR'),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `kuponlar_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600"></div>
      </div>
    );
  }

  const activeSettings = currentWheelSettings || settings;

  if (!activeSettings) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Çark bulunamadı</p>
          <button
            onClick={() => setShowCreateWheelModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold hover:shadow-lg transition-all"
          >
            Yeni Çark Oluştur
          </button>
        </div>
      </div>
    );
  }

  const totalProbability = Object.values(rewardProbabilities).reduce((sum, val) => sum + val, 0);
  const categories = Array.from(new Set(allCoupons.map(c => c.category).filter(Boolean)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg p-4 md:p-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-xl md:text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2 md:mb-3 flex items-center gap-2 md:gap-3">
              <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-2 md:p-3 rounded-xl">
                <Settings className="w-5 h-5 md:w-7 md:h-7 text-white" />
              </div>
              Çark Yönetimi
            </h2>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 md:gap-4">
              <select
                value={selectedWheelId}
                onChange={(e) => handleSwitchWheel(e.target.value)}
                className="w-full sm:w-auto px-3 md:px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-semibold text-sm md:text-base"
              >
                {allWheels.map(wheel => (
                  <option key={wheel.id} value={wheel.id}>
                    {wheel.name || wheel.id}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setShowCreateWheelModal(true)}
                className="w-full sm:w-auto px-3 md:px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm md:text-base"
              >
                <Plus className="w-4 h-4 md:w-5 md:h-5" />
                Yeni Çark
              </button>
            </div>
          </div>
          <button
            onClick={toggleWheelActive}
            className={`w-full lg:w-auto px-4 md:px-6 py-2 md:py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all text-sm md:text-base ${
              settings.isActive
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-red-100 text-red-700 hover:bg-red-200'
            }`}
          >
            <Power className="w-4 h-4 md:w-5 md:h-5" />
            Çark {activeSettings.isActive ? 'Aktif' : 'Pasif'}
          </button>
        </div>
      </div>

      {/* İstatistikler */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6">
        <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-4 md:p-6 rounded-xl md:rounded-2xl shadow-lg text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm font-medium text-white/90">Aktif Kuponlar</p>
              <p className="text-2xl md:text-3xl font-bold mt-1 md:mt-2">{allCoupons.length}</p>
            </div>
            <Ticket className="w-6 h-6 md:w-8 md:h-8 text-white/80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-cyan-600 p-4 md:p-6 rounded-xl md:rounded-2xl shadow-lg text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm font-medium text-white/90">Aktif Ödüller</p>
              <p className="text-2xl md:text-3xl font-bold mt-1 md:mt-2">{activeSettings.rewards?.filter(r => r.isActive).length || 0}</p>
            </div>
            <BarChart3 className="w-6 h-6 md:w-8 md:h-8 text-white/80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-4 md:p-6 rounded-xl md:rounded-2xl shadow-lg text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm font-medium text-white/90">Kupon Sahibi</p>
              <p className="text-2xl md:text-3xl font-bold mt-1 md:mt-2">{new Set(allCoupons.map(c => c.userId)).size}</p>
            </div>
            <Users className="w-6 h-6 md:w-8 md:h-8 text-white/80" />
          </div>
        </div>
      </div>

      {/* Ödül Dağılımı */}
      <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg p-4 md:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 md:gap-0 mb-4 md:mb-6">
          <h3 className="text-lg md:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-purple-600" />
            Ödül Dağılımı Ayarları
          </h3>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 md:gap-3 w-full sm:w-auto">
            <div className={`px-4 py-2 rounded-lg font-bold ${
              Math.abs(totalProbability - 100) < 0.1 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              Toplam: %{totalProbability.toFixed(1)}
            </div>
            <button
              onClick={() => setShowAddRewardModal(true)}
              className="w-full sm:w-auto px-3 md:px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm md:text-base"
            >
              <Plus className="w-4 h-4 md:w-5 md:h-5" />
              Yeni Ödül
            </button>
          </div>
        </div>

        <div className="overflow-x-auto -mx-4 md:mx-0">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-3 px-4 font-bold text-gray-700">Ödül</th>
                <th className="text-center py-3 px-4 font-bold text-gray-700">İkon</th>
                <th className="text-center py-3 px-4 font-bold text-gray-700">Oran (%)</th>
                <th className="text-center py-3 px-4 font-bold text-gray-700">Durum</th>
                <th className="text-center py-3 px-4 font-bold text-gray-700">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {activeSettings.rewards?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">
                    Henüz ödül eklenmemiş. "Yeni Ödül" butonuna tıklayarak ödül ekleyin.
                  </td>
                </tr>
              ) : (
                activeSettings.rewards?.map(reward => (
                <tr key={reward.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: reward.color }}></div>
                      <span className="font-semibold text-gray-900">{reward.name}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center text-2xl">{reward.icon}</td>
                  <td className="py-4 px-4 text-center">
                    <input
                      type="number"
                      step="0.1"
                      value={rewardProbabilities[reward.id] || reward.probability}
                      onChange={(e) => setRewardProbabilities(prev => ({
                        ...prev,
                        [reward.id]: parseFloat(e.target.value) || 0
                      }))}
                      className="w-20 px-3 py-2 border-2 border-gray-200 rounded-lg text-center font-bold focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </td>
                  <td className="py-4 px-4 text-center">
                    <button
                      onClick={() => toggleRewardActive(reward.id)}
                      className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                        reward.isActive
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {reward.isActive ? 'Aktif' : 'Pasif'}
                    </button>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => setEditingReward(reward)}
                        className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-all"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteReward(reward.id)}
                        className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSaveProbabilities}
            disabled={Math.abs(totalProbability - 100) > 0.1}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Değişiklikleri Kaydet
          </button>
        </div>
      </div>

      {/* Aktif Kuponlar */}
      <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg p-4 md:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 md:mb-6">
          <h3 className="text-lg md:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Ticket className="w-5 h-5 md:w-6 md:h-6 text-purple-600" />
            Aktif Kuponlar ({filteredCoupons.length})
          </h3>
          <button
            onClick={exportToCSV}
            className="w-full sm:w-auto px-3 md:px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all flex items-center justify-center gap-2 text-sm md:text-base"
          >
            <Download className="w-4 h-4" />
            CSV İndir
          </button>
        </div>

        {/* Filtreler */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-4 md:mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Kullanıcı ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-semibold"
          >
            <option value="all">Tüm Kategoriler</option>
            {categories.map(cat => (
              <option key={cat} value={cat!}>{cat}</option>
            ))}
          </select>
        </div>

        {filteredCoupons.length === 0 ? (
          <div className="text-center py-12">
            <Ticket className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">Kupon bulunamadı</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 font-bold text-gray-700">Kullanıcı</th>
                  <th className="text-center py-3 px-4 font-bold text-gray-700">İndirim</th>
                  <th className="text-center py-3 px-4 font-bold text-gray-700">Kategori</th>
                  <th className="text-center py-3 px-4 font-bold text-gray-700">Oluşturma</th>
                  <th className="text-center py-3 px-4 font-bold text-gray-700">SKT</th>
                </tr>
              </thead>
              <tbody>
                {filteredCoupons.map(coupon => (
                  <tr key={coupon.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-4 font-semibold text-gray-900">{coupon.userName}</td>
                    <td className="py-4 px-4 text-center">
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full font-bold">
                        %{coupon.discountPercent}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center text-gray-700">
                      {coupon.category || 'Tüm Kategoriler'}
                    </td>
                    <td className="py-4 px-4 text-center text-gray-600 text-sm">
                      {coupon.createdAt.toLocaleDateString('tr-TR')}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="text-sm text-gray-600">
                        {Math.ceil((coupon.expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} gün
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Yeni Ödül Modal */}
      {showAddRewardModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Yeni Ödül Ekle</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Ödül Adı</label>
                <input
                  type="text"
                  value={newReward.name}
                  onChange={(e) => setNewReward(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Örn: %15 Ceza İndirimi"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Ödül Tipi</label>
                <select
                  value={newReward.type}
                  onChange={(e) => setNewReward(prev => ({ ...prev, type: e.target.value as any }))}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="penalty-discount">Ceza İndirimi</option>
                  <option value="shop-discount">Mağaza İndirimi</option>
                  <option value="category">Kategori Keşfi</option>
                  <option value="borrow-extension">Ödünç Süresi Uzatma</option>
                  <option value="spin-again">Yeniden Çevir</option>
                  <option value="pass">Pas</option>
                </select>
              </div>
              {(newReward.type === 'penalty-discount' || newReward.type === 'shop-discount') && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">İndirim Oranı (%)</label>
                  <input
                    type="number"
                    value={newReward.value || ''}
                    onChange={(e) => setNewReward(prev => ({ ...prev, value: parseInt(e.target.value) }))}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Örn: 15"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Olasılık (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={newReward.probability}
                  onChange={(e) => setNewReward(prev => ({ ...prev, probability: parseFloat(e.target.value) }))}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Örn: 10"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">İkon (Emoji)</label>
                <input
                  type="text"
                  value={newReward.icon}
                  onChange={(e) => setNewReward(prev => ({ ...prev, icon: e.target.value }))}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="💰"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Renk</label>
                <input
                  type="color"
                  value={newReward.color}
                  onChange={(e) => setNewReward(prev => ({ ...prev, color: e.target.value }))}
                  className="w-full h-12 border-2 border-gray-200 rounded-lg cursor-pointer"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddRewardModal(false)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-all"
              >
                İptal
              </button>
              <button
                onClick={handleAddReward}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
              >
                Ekle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ödül Düzenle Modal */}
      {editingReward && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Ödül Düzenle</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Ödül Adı</label>
                <input
                  type="text"
                  value={editingReward.name}
                  onChange={(e) => setEditingReward(prev => ({ ...prev!, name: e.target.value }))}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">İkon (Emoji)</label>
                <input
                  type="text"
                  value={editingReward.icon}
                  onChange={(e) => setEditingReward(prev => ({ ...prev!, icon: e.target.value }))}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Renk</label>
                <input
                  type="color"
                  value={editingReward.color}
                  onChange={(e) => setEditingReward(prev => ({ ...prev!, color: e.target.value }))}
                  className="w-full h-12 border-2 border-gray-200 rounded-lg cursor-pointer"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditingReward(null)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-all"
              >
                İptal
              </button>
              <button
                onClick={handleEditReward}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
              >
                Güncelle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Yeni Çark Oluştur Modal */}
      {showCreateWheelModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Yeni Çark Oluştur</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Çark Adı</label>
                <input
                  type="text"
                  value={newWheelName}
                  onChange={(e) => setNewWheelName(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Örn: Yaz Kampanyası Çarkı"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateWheelModal(false)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-all"
              >
                İptal
              </button>
              <button
                onClick={handleCreateWheel}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
              >
                Oluştur
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpinWheelManagementTab;
