import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { ArrowLeft, Search, Lock, Unlock, Save, RefreshCw } from 'lucide-react';
import Swal from 'sweetalert2';

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
  };

  const saveChanges = async () => {
    setSaving(true);
    try {
      for (const campus of campuses) {
        await setDoc(doc(db, 'pageAccess', campus.campusId), campus.pageAccess);
      }
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
    .filter(page => page.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                    page.description.toLowerCase().includes(searchTerm.toLowerCase()))
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
              disabled={saving}
              className="flex items-center px-3 sm:px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 text-sm"
            >
              <Save className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">{saving ? 'Kaydediliyor...' : 'Kaydet'}</span>
              <span className="sm:hidden">{saving ? '...' : 'Kaydet'}</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div>
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Arama</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Sayfa adı..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Kategori</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="all">Tüm Kategoriler</option>
                <option value="user">Kullanıcı</option>
                <option value="teacher">Öğretmen</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sıralama</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="category">Kategoriye Göre</option>
                <option value="name">İsme Göre</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        {!selectedCampus ? (
          <div className="bg-white p-8 sm:p-12 rounded-lg shadow-lg text-center">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-indigo-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Kampüs Seçin</h3>
            <p className="text-sm text-gray-500">Sayfa erişim ayarlarını yönetmek için yukarıdan bir kampüs seçin</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="bg-indigo-50 px-4 sm:px-6 py-3 sm:py-4 border-b border-indigo-100">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-lg">{selectedCampusData?.campusName.charAt(0)}</span>
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-800">{selectedCampusData?.campusName}</h3>
                    <p className="text-xs sm:text-sm text-gray-600">
                      {paginatedPages.filter(p => selectedCampusData?.pageAccess[p.id]).length} / {paginatedPages.length} sayfa aktif
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Sayfa</th>
                    <th className="hidden sm:table-cell px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Kategori</th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Durum</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedPages.map(page => {
                    const isActive = selectedCampusData?.pageAccess[page.id];
                    return (
                      <tr key={page.id} className="hover:bg-gray-50">
                        <td className="px-3 sm:px-6 py-3 sm:py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{page.name}</div>
                            <div className="text-xs text-gray-500">{page.description}</div>
                            <div className="text-xs text-gray-400 mt-1">{page.path}</div>
                            <div className="sm:hidden mt-2">
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getCategoryColor(page.category)}`}>
                                {getCategoryLabel(page.category)}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="hidden sm:table-cell px-6 py-4">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getCategoryColor(page.category)}`}>
                            {getCategoryLabel(page.category)}
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-center">
                          <button
                            onClick={() => togglePageAccess(selectedCampus, page.id)}
                            className={`inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all transform hover:scale-105 ${
                              isActive
                                ? 'bg-green-100 text-green-800 hover:bg-green-200 shadow-sm'
                                : 'bg-red-100 text-red-800 hover:bg-red-200 shadow-sm'
                            }`}
                          >
                            {isActive ? (
                              <>
                                <Unlock className="w-4 h-4 mr-2" />
                                Aktif
                              </>
                            ) : (
                              <>
                                <Lock className="w-4 h-4 mr-2" />
                                Pasif
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
            <div className="bg-gray-50 px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row items-center justify-between border-t border-gray-200 gap-3">
              <div className="text-xs sm:text-sm text-gray-700">
                {currentPage}/{totalPages} sayfa
              </div>
              <div className="flex gap-1 sm:gap-2 flex-wrap justify-center">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 hover:bg-gray-100"
                >
                  Önceki
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1 border rounded text-sm ${
                      currentPage === page
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 hover:bg-gray-100"
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
  );
};

export default PageManagementPage;
