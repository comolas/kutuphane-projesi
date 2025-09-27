
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, getDocs, query, where, doc, updateDoc, deleteDoc, writeBatch, WriteBatch } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { Search, Edit, Trash2, Users } from 'lucide-react';
import EditUserModal from '../EditUserModal';

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
  const [users, setUsers] = useState<UserData[]>([]);
  const [usersSearchQuery, setUsersSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [usersCurrentPage, setUsersCurrentPage] = useState(1);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const usersPerPage = 10;
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [selectedUserToEdit, setSelectedUserToEdit] = useState<UserData | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
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
      alert('Kullanıcı bilgileri başarıyla güncellendi.');
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Kullanıcı güncellenirken bir hata oluştu.');
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
    if (!window.confirm('Bu kullanıcıyı ve ilgili tüm verilerini kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
      return;
    }
    try {
      const batch = writeBatch(db);
      await deleteUserAndData(userId, batch);
      await batch.commit();
      setUsers(prev => prev.filter(user => user.uid !== userId));
      alert('Kullanıcı başarıyla silindi.');
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Kullanıcı silinirken bir hata oluştu.');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedUsers.length === 0) return;
    if (!window.confirm(`${selectedUsers.length} kullanıcıyı ve bu kullanıcılara ait tüm verileri (ödünç alma geçmişi, talepler vb.) kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`)) {
      return;
    }

    setIsBulkDeleting(true);
    try {
      const batch = writeBatch(db);
      for (const userId of selectedUsers) {
        await deleteUserAndData(userId, batch);
      }
      await batch.commit();
      setUsers(prev => prev.filter(user => !selectedUsers.includes(user.uid)));
      setSelectedUsers([]);
      alert(`${selectedUsers.length} kullanıcı başarıyla silindi.`);
    } catch (error) {
      console.error('Error bulk deleting users:', error);
      alert('Toplu kullanıcı silme sırasında bir hata oluştu.');
    } finally {
      setIsBulkDeleting(false);
    }
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

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Users className="w-6 h-6 mr-2 text-indigo-600" />
              Kullanıcı Yönetimi
            </h2>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                {uniqueClasses.map(c => (
                  <option key={c} value={c}>{c === 'all' ? 'Tüm Sınıflar' : c}</option>
                ))}
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
