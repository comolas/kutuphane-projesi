import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, getDocs, query, where, doc, updateDoc, deleteDoc, writeBatch, WriteBatch } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { Search, Edit, Trash2, Users, UserPlus, BookOpen, DollarSign, Grid, List, ArrowUpDown, Filter, MoreVertical, History, AlertCircle } from 'lucide-react';
import EditUserModal from '../EditUserModal';
import Swal from 'sweetalert2';
import { useBooks } from '../../../contexts/BookContext';
import { useNavigate } from 'react-router-dom';

interface UserData {
  uid: string;
  email: string;
  displayName: string;
  studentClass: string;
  studentNumber: string;
  role: 'user' | 'admin' | 'teacher';
  createdAt: Date;
  lastLogin: Date;
  photoURL?: string;
  teacherData?: {
    assignedClass: string;
    subject?: string;
  };
}

const UsersTab: React.FC = () => {
  const { allBorrowedBooks } = useBooks();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [usersSearchQuery, setUsersSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'user' | 'admin' | 'teacher'>('all');
  const [activityFilter, setActivityFilter] = useState<'all' | 'active' | 'inactive'>('all');
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
  }, [usersSearchQuery, classFilter, roleFilter, activityFilter]);

  const handleEditUser = (user: UserData) => {
    setSelectedUserToEdit(user);
    setShowEditUserModal(true);
  };

  const handleSaveUser = async (updatedUser: UserData) => {
    if (!updatedUser) return;

    try {
      const userRef = doc(db, 'users', updatedUser.uid);
      const updateData: any = {
        displayName: updatedUser.displayName,
        studentClass: updatedUser.studentClass,
        studentNumber: updatedUser.studentNumber,
        role: updatedUser.role,
        photoURL: updatedUser.photoURL || '',
      };
      
      // Add teacher data if role is teacher
      if (updatedUser.role === 'teacher' && updatedUser.teacherData) {
        updateData.teacherData = {
          assignedClass: updatedUser.teacherData.assignedClass || '',
          ...(updatedUser.teacherData.subject && { subject: updatedUser.teacherData.subject })
        };
      }
      
      await updateDoc(userRef, updateData);

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

  const activeUserIds = useMemo(() => 
    new Set(allBorrowedBooks.filter(b => b.returnStatus === 'borrowed').map(b => b.borrowedBy))
  , [allBorrowedBooks]);

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      (user.displayName?.toLowerCase() || '').includes(usersSearchQuery.toLowerCase()) ||
      (user.email?.toLowerCase() || '').includes(usersSearchQuery.toLowerCase()) ||
      (user.studentClass?.toLowerCase() || '').includes(usersSearchQuery.toLowerCase()) ||
      (user.studentNumber?.toLowerCase() || '').includes(usersSearchQuery.toLowerCase());
    
    const matchesClass = classFilter === 'all' || user.studentClass === classFilter;
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const isActive = activeUserIds.has(user.uid);
    const matchesActivity = activityFilter === 'all' || 
      (activityFilter === 'active' && isActive) || 
      (activityFilter === 'inactive' && !isActive);

    return matchesSearch && matchesClass && matchesRole && matchesActivity;
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
    return { total: users.length, todayRegistered, activeUsers, topClass: topClass ? `${topClass[0]} (${topClass[1]})` : '-', classDistribution };
  }, [users, allBorrowedBooks]);

  const classChartData = useMemo(() => {
    return Object.entries(userStats.classDistribution)
      .sort((a, b) => b[1] - a[1]);
  }, [userStats.classDistribution]);

  const maxClassCount = Math.max(...classChartData.map(d => d[1]), 1);

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 py-8 px-4">
    <div className="max-w-7xl mx-auto">
      <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg p-6 mb-6 border border-white/20">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
          <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Kullanıcı Aktivite Dağılımı
        </h3>
        <div className="flex items-center justify-center">
          <div className="relative w-48 h-48">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 192 192">
              <circle cx="96" cy="96" r="80" fill="none" stroke="#e5e7eb" strokeWidth="24"/>
              <circle 
                cx="96" cy="96" r="80" fill="none" 
                stroke="#10b981" strokeWidth="24"
                strokeDasharray={`${(userStats.activeUsers / userStats.total) * 502.4} 502.4`}
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-gray-900">{userStats.total > 0 ? Math.round((userStats.activeUsers / userStats.total) * 100) : 0}%</span>
              <span className="text-xs text-gray-500 mt-1">Aktif</span>
            </div>
          </div>
          <div className="ml-8 space-y-3">
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-700">Aktif Ödünç Alan</p>
                <p className="text-xl font-bold text-green-600">{userStats.activeUsers}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-700">Pasif Kullanıcı</p>
                <p className="text-xl font-bold text-gray-600">{userStats.total - userStats.activeUsers}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg p-6 mb-6 border border-white/20">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
          <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          Sınıf Bazlı Kullanıcı Dağılımı
        </h3>
        <div className="flex items-end justify-between h-48 gap-1 overflow-x-auto">
          {classChartData.map(([className, count], index) => (
            <div key={className} className="flex-1 flex flex-col items-center group min-w-[40px]">
              <div className="w-full flex flex-col items-center justify-end relative" style={{ height: '160px' }}>
                <div className="text-xs font-medium text-gray-600 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">{count}</div>
                <div 
                  className="w-full bg-gradient-to-t from-purple-600 to-purple-400 rounded-t transition-all duration-500 hover:from-purple-700 hover:to-purple-500"
                  style={{ height: `${(count / maxClassCount) * 100}%`, minHeight: count > 0 ? '8px' : '0' }}
                ></div>
              </div>
              <div className="text-xs text-gray-500 mt-2 font-medium truncate w-full text-center" title={className}>{className}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-lg p-3 sm:p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-white/80">Toplam Kullanıcı</p>
              <p className="text-xl sm:text-3xl font-bold mt-1">{userStats.total}</p>
            </div>
            <div className="p-2 sm:p-3 bg-white/20 rounded-full">
              <Users className="w-4 h-4 sm:w-6 sm:h-6" />
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-3 sm:p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-white/80">Bugün Kayıt Olan</p>
              <p className="text-xl sm:text-3xl font-bold mt-1">{userStats.todayRegistered}</p>
            </div>
            <div className="p-2 sm:p-3 bg-white/20 rounded-full">
              <UserPlus className="w-4 h-4 sm:w-6 sm:h-6" />
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-3 sm:p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-white/80">Aktif Ödünç Alan</p>
              <p className="text-xl sm:text-3xl font-bold mt-1">{userStats.activeUsers}</p>
            </div>
            <div className="p-2 sm:p-3 bg-white/20 rounded-full">
              <BookOpen className="w-4 h-4 sm:w-6 sm:h-6" />
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-3 sm:p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-white/80">En Kalabalık Sınıf</p>
              <p className="text-xl sm:text-3xl font-bold mt-1">{userStats.topClass}</p>
            </div>
            <div className="p-2 sm:p-3 bg-white/20 rounded-full">
              <svg className="w-4 h-4 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg overflow-hidden border border-white/20">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Users className="w-6 h-6 mr-2 text-indigo-600" />
            Kullanıcı Yönetimi
          </h2>
        </div>

        <div className="p-6">
          <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
            <aside className="w-full lg:w-64 bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg p-4 sm:p-6 flex-shrink-0 border border-white/20">
              <div className="flex justify-between items-center mb-4 sm:mb-6">
                <h2 className="text-base sm:text-lg font-semibold flex items-center">
                  <Filter className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-indigo-600" />
                  Filtreler
                </h2>
              </div>
              <div className="mb-4 sm:mb-6">
                <div className="relative">
                  <input type="text" placeholder="Kullanıcı ara..." value={usersSearchQuery} onChange={(e) => setUsersSearchQuery(e.target.value)} className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                  <Search className="absolute left-2.5 sm:left-3 top-2.5 text-gray-400" size={14} />
                </div>
              </div>
              <div className="space-y-4 sm:space-y-6">
                <div>
                  <h3 className="text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3">Sınıf</h3>
                  <div className="space-y-1 sm:space-y-2 max-h-48 overflow-y-auto">
                    {uniqueClasses.map(c => (
                      <label key={c} className="flex items-center cursor-pointer hover:bg-gray-50 p-1.5 sm:p-2 rounded touch-manipulation">
                        <input type="radio" name="class" checked={classFilter === c} onChange={() => setClassFilter(c)} className="mr-2" />
                        <span className="text-xs sm:text-sm">{c === 'all' ? 'Tümü' : c}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Rol</h3>
                  <div className="space-y-2">
                    <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input type="radio" name="role" checked={roleFilter === 'all'} onChange={() => setRoleFilter('all')} className="mr-2" />
                      <span className="text-sm">Tümü</span>
                    </label>
                    <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input type="radio" name="role" checked={roleFilter === 'user'} onChange={() => setRoleFilter('user')} className="mr-2" />
                      <span className="text-sm text-green-600">● Kullanıcı</span>
                    </label>
                    <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input type="radio" name="role" checked={roleFilter === 'teacher'} onChange={() => setRoleFilter('teacher')} className="mr-2" />
                      <span className="text-sm text-orange-600">● Öğretmen</span>
                    </label>
                    <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input type="radio" name="role" checked={roleFilter === 'admin'} onChange={() => setRoleFilter('admin')} className="mr-2" />
                      <span className="text-sm text-red-600">● Admin</span>
                    </label>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Aktivite</h3>
                  <div className="space-y-2">
                    <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input type="radio" name="activity" checked={activityFilter === 'all'} onChange={() => setActivityFilter('all')} className="mr-2" />
                      <span className="text-sm">Tümü</span>
                    </label>
                    <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input type="radio" name="activity" checked={activityFilter === 'active'} onChange={() => setActivityFilter('active')} className="mr-2" />
                      <span className="text-sm text-green-600">● Aktif Ödünç Alan</span>
                    </label>
                    <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input type="radio" name="activity" checked={activityFilter === 'inactive'} onChange={() => setActivityFilter('inactive')} className="mr-2" />
                      <span className="text-sm text-gray-600">● Pasif</span>
                    </label>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Sıralama</h3>
                  <div className="space-y-2">
                    <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input type="radio" name="sort" checked={sortBy === 'name' && sortOrder === 'asc'} onChange={() => { setSortBy('name'); setSortOrder('asc'); }} className="mr-2" />
                      <span className="text-sm">İsim (A-Z)</span>
                    </label>
                    <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input type="radio" name="sort" checked={sortBy === 'name' && sortOrder === 'desc'} onChange={() => { setSortBy('name'); setSortOrder('desc'); }} className="mr-2" />
                      <span className="text-sm">İsim (Z-A)</span>
                    </label>
                    <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input type="radio" name="sort" checked={sortBy === 'createdAt' && sortOrder === 'desc'} onChange={() => { setSortBy('createdAt'); setSortOrder('desc'); }} className="mr-2" />
                      <span className="text-sm">En Yeni Kayıt</span>
                    </label>
                    <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input type="radio" name="sort" checked={sortBy === 'lastLogin' && sortOrder === 'desc'} onChange={() => { setSortBy('lastLogin'); setSortOrder('desc'); }} className="mr-2" />
                      <span className="text-sm">Son Giriş (Yeni)</span>
                    </label>
                  </div>
                </div>
              </div>
            </aside>
            <div className="flex-1">
              <div className="mb-3 sm:mb-4 flex items-center justify-between">
                <div className="flex gap-2">
                  <button onClick={() => setViewMode('table')} className={`p-1.5 sm:p-2 rounded-lg transition-all duration-200 touch-manipulation ${viewMode === 'table' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    <List className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                  <button onClick={() => setViewMode('card')} className={`p-1.5 sm:p-2 rounded-lg transition-all duration-200 touch-manipulation ${viewMode === 'card' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    <Grid className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>
                <p className="text-xs sm:text-sm text-gray-600">{filteredUsers.length} kullanıcı bulundu</p>
              </div>
              {selectedUsers.length > 0 && (
                <div className="p-3 sm:p-4 bg-indigo-50 border border-indigo-200 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 sm:mb-4 gap-2">
                  <span className="text-xs sm:text-sm font-medium text-indigo-700">{selectedUsers.length} kullanıcı seçildi.</span>
                  <button onClick={handleBulkDelete} disabled={isBulkDeleting} className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed transition-colors touch-manipulation min-h-[40px]">
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol / Sorumlu Sınıf</th>
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
                      <div className="flex flex-col gap-1">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full w-fit ${
                          user.role === 'admin' ? 'bg-red-100 text-red-800' : 
                          user.role === 'teacher' ? 'bg-orange-100 text-orange-800' : 
                          'bg-green-100 text-green-800'
                        }`}>
                          {user.role === 'teacher' ? 'Öğretmen' : user.role === 'admin' ? 'Admin' : 'Kullanıcı'}
                        </span>
                        {user.role === 'teacher' && user.teacherData?.assignedClass && (
                          <span className="text-xs text-gray-600">
                            📚 {user.teacherData.assignedClass}
                            {user.teacherData.subject && ` • ${user.teacherData.subject}`}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.createdAt.toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="relative">
                        <button 
                          onClick={() => setOpenDropdown(openDropdown === user.uid ? null : user.uid)}
                          className="text-gray-600 hover:text-gray-900 p-1 rounded-full hover:bg-gray-100"
                          disabled={selectedUsers.length > 0}
                        >
                          <MoreVertical size={18} />
                        </button>
                        {openDropdown === user.uid && (
                          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                            <button onClick={() => { handleEditUser(user); setOpenDropdown(null); }} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
                              <Edit size={16} /> Düzenle
                            </button>
                            <button onClick={() => { navigate(`/admin/borrowed-by/${user.uid}`); setOpenDropdown(null); }} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
                              <History size={16} /> Ödünç Geçmişi
                            </button>
                            <button onClick={() => { navigate('/admin/dashboard', { state: { activeTab: 'fines', searchQuery: user.displayName } }); setOpenDropdown(null); }} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
                              <AlertCircle size={16} /> Cezaları Görüntüle
                            </button>
                            <button onClick={() => { handleDeleteUser(user.uid); setOpenDropdown(null); }} className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2 border-t">
                              <Trash2 size={16} /> Sil
                            </button>
                          </div>
                        )}
                      </div>
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
              <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {paginatedUsers.length > 0 ? (
                paginatedUsers.map(user => (
                  <div key={user.uid} className={`bg-white rounded-lg shadow-md border-2 transition-all hover:shadow-lg ${selectedUsers.includes(user.uid) ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'}`}>
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-4">
                        <input type="checkbox" className="h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" checked={selectedUsers.includes(user.uid)} onChange={() => handleSelectUser(user.uid)} />
                        <div className="flex flex-col items-end gap-1">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            user.role === 'admin' ? 'bg-red-100 text-red-800' : 
                            user.role === 'teacher' ? 'bg-orange-100 text-orange-800' : 
                            'bg-green-100 text-green-800'
                          }`}>
                            {user.role === 'teacher' ? 'Öğretmen' : user.role === 'admin' ? 'Admin' : 'Kullanıcı'}
                          </span>
                          {user.role === 'teacher' && user.teacherData?.assignedClass && (
                            <span className="text-xs text-gray-600 bg-orange-50 px-2 py-0.5 rounded">
                              {user.teacherData.assignedClass}
                            </span>
                          )}
                        </div>
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
                <div className="flex items-center justify-center gap-2 p-4 border-t mt-4">
                  <button onClick={() => setUsersCurrentPage(p => Math.max(p - 1, 1))} disabled={usersCurrentPage === 1} className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  <span className="text-sm text-gray-600">Sayfa {usersCurrentPage} / {usersTotalPages}</span>
                  <button onClick={() => setUsersCurrentPage(p => Math.min(p + 1, usersTotalPages))} disabled={usersCurrentPage === usersTotalPages} className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showEditUserModal && selectedUserToEdit && (
        <EditUserModal
          isOpen={showEditUserModal}
          onClose={() => setShowEditUserModal(false)}
          user={selectedUserToEdit}
          onSave={handleSaveUser}
        />
      )}
    </div>
    </div>
  );
};

export default UsersTab;