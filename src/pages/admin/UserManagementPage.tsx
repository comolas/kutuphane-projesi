import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../../firebase/config';
import { Search, SortAsc, SortDesc, ArrowLeft, Ban, CheckCircle, ChevronLeft, ChevronRight, Users as UsersIcon, Download, X, Filter, Shield, Edit, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { updateDoc, doc } from 'firebase/firestore';
import * as XLSX from 'xlsx';

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedCampus, setSelectedCampus] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

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
  };

  const handleSaveChanges = async () => {
    if (!selectedUser) return;

    if (!selectedCampus) {
      alert('Bir kampüs seçmelisiniz.');
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
      setUsers(users.map(u => u.id === selectedUser.id ? { ...u, role: selectedRole, campusId: selectedCampus } : u));
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

  const exportToExcel = () => {
    const data = filteredAndSortedUsers.map(user => ({
      'Ad': user.displayName || '',
      'Email': user.email || '',
      'Rol': user.role || '',
      'Kampüs': campuses.find(c => c.id === user.campusId)?.name || 'N/A',
      'Durum': user.isBlocked ? 'Engelli' : 'Aktif'
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Kullanıcılar');
    XLSX.writeFile(wb, `kullanicilar_${new Date().toISOString().split('T')[0]}.xlsx`);
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
              <UsersIcon className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Kullanıcı ve Yetki Yönetimi</h1>
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <p className="text-gray-600 text-lg">Sistem kullanıcılarını yönetin ve rollerini düzenleyin</p>
            <button 
              onClick={exportToExcel}
              className="flex items-center px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:shadow-lg transition-all font-semibold"
            >
              <Download className="w-4 h-4 mr-2" />
              Toplu Dışa Aktar
            </button>
          </div>
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
                placeholder="Ad veya email ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <Search className="absolute left-2.5 sm:left-3 top-2.5 text-gray-400" size={14} />
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Rol</h3>
              <div className="space-y-2">
                <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                  <input
                    type="radio"
                    name="role"
                    checked={roleFilter === 'all'}
                    onChange={() => setRoleFilter('all')}
                    className="mr-2"
                  />
                  <span className="text-sm">Tümü</span>
                </label>
                <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                  <input
                    type="radio"
                    name="role"
                    checked={roleFilter === 'user'}
                    onChange={() => setRoleFilter('user')}
                    className="mr-2"
                  />
                  <span className="text-sm text-green-600">● Kullanıcı</span>
                </label>
                <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                  <input
                    type="radio"
                    name="role"
                    checked={roleFilter === 'teacher'}
                    onChange={() => setRoleFilter('teacher')}
                    className="mr-2"
                  />
                  <span className="text-sm text-blue-600">● Öğretmen</span>
                </label>
                <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                  <input
                    type="radio"
                    name="role"
                    checked={roleFilter === 'admin'}
                    onChange={() => setRoleFilter('admin')}
                    className="mr-2"
                  />
                  <span className="text-sm text-red-600">● Admin</span>
                </label>
                <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                  <input
                    type="radio"
                    name="role"
                    checked={roleFilter === 'superadmin'}
                    onChange={() => setRoleFilter('superadmin')}
                    className="mr-2"
                  />
                  <span className="text-sm text-purple-600">● Süper Admin</span>
                </label>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Kampüs</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                  <input
                    type="radio"
                    name="campus"
                    checked={campusFilter === 'all'}
                    onChange={() => setCampusFilter('all')}
                    className="mr-2"
                  />
                  <span className="text-sm">Tümü</span>
                </label>
                {campuses.map(campus => (
                  <label key={campus.id} className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <input
                      type="radio"
                      name="campus"
                      checked={campusFilter === campus.id}
                      onChange={() => setCampusFilter(campus.id)}
                      className="mr-2"
                    />
                    <span className="text-sm">{campus.name}</span>
                  </label>
                ))}
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
                    checked={sortBy === 'email'}
                    onChange={() => setSortBy('email')}
                    className="mr-2"
                  />
                  <span className="text-sm">Email'e Göre</span>
                </label>
                <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                  <input
                    type="radio"
                    name="sortBy"
                    checked={sortBy === 'role'}
                    onChange={() => setSortBy('role')}
                    className="mr-2"
                  />
                  <span className="text-sm">Role Göre</span>
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

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Sayfa Başına</h3>
              <select 
                value={itemsPerPage} 
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              >
                <option value={5}>5 / sayfa</option>
                <option value={10}>10 / sayfa</option>
                <option value={25}>25 / sayfa</option>
                <option value={50}>50 / sayfa</option>
              </select>
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
            <div className="flex items-center mb-4">
              <input
                type="checkbox"
                className="form-checkbox h-4 w-4 text-indigo-600 transition duration-150 ease-in-out rounded"
                checked={selectedUserIds.length === filteredAndSortedUsers.length && filteredAndSortedUsers.length > 0}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedUserIds(filteredAndSortedUsers.map(u => u.id));
                  } else {
                    setSelectedUserIds([]);
                  }
                }}
              />
              <label className="ml-2 text-sm text-gray-700">Tümünü Seç</label>
            </div>

            {selectedUserIds.length > 0 && (
              <div className="mb-4 bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-300 rounded-xl p-4 shadow-lg animate-fadeIn">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <span className="text-orange-800 font-medium">
                    {selectedUserIds.length} kullanıcı seçildi
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={async () => {
                        if (!confirm(`${selectedUserIds.length} kullanıcıyı engellemek istediğinizden emin misiniz?`)) return;
                        try {
                          await Promise.all(selectedUserIds.map(id => 
                            updateDoc(doc(db, 'users', id), { isBlocked: true })
                          ));
                          setUsers(users.map(u => selectedUserIds.includes(u.id) ? { ...u, isBlocked: true } : u));
                          setSelectedUserIds([]);
                        } catch (err) {
                          alert('İşlem sırasında bir hata oluştu.');
                        }
                      }}
                      className="flex items-center px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                    >
                      <Ban className="w-4 h-4 mr-1" />
                      Engelle
                    </button>
                    <button
                      onClick={async () => {
                        if (!confirm(`${selectedUserIds.length} kullanıcının engelini kaldırmak istediğinizden emin misiniz?`)) return;
                        try {
                          await Promise.all(selectedUserIds.map(id => 
                            updateDoc(doc(db, 'users', id), { isBlocked: false })
                          ));
                          setUsers(users.map(u => selectedUserIds.includes(u.id) ? { ...u, isBlocked: false } : u));
                          setSelectedUserIds([]);
                        } catch (err) {
                          alert('İşlem sırasında bir hata oluştu.');
                        }
                      }}
                      className="flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Aktifleştir
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="text-xs sm:text-sm text-gray-600">
                <span className="font-medium">{startIndex + 1}-{Math.min(endIndex, filteredAndSortedUsers.length)}</span> / {filteredAndSortedUsers.length} kullanıcı
                {searchQuery && ` ("${searchQuery}" araması)`}
                {roleFilter !== 'all' && ` (${roleFilter} filtresi)`}
                {campusFilter !== 'all' && ` (${campuses.find(c => c.id === campusFilter)?.name} kampüsü)`}
              </div>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => setIsSidebarOpen(true)}
                  className="lg:hidden px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2 font-semibold"
                >
                  <Filter className="w-5 h-5" />
                  Filtreler
                </button>
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
          </div>
      
          <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg overflow-hidden animate-fadeIn">
            <div className="overflow-x-auto -mx-4 sm:mx-0">
        <table className="min-w-full leading-normal">
          <thead>
            <tr>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Seç
              </th>
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
                <tr key={user.id} className={selectedUserIds.includes(user.id) ? 'bg-blue-50' : ''}>
                  <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm text-center">
                    <input
                      type="checkbox"
                      className="form-checkbox h-4 w-4 text-indigo-600 transition duration-150 ease-in-out rounded"
                      checked={selectedUserIds.includes(user.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedUserIds([...selectedUserIds, user.id]);
                        } else {
                          setSelectedUserIds(selectedUserIds.filter(id => id !== user.id));
                        }
                      }}
                    />
                  </td>
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
            <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg px-4 sm:px-6 py-4 animate-fadeIn">
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
        </div>
      </div>

      {isModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-[9999] flex items-center justify-center p-0 animate-fadeIn" onClick={() => setIsModalOpen(false)}>
          <div className="bg-gradient-to-br from-white to-indigo-50 w-full h-full overflow-y-auto flex flex-col transform transition-all duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 sm:p-6 flex-shrink-0">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 sm:p-3">
                    <UsersIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-2xl font-bold text-white">Rolü Yönet</h3>
                    <p className="text-xs sm:text-sm text-white/80">Kullanıcı rolünü ve kampüsünü güncelleyin</p>
                  </div>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="text-white hover:bg-white/20 rounded-full p-2 transition-all duration-200 flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation">
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>
            </div>
            <div className="p-4 sm:p-6 overflow-y-auto">
              <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg p-4 sm:p-6 mb-6">
                <p className="mb-2 text-sm sm:text-base"><strong>Kullanıcı:</strong> {selectedUser.displayName}</p>
                <p className="text-sm sm:text-base"><strong>Email:</strong> {selectedUser.email}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="role" className="block text-xs sm:text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-indigo-600" />
                    Rol <span className="text-red-500">*</span>
                  </label>
                  <select id="role" value={selectedRole} onChange={handleRoleChange} className="block w-full border-2 border-gray-200 rounded-xl shadow-sm py-2 sm:py-3 px-3 sm:px-4 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm sm:text-base font-medium">
                    <option value="user">Kullanıcı</option>
                    <option value="teacher">Öğretmen</option>
                    <option value="admin">Admin</option>
                    <option value="superadmin">Süper Admin</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="campus" className="block text-xs sm:text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                    <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Kampüs <span className="text-red-500">*</span>
                  </label>
                  <select id="campus" value={selectedCampus} onChange={(e) => setSelectedCampus(e.target.value)} className="block w-full border-2 border-gray-200 rounded-xl shadow-sm py-2 sm:py-3 px-3 sm:px-4 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm sm:text-base font-medium">
                    <option value="">Kampüs Seçin</option>
                    {campuses.map(campus => (
                      <option key={campus.id} value={campus.id}>{campus.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="p-4 sm:p-6 border-t border-gray-200 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 bg-gradient-to-t from-white to-transparent">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-700 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-all font-semibold text-sm min-h-[44px] flex items-center justify-center shadow-md hover:shadow-lg hover:scale-105 touch-manipulation" disabled={isSaving}>İptal</button>
              <button onClick={handleSaveChanges} className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all font-semibold text-sm min-h-[44px] flex items-center justify-center shadow-md hover:scale-105 touch-manipulation" disabled={isSaving}>
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
