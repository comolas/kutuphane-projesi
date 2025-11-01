import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, where, getCountFromServer } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Edit2, Trash2, MoreVertical, CheckSquare, Square, Search, Filter, SortAsc, SortDesc, Users, BookOpen, Clock, Eye, ArrowLeft, TrendingUp, BarChart3, X } from 'lucide-react';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);
import { useNavigate } from 'react-router-dom';

interface Campus {
  id: string;
  name: string;
  code?: string;
  createdAt: any;
  status?: 'active' | 'inactive';
  description?: string;
  stats?: {
    totalUsers: number;
    totalBooks: number;
    activeBorrows: number;
    totalAdmins: number;
  };
}

const CampusManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCampus, setEditingCampus] = useState<Campus | null>(null);
  const [newCampusName, setNewCampusName] = useState('');
  const [newCampusCode, setNewCampusCode] = useState('');
  const [newCampusDescription, setNewCampusDescription] = useState('');
  const [selectedCampuses, setSelectedCampuses] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showStats, setShowStats] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [showCharts, setShowCharts] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const fetchCampuses = async () => {
      try {
        setLoading(true);
        const querySnapshot = await getDocs(collection(db, 'campuses'));
        const campusesData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          code: doc.data().code || '',
          createdAt: doc.data().createdAt,
          status: doc.data().status || 'active',
          description: doc.data().description || '',
        })) as Campus[];
        setCampuses(campusesData);
      } catch (err) {
        setError('Kampüsler yüklenirken bir hata oluştu.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchCampuses();
  }, []);

  const handleAddCampus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampusName.trim()) {
      alert('Kampüs adı boş olamaz.');
      return;
    }

    try {
      const campusData = {
        name: newCampusName,
        code: newCampusCode,
        description: newCampusDescription,
        status: 'active' as const,
        createdAt: serverTimestamp(),
      };

      if (editingCampus) {
        await updateDoc(doc(db, 'campuses', editingCampus.id), campusData);
        setCampuses(prev => prev.map(c => c.id === editingCampus.id ? { ...c, ...campusData, createdAt: c.createdAt } : c));
      } else {
        const docRef = await addDoc(collection(db, 'campuses'), campusData);
        setCampuses(prev => [...prev, { id: docRef.id, ...campusData, createdAt: new Date() }]);
      }
      
      setNewCampusName('');
      setNewCampusCode('');
      setNewCampusDescription('');
      setEditingCampus(null);
      setIsModalOpen(false);
    } catch (err) {
      alert('Kampüs kaydedilirken bir hata oluştu.');
      console.error(err);
    }
  };

  const handleEditCampus = (campus: Campus) => {
    setEditingCampus(campus);
    setNewCampusName(campus.name);
    setNewCampusCode(campus.code || '');
    setNewCampusDescription(campus.description || '');
    setIsModalOpen(true);
  };

  const handleDeleteCampus = async (campusId: string) => {
    if (!confirm('Bu kampüsü silmek istediğinizden emin misiniz?')) return;
    
    try {
      await deleteDoc(doc(db, 'campuses', campusId));
      setCampuses(prev => prev.filter(c => c.id !== campusId));
    } catch (err) {
      alert('Kampüs silinirken bir hata oluştu.');
      console.error(err);
    }
  };

  const handleToggleStatus = async (campusId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      await updateDoc(doc(db, 'campuses', campusId), { status: newStatus });
      setCampuses(prev => prev.map(c => c.id === campusId ? { ...c, status: newStatus } : c));
    } catch (err) {
      alert('Kampüs durumu güncellenirken bir hata oluştu.');
      console.error(err);
    }
  };

  const handleSelectCampus = (campusId: string) => {
    setSelectedCampuses(prev => 
      prev.includes(campusId) 
        ? prev.filter(id => id !== campusId)
        : [...prev, campusId]
    );
  };

  const handleSelectAll = () => {
    setSelectedCampuses(selectedCampuses.length === campuses.length ? [] : campuses.map(c => c.id));
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedCampuses.length === 0) return;
    
    try {
      const promises = selectedCampuses.map(campusId => {
        if (bulkAction === 'activate') {
          return updateDoc(doc(db, 'campuses', campusId), { status: 'active' });
        } else if (bulkAction === 'deactivate') {
          return updateDoc(doc(db, 'campuses', campusId), { status: 'inactive' });
        } else if (bulkAction === 'delete') {
          return deleteDoc(doc(db, 'campuses', campusId));
        }
      });
      
      await Promise.all(promises);
      
      if (bulkAction === 'delete') {
        setCampuses(prev => prev.filter(c => !selectedCampuses.includes(c.id)));
      } else {
        const newStatus = bulkAction === 'activate' ? 'active' : 'inactive';
        setCampuses(prev => prev.map(c => 
          selectedCampuses.includes(c.id) ? { ...c, status: newStatus } : c
        ));
      }
      
      setSelectedCampuses([]);
      setBulkAction('');
    } catch (err) {
      alert('Toplu işlem sırasında bir hata oluştu.');
      console.error(err);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCampus(null);
    setNewCampusName('');
    setNewCampusCode('');
    setNewCampusDescription('');
  };

  const filteredAndSortedCampuses = useMemo(() => {
    return campuses
      .filter(campus => {
        const matchesSearch = campus.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             (campus.description || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || campus.status === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        let aValue, bValue;
        
        switch (sortBy) {
          case 'name':
            aValue = a.name.toLowerCase();
            bValue = b.name.toLowerCase();
            break;
          case 'status':
            aValue = a.status || 'active';
            bValue = b.status || 'active';
            break;
          case 'date':
            aValue = a.createdAt?.toDate().getTime() || 0;
            bValue = b.createdAt?.toDate().getTime() || 0;
            break;
          default:
            return 0;
        }
        
        if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [campuses, searchQuery, statusFilter, sortBy, sortOrder]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setSortBy('name');
    setSortOrder('asc');
  };

  const fetchCampusStats = async () => {
    setLoadingStats(true);
    try {
      const updatedCampuses = await Promise.all(
        campuses.map(async (campus) => {
          const usersCol = collection(db, 'users');
          const booksCol = collection(db, 'books');
          const borrowsCol = collection(db, 'borrows');
          
          const campusUsersQuery = query(usersCol, where('campusId', '==', campus.id));
          const campusBooksQuery = query(booksCol, where('campusId', '==', campus.id));
          const campusBorrowsQuery = query(borrowsCol, where('campusId', '==', campus.id), where('status', '==', 'active'));
          const campusAdminsQuery = query(usersCol, where('campusId', '==', campus.id), where('role', '==', 'admin'));
          
          const [usersCount, booksCount, borrowsCount, adminsCount] = await Promise.all([
            getCountFromServer(campusUsersQuery),
            getCountFromServer(campusBooksQuery),
            getCountFromServer(campusBorrowsQuery),
            getCountFromServer(campusAdminsQuery)
          ]);
          
          return {
            ...campus,
            stats: {
              totalUsers: usersCount.data().count,
              totalBooks: booksCount.data().count,
              activeBorrows: borrowsCount.data().count,
              totalAdmins: adminsCount.data().count
            }
          };
        })
      );
      
      setCampuses(updatedCampuses);
      setShowStats(true);
    } catch (err) {
      console.error('İstatistikler yüklenirken hata:', err);
      alert('İstatistikler yüklenirken bir hata oluştu.');
    } finally {
      setLoadingStats(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4 sm:p-6">
      <div className="mb-6 sm:mb-8 animate-fadeIn">
        <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-3">
            <button 
              onClick={() => navigate('/super-admin')}
              className="p-2 hover:bg-indigo-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-indigo-600" />
            </button>
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-3 rounded-xl">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Kampüs Yönetimi</h1>
          </div>
          <p className="text-gray-600 text-lg">Kampüsleri yönetin ve istatistikleri görüntüleyin</p>
        </div>
      </div>

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
                placeholder="Kampüs ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <Search className="absolute left-2.5 sm:left-3 top-2.5 text-gray-400" size={14} />
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Durum</h3>
              <div className="space-y-2">
                <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                  <input
                    type="radio"
                    name="status"
                    checked={statusFilter === 'all'}
                    onChange={() => setStatusFilter('all')}
                    className="mr-2"
                  />
                  <span className="text-sm">Tümü</span>
                </label>
                <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                  <input
                    type="radio"
                    name="status"
                    checked={statusFilter === 'active'}
                    onChange={() => setStatusFilter('active')}
                    className="mr-2"
                  />
                  <span className="text-sm text-green-600">● Aktif</span>
                </label>
                <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                  <input
                    type="radio"
                    name="status"
                    checked={statusFilter === 'inactive'}
                    onChange={() => setStatusFilter('inactive')}
                    className="mr-2"
                  />
                  <span className="text-sm text-red-600">● Pasif</span>
                </label>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Sıralama</h3>
              <div className="space-y-2">
                <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                  <input
                    type="radio"
                    name="sortBy"
                    checked={sortBy === 'name'}
                    onChange={() => setSortBy('name')}
                    className="mr-2"
                  />
                  <span className="text-sm">Ada Göre</span>
                </label>
                <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                  <input
                    type="radio"
                    name="sortBy"
                    checked={sortBy === 'status'}
                    onChange={() => setSortBy('status')}
                    className="mr-2"
                  />
                  <span className="text-sm">Duruma Göre</span>
                </label>
                <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                  <input
                    type="radio"
                    name="sortBy"
                    checked={sortBy === 'date'}
                    onChange={() => setSortBy('date')}
                    className="mr-2"
                  />
                  <span className="text-sm">Tarihe Göre</span>
                </label>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Sıra</h3>
              <div className="space-y-2">
                <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                  <input
                    type="radio"
                    name="sortOrder"
                    checked={sortOrder === 'asc'}
                    onChange={() => setSortOrder('asc')}
                    className="mr-2"
                  />
                  <span className="text-sm flex items-center"><SortAsc className="w-4 h-4 mr-1" /> Artan</span>
                </label>
                <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                  <input
                    type="radio"
                    name="sortOrder"
                    checked={sortOrder === 'desc'}
                    onChange={() => setSortOrder('desc')}
                    className="mr-2"
                  />
                  <span className="text-sm flex items-center"><SortDesc className="w-4 h-4 mr-1" /> Azalan</span>
                </label>
              </div>
            </div>

            <button 
              onClick={clearFilters}
              className="w-full px-3 py-2 text-gray-600 hover:text-gray-800 border rounded-lg hover:bg-gray-50 text-sm font-semibold"
            >
              Filtreleri Temizle
            </button>
          </div>
        </aside>

        <div className="flex-1">
          <div className="mb-4 sm:mb-6 bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg p-4 sm:p-6 animate-fadeIn">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="text-xs sm:text-sm text-gray-600">
                {filteredAndSortedCampuses.length} kampüs gösteriliyor
                {searchQuery && ` ("${searchQuery}" araması)`}
                {statusFilter !== 'all' && ` (${statusFilter === 'active' ? 'Aktif' : 'Pasif'} filtresi)`}
              </div>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => setIsSidebarOpen(true)}
                  className="lg:hidden px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2 font-semibold"
                >
                  <Filter className="w-5 h-5" />
                  Filtreler
                </button>
                <button 
                  onClick={() => showStats ? setShowStats(false) : fetchCampusStats()}
                  disabled={loadingStats}
                  className="flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  {loadingStats ? 'Yükleniyor...' : showStats ? 'Gizle' : 'İstatistikler'}
                </button>
                {showStats && (
                  <button 
                    onClick={() => setShowCharts(!showCharts)}
                    className="flex items-center px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    <BarChart3 className="w-4 h-4 mr-1" />
                    {showCharts ? 'Grafik Gizle' : 'Grafikler'}
                  </button>
                )}
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-2 px-4 rounded-xl hover:shadow-lg transition-all text-sm flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Yeni Kampüs Ekle
                </button>
              </div>
            </div>
          </div>
      
      {/* Toplu İşlemler */}
      {selectedCampuses.length > 0 && (
        <div className="mb-4 bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-300 rounded-xl p-4 shadow-lg animate-fadeIn mx-4 sm:mx-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <span className="text-orange-800 font-medium">
              {selectedCampuses.length} kampüs seçildi
            </span>
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <select 
                value={bulkAction} 
                onChange={(e) => setBulkAction(e.target.value)}
                className="border rounded-lg px-3 py-2"
              >
                <option value="">Toplu İşlem Seç</option>
                <option value="activate">Aktifleştir</option>
                <option value="deactivate">Pasifleştir</option>
                <option value="delete">Sil</option>
              </select>
              <button 
                onClick={handleBulkAction}
                disabled={!bulkAction}
                className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50"
              >
                Uygula
              </button>
            </div>
          </div>
        </div>
      )}

      {showCharts && showStats && campuses.some(c => c.stats) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 animate-fadeIn mx-4 sm:mx-0">
          <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg p-6">
            <h3 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              Kampüs Karşılaştırması
            </h3>
            <div className="h-80">
              <Bar data={{ labels: campuses.filter(c => c.stats).map(c => c.name), datasets: [{ label: 'Kullanıcılar', data: campuses.filter(c => c.stats).map(c => c.stats?.totalUsers || 0), backgroundColor: 'rgba(99, 102, 241, 0.8)', borderRadius: 8 }, { label: 'Kitaplar', data: campuses.filter(c => c.stats).map(c => c.stats?.totalBooks || 0), backgroundColor: 'rgba(34, 197, 94, 0.8)', borderRadius: 8 }, { label: 'Aktif Ödünç', data: campuses.filter(c => c.stats).map(c => c.stats?.activeBorrows || 0), backgroundColor: 'rgba(251, 146, 60, 0.8)', borderRadius: 8 }] }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true } } }} />
            </div>
          </div>
          <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg p-6">
            <h3 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">Kullanıcı Dağılımı</h3>
            <div className="h-80">
              <Doughnut data={{ labels: campuses.filter(c => c.stats).map(c => c.name), datasets: [{ data: campuses.filter(c => c.stats).map(c => c.stats?.totalUsers || 0), backgroundColor: ['rgba(99, 102, 241, 0.8)', 'rgba(59, 130, 246, 0.8)', 'rgba(34, 197, 94, 0.8)', 'rgba(251, 146, 60, 0.8)', 'rgba(236, 72, 153, 0.8)', 'rgba(147, 51, 234, 0.8)'], borderWidth: 0 }] }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12 mx-4 sm:mx-0">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 text-center mx-4 sm:mx-0">
          <p className="text-red-600 font-semibold">{error}</p>
        </div>
      ) : filteredAndSortedCampuses.length === 0 ? (
        <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg p-12 text-center animate-fadeIn mx-4 sm:mx-0">
          <svg className="w-24 h-24 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <h3 className="text-xl font-bold text-gray-700 mb-2">Kampüs Bulunamadı</h3>
          <p className="text-gray-500 mb-6">Henüz kampüs eklenmemiş veya arama kriterlerinize uygun kampüs yok.</p>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-3 px-6 rounded-xl hover:shadow-lg transition-all inline-flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            İlk Kampüsü Ekle
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 animate-fadeIn mx-4 sm:mx-0">
          {filteredAndSortedCampuses.map(campus => {
            const gradients = ['from-indigo-500 to-purple-600', 'from-blue-500 to-cyan-600', 'from-green-500 to-emerald-600', 'from-yellow-500 to-orange-600', 'from-pink-500 to-rose-600', 'from-purple-500 to-pink-600'];
            const gradient = gradients[Math.abs(campus.name.charCodeAt(0)) % gradients.length];
            return (
              <div key={campus.id} className={`bg-white/90 backdrop-blur-xl border-2 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden ${selectedCampuses.includes(campus.id) ? 'border-indigo-500 ring-2 ring-indigo-300' : 'border-white/20 hover:border-indigo-300'}`}>
                <div className={`bg-gradient-to-r ${gradient} p-6 relative`}>
                  <div className="absolute top-4 right-4">
                    <button onClick={() => handleSelectCampus(campus.id)} className="p-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-all">
                      {selectedCampuses.includes(campus.id) ? <CheckSquare className="w-5 h-5 text-white" /> : <Square className="w-5 h-5 text-white" />}
                    </button>
                  </div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">{campus.name}</h3>
                  {campus.code && <p className="text-white/90 font-mono text-sm bg-white/20 backdrop-blur-sm rounded-lg px-3 py-1 inline-block">{campus.code}</p>}
                </div>
                <div className="p-6">
                  {campus.description && <p className="text-gray-600 text-sm mb-4 line-clamp-2">{campus.description}</p>}
                  {showStats && campus.stats && (
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-3 border-2 border-blue-200"><div className="flex items-center justify-between mb-1"><div className="flex items-center gap-2"><Users className="w-4 h-4 text-blue-600" /><span className="text-xs font-semibold text-blue-600">Kullanıcı</span></div>{campus.stats.totalUsers > 50 && <TrendingUp className="w-3 h-3 text-green-600" />}</div><p className="text-2xl font-bold text-blue-700">{campus.stats.totalUsers}</p></div>
                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-3 border-2 border-green-200"><div className="flex items-center justify-between mb-1"><div className="flex items-center gap-2"><BookOpen className="w-4 h-4 text-green-600" /><span className="text-xs font-semibold text-green-600">Kitap</span></div>{campus.stats.totalBooks > 100 && <TrendingUp className="w-3 h-3 text-green-600" />}</div><p className="text-2xl font-bold text-green-700">{campus.stats.totalBooks}</p></div>
                      <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-3 border-2 border-orange-200"><div className="flex items-center justify-between mb-1"><div className="flex items-center gap-2"><Clock className="w-4 h-4 text-orange-600" /><span className="text-xs font-semibold text-orange-600">Ödünç</span></div>{campus.stats.activeBorrows > 20 && <TrendingUp className="w-3 h-3 text-green-600" />}</div><p className="text-2xl font-bold text-orange-700">{campus.stats.activeBorrows}</p>{campus.stats.totalBooks > 0 && <p className="text-xs text-orange-600 mt-1">%{Math.round((campus.stats.activeBorrows / campus.stats.totalBooks) * 100)} kullanımda</p>}</div>
                      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-3 border-2 border-purple-200"><div className="flex items-center gap-2 mb-1"><Users className="w-4 h-4 text-purple-600" /><span className="text-xs font-semibold text-purple-600">Admin</span></div><p className="text-2xl font-bold text-purple-700">{campus.stats.totalAdmins}</p></div>
                    </div>
                  )}
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
                    <button onClick={() => handleToggleStatus(campus.id, campus.status || 'active')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${campus.status === 'active' ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-lg' : 'bg-gradient-to-r from-red-500 to-pink-600 text-white hover:shadow-lg'}`}>{campus.status === 'active' ? '✓ Aktif' : '✕ Pasif'}</button>
                    <div className="text-right"><p className="text-xs text-gray-500">Oluşturulma</p><p className="text-sm font-semibold text-gray-700">{campus.createdAt?.toDate().toLocaleDateString('tr-TR') ?? '-'}</p></div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleEditCampus(campus)} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-xl hover:bg-indigo-200 transition-all font-semibold text-sm"><Edit2 className="w-4 h-4" />Düzenle</button>
                    <button onClick={() => handleDeleteCampus(campus.id)} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition-all font-semibold text-sm"><Trash2 className="w-4 h-4" />Sil</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )
      }
        </div>
      </div>
      <div className="hidden bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="overflow-x-auto -mx-4 sm:mx-0">
        <table className="min-w-full leading-normal">
          <thead>
            <tr>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100">
                <button onClick={handleSelectAll} className="flex items-center">
                  {selectedCampuses.length === filteredAndSortedCampuses.length && filteredAndSortedCampuses.length > 0 ? 
                    <CheckSquare className="w-4 h-4" /> : 
                    <Square className="w-4 h-4" />
                  }
                </button>
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100">
                <button 
                  onClick={() => handleSort('name')}
                  className="flex items-center space-x-1 text-xs font-semibold text-gray-600 uppercase tracking-wider hover:text-gray-800"
                >
                  <span>Kampüs Adı</span>
                  {sortBy === 'name' && (
                    sortOrder === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />
                  )}
                </button>
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Benzersiz Kod
              </th>
              {showStats && (
                <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  İstatistikler
                </th>
              )}
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100">
                <button 
                  onClick={() => handleSort('status')}
                  className="flex items-center space-x-1 text-xs font-semibold text-gray-600 uppercase tracking-wider hover:text-gray-800"
                >
                  <span>Durum</span>
                  {sortBy === 'status' && (
                    sortOrder === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />
                  )}
                </button>
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100">
                <button 
                  onClick={() => handleSort('date')}
                  className="flex items-center space-x-1 text-xs font-semibold text-gray-600 uppercase tracking-wider hover:text-gray-800"
                >
                  <span>Oluşturulma Tarihi</span>
                  {sortBy === 'date' && (
                    sortOrder === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />
                  )}
                </button>
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                İşlemler
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={showStats ? 7 : 6} className="text-center py-4">Yükleniyor...</td></tr>
            ) : error ? (
              <tr><td colSpan={showStats ? 7 : 6} className="text-center py-4 text-red-500">{error}</td></tr>
            ) : (
              filteredAndSortedCampuses.map(campus => (
                <tr key={campus.id} className={selectedCampuses.includes(campus.id) ? 'bg-blue-50' : ''}>
                  <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                    <button onClick={() => handleSelectCampus(campus.id)}>
                      {selectedCampuses.includes(campus.id) ? 
                        <CheckSquare className="w-4 h-4 text-blue-600" /> : 
                        <Square className="w-4 h-4" />
                      }
                    </button>
                  </td>
                  <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                    <div>
                      <p className="text-gray-900 font-medium">{campus.name}</p>
                      {campus.description && (
                        <p className="text-gray-600 text-xs">{campus.description}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                    <p className="text-gray-900 font-mono font-semibold">{campus.code || '-'}</p>
                  </td>
                  {showStats && (
                    <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                      {campus.stats ? (
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex items-center space-x-1 text-xs">
                            <Users className="w-3 h-3 text-blue-500" />
                            <span className="font-medium text-blue-600">{campus.stats.totalUsers}</span>
                            <span className="text-gray-500">kullanıcı</span>
                          </div>
                          <div className="flex items-center space-x-1 text-xs">
                            <BookOpen className="w-3 h-3 text-green-500" />
                            <span className="font-medium text-green-600">{campus.stats.totalBooks}</span>
                            <span className="text-gray-500">kitap</span>
                          </div>
                          <div className="flex items-center space-x-1 text-xs">
                            <Clock className="w-3 h-3 text-orange-500" />
                            <span className="font-medium text-orange-600">{campus.stats.activeBorrows}</span>
                            <span className="text-gray-500">ödünç</span>
                          </div>
                          <div className="flex items-center space-x-1 text-xs">
                            <Users className="w-3 h-3 text-purple-500" />
                            <span className="font-medium text-purple-600">{campus.stats.totalAdmins}</span>
                            <span className="text-gray-500">admin</span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400">İstatistik yok</div>
                      )}
                    </td>
                  )}
                  <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                    <button 
                      onClick={() => handleToggleStatus(campus.id, campus.status || 'active')}
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        campus.status === 'active' 
                          ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                          : 'bg-red-100 text-red-800 hover:bg-red-200'
                      } transition-colors`}
                    >
                      {campus.status === 'active' ? 'Aktif' : 'Pasif'}
                    </button>
                  </td>
                  <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                    <p className="text-gray-900">
                      {campus.createdAt?.toDate().toLocaleDateString('tr-TR') ?? '-'}
                    </p>
                  </td>
                  <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm text-center">
                    <div className="flex justify-center space-x-2">
                      <button 
                        onClick={() => handleEditCampus(campus)}
                        className="text-blue-600 hover:text-blue-800 p-1"
                        title="Düzenle"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteCampus(campus.id)}
                        className="text-red-600 hover:text-red-800 p-1"
                        title="Sil"
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
      </div>

      {/* Yeni Kampüs Ekleme Modalı */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-[9999] flex items-center justify-center p-0 animate-fadeIn" onClick={closeModal}>
          <div className="bg-gradient-to-br from-white to-indigo-50 w-full h-full overflow-y-auto flex flex-col transform transition-all duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 sm:p-6 flex-shrink-0">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 sm:p-3">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-2xl font-bold text-white">{editingCampus ? 'Kampüs Düzenle' : 'Yeni Kampüs Ekle'}</h3>
                    <p className="text-xs sm:text-sm text-white/80">Kampüs bilgilerini {editingCampus ? 'güncelleyin' : 'girin'}</p>
                  </div>
                </div>
                <button onClick={closeModal} className="text-white hover:bg-white/20 rounded-full p-2 transition-all duration-200 flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation">
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>
            </div>
            <form onSubmit={handleAddCampus} className="p-4 sm:p-6 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label htmlFor="campusName" className="block text-xs sm:text-sm font-bold text-gray-700 mb-2">Kampüs Adı <span className="text-red-500">*</span></label>
                  <input 
                    type="text"
                    id="campusName"
                    value={newCampusName}
                    onChange={(e) => setNewCampusName(e.target.value)}
                    className="block w-full border-2 border-gray-200 rounded-xl shadow-sm py-2 sm:py-3 px-3 sm:px-4 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm sm:text-base"
                    placeholder="Örn: Merkez Kampüs"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="campusCode" className="block text-xs sm:text-sm font-bold text-gray-700 mb-2">Benzersiz Kod</label>
                  <input 
                    type="text"
                    id="campusCode"
                    value={newCampusCode}
                    onChange={(e) => setNewCampusCode(e.target.value.toUpperCase())}
                    className="block w-full border-2 border-gray-200 rounded-xl shadow-sm py-2 sm:py-3 px-3 sm:px-4 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm sm:text-base font-mono"
                    placeholder="Örn: MERKEZ2024"
                  />
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="campusDescription" className="block text-xs sm:text-sm font-bold text-gray-700 mb-2">Açıklama (İsteğe Bağlı)</label>
                  <textarea 
                    id="campusDescription"
                    value={newCampusDescription}
                    onChange={(e) => setNewCampusDescription(e.target.value)}
                    className="block w-full border-2 border-gray-200 rounded-xl shadow-sm py-2 sm:py-3 px-3 sm:px-4 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm sm:text-base"
                    placeholder="Kampüs hakkında kısa açıklama"
                    rows={3}
                  />
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-gray-200 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
                <button 
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-gray-700 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-all font-semibold text-sm min-h-[44px] flex items-center justify-center shadow-md hover:shadow-lg hover:scale-105 touch-manipulation"
                >
                  İptal
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all font-semibold text-sm min-h-[44px] flex items-center justify-center shadow-md hover:scale-105 touch-manipulation"
                >
                  {editingCampus ? 'Güncelle' : 'Ekle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampusManagementPage;