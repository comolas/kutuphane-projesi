import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, where, getCountFromServer } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Edit2, Trash2, MoreVertical, CheckSquare, Square, Search, Filter, SortAsc, SortDesc, Users, BookOpen, Clock, Eye, ArrowLeft } from 'lucide-react';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    <div className="p-4 sm:p-8 bg-gray-50 min-h-screen">
      <div className="flex items-center gap-2 sm:gap-4 mb-6 sm:mb-8">
        <button 
          onClick={() => navigate('/super-admin')}
          className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
          <span className="hidden sm:inline">Geri Dön</span>
        </button>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">Kampüs Yönetimi</h1>
      </div>

      {/* Arama ve Filtreleme */}
      <div className="mb-4 sm:mb-6 bg-white p-3 sm:p-4 rounded-lg shadow-lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Kampüs ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tüm Durumlar</option>
            <option value="active">Aktif</option>
            <option value="inactive">Pasif</option>
          </select>
          
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="name">Ada Göre Sırala</option>
            <option value="status">Duruma Göre Sırala</option>
            <option value="date">Tarihe Göre Sırala</option>
          </select>
          
          <div className="flex space-x-2">
            <button 
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="flex items-center px-3 py-2 border rounded-lg hover:bg-gray-50"
              title={sortOrder === 'asc' ? 'Azalan Sıralama' : 'Artan Sıralama'}
            >
              {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
            </button>
            <button 
              onClick={() => showStats ? setShowStats(false) : fetchCampusStats()}
              disabled={loadingStats}
              className="flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              <Eye className="w-4 h-4 mr-1" />
              {loadingStats ? 'Yükleniyor...' : showStats ? 'İstatistikleri Gizle' : 'İstatistikleri Göster'}
            </button>
            <button 
              onClick={clearFilters}
              className="px-3 py-2 text-gray-600 hover:text-gray-800 border rounded-lg hover:bg-gray-50"
            >
              Temizle
            </button>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="text-xs sm:text-sm text-gray-600">
            {filteredAndSortedCampuses.length} kampüs gösteriliyor
            {searchQuery && ` ("${searchQuery}" araması)`}
            {statusFilter !== 'all' && ` (${statusFilter === 'active' ? 'Aktif' : 'Pasif'} filtresi)`}
          </div>
          
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 text-white font-bold py-2 px-3 sm:px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm w-full sm:w-auto"
          >
            Yeni Kampüs Ekle
          </button>
        </div>
      </div>
      
      {/* Toplu İşlemler */}
      {selectedCampuses.length > 0 && (
        <div className="mb-4 bg-orange-50 border border-orange-200 rounded-lg p-3 sm:p-4">
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

      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 sm:p-8 rounded-lg shadow-2xl w-full max-w-md">
            <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">{editingCampus ? 'Kampüs Düzenle' : 'Yeni Kampüs Ekle'}</h2>
            <form onSubmit={handleAddCampus}>
              <div className="mb-4">
                <label htmlFor="campusName" className="block text-gray-700 text-sm font-bold mb-2">Kampüs Adı</label>
                <input 
                  type="text"
                  id="campusName"
                  value={newCampusName}
                  onChange={(e) => setNewCampusName(e.target.value)}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  placeholder="Örn: Merkez Kampüs"
                />
              </div>
              <div className="mb-4">
                <label htmlFor="campusCode" className="block text-gray-700 text-sm font-bold mb-2">Benzersiz Kod</label>
                <input 
                  type="text"
                  id="campusCode"
                  value={newCampusCode}
                  onChange={(e) => setNewCampusCode(e.target.value.toUpperCase())}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline font-mono"
                  placeholder="Örn: MERKEZ2024"
                />
              </div>
              <div className="mb-4">
                <label htmlFor="campusDescription" className="block text-gray-700 text-sm font-bold mb-2">Açıklama (İsteğe Bağlı)</label>
                <textarea 
                  id="campusDescription"
                  value={newCampusDescription}
                  onChange={(e) => setNewCampusDescription(e.target.value)}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  placeholder="Kampüs hakkında kısa açıklama"
                  rows={3}
                />
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 sm:gap-4">
                <button 
                  type="button"
                  onClick={closeModal}
                  className="bg-gray-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  İptal
                </button>
                <button 
                  type="submit"
                  className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
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