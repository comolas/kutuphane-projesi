import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../../firebase/config';
import { PhysicalReward, RewardCategory } from '../../../types';
import { useAuth } from '../../../contexts/AuthContext';
import { Gift, Plus, Edit2, Trash2, Upload, Package, Search, Filter, ChevronLeft, ChevronRight, TrendingUp, Clock, CheckCircle, AlertTriangle, BarChart3, X } from 'lucide-react';
import Swal from 'sweetalert2';
import { Line, Bar, Pie } from 'react-chartjs-2';

const RewardManagementTab: React.FC = () => {
  const { userData } = useAuth();
  const [rewards, setRewards] = useState<PhysicalReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingReward, setEditingReward] = useState<PhysicalReward | null>(null);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<RewardCategory | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'low-stock' | 'out-of-stock'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'coupon-low' | 'coupon-high' | 'stock-low' | 'stock-high' | 'name'>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [claims, setClaims] = useState<any[]>([]);
  const [selectedRewards, setSelectedRewards] = useState<string[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    category: 'item' as RewardCategory,
    description: '',
    image: '',
    requiredCoupons: 1,
    stock: 1,
    isActive: true,
    lowStockThreshold: 5
  });

  useEffect(() => {
    loadRewards();
    loadClaims();
  }, []);

  const loadRewards = async () => {
    if (!userData?.campusId) return;
    setLoading(true);
    const q = query(collection(db, 'physicalRewards'), where('campusId', '==', userData.campusId));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PhysicalReward));
    setRewards(data);
    setLoading(false);
  };

  const loadClaims = async () => {
    if (!userData?.campusId) return;
    const q = query(collection(db, 'rewardClaims'), where('campusId', '==', userData.campusId));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setClaims(data);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const storageRef = ref(storage, `rewards/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setFormData({ ...formData, image: url });
      Swal.fire('Başarılı!', 'Resim yüklendi.', 'success');
    } catch (error) {
      Swal.fire('Hata!', 'Resim yüklenemedi.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData?.campusId) return;

    try {
      const rewardData = {
        ...formData,
        campusId: userData.campusId,
        isActive: formData.stock > 0 ? formData.isActive : false
      };

      if (editingReward) {
        await updateDoc(doc(db, 'physicalRewards', editingReward.id!), rewardData);
        Swal.fire('Başarılı!', 'Ödül güncellendi.', 'success');
      } else {
        await addDoc(collection(db, 'physicalRewards'), {
          ...rewardData,
          createdAt: Timestamp.now()
        });
        Swal.fire('Başarılı!', 'Ödül eklendi.', 'success');
      }
      resetForm();
      loadRewards();
    } catch (error) {
      Swal.fire('Hata!', 'İşlem başarısız.', 'error');
    }
  };

  const handleEdit = (reward: PhysicalReward) => {
    setEditingReward(reward);
    setFormData({
      name: reward.name,
      category: reward.category,
      description: reward.description,
      image: reward.image,
      requiredCoupons: reward.requiredCoupons,
      stock: reward.stock,
      isActive: reward.isActive,
      lowStockThreshold: reward.lowStockThreshold || 5
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'Emin misiniz?',
      text: 'Bu ödül silinecek!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Evet, Sil',
      cancelButtonText: 'İptal'
    });

    if (result.isConfirmed) {
      await deleteDoc(doc(db, 'physicalRewards', id));
      Swal.fire('Silindi!', 'Ödül başarıyla silindi.', 'success');
      loadRewards();
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'item',
      description: '',
      image: '',
      requiredCoupons: 1,
      stock: 1,
      isActive: true,
      lowStockThreshold: 5
    });
    setEditingReward(null);
    setShowModal(false);
  };

  const categoryLabels: Record<RewardCategory, string> = {
    experience: '🎭 Deneyim',
    'gift-card': '💰 Hediye Çeki',
    food: '🍫 Yiyecek/İçecek',
    item: '🎁 Eşya'
  };

  const filteredRewards = useMemo(() => {
    let filtered = rewards;

    // Arama
    if (searchTerm) {
      filtered = filtered.filter(r => 
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Kategori filtresi
    if (filterCategory !== 'all') {
      filtered = filtered.filter(r => r.category === filterCategory);
    }

    // Durum filtresi
    if (filterStatus === 'active') {
      filtered = filtered.filter(r => r.isActive);
    } else if (filterStatus === 'inactive') {
      filtered = filtered.filter(r => !r.isActive);
    } else if (filterStatus === 'low-stock') {
      filtered = filtered.filter(r => r.stock > 0 && r.stock <= (r.lowStockThreshold || 5));
    } else if (filterStatus === 'out-of-stock') {
      filtered = filtered.filter(r => r.stock === 0);
    }

    // Sıralama
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0);
        case 'oldest':
          return (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0);
        case 'coupon-low':
          return a.requiredCoupons - b.requiredCoupons;
        case 'coupon-high':
          return b.requiredCoupons - a.requiredCoupons;
        case 'stock-low':
          return a.stock - b.stock;
        case 'stock-high':
          return b.stock - a.stock;
        case 'name':
          return a.name.localeCompare(b.name, 'tr');
        default:
          return 0;
      }
    });

    return filtered;
  }, [rewards, searchTerm, filterCategory, filterStatus, sortBy]);

  const totalPages = Math.ceil(filteredRewards.length / itemsPerPage);
  const paginatedRewards = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRewards.slice(start, start + itemsPerPage);
  }, [filteredRewards, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCategory, filterStatus, sortBy]);

  const stats = useMemo(() => ({
    total: rewards.length,
    active: rewards.filter(r => r.isActive).length,
    lowStock: rewards.filter(r => r.stock > 0 && r.stock <= (r.lowStockThreshold || 5)).length,
    outOfStock: rewards.filter(r => r.stock === 0).length,
    pendingClaims: claims.filter(c => c.status === 'pending').length,
    approvedClaims: claims.filter(c => c.status === 'approved').length,
    deliveredClaims: claims.filter(c => c.status === 'delivered').length
  }), [rewards, claims]);

  const analyticsData = useMemo(() => {
    const categoryData = rewards.reduce((acc, r) => {
      acc[r.category] = (acc[r.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topRewards = claims.reduce((acc, c) => {
      acc[c.rewardName] = (acc[c.rewardName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topRewardsList = Object.entries(topRewards)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const now = new Date();
    const last6Months = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      last6Months.push({
        month: date.toLocaleDateString('tr-TR', { month: 'short' }),
        monthIndex: date.getMonth(),
        year: date.getFullYear()
      });
    }

    const monthlyData = last6Months.map(({ monthIndex, year }) => {
      const count = claims.filter(c => {
        const claimDate = new Date(c.claimedAt?.toMillis());
        return claimDate.getMonth() === monthIndex && claimDate.getFullYear() === year;
      }).length;
      return count;
    });

    return {
      labels: last6Months.map(m => m.month),
      monthlyData,
      categoryData,
      topRewardsList,
      totalCouponsUsed: claims.reduce((sum, c) => sum + (c.couponsUsed || 0), 0)
    };
  }, [rewards, claims]);

  return (
    <>
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 py-8 px-4">
    <div className="max-w-7xl mx-auto">
    <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg overflow-hidden border border-white/20">
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center">
            <Gift className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-indigo-600" />
            Ödül Mağaza Yönetimi
          </h2>
          <button
            onClick={() => setShowModal(true)}
            className="px-3 sm:px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center text-sm sm:text-base touch-manipulation min-h-[40px]"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            Yeni Ödül Ekle
          </button>
        </div>
      </div>

      <div className="p-6">

      {/* İstatistik Kartları */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-cyan-600 p-3 sm:p-6 rounded-xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-white/90">Toplam Ödül</p>
              <p className="text-xl sm:text-3xl font-bold text-white mt-1 sm:mt-2">{stats.total}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 sm:p-4">
              <Gift className="w-5 sm:w-8 h-5 sm:h-8 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-3 sm:p-6 rounded-xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-white/90">Aktif Ödül</p>
              <p className="text-xl sm:text-3xl font-bold text-white mt-1 sm:mt-2">{stats.active}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 sm:p-4">
              <CheckCircle className="w-5 sm:w-8 h-5 sm:h-8 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-500 to-orange-600 p-3 sm:p-6 rounded-xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-white/90">Düşük Stok</p>
              <p className="text-xl sm:text-3xl font-bold text-white mt-1 sm:mt-2">{stats.lowStock}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 sm:p-4">
              <AlertTriangle className="w-5 sm:w-8 h-5 sm:h-8 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-pink-600 p-3 sm:p-6 rounded-xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-white/90">Bekleyen Talep</p>
              <p className="text-xl sm:text-3xl font-bold text-white mt-1 sm:mt-2">{stats.pendingClaims}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 sm:p-4">
              <Clock className="w-5 sm:w-8 h-5 sm:h-8 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Gelişmiş Analiz Toggle */}
      <div>
        <button
          onClick={() => setShowAnalytics(!showAnalytics)}
          className="w-full bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6 flex items-center justify-between group"
        >
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-3 rounded-xl group-hover:scale-110 transition-transform">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <h3 className="text-xl font-bold text-gray-900">Gelişmiş Analiz ve İstatistikler</h3>
              <p className="text-sm text-gray-600">Detaylı grafikler, kategori dağılımı ve ödül istatistikleri</p>
            </div>
          </div>
          <div className={`transform transition-transform ${showAnalytics ? 'rotate-180' : ''}`}>
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>
      </div>

      {/* Analiz Bölümü */}
      {showAnalytics && (
        <div className="space-y-6">
          {/* Aylık Talep Trendi */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              Aylık Ödül Talep Trendi (Son 6 Ay)
            </h3>
            <div className="h-80">
              <Line
                data={{
                  labels: analyticsData.labels,
                  datasets: [{
                    label: 'Talep Sayısı',
                    data: analyticsData.monthlyData,
                    borderColor: 'rgba(147, 51, 234, 1)',
                    backgroundColor: 'rgba(147, 51, 234, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    pointBackgroundColor: 'rgba(147, 51, 234, 1)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      backgroundColor: 'rgba(0, 0, 0, 0.8)',
                      padding: 12,
                      cornerRadius: 8
                    }
                  },
                  scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1 } }
                  }
                }}
              />
            </div>
          </div>

          {/* Kategori & Popüler Ödüller */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Kategori Dağılımı */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">Kategori Dağılımı</h3>
              <div className="h-80">
                <Pie
                  data={{
                    labels: Object.keys(analyticsData.categoryData).map(k => categoryLabels[k as RewardCategory]),
                    datasets: [{
                      data: Object.values(analyticsData.categoryData),
                      backgroundColor: [
                        'rgba(239, 68, 68, 0.8)',
                        'rgba(249, 115, 22, 0.8)',
                        'rgba(234, 179, 8, 0.8)',
                        'rgba(34, 197, 94, 0.8)'
                      ],
                      borderWidth: 2,
                      borderColor: '#fff'
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { position: 'bottom', labels: { padding: 15, font: { size: 12 } } },
                      tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        cornerRadius: 8
                      }
                    }
                  }}
                />
              </div>
            </div>

            {/* En Popüler Ödüller */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">En Popüler Ödüller</h3>
              <div className="h-80">
                <Bar
                  data={{
                    labels: analyticsData.topRewardsList.map(r => r[0]),
                    datasets: [{
                      label: 'Talep Sayısı',
                      data: analyticsData.topRewardsList.map(r => r[1]),
                      backgroundColor: 'rgba(147, 51, 234, 0.8)',
                      borderRadius: 8,
                      borderWidth: 0
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        cornerRadius: 8
                      }
                    },
                    scales: {
                      y: { beginAtZero: true, ticks: { stepSize: 1 } }
                    }
                  }}
                />
              </div>
            </div>
          </div>

          {/* Kupon İstatistikleri */}
          <div className="bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold mb-2">Toplam Kullanılan Kupon</h3>
                <p className="text-white/90">Tüm ödül taleplerinde kullanılan kupon sayısı</p>
              </div>
              <div className="text-right">
                <p className="text-6xl font-bold">{analyticsData.totalCouponsUsed}</p>
                <p className="text-sm text-white/90 mt-2">{claims.length} talep</p>
              </div>
            </div>
          </div>
        </div>
      )}

        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
          <aside className={`fixed lg:sticky top-0 left-0 h-screen lg:h-auto w-full lg:w-64 bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg p-4 sm:p-6 flex-shrink-0 border border-white/20 z-50 transition-transform duration-300 ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}>
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <h2 className="text-base sm:text-lg font-semibold flex items-center">
                <Filter className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-indigo-600" />
                Filtreler
              </h2>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="lg:hidden text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4 sm:mb-6">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Ödül ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <Search className="absolute left-2.5 sm:left-3 top-2.5 text-gray-400" size={14} />
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Kategori</h3>
                <div className="space-y-2">
                  <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <input
                      type="radio"
                      name="category"
                      checked={filterCategory === 'all'}
                      onChange={() => setFilterCategory('all')}
                      className="mr-2"
                    />
                    <span className="text-sm">Tümü</span>
                  </label>
                  <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <input
                      type="radio"
                      name="category"
                      checked={filterCategory === 'experience'}
                      onChange={() => setFilterCategory('experience')}
                      className="mr-2"
                    />
                    <span className="text-sm">🎭 Deneyim</span>
                  </label>
                  <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <input
                      type="radio"
                      name="category"
                      checked={filterCategory === 'gift-card'}
                      onChange={() => setFilterCategory('gift-card')}
                      className="mr-2"
                    />
                    <span className="text-sm">💰 Hediye Çeki</span>
                  </label>
                  <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <input
                      type="radio"
                      name="category"
                      checked={filterCategory === 'food'}
                      onChange={() => setFilterCategory('food')}
                      className="mr-2"
                    />
                    <span className="text-sm">🍫 Yiyecek/İçecek</span>
                  </label>
                  <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <input
                      type="radio"
                      name="category"
                      checked={filterCategory === 'item'}
                      onChange={() => setFilterCategory('item')}
                      className="mr-2"
                    />
                    <span className="text-sm">🎁 Eşya</span>
                  </label>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Durum</h3>
                <div className="space-y-2">
                  <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <input
                      type="radio"
                      name="status"
                      checked={filterStatus === 'all'}
                      onChange={() => setFilterStatus('all')}
                      className="mr-2"
                    />
                    <span className="text-sm">Tümü</span>
                  </label>
                  <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <input
                      type="radio"
                      name="status"
                      checked={filterStatus === 'active'}
                      onChange={() => setFilterStatus('active')}
                      className="mr-2"
                    />
                    <span className="text-sm text-green-600">● Aktif</span>
                  </label>
                  <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <input
                      type="radio"
                      name="status"
                      checked={filterStatus === 'inactive'}
                      onChange={() => setFilterStatus('inactive')}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-600">● Pasif</span>
                  </label>
                  <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <input
                      type="radio"
                      name="status"
                      checked={filterStatus === 'low-stock'}
                      onChange={() => setFilterStatus('low-stock')}
                      className="mr-2"
                    />
                    <span className="text-sm text-yellow-600">● Düşük Stok</span>
                  </label>
                  <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <input
                      type="radio"
                      name="status"
                      checked={filterStatus === 'out-of-stock'}
                      onChange={() => setFilterStatus('out-of-stock')}
                      className="mr-2"
                    />
                    <span className="text-sm text-red-600">● Stokta Yok</span>
                  </label>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Sıralama</h3>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm font-medium"
                >
                  <option value="newest">En Yeni</option>
                  <option value="oldest">En Eski</option>
                  <option value="name">İsme Göre (A-Z)</option>
                  <option value="coupon-low">Kupon (Düşük → Yüksek)</option>
                  <option value="coupon-high">Kupon (Yüksek → Düşük)</option>
                  <option value="stock-low">Stok (Düşük → Yüksek)</option>
                  <option value="stock-high">Stok (Yüksek → Düşük)</option>
                </select>
              </div>
            </div>
          </aside>

          <div className="flex-1">

      {/* Toplu İşlemler */}
      {paginatedRewards.length > 0 && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border-2 border-indigo-200 p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  const pageIds = paginatedRewards.map(r => r.id!);
                  const allSelected = pageIds.every(id => selectedRewards.includes(id));
                  if (allSelected) {
                    setSelectedRewards(prev => prev.filter(id => !pageIds.includes(id)));
                  } else {
                    setSelectedRewards(prev => [...new Set([...prev, ...pageIds])]);
                  }
                }}
                className="px-4 py-2 bg-white border-2 border-indigo-300 rounded-lg hover:bg-indigo-50 transition-all font-semibold text-sm"
              >
                {paginatedRewards.every(r => selectedRewards.includes(r.id!)) ? 'Tümünü Kaldır' : 'Tümünü Seç'}
              </button>
              <span className="text-sm text-gray-600">
                {selectedRewards.length} / {filteredRewards.length} ödül seçildi
              </span>
            </div>
            
            {selectedRewards.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={async () => {
                    if (!confirm(`${selectedRewards.length} ödülü aktif yapmak istediğinizden emin misiniz?`)) return;
                    try {
                      await Promise.all(selectedRewards.map(id => 
                        updateDoc(doc(db, 'physicalRewards', id), { isActive: true })
                      ));
                      Swal.fire('Başarılı!', 'Ödüller aktif yapıldı.', 'success');
                      setSelectedRewards([]);
                      loadRewards();
                    } catch (error) {
                      Swal.fire('Hata!', 'İşlem başarısız.', 'error');
                    }
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold text-sm"
                >
                  Aktif Yap
                </button>
                <button
                  onClick={async () => {
                    if (!confirm(`${selectedRewards.length} ödülü pasif yapmak istediğinizden emin misiniz?`)) return;
                    try {
                      await Promise.all(selectedRewards.map(id => 
                        updateDoc(doc(db, 'physicalRewards', id), { isActive: false })
                      ));
                      Swal.fire('Başarılı!', 'Ödüller pasif yapıldı.', 'success');
                      setSelectedRewards([]);
                      loadRewards();
                    } catch (error) {
                      Swal.fire('Hata!', 'İşlem başarısız.', 'error');
                    }
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold text-sm"
                >
                  Pasif Yap
                </button>
                <button
                  onClick={async () => {
                    const { value: stock } = await Swal.fire({
                      title: 'Stok Güncelle',
                      input: 'number',
                      inputLabel: `${selectedRewards.length} ödülün stok miktarını girin`,
                      inputPlaceholder: 'Stok miktarı',
                      showCancelButton: true,
                      confirmButtonText: 'Güncelle',
                      cancelButtonText: 'İptal',
                      inputValidator: (value) => {
                        if (!value || parseInt(value) < 0) {
                          return 'Geçerli bir stok miktarı girin!';
                        }
                      }
                    });
                    if (stock) {
                      try {
                        const stockNum = parseInt(stock);
                        await Promise.all(selectedRewards.map(id => 
                          updateDoc(doc(db, 'physicalRewards', id), { 
                            stock: stockNum,
                            isActive: stockNum > 0
                          })
                        ));
                        Swal.fire('Başarılı!', 'Stok güncellendi.', 'success');
                        setSelectedRewards([]);
                        loadRewards();
                      } catch (error) {
                        Swal.fire('Hata!', 'İşlem başarısız.', 'error');
                      }
                    }
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold text-sm"
                >
                  Stok Güncelle
                </button>
                <button
                  onClick={async () => {
                    if (!confirm(`${selectedRewards.length} ödülü silmek istediğinizden emin misiniz? Bu işlem geri alınamaz!`)) return;
                    try {
                      await Promise.all(selectedRewards.map(id => 
                        deleteDoc(doc(db, 'physicalRewards', id))
                      ));
                      Swal.fire('Silindi!', 'Ödüller başarıyla silindi.', 'success');
                      setSelectedRewards([]);
                      loadRewards();
                    } catch (error) {
                      Swal.fire('Hata!', 'İşlem başarısız.', 'error');
                    }
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold text-sm"
                >
                  Sil
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg overflow-hidden animate-pulse border border-white/20">
              <div className="w-full aspect-[2/3] bg-gradient-to-br from-gray-200 to-gray-300"></div>
              <div className="p-4 space-y-3">
                <div className="h-5 bg-gray-300 rounded w-3/4"></div>
                <div className="h-4 bg-gray-300 rounded w-1/2"></div>
                <div className="h-4 bg-gray-300 rounded w-2/3"></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
          {paginatedRewards.map(reward => (
            <div key={reward.id} className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg overflow-hidden relative group transition-all duration-300 hover:scale-105 hover:shadow-2xl border border-white/20 hover:z-10">
              <div className="relative overflow-hidden aspect-[2/3]">
                <div className="absolute top-2 left-2 z-10">
                  <input
                    type="checkbox"
                    className="form-checkbox h-5 w-5 text-indigo-600 bg-white/90 backdrop-blur-sm rounded shadow-md transition duration-150 ease-in-out"
                    checked={selectedRewards.includes(reward.id!)}
                    onChange={() => {
                      setSelectedRewards(prev => 
                        prev.includes(reward.id!) 
                          ? prev.filter(id => id !== reward.id!) 
                          : [...prev, reward.id!]
                      );
                    }}
                  />
                </div>
                <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
                  {reward.stock === 0 && (
                    <span className="px-2 py-1 rounded-lg text-xs font-bold shadow-md bg-gradient-to-r from-red-500 to-pink-600 text-white">
                      Tükendi
                    </span>
                  )}
                  {reward.stock > 0 && reward.stock <= (reward.lowStockThreshold || 5) && (
                    <span className="px-2 py-1 rounded-lg text-xs font-bold shadow-md bg-gradient-to-r from-yellow-400 to-orange-500 text-white">
                      Az Stok
                    </span>
                  )}
                  <span className={`px-2 py-1 rounded-lg text-xs font-bold shadow-md ${
                    reward.isActive 
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white' 
                      : 'bg-gradient-to-r from-gray-400 to-gray-600 text-white'
                  }`}>
                    {reward.isActive ? 'Aktif' : 'Pasif'}
                  </span>
                </div>
                <img src={reward.image} alt={reward.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
              </div>
              <div className="p-4">
                <span className="text-xs text-gray-500">{categoryLabels[reward.category]}</span>
                <h3 className="font-bold text-gray-900 text-sm line-clamp-2 mb-1">{reward.name}</h3>
                <p className="text-xs text-gray-600 line-clamp-2 mb-2">{reward.description}</p>
                <div className="flex items-center justify-between text-xs mb-3">
                  <div className="flex items-center">
                    <Gift className="w-3 h-3 text-indigo-600 mr-1" />
                    <span className="font-semibold text-indigo-600">{reward.requiredCoupons}</span>
                  </div>
                  <div className="flex items-center">
                    <Package className="w-3 h-3 text-gray-600 mr-1" />
                    <span className="text-gray-600">{reward.stock}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(reward)}
                    className="flex-1 px-3 py-2 bg-white/90 backdrop-blur-sm text-indigo-600 rounded-xl text-xs font-semibold shadow-md hover:bg-white transition-all flex items-center justify-center"
                  >
                    <Edit2 className="w-3 h-3 mr-1" />
                    Düzenle
                  </button>
                  <button
                    onClick={() => handleDelete(reward.id!)}
                    className="flex-1 px-3 py-2 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-xl text-xs font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Sil
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredRewards.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-500">
          {searchTerm || filterCategory !== 'all' || filterStatus !== 'all' 
            ? 'Arama kriterlerine uygun ödül bulunamadı.' 
            : 'Henüz ödül eklenmemiş.'}
        </div>
      )}

            <div className="mt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2 font-semibold"
              >
                <Filter className="w-5 h-5" />
                Filtreler
              </button>
              {totalPages > 1 && (
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-6 py-2.5 bg-white/60 backdrop-blur-xl border border-white/20 rounded-xl text-gray-700 hover:bg-white/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg font-medium"
                  >
                    Önceki
                  </button>
                  <span className="px-4 py-2 bg-white/60 backdrop-blur-xl rounded-xl text-gray-700 font-semibold shadow-lg">
                    Sayfa {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-6 py-2.5 bg-white/60 backdrop-blur-xl border border-white/20 rounded-xl text-gray-700 hover:bg-white/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg font-medium"
                  >
                    Sonraki
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
    </div>

    {/* Modal */}
    {showModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-0">
        <div className="bg-white rounded-xl shadow-2xl w-full h-full overflow-y-auto">
          <div className="p-6 flex-shrink-0">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">
              {editingReward ? 'Ödül Düzenle' : 'Yeni Ödül Ekle'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ödül Adı</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Kategori</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as RewardCategory })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="experience">🎭 Deneyim</option>
                  <option value="gift-card">💰 Hediye Çeki</option>
                  <option value="food">🍫 Yiyecek/İçecek</option>
                  <option value="item">🎁 Eşya</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Açıklama</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ödül Resmi</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                {formData.image && (
                  <img src={formData.image} alt="Preview" className="mt-2 w-32 h-32 object-cover rounded-lg" />
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Gerekli Kupon</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.requiredCoupons}
                    onChange={(e) => setFormData({ ...formData, requiredCoupons: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Stok</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Düşük Stok Uyarı Seviyesi</label>
                <input
                  type="number"
                  min="1"
                  value={formData.lowStockThreshold}
                  onChange={(e) => setFormData({ ...formData, lowStockThreshold: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Stok bu seviyenin altına düştüğünde uyarı gösterilir</p>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  disabled={formData.stock === 0}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 disabled:opacity-50"
                />
                <label className="ml-2 text-sm text-gray-700">Aktif</label>
                {formData.stock === 0 && (
                  <span className="ml-2 text-xs text-red-600">Stok bittiğinde aktif edilemez</span>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={uploading || !formData.image}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {editingReward ? 'Güncelle' : 'Ekle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default RewardManagementTab;
