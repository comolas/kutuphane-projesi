import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, getDocs, query, where, doc, updateDoc, deleteDoc, writeBatch, WriteBatch } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { Search, Edit, Trash2, Users, UserPlus, BookOpen, DollarSign, Grid, List, ArrowUpDown } from 'lucide-react';
import EditUserModal from '../EditUserModal';
import Swal from 'sweetalert2';
import { useBooks } from '../../../contexts/BookContext';

interface UserData {
  uid: string;
  email: string;
  displayName: string;
  studentClass: string;
  studentNumber: string;
  role: 'user' | 'admin';
  createdAt: Date;
  lastLogin: Date;
  photoURL?: string;
}

const UsersTab: React.FC = () => {
  const { allBorrowedBooks } = useBooks();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [usersSearchQuery, setUsersSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [usersCurrentPage, setUsersCurrentPage] = useState(1);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const usersPerPage = 10;
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [selectedUserToEdit, setSelectedUserToEdit] = useState<UserData | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [sortBy, setSortBy] = useState<'name' | 'createdAt' | 'lastLogin'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const usersRef = collection(db, 'users');
      const querySnapshot = await getDocs(usersRef);
      
      const usersData: UserData[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.role !== 'admin') {
          usersData.push({
            uid: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            lastLogin: data.lastLogin?.toDate() || new Date(),
          } as UserData);
        }
      });
      
      setUsers(usersData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
    } catch (error) {
      console.error('Error fetching users:', error);
      Swal.fire('Hata!', 'Kullanıcılar getirilirken bir hata oluştu.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    setUsersCurrentPage(1);
    setSelectedUsers([]);
  }, [usersSearchQuery, classFilter]);

  const handleEditUser = (user: UserData) => {
    setSelectedUserToEdit(user);
    setShowEditUserModal(true);
  };

  const handleSaveUser = async (updatedUser: UserData) => {
    if (!updatedUser) return;

    try {
      const userRef = doc(db, 'users', updatedUser.uid);
      await updateDoc(userRef, {
        displayName: updatedUser.displayName,
        studentClass: updatedUser.studentClass,
        studentNumber: updatedUser.studentNumber,
        role: updatedUser.role,
        photoURL: updatedUser.photoURL || '',
      });

      setUsers(prev => prev.map(user => user.uid === updatedUser.uid ? updatedUser : user));
      setShowEditUserModal(false);
      setSelectedUserToEdit(null);
      Swal.fire('Başarılı!', 'Kullanıcı bilgileri başarıyla güncellendi.', 'success');
    } catch (error) {
      console.error('Error updating user:', error);
      Swal.fire('Hata!', 'Kullanıcı güncellenirken bir hata oluştu.', 'error');
    }
  };

  const deleteUserAndData = async (userId: string, batch: WriteBatch) => {
    const userRef = doc(db, 'users', userId);
    batch.delete(userRef);

    const collectionsToDelete = ['borrowedBooks', 'requests', 'userTasks', 'userAchievements', 'borrowMessages', 'returnMessages'];
    for (const coll of collectionsToDelete) {
        const itemsRef = collection(db, coll);
        const itemsQuery = query(itemsRef, where('userId', '==', userId));
        const itemsSnapshot = await getDocs(itemsQuery);
        itemsSnapshot.forEach((doc) => {
            batch.delete(doc.ref);
        });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    Swal.fire({
      title: 'Emin misiniz?',
      text: "Bu kullanıcıyı ve ilgili tüm verilerini kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Evet, sil!',
      cancelButtonText: 'Vazgeç'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const batch = writeBatch(db);
          await deleteUserAndData(userId, batch);
          await batch.commit();
          setUsers(prev => prev.filter(user => user.uid !== userId));
          Swal.fire('Başarılı!', 'Kullanıcı başarıyla silindi.', 'success');
        } catch (error) {
          console.error('Error deleting user:', error);
          Swal.fire('Hata!', 'Kullanıcı silinirken bir hata oluştu.', 'error');
        }
      }
    });
  };

  const handleBulkDelete = async () => {
    if (selectedUsers.length === 0) return;
    Swal.fire({
      title: 'Emin misiniz?',
      text: `${selectedUsers.length} kullanıcıyı ve bu kullanıcılara ait tüm verileri (ödünç alma geçmişi, talepler vb.) kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Evet, sil!',
      cancelButtonText: 'Vazgeç'
    }).then(async (result) => {
      if (result.isConfirmed) {
        setIsBulkDeleting(true);
        try {
          const batch = writeBatch(db);
          for (const userId of selectedUsers) {
            await deleteUserAndData(userId, batch);
          }
          await batch.commit();
          setUsers(prev => prev.filter(user => !selectedUsers.includes(user.uid)));
          setSelectedUsers([]);
          Swal.fire('Başarılı!', `${selectedUsers.length} kullanıcı başarıyla silindi.`, 'success');
        } catch (error) {
          console.error('Error bulk deleting users:', error);
          Swal.fire('Hata!', 'Toplu kullanıcı silme sırasında bir hata oluştu.', 'error');
        } finally {
          setIsBulkDeleting(false);
        }
      }
    });
  };

  const uniqueClasses = useMemo(() => {
    const classes = new Set(users.map(u => u.studentClass));
    return ['all', ...Array.from(classes).sort()];
  }, [users]);

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      (user.displayName?.toLowerCase() || '').includes(usersSearchQuery.toLowerCase()) ||
      (user.email?.toLowerCase() || '').includes(usersSearchQuery.toLowerCase()) ||
      (user.studentClass?.toLowerCase() || '').includes(usersSearchQuery.toLowerCase()) ||
      (user.studentNumber?.toLowerCase() || '').includes(usersSearchQuery.toLowerCase());
    
    const matchesClass = classFilter === 'all' || user.studentClass === classFilter;

    return matchesSearch && matchesClass;
  }).sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'name') {
      comparison = a.displayName.localeCompare(b.displayName);
    } else if (sortBy === 'createdAt') {
      comparison = a.createdAt.getTime() - b.createdAt.getTime();
    } else if (sortBy === 'lastLogin') {
      comparison = a.lastLogin.getTime() - b.lastLogin.getTime();
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const usersTotalPages = Math.ceil(filteredUsers.length / usersPerPage);
  const paginatedUsers = useMemo(() => filteredUsers.slice(
    (usersCurrentPage - 1) * usersPerPage,
    usersCurrentPage * usersPerPage
  ), [filteredUsers, usersCurrentPage]);

  const currentVisibleUserIds = useMemo(() => paginatedUsers.map(u => u.uid), [paginatedUsers]);

  const handleSelectUser = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === currentVisibleUserIds.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(currentVisibleUserIds);
    }
  };

  const userStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayRegistered = users.filter(u => {
      const createdDate = new Date(u.createdAt);
      createdDate.setHours(0, 0, 0, 0);
      return createdDate.getTime() === today.getTime();
    }).length;
    const activeUsers = new Set(allBorrowedBooks.filter(b => b.returnStatus === 'borrowed').map(b => b.borrowedBy)).size;
    const classDistribution = users.reduce((acc, u) => {
      acc[u.studentClass] = (acc[u.studentClass] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const topClass = Object.entries(classDistribution).sort((a, b) => b[1] - a[1])[0];
    return { total: users.length, todayRegistered, activeUsers, topClass: topClass ? `${topClass[0]} (${topClass[1]})` : '-' };
  }, [users, allBorrowedBooks]);

  if (loading) {
    return (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-24 mb-2 animate-pulse"></div>
                  <div className="h-8 bg-gray-200 rounded w-16 animate-pulse"></div>
                </div>
                <div className="p-3 bg-gray-100 rounded-full animate-pulse">
                  <div className="w-6 h-6"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
              <div className="flex gap-4">
                <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
                <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
                <div className="h-10 bg-gray-200 rounded w-72 animate-pulse"></div>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3"><div className="h-4 bg-gray-200 rounded w-4 animate-pulse"></div></th>
                  <th className="px-6 py-3"><div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div></th>
                  <th className="px-6 py-3"><div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div></th>
                  <th className="px-6 py-3"><div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div></th>
                  <th className="px-6 py-3"><div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div></th>
                  <th className="px-6 py-3"><div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {[...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-4 animate-pulse"></div></td>
                    <td className="px-6 py-4">
                      <div className="h-4 bg-gray-200 rounded w-32 mb-2 animate-pulse"></div>
                      <div className="h-3 bg-gray-200 rounded w-40 animate-pulse"></div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 bg-gray-200 rounded w-20 mb-2 animate-pulse"></div>
                      <div className="h-3 bg-gray-200 rounded w-16 animate-pulse"></div>
                    </td>
                    <td className="px-6 py-4"><div className="h-6 bg-gray-200 rounded-full w-16 animate-pulse"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div></td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse"></div>
                        <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse"></div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-indigo-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Toplam Kullanıcı</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{userStats.total}</p>
            </div>
            <div className="p-3 bg-indigo-100 rounded-full">
              <Users className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Bugün Kayıt Olan</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{userStats.todayRegistered}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <UserPlus className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Aktif Ödünç Alan</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{userStats.activeUsers}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <BookOpen className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">En Kalabalık Sınıf</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{userStats.topClass}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Users className="w-6 h-6 mr-2 text-indigo-600" />
              Kullanıcı Yönetimi
            </h2>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="flex gap-2">
                <button onClick={() => setViewMode('table')} className={`px-4 py-2 rounded-lg transition-colors ${viewMode === 'table' ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                  <List className="w-5 h-5" />
                </button>
                <button onClick={() => setViewMode('card')} className={`px-4 py-2 rounded-lg transition-colors ${viewMode === 'card' ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                  <Grid className="w-5 h-5" />
                </button>
              </div>
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                {uniqueClasses.map(c => (
                  <option key={c} value={c}>{c === 'all' ? 'Tüm Sınıflar' : c}</option>
                ))}
              </select>
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [newSortBy, newSortOrder] = e.target.value.split('-') as [typeof sortBy, typeof sortOrder];
                  setSortBy(newSortBy);
                  setSortOrder(newSortOrder);
                }}
                className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="name-asc">İsim (A-Z)</option>
                <option value="name-desc">İsim (Z-A)</option>
                <option value="createdAt-desc">Kayıt (Yeni-Eski)</option>
                <option value="createdAt-asc">Kayıt (Eski-Yeni)</option>
                <option value="lastLogin-desc">Son Giriş (Yeni-Eski)</option>
                <option value="lastLogin-asc">Son Giriş (Eski-Yeni)</option>
              </select>
              <div className="relative w-full sm:w-72">
                <input
                  type="text"
                  placeholder="Kullanıcı adı, email, sınıf..."
                  value={usersSearchQuery}
                  onChange={(e) => setUsersSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
              </div>
            </div>
          </div>
        </div>

        {selectedUsers.length > 0 && (
          <div className="p-4 bg-indigo-50 border-t border-b border-indigo-200 flex items-center justify-between">
            <span className="text-sm font-medium text-indigo-700">
              {selectedUsers.length} kullanıcı seçildi.
            </span>
            <button
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
              className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed transition-colors"
            >
              {isBulkDeleting ? 'Siliniyor...' : 'Seçilenleri Sil'}
            </button>
          </div>
        )}

        {viewMode === 'table' ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input 
                    type="checkbox"
                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    checked={currentVisibleUserIds.length > 0 && selectedUsers.length === currentVisibleUserIds.length}
                    onChange={handleSelectAll}
                    disabled={currentVisibleUserIds.length === 0}
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kullanıcı</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sınıf / Numara</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kayıt Tarihi</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedUsers.length > 0 ? (
                paginatedUsers.map(user => (
                  <tr key={user.uid} className={selectedUsers.includes(user.uid) ? 'bg-indigo-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input 
                        type="checkbox"
                        className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        checked={selectedUsers.includes(user.uid)}
                        onChange={() => handleSelectUser(user.uid)}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{user.displayName}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>{user.studentClass}</div>
                      <div>{user.studentNumber}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.createdAt.toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button 
                        onClick={() => handleEditUser(user)} 
                        className="text-indigo-600 hover:text-indigo-900 p-1 rounded-full hover:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                        disabled={selectedUsers.length > 0}
                      >
                        <Edit size={18} />
                      </button>
                      <button 
                        onClick={() => handleDeleteUser(user.uid)} 
                        className="text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                        disabled={selectedUsers.length > 0}
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    Kullanıcı bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        ) : (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedUsers.length > 0 ? (
                paginatedUsers.map(user => (
                  <div key={user.uid} className={`bg-white rounded-lg shadow-md border-2 transition-all hover:shadow-lg ${selectedUsers.includes(user.uid) ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'}`}>
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-4">
                        <input type="checkbox" className="h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" checked={selectedUsers.includes(user.uid)} onChange={() => handleSelectUser(user.uid)} />
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${user.role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>{user.role}</span>
                      </div>
                      <div className="flex flex-col items-center mb-4">
                        {user.photoURL ? (
                          <img src={user.photoURL} alt={user.displayName} className="w-20 h-20 rounded-full object-cover mb-3" onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/80'; }} />
                        ) : (
                          <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center mb-3">
                            <span className="text-2xl font-bold text-indigo-600">{user.displayName?.charAt(0).toUpperCase()}</span>
                          </div>
                        )}
                        <h3 className="text-lg font-bold text-gray-900 text-center">{user.displayName}</h3>
                        <p className="text-sm text-gray-500 text-center">{user.email}</p>
                      </div>
                      <div className="space-y-2 mb-4 pb-4 border-b">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Sınıf:</span>
                          <span className="font-medium text-gray-900">{user.studentClass}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Numara:</span>
                          <span className="font-medium text-gray-900">{user.studentNumber}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Kayıt:</span>
                          <span className="font-medium text-gray-900">{user.createdAt.toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleEditUser(user)} disabled={selectedUsers.length > 0} className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                          <Edit size={16} /> Düzenle
                        </button>
                        <button onClick={() => handleDeleteUser(user.uid)} disabled={selectedUsers.length > 0} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                          <Trash2 size={16} /> Sil
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center py-8 text-gray-500">Kullanıcı bulunamadı.</div>
              )}
            </div>
          </div>
        )}

        {usersTotalPages > 1 && (
          <div className="p-6 bg-white border-t border-gray-200 flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Sayfa {usersCurrentPage} / {usersTotalPages} ({filteredUsers.length} sonuç)
            </p>
            <div className="flex space-x-2">
              <button
                onClick={() => setUsersCurrentPage(p => Math.max(p - 1, 1))}
                disabled={usersCurrentPage === 1}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Önceki
              </button>
              <button
                onClick={() => setUsersCurrentPage(p => Math.min(p + 1, usersTotalPages))}
                disabled={usersCurrentPage === usersTotalPages}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Sonraki
              </button>
            </div>
          </div>
        )}
      </div>

      {showEditUserModal && selectedUserToEdit && (
        <EditUserModal
          isOpen={showEditUserModal}
          onClose={() => setShowEditUserModal(false)}
          user={selectedUserToEdit}
          onSave={handleSaveUser}
        />
      )}
    </>
  );
};

export default UsersTab;