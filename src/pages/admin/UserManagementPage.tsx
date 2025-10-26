import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../../firebase/config';
import { Search, SortAsc, SortDesc, ArrowLeft, Ban, CheckCircle, ChevronLeft, ChevronRight, Users as UsersIcon, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { updateDoc, doc } from 'firebase/firestore';

interface User {
  id: string;
  displayName: string;
  email: string;
  role: string;
  campusId?: string;
  isBlocked?: boolean;
}

interface Campus {
  id: string;
  name: string;
}

const UserManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [campusFilter, setCampusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedCampus, setSelectedCampus] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const usersData = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
        setUsers(usersData);

        const campusesSnapshot = await getDocs(collection(db, 'campuses'));
        const campusesData = campusesSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name } as Campus));
        setCampuses(campusesData);

        setError(null);
      } catch (err) {
        console.error("Veri yüklenirken hata:", err);
        setError("Kullanıcı ve kampüs verileri yüklenemedi.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const openModal = (user: User) => {
    setSelectedUser(user);
    setSelectedRole(user.role);
    setSelectedCampus(user.campusId || '');
    setIsModalOpen(true);
  };

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedRole(e.target.value);
    if (e.target.value !== 'admin') {
      setSelectedCampus('');
    }
  };

  const handleSaveChanges = async () => {
    if (!selectedUser) return;

    if (selectedRole === 'admin' && !selectedCampus) {
      alert('Admin rolü için bir kampüs seçmelisiniz.');
      return;
    }

    setIsSaving(true);
    try {
      const functions = getFunctions();
      const setRole = httpsCallable(functions, 'setRole');
      
      await setRole({
        userId: selectedUser.id,
        newRole: selectedRole,
        campusId: selectedCampus,
      });

      // Arayüzü güncelle
      setUsers(users.map(u => u.id === selectedUser.id ? { ...u, role: selectedRole, campusId: selectedRole === 'admin' ? selectedCampus : undefined } : u));
      setIsModalOpen(false);
      alert('Rol başarıyla güncellendi!');

    } catch (err: any) {
      console.error("Rol güncellenirken hata:", err);
      alert(`Bir hata oluştu: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredAndSortedUsers = useMemo(() => {
    return users
      .filter(user => {
        const matchesSearch = (user.displayName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                             (user.email || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRole = roleFilter === 'all' || user.role === roleFilter;
        const matchesCampus = campusFilter === 'all' || user.campusId === campusFilter;
        return matchesSearch && matchesRole && matchesCampus;
      })
      .sort((a, b) => {
        let aValue, bValue;
        
        switch (sortBy) {
          case 'name':
            aValue = (a.displayName || '').toLowerCase();
            bValue = (b.displayName || '').toLowerCase();
            break;
          case 'email':
            aValue = (a.email || '').toLowerCase();
            bValue = (b.email || '').toLowerCase();
            break;
          case 'role':
            aValue = a.role || '';
            bValue = b.role || '';
            break;
          default:
            return 0;
        }
        
        if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [users, searchQuery, roleFilter, campusFilter, sortBy, sortOrder]);

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
    setRoleFilter('all');
    setCampusFilter('all');
    setSortBy('name');
    setSortOrder('asc');
    setCurrentPage(1);
  };

  const handleToggleBlockUser = async (userId: string, currentBlockStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        isBlocked: !currentBlockStatus
      });
      
      setUsers(users.map(u => 
        u.id === userId ? { ...u, isBlocked: !currentBlockStatus } : u
      ));
    } catch (err) {
      console.error('Kullanıcı durumu güncellenirken hata:', err);
      alert('Kullanıcı durumu güncellenirken bir hata oluştu.');
    }
  };

  const roleStats = useMemo(() => {
    return filteredAndSortedUsers.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [filteredAndSortedUsers]);

  // Sayfalama hesaplamaları
  const totalPages = Math.ceil(filteredAndSortedUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentUsers = filteredAndSortedUsers.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const exportToCSV = () => {
    const headers = ['Ad', 'Email', 'Rol', 'Kampüs', 'Durum'];
    const csvContent = [
      headers.join(','),
      ...filteredAndSortedUsers.map(user => [
        user.displayName || '',
        user.email || '',
        user.role || '',
        campuses.find(c => c.id === user.campusId)?.name || 'N/A',
        user.isBlocked ? 'Engelli' : 'Aktif'
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `kullanicilar_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="p-4 sm:p-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
          <button 
            onClick={() => navigate('/super-admin')}
            className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            <span className="hidden sm:inline">Geri Dön</span>
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">Kullanıcı ve Yetki Yönetimi</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">Sistem kullanıcılarını yönetin ve rollerini düzenleyin</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <div className="flex items-center bg-blue-50 px-3 sm:px-4 py-2 rounded-lg flex-1 sm:flex-initial">
            <UsersIcon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 mr-2" />
            <span className="text-blue-800 font-semibold text-sm sm:text-base">{filteredAndSortedUsers.length} Kullanıcı</span>
          </div>
          <button 
            onClick={exportToCSV}
            className="flex items-center px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
          >
            <Download className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Dışa Aktar</span>
          </button>
        </div>
      </div>
      
      {/* Arama ve Filtreleme */}
      <div className="mb-4 sm:mb-6 bg-white p-3 sm:p-4 rounded-lg shadow-lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Ad veya email ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <select 
            value={roleFilter} 
            onChange={(e) => setRoleFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tüm Roller</option>
            <option value="user">Kullanıcı</option>
            <option value="teacher">Öğretmen</option>
            <option value="admin">Admin</option>
            <option value="superadmin">Süper Admin</option>
          </select>
          
          <select 
            value={campusFilter} 
            onChange={(e) => setCampusFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tüm Kampüsler</option>
            {campuses.map(campus => (
              <option key={campus.id} value={campus.id}>{campus.name}</option>
            ))}
          </select>
          
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="name">Ada Göre Sırala</option>
            <option value="email">Email'e Göre Sırala</option>
            <option value="role">Role Göre Sırala</option>
          </select>
          
          <div className="flex gap-2 col-span-1 sm:col-span-2 lg:col-span-1">
            <button 
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="flex items-center px-3 py-2 border rounded-lg hover:bg-gray-50 flex-1 sm:flex-initial justify-center"
              title={sortOrder === 'asc' ? 'Azalan Sıralama' : 'Artan Sıralama'}
            >
              {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
            </button>
            <button 
              onClick={clearFilters}
              className="px-3 py-2 text-gray-600 hover:text-gray-800 border rounded-lg hover:bg-gray-50 flex-1 sm:flex-initial text-sm"
            >
              Temizle
            </button>
          </div>
          
          <select 
            value={itemsPerPage} 
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={5}>5 / sayfa</option>
            <option value={10}>10 / sayfa</option>
            <option value={25}>25 / sayfa</option>
            <option value={50}>50 / sayfa</option>
          </select>
        </div>
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="text-xs sm:text-sm text-gray-600">
            <span className="font-medium">{startIndex + 1}-{Math.min(endIndex, filteredAndSortedUsers.length)}</span> / {filteredAndSortedUsers.length} kullanıcı
            {searchQuery && ` ("${searchQuery}" araması)`}
            {roleFilter !== 'all' && ` (${roleFilter} filtresi)`}
            {campusFilter !== 'all' && ` (${campuses.find(c => c.id === campusFilter)?.name} kampüsü)`}
          </div>
          
          <div className="flex flex-wrap gap-2 text-xs">
            {Object.entries(roleStats).map(([role, count]) => (
              <span key={role} className={`px-2 py-1 rounded-full ${
                role === 'superadmin' ? 'bg-purple-100 text-purple-800' :
                role === 'admin' ? 'bg-red-100 text-red-800' :
                role === 'teacher' ? 'bg-blue-100 text-blue-800' :
                'bg-green-100 text-green-800'
              }`}>
                {role}: {count}
              </span>
            ))}
          </div>
        </div>
      </div>
      
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="overflow-x-auto -mx-4 sm:mx-0">
        <table className="min-w-full leading-normal">
          <thead>
            <tr>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100">
                <button 
                  onClick={() => handleSort('name')}
                  className="flex items-center space-x-1 text-xs font-semibold text-gray-600 uppercase tracking-wider hover:text-gray-800"
                >
                  <span>Kullanıcı</span>
                  {sortBy === 'name' && (
                    sortOrder === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />
                  )}
                </button>
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100">
                <button 
                  onClick={() => handleSort('role')}
                  className="flex items-center space-x-1 text-xs font-semibold text-gray-600 uppercase tracking-wider hover:text-gray-800"
                >
                  <span>Rol</span>
                  {sortBy === 'role' && (
                    sortOrder === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />
                  )}
                </button>
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Kampüs</th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Durum</th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-4">Kullanıcılar Yükleniyor...</td></tr>
            ) : error ? (
              <tr><td colSpan={5} className="text-center py-4 text-red-500">{error}</td></tr>
            ) : (
              currentUsers.map(user => (
                <tr key={user.id}>
                  <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                    <p className="text-gray-900 whitespace-no-wrap font-medium">{user.displayName || 'İsimsiz'}</p>
                    <p className="text-gray-600 whitespace-no-wrap text-xs">{user.email || 'Email yok'}</p>
                  </td>
                  <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === 'superadmin' ? 'bg-purple-100 text-purple-800' : user.role === 'admin' ? 'bg-red-100 text-red-800' : user.role === 'teacher' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                    <p className="text-gray-900 whitespace-no-wrap">{campuses.find(c => c.id === user.campusId)?.name || 'N/A'}</p>
                  </td>
                  <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm text-center">
                    <button 
                      onClick={() => handleToggleBlockUser(user.id, user.isBlocked || false)}
                      className={`flex items-center px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                        user.isBlocked 
                          ? 'bg-red-100 text-red-800 hover:bg-red-200' 
                          : 'bg-green-100 text-green-800 hover:bg-green-200'
                      }`}
                    >
                      {user.isBlocked ? (
                        <><Ban className="w-3 h-3 mr-1" /> Engelli</>
                      ) : (
                        <><CheckCircle className="w-3 h-3 mr-1" /> Aktif</>
                      )}
                    </button>
                  </td>
                  <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm text-center">
                    <button 
                      onClick={() => openModal(user)} 
                      className="bg-indigo-600 text-white px-3 py-1 rounded-lg hover:bg-indigo-700 transition-colors text-xs"
                    >
                      Rolü Yönet
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Sayfalama */}
      {totalPages > 1 && (
        <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white px-4 sm:px-6 py-4 rounded-lg shadow-lg">
          <div className="text-sm text-gray-600">
            Sayfa <span className="font-medium">{currentPage}</span> / <span className="font-medium">{totalPages}</span>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="flex items-center px-2 sm:px-3 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              <ChevronLeft className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">Önceki</span>
            </button>
            
            <div className="flex gap-1">
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
                    onClick={() => handlePageChange(pageNum)}
                    className={`px-3 py-2 rounded-lg transition-colors ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="flex items-center px-2 sm:px-3 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              <span className="hidden sm:inline">Sonraki</span>
              <ChevronRight className="w-4 h-4 sm:ml-1" />
            </button>
          </div>
        </div>
      )}

      {isModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-lg">
            <h2 className="text-2xl font-bold mb-4">Rolü Yönet</h2>
            <p className="mb-2"><strong>Kullanıcı:</strong> {selectedUser.displayName}</p>
            <p className="mb-6"><strong>Email:</strong> {selectedUser.email}</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="role" className="block text-gray-700 text-sm font-bold mb-2">Rol</label>
                <select id="role" value={selectedRole} onChange={handleRoleChange} className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline">
                  <option value="user">Kullanıcı</option>
                  <option value="teacher">Öğretmen</option>
                  <option value="admin">Admin</option>
                  <option value="superadmin">Süper Admin</option>
                </select>
              </div>
              
              {selectedRole === 'admin' && (
                <div>
                  <label htmlFor="campus" className="block text-gray-700 text-sm font-bold mb-2">Kampüs</label>
                  <select id="campus" value={selectedCampus} onChange={(e) => setSelectedCampus(e.target.value)} className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline">
                    <option value="">Kampüs Seçin</option>
                    {campuses.map(campus => (
                      <option key={campus.id} value={campus.id}>{campus.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end space-x-4 mt-8">
              <button onClick={() => setIsModalOpen(false)} className="bg-gray-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors" disabled={isSaving}>İptal</button>
              <button onClick={handleSaveChanges} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors" disabled={isSaving}>
                {isSaving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementPage;
