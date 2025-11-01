import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { ArrowLeft, Search, Lock, Unlock, Save, RefreshCw, Filter, X, FileText, CheckCircle, XCircle, BarChart3, Users, GraduationCap, Shield, PieChart } from 'lucide-react';
import Swal from 'sweetalert2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

interface PageConfig {
  id: string;
  name: string;
  path: string;
  description: string;
  category: 'user' | 'teacher' | 'admin';
}

interface CampusPageAccess {
  campusId: string;
  campusName: string;
  pageAccess: { [pageId: string]: boolean };
}

const AVAILABLE_PAGES: PageConfig[] = [
  { id: 'blog', name: 'Blog', path: '/blog', description: 'Blog yazıları ve haberler', category: 'user' },
  { id: 'books', name: 'Kitaplar', path: '/books', description: 'Kitap kataloğu', category: 'user' },
  { id: 'borrowed', name: 'Ödünç Kitaplarım', path: '/borrowed-books', description: 'Ödünç alınan kitaplar', category: 'user' },
  { id: 'favorites', name: 'Favorilerim', path: '/favorites', description: 'Favori kitaplar', category: 'user' },
  { id: 'profile', name: 'Profil', path: '/profile', description: 'Kullanıcı profili', category: 'user' },
  { id: 'shop', name: 'Mağaza', path: '/shop', description: 'Ürün mağazası', category: 'user' },
  { id: 'my-orders', name: 'Siparişlerim', path: '/my-orders', description: 'Sipariş geçmişi', category: 'user' },
  { id: 'my-posts', name: 'Blog Yazılarım', path: '/my-posts', description: 'Kendi blog yazılarım', category: 'user' },
  { id: 'game-reservations', name: 'Oyun Rezervasyonları', path: '/game-reservations', description: 'Oyun rezervasyon işlemleri', category: 'user' },
  { id: 'reward-store', name: 'Ödül Mağazası', path: '/reward-store', description: 'Puan ile ödül alımı', category: 'user' },
  { id: 'challenges', name: 'Meydan Okumalar', path: '/challenges', description: 'Okuma meydan okumaları', category: 'user' },
  { id: 'my-requests', name: 'Taleplerim', path: '/my-requests', description: 'Gönderilen talepler', category: 'user' },
  { id: 'chat', name: 'Sohbet', path: '/chat', description: 'Mesajlaşma ve sohbet', category: 'user' },
  { id: 'teacher-dashboard', name: 'Öğretmen Paneli', path: '/teacher', description: 'Öğretmen ana sayfa', category: 'teacher' },
  { id: 'teacher-books', name: 'Kitap Yönetimi', path: '/teacher/books', description: 'Kitap ekleme/düzenleme', category: 'teacher' },
  { id: 'teacher-borrows', name: 'Ödünç İşlemleri', path: '/teacher/borrows', description: 'Ödünç verme/alma', category: 'teacher' },
  { id: 'teacher-students', name: 'Öğrenci Yönetimi', path: '/teacher/students', description: 'Öğrenci listesi', category: 'teacher' },
  { id: 'teacher-reports', name: 'Raporlar', path: '/teacher/reports', description: 'Öğretmen raporları', category: 'teacher' },
  { id: 'admin-dashboard', name: 'Admin Paneli', path: '/admin', description: 'Admin ana sayfa', category: 'admin' },
  { id: 'admin-users', name: 'Kullanıcı Yönetimi', path: '/admin/users', description: 'Kullanıcı işlemleri', category: 'admin' },
  { id: 'admin-reports', name: 'Raporlar', path: '/admin/reports', description: 'İstatistik ve raporlar', category: 'admin' },
];

const PageManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const [campuses, setCampuses] = useState<CampusPageAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<'all' | 'user' | 'teacher' | 'admin'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'category'>('category');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCampus, setSelectedCampus] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [showSidebar, setShowSidebar] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [originalCampuses, setOriginalCampuses] = useState<CampusPageAccess[]>([]);
  const [showCharts, setShowCharts] = useState(false);
  const itemsPerPage = 10;

  useEffect(() => {
    loadCampusesAndAccess();
  }, []);

  const loadCampusesAndAccess = async () => {
    setLoading(true);
    try {
      const campusSnapshot = await getDocs(collection(db, 'campuses'));
      const campusData: CampusPageAccess[] = [];

      for (const campusDoc of campusSnapshot.docs) {
        const accessDoc = await getDoc(doc(db, 'pageAccess', campusDoc.id));
        const pageAccess: { [key: string]: boolean } = {};

        AVAILABLE_PAGES.forEach(page => {
          pageAccess[page.id] = accessDoc.exists() ? (accessDoc.data()[page.id] ?? true) : true;
        });

        campusData.push({
          campusId: campusDoc.id,
          campusName: campusDoc.data().name,
          pageAccess
        });
      }

      setCampuses(campusData);
      setOriginalCampuses(JSON.parse(JSON.stringify(campusData)));
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Veri yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePageAccess = (campusId: string, pageId: string) => {
    setCampuses(prev => prev.map(campus => {
      if (campus.campusId === campusId) {
        return {
          ...campus,
          pageAccess: {
            ...campus.pageAccess,
            [pageId]: !campus.pageAccess[pageId]
          }
        };
      }
      return campus;
    }));
    setHasUnsavedChanges(true);
  };

  const bulkToggleAll = (enable: boolean) => {
    if (!selectedCampus) return;
    setCampuses(prev => prev.map(campus => {
      if (campus.campusId === selectedCampus) {
        const newAccess: { [key: string]: boolean } = {};
        filteredPages.forEach(page => {
          newAccess[page.id] = enable;
        });
        return {
          ...campus,
          pageAccess: { ...campus.pageAccess, ...newAccess }
        };
      }
      return campus;
    }));
    setHasUnsavedChanges(true);
  };

  const bulkToggleCategory = (category: string, enable: boolean) => {
    if (!selectedCampus) return;
    setCampuses(prev => prev.map(campus => {
      if (campus.campusId === selectedCampus) {
        const newAccess: { [key: string]: boolean } = {};
        AVAILABLE_PAGES.filter(p => p.category === category).forEach(page => {
          newAccess[page.id] = enable;
        });
        return {
          ...campus,
          pageAccess: { ...campus.pageAccess, ...newAccess }
        };
      }
      return campus;
    }));
    setHasUnsavedChanges(true);
  };

  const saveChanges = async () => {
    setSaving(true);
    try {
      for (const campus of campuses) {
        await setDoc(doc(db, 'pageAccess', campus.campusId), campus.pageAccess);
      }
      setOriginalCampuses(JSON.parse(JSON.stringify(campuses)));
      setHasUnsavedChanges(false);
      Swal.fire({
        icon: 'success',
        title: 'Başarılı!',
        text: 'Değişiklikler kaydedildi!',
        confirmButtonColor: '#4f46e5'
      });
    } catch (error) {
      console.error('Kaydetme hatası:', error);
      Swal.fire({
        icon: 'error',
        title: 'Hata!',
        text: 'Kaydetme sırasında hata oluştu!',
        confirmButtonColor: '#4f46e5'
      });
    } finally {
      setSaving(false);
    }
  };

  const selectedCampusData = campuses.find(c => c.campusId === selectedCampus);
  
  const filteredPages = AVAILABLE_PAGES
    .filter(page => filterCategory === 'all' || page.category === filterCategory)
    .filter(page => {
      if (!selectedCampusData) return true;
      if (statusFilter === 'active') return selectedCampusData.pageAccess[page.id];
      if (statusFilter === 'inactive') return !selectedCampusData.pageAccess[page.id];
      return true;
    })
    .filter(page => 
      page.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      page.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      page.path.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name, 'tr');
      return a.category.localeCompare(b.category);
    });

  const totalPages = Math.ceil(filteredPages.length / itemsPerPage);
  const paginatedPages = filteredPages.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'user': return 'bg-blue-100 text-blue-800';
      case 'teacher': return 'bg-green-100 text-green-800';
      case 'admin': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'user': return 'Kullanıcı';
      case 'teacher': return 'Öğretmen';
      case 'admin': return 'Admin';
      default: return category;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-lg font-semibold text-gray-700">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 gap-4">
          <div className="flex items-start sm:items-center gap-2 sm:gap-4">
            <button 
              onClick={() => navigate('/super-admin')}
              className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 sm:mr-2" />
              <span className="hidden sm:inline">Geri Dön</span>
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">Sayfa Yönetimi</h1>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">Kampüs bazlı sayfa erişim kontrolü</p>
            </div>
          </div>
          <div className="flex gap-2 sm:gap-3">
            <button 
              onClick={loadCampusesAndAccess}
              className="flex items-center px-3 sm:px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
            >
              <RefreshCw className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Yenile</span>
            </button>
            <button 
              onClick={saveChanges}
              disabled={saving || !hasUnsavedChanges}
              className="relative flex items-center px-3 sm:px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 text-sm"
            >
              <Save className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">{saving ? 'Kaydediliyor...' : 'Kaydet'}</span>
              <span className="sm:hidden">{saving ? '...' : 'Kaydet'}</span>
              {hasUnsavedChanges && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full animate-pulse"></span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Filter Toggle */}
        <button
          onClick={() => setShowSidebar(!showSidebar)}
          className="lg:hidden fixed bottom-6 right-6 z-50 bg-indigo-600 text-white p-4 rounded-full shadow-2xl hover:bg-indigo-700 transition-all"
        >
          <Filter className="w-6 h-6" />
        </button>

        <div className="flex gap-6">
          {/* Sidebar Filters */}
          <div className={`fixed lg:static inset-y-0 left-0 z-40 w-80 bg-white/80 backdrop-blur-xl border-r border-gray-200 transform transition-transform duration-300 lg:transform-none ${
            showSidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          } overflow-y-auto`}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Filter className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-semibold text-gray-800">Filtreler</h3>
                </div>
                <button onClick={() => setShowSidebar(false)} className="lg:hidden text-gray-500 hover:text-gray-700">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Campus Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Kampüs</label>
                <select
                  value={selectedCampus}
                  onChange={(e) => setSelectedCampus(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Kampüs Seçin</option>
                  {campuses.map(campus => (
                    <option key={campus.campusId} value={campus.campusId}>{campus.campusName}</option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">Durum</label>
                <div className="space-y-2">
                  {[{value: 'all', label: 'Tümü'}, {value: 'active', label: 'Aktif'}, {value: 'inactive', label: 'Pasif'}].map(opt => (
                    <label key={opt.value} className="flex items-center p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                      <input
                        type="radio"
                        name="status"
                        value={opt.value}
                        checked={statusFilter === opt.value}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                        className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="ml-3 text-sm text-gray-700">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Category Filter */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">Kategori</label>
                <div className="space-y-2">
                  {[{value: 'all', label: 'Tümü'}, {value: 'user', label: 'Kullanıcı'}, {value: 'teacher', label: 'Öğretmen'}, {value: 'admin', label: 'Admin'}].map(opt => (
                    <label key={opt.value} className="flex items-center p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                      <input
                        type="radio"
                        name="category"
                        value={opt.value}
                        checked={filterCategory === opt.value}
                        onChange={(e) => setFilterCategory(e.target.value as any)}
                        className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="ml-3 text-sm text-gray-700">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Sort */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Sıralama</label>
                <div className="space-y-2">
                  {[{value: 'category', label: 'Kategoriye Göre'}, {value: 'name', label: 'İsme Göre'}].map(opt => (
                    <label key={opt.value} className="flex items-center p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                      <input
                        type="radio"
                        name="sort"
                        value={opt.value}
                        checked={sortBy === opt.value}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="ml-3 text-sm text-gray-700">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Statistics Cards */}
            {selectedCampus && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center">
                      <BarChart3 className="w-6 h-6" />
                    </div>
                  </div>
                  <p className="text-sm text-white/80 mb-1">Toplam Sayfa</p>
                  <p className="text-3xl font-bold">{AVAILABLE_PAGES.length}</p>
                </div>

                <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center">
                      <CheckCircle className="w-6 h-6" />
                    </div>
                  </div>
                  <p className="text-sm text-white/80 mb-1">Aktif Sayfa</p>
                  <p className="text-3xl font-bold">{AVAILABLE_PAGES.filter(p => selectedCampusData?.pageAccess[p.id]).length}</p>
                </div>

                <div className="bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center">
                      <XCircle className="w-6 h-6" />
                    </div>
                  </div>
                  <p className="text-sm text-white/80 mb-1">Pasif Sayfa</p>
                  <p className="text-3xl font-bold">{AVAILABLE_PAGES.filter(p => !selectedCampusData?.pageAccess[p.id]).length}</p>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center">
                      <FileText className="w-6 h-6" />
                    </div>
                  </div>
                  <p className="text-sm text-white/80 mb-1">Filtrelenmiş</p>
                  <p className="text-3xl font-bold">{filteredPages.length}</p>
                </div>
              </div>
            )}

            {/* Charts Toggle */}
            {selectedCampus && (
              <div className="mb-6">
                <button
                  onClick={() => setShowCharts(!showCharts)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all font-medium"
                >
                  <PieChart className="w-5 h-5" />
                  {showCharts ? 'Grafikleri Gizle' : 'Grafikleri Göster'}
                </button>
              </div>
            )}

            {/* Charts */}
            {selectedCampus && showCharts && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Campus Comparison Bar Chart */}
                <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-white/20">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                      <BarChart3 className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="font-bold text-gray-800">Kampüs Karşılaştırma</h3>
                  </div>
                  <Bar
                    data={{
                      labels: campuses.map(c => c.campusName),
                      datasets: [
                        {
                          label: 'Aktif Sayfalar',
                          data: campuses.map(c => AVAILABLE_PAGES.filter(p => c.pageAccess[p.id]).length),
                          backgroundColor: 'rgba(34, 197, 94, 0.8)',
                          borderRadius: 8,
                          borderWidth: 0
                        },
                        {
                          label: 'Pasif Sayfalar',
                          data: campuses.map(c => AVAILABLE_PAGES.filter(p => !c.pageAccess[p.id]).length),
                          backgroundColor: 'rgba(239, 68, 68, 0.8)',
                          borderRadius: 8,
                          borderWidth: 0
                        }
                      ]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: true,
                      plugins: {
                        legend: { position: 'top' as const },
                        title: { display: false }
                      },
                      scales: {
                        y: { beginAtZero: true, ticks: { stepSize: 1 } }
                      }
                    }}
                  />
                </div>

                {/* Active/Inactive Doughnut Chart */}
                <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-white/20">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                      <PieChart className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="font-bold text-gray-800">Sayfa Dağılımı</h3>
                  </div>
                  <Doughnut
                    data={{
                      labels: ['Aktif', 'Pasif'],
                      datasets: [
                        {
                          data: [
                            AVAILABLE_PAGES.filter(p => selectedCampusData?.pageAccess[p.id]).length,
                            AVAILABLE_PAGES.filter(p => !selectedCampusData?.pageAccess[p.id]).length
                          ],
                          backgroundColor: [
                            'rgba(34, 197, 94, 0.8)',
                            'rgba(239, 68, 68, 0.8)'
                          ],
                          borderWidth: 0
                        }
                      ]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: true,
                      plugins: {
                        legend: { position: 'bottom' as const },
                        title: { display: false }
                      }
                    }}
                  />
                </div>

                {/* Category Distribution Chart */}
                <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-white/20">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center">
                      <PieChart className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="font-bold text-gray-800">Kategori Dağılımı</h3>
                  </div>
                  <Doughnut
                    data={{
                      labels: ['Kullanıcı', 'Öğretmen', 'Admin'],
                      datasets: [
                        {
                          data: [
                            AVAILABLE_PAGES.filter(p => p.category === 'user' && selectedCampusData?.pageAccess[p.id]).length,
                            AVAILABLE_PAGES.filter(p => p.category === 'teacher' && selectedCampusData?.pageAccess[p.id]).length,
                            AVAILABLE_PAGES.filter(p => p.category === 'admin' && selectedCampusData?.pageAccess[p.id]).length
                          ],
                          backgroundColor: [
                            'rgba(59, 130, 246, 0.8)',
                            'rgba(34, 197, 94, 0.8)',
                            'rgba(168, 85, 247, 0.8)'
                          ],
                          borderWidth: 0
                        }
                      ]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: true,
                      plugins: {
                        legend: { position: 'bottom' as const },
                        title: { display: false }
                      }
                    }}
                  />
                </div>

                {/* Campus Performance */}
                <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-white/20">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
                      <BarChart3 className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="font-bold text-gray-800">Kampüs Performansı</h3>
                  </div>
                  <div className="space-y-3">
                    {campuses.map(campus => {
                      const activeCount = AVAILABLE_PAGES.filter(p => campus.pageAccess[p.id]).length;
                      const percentage = Math.round((activeCount / AVAILABLE_PAGES.length) * 100);
                      const isHighPerformer = percentage >= 80;
                      return (
                        <div key={campus.campusId} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-gray-800">{campus.campusName}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-gray-700">{percentage}%</span>
                              {isHighPerformer && <span className="text-green-600 font-bold">↑</span>}
                            </div>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                percentage >= 80 ? 'bg-gradient-to-r from-green-500 to-emerald-600' :
                                percentage >= 50 ? 'bg-gradient-to-r from-yellow-500 to-orange-600' :
                                'bg-gradient-to-r from-red-500 to-rose-600'
                              }`}
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Category Statistics */}
            {selectedCampus && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl p-5 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-white/20 backdrop-blur-xl rounded-lg flex items-center justify-center">
                      <Users className="w-5 h-5" />
                    </div>
                    <h4 className="font-semibold text-lg">Kullanıcı Sayfaları</h4>
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-2xl font-bold">{AVAILABLE_PAGES.filter(p => p.category === 'user' && selectedCampusData?.pageAccess[p.id]).length}</p>
                      <p className="text-sm text-white/80">/ {AVAILABLE_PAGES.filter(p => p.category === 'user').length} aktif</p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold">{Math.round((AVAILABLE_PAGES.filter(p => p.category === 'user' && selectedCampusData?.pageAccess[p.id]).length / AVAILABLE_PAGES.filter(p => p.category === 'user').length) * 100)}%</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-400 to-green-600 rounded-2xl p-5 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-white/20 backdrop-blur-xl rounded-lg flex items-center justify-center">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <h4 className="font-semibold text-lg">Öğretmen Sayfaları</h4>
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-2xl font-bold">{AVAILABLE_PAGES.filter(p => p.category === 'teacher' && selectedCampusData?.pageAccess[p.id]).length}</p>
                      <p className="text-sm text-white/80">/ {AVAILABLE_PAGES.filter(p => p.category === 'teacher').length} aktif</p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold">{Math.round((AVAILABLE_PAGES.filter(p => p.category === 'teacher' && selectedCampusData?.pageAccess[p.id]).length / AVAILABLE_PAGES.filter(p => p.category === 'teacher').length) * 100)}%</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-400 to-purple-600 rounded-2xl p-5 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-white/20 backdrop-blur-xl rounded-lg flex items-center justify-center">
                      <Shield className="w-5 h-5" />
                    </div>
                    <h4 className="font-semibold text-lg">Admin Sayfaları</h4>
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-2xl font-bold">{AVAILABLE_PAGES.filter(p => p.category === 'admin' && selectedCampusData?.pageAccess[p.id]).length}</p>
                      <p className="text-sm text-white/80">/ {AVAILABLE_PAGES.filter(p => p.category === 'admin').length} aktif</p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold">{Math.round((AVAILABLE_PAGES.filter(p => p.category === 'admin' && selectedCampusData?.pageAccess[p.id]).length / AVAILABLE_PAGES.filter(p => p.category === 'admin').length) * 100)}%</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Search Bar */}
            <div className="bg-white/80 backdrop-blur-xl p-4 rounded-2xl shadow-lg mb-6 border border-white/20">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Sayfa adı, açıklama veya path ile ara..."
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white/50"
                />
                {searchTerm && (
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">
                    {filteredPages.length} sonuç
                  </div>
                )}
              </div>
            </div>

            {/* Unsaved Changes Warning */}
            {hasUnsavedChanges && selectedCampus && (
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-l-4 border-orange-500 p-4 rounded-lg mb-6 shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                    <Save className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-orange-900">Kaydedilmemiş Değişiklikler</h4>
                    <p className="text-sm text-orange-700">Yaptığınız değişiklikleri kaydetmeyi unutmayın!</p>
                  </div>
                </div>
              </div>
            )}

            {/* Bulk Operations */}
            {selectedCampus && (
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-2xl shadow-lg mb-6 border border-indigo-100">
                <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <Lock className="w-4 h-4 text-white" />
                  </div>
                  Toplu İşlemler
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-600 mb-2">Tüm Sayfalar</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => bulkToggleAll(true)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:shadow-lg transition-all text-sm font-medium"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Tümünü Aç
                      </button>
                      <button
                        onClick={() => bulkToggleAll(false)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-lg hover:shadow-lg transition-all text-sm font-medium"
                      >
                        <XCircle className="w-4 h-4" />
                        Tümünü Kapat
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-600 mb-2">Kategoriye Göre</p>
                    <div className="flex gap-2">
                      <select
                        onChange={(e) => {
                          const [category, action] = e.target.value.split('-');
                          if (category && action) {
                            bulkToggleCategory(category, action === 'enable');
                            e.target.value = '';
                          }
                        }}
                        className="flex-1 px-3 py-2 border border-indigo-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
                      >
                        <option value="">İşlem Seçin...</option>
                        <option value="user-enable">Kullanıcı - Aç</option>
                        <option value="user-disable">Kullanıcı - Kapat</option>
                        <option value="teacher-enable">Öğretmen - Aç</option>
                        <option value="teacher-disable">Öğretmen - Kapat</option>
                        <option value="admin-enable">Admin - Aç</option>
                        <option value="admin-disable">Admin - Kapat</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Content */}
            {!selectedCampus ? (
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-12 rounded-2xl shadow-lg text-center border border-indigo-100">
                <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                  <FileText className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-3">Kampüs Seçin</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">Sayfa erişim ayarlarını yönetmek için sol taraftaki filtrelerden bir kampüs seçin</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">Kullanıcı Sayfaları</span>
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">Öğretmen Sayfaları</span>
                  <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">Admin Sayfaları</span>
                </div>
              </div>
            ) : (
              <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg overflow-hidden border border-white/20">
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center">
                        <span className="text-white font-bold text-xl">{selectedCampusData?.campusName.charAt(0)}</span>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">{selectedCampusData?.campusName}</h3>
                        <p className="text-sm text-white/80">
                          {filteredPages.filter(p => selectedCampusData?.pageAccess[p.id]).length} / {filteredPages.length} sayfa aktif
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                  {paginatedPages.map(page => {
                    const isActive = selectedCampusData?.pageAccess[page.id];
                    const categoryGradients = {
                      user: 'from-blue-500 to-cyan-600',
                      teacher: 'from-green-500 to-emerald-600',
                      admin: 'from-purple-500 to-pink-600'
                    };
                    const categoryIcons = {
                      user: Users,
                      teacher: GraduationCap,
                      admin: Shield
                    };
                    const CategoryIcon = categoryIcons[page.category as keyof typeof categoryIcons];
                    
                    return (
                      <div key={page.id} className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 overflow-hidden group hover:scale-105">
                        <div className={`h-2 bg-gradient-to-r ${categoryGradients[page.category as keyof typeof categoryGradients]}`}></div>
                        <div className="p-5">
                          <div className="flex items-start gap-3 mb-4">
                            <div className={`w-12 h-12 bg-gradient-to-br ${categoryGradients[page.category as keyof typeof categoryGradients]} rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg`}>
                              <CategoryIcon className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-gray-900 mb-1 truncate">{page.name}</h4>
                              <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full ${getCategoryColor(page.category)}`}>
                                {getCategoryLabel(page.category)}
                              </span>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{page.description}</p>
                          <code className="block text-xs text-gray-400 bg-gray-50 px-3 py-2 rounded-lg mb-4 truncate">{page.path}</code>
                          <button
                            onClick={() => togglePageAccess(selectedCampus, page.id)}
                            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 ${
                              isActive
                                ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/30 hover:shadow-xl hover:shadow-green-500/40'
                                : 'bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40'
                            }`}
                          >
                            {isActive ? (
                              <>
                                <CheckCircle className="w-5 h-5" />
                                Aktif
                              </>
                            ) : (
                              <>
                                <XCircle className="w-5 h-5" />
                                Pasif
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 flex items-center justify-between border-t border-gray-200">
                    <div className="text-sm text-gray-700 font-medium">
                      {currentPage}/{totalPages} sayfa
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 hover:bg-white transition-colors font-medium"
                      >
                        Önceki
                      </button>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`px-4 py-2 border rounded-lg text-sm font-medium transition-all ${
                              currentPage === pageNum
                                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-transparent shadow-lg'
                                : 'border-gray-300 hover:bg-white'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 hover:bg-white transition-colors font-medium"
                      >
                        Sonraki
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageManagementPage;
