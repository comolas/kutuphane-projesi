import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, query, where, Timestamp, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { AllowedUser } from '../../types';
import { Upload, Trash2, Search, Filter, X, SortAsc, SortDesc, Plus, Edit, ChevronLeft, ChevronRight } from 'lucide-react';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';

interface Campus {
  id: string;
  name: string;
}

const AllowedUsersTab: React.FC = () => {
  const [allowedUsers, setAllowedUsers] = useState<AllowedUser[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [selectedCampus, setSelectedCampus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [classFilter, setClassFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AllowedUser | null>(null);
  const [formData, setFormData] = useState({ firstName: '', lastName: '', studentClass: '', studentNumber: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  useEffect(() => {
    loadCampuses();
  }, []);

  useEffect(() => {
    if (selectedCampus) {
      loadAllowedUsers();
    }
  }, [selectedCampus]);

  const loadCampuses = async () => {
    const snapshot = await getDocs(collection(db, 'campuses'));
    const data = snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
    setCampuses(data);
    if (data.length > 0) setSelectedCampus(data[0].id);
  };

  const loadAllowedUsers = async () => {
    setLoading(true);
    const q = query(collection(db, 'allowedUsers'), where('campusId', '==', selectedCampus));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AllowedUser));
    setAllowedUsers(data);
    setLoading(false);
  };

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedCampus) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet) as any[];

        const campusData = campuses.find(c => c.id === selectedCampus);
        let successCount = 0;

        for (const row of rows) {
          await addDoc(collection(db, 'allowedUsers'), {
            firstName: row['Ad'] || row['firstName'],
            lastName: row['Soyad'] || row['lastName'],
            studentClass: row['Sınıf'] || row['studentClass'],
            studentNumber: row['Numara'] || row['studentNumber'],
            campusName: campusData?.name,
            campusId: selectedCampus,
            addedAt: Timestamp.now()
          });
          successCount++;
        }

        Swal.fire('Başarılı!', `${successCount} kullanıcı eklendi.`, 'success');
        loadAllowedUsers();
      } catch (error) {
        Swal.fire('Hata!', 'Excel dosyası işlenirken hata oluştu.', 'error');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'Emin misiniz?',
      text: 'Bu kullanıcı silinecek!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Evet, Sil',
      cancelButtonText: 'İptal'
    });

    if (result.isConfirmed) {
      await deleteDoc(doc(db, 'allowedUsers', id!));
      Swal.fire('Silindi!', 'Kullanıcı başarıyla silindi.', 'success');
      loadAllowedUsers();
    }
  };

  const uniqueClasses = Array.from(new Set(allowedUsers.map(u => u.studentClass))).sort();

  const filteredUsers = allowedUsers
    .filter(user => {
      const matchesSearch = user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.studentNumber.includes(searchQuery);
      const matchesClass = classFilter === 'all' || user.studentClass === classFilter;
      return matchesSearch && matchesClass;
    })
    .sort((a, b) => {
      let aValue, bValue;
      switch (sortBy) {
        case 'name':
          aValue = `${a.firstName} ${a.lastName}`.toLowerCase();
          bValue = `${b.firstName} ${b.lastName}`.toLowerCase();
          break;
        case 'class':
          aValue = a.studentClass.toLowerCase();
          bValue = b.studentClass.toLowerCase();
          break;
        case 'number':
          aValue = a.studentNumber;
          bValue = b.studentNumber;
          break;
        default:
          return 0;
      }
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentUsers = filteredUsers.slice(startIndex, endIndex);

  const clearFilters = () => {
    setSearchQuery('');
    setClassFilter('all');
    setSortBy('name');
    setSortOrder('asc');
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampus) return;

    try {
      const campusData = campuses.find(c => c.id === selectedCampus);
      if (editingUser) {
        await updateDoc(doc(db, 'allowedUsers', editingUser.id!), formData);
        Swal.fire('Güncellendi!', 'Kullanıcı başarıyla güncellendi.', 'success');
      } else {
        await addDoc(collection(db, 'allowedUsers'), {
          ...formData,
          campusName: campusData?.name,
          campusId: selectedCampus,
          addedAt: Timestamp.now()
        });
        Swal.fire('Eklendi!', 'Kullanıcı başarıyla eklendi.', 'success');
      }
      setIsAddModalOpen(false);
      setEditingUser(null);
      setFormData({ firstName: '', lastName: '', studentClass: '', studentNumber: '' });
      loadAllowedUsers();
    } catch (err) {
      Swal.fire('Hata!', 'İşlem sırasında bir hata oluştu.', 'error');
    }
  };

  const handleEdit = (user: AllowedUser) => {
    setEditingUser(user);
    setFormData({ firstName: user.firstName, lastName: user.lastName, studentClass: user.studentClass, studentNumber: user.studentNumber });
    setIsAddModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg p-6 animate-fadeIn">
        <div className="flex items-center gap-3 mb-3">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-3 rounded-xl">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">İzin Verilen Kullanıcılar</h2>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <p className="text-gray-600 text-lg">Sisteme kayıt olmasına izin verilen kullanıcıları yönetin</p>
          <div className="flex gap-2">
            <button
              onClick={() => { setEditingUser(null); setFormData({ firstName: '', lastName: '', studentClass: '', studentNumber: '' }); setIsAddModalOpen(true); }}
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all flex items-center min-h-[44px] justify-center font-semibold"
            >
              <Plus className="w-4 h-4 mr-2" />
              Yeni Ekle
            </button>
            <label className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:shadow-lg transition-all cursor-pointer flex items-center min-h-[44px] justify-center font-semibold">
              <Upload className="w-4 h-4 mr-2" />
              Excel İçe Aktar
              <input type="file" accept=".xlsx,.xls" onChange={handleExcelImport} className="hidden" />
            </label>
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
                placeholder="Ad, soyad veya numara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <Search className="absolute left-2.5 sm:left-3 top-2.5 text-gray-400" size={14} />
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Kampüs</h3>
              <div className="space-y-2">
                {campuses.map(campus => (
                  <label key={campus.id} className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <input
                      type="radio"
                      name="campus"
                      checked={selectedCampus === campus.id}
                      onChange={() => setSelectedCampus(campus.id)}
                      className="mr-2"
                    />
                    <span className="text-sm">{campus.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Sınıf</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                  <input
                    type="radio"
                    name="class"
                    checked={classFilter === 'all'}
                    onChange={() => setClassFilter('all')}
                    className="mr-2"
                  />
                  <span className="text-sm">Tümü</span>
                </label>
                {uniqueClasses.map(cls => (
                  <label key={cls} className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <input
                      type="radio"
                      name="class"
                      checked={classFilter === cls}
                      onChange={() => setClassFilter(cls)}
                      className="mr-2"
                    />
                    <span className="text-sm">{cls}</span>
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
                    checked={sortBy === 'class'}
                    onChange={() => setSortBy('class')}
                    className="mr-2"
                  />
                  <span className="text-sm">Sınıfa Göre</span>
                </label>
                <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                  <input
                    type="radio"
                    name="sortBy"
                    checked={sortBy === 'number'}
                    onChange={() => setSortBy('number')}
                    className="mr-2"
                  />
                  <span className="text-sm">Numaraya Göre</span>
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
          <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg p-4 sm:p-6 mb-4 animate-fadeIn">
            <div className="flex items-center mb-4">
              <input
                type="checkbox"
                className="form-checkbox h-4 w-4 text-indigo-600 transition duration-150 ease-in-out rounded"
                checked={selectedUserIds.length === filteredUsers.length && filteredUsers.length > 0}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedUserIds(filteredUsers.map(u => u.id!));
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
                        if (!confirm(`${selectedUserIds.length} kullanıcıyı silmek istediğinizden emin misiniz?`)) return;
                        try {
                          await Promise.all(selectedUserIds.map(id => deleteDoc(doc(db, 'allowedUsers', id))));
                          Swal.fire('Silindi!', `${selectedUserIds.length} kullanıcı başarıyla silindi.`, 'success');
                          setSelectedUserIds([]);
                          loadAllowedUsers();
                        } catch (err) {
                          Swal.fire('Hata!', 'İşlem sırasında bir hata oluştu.', 'error');
                        }
                      }}
                      className="flex items-center px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Toplu Sil
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="text-xs sm:text-sm text-gray-600">
                <span className="font-medium">{startIndex + 1}-{Math.min(endIndex, filteredUsers.length)}</span> / {filteredUsers.length} kullanıcı
                {searchQuery && ` ("${searchQuery}" araması)`}
                {classFilter !== 'all' && ` (${classFilter} sınıfı)`}
              </div>
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2 font-semibold"
              >
                <Filter className="w-5 h-5" />
                Filtreler
              </button>
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg p-6 animate-fadeIn">

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-indigo-600 mx-auto"></div>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
            <table className="min-w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Seç</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ad</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Soyad</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sınıf</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Numara/Branş</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kampüs</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {currentUsers.map(user => (
                  <tr key={user.id} className={`hover:bg-gray-50 ${selectedUserIds.includes(user.id!) ? 'bg-blue-50' : ''}`}>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        className="form-checkbox h-4 w-4 text-indigo-600 transition duration-150 ease-in-out rounded"
                        checked={selectedUserIds.includes(user.id!)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUserIds([...selectedUserIds, user.id!]);
                          } else {
                            setSelectedUserIds(selectedUserIds.filter(id => id !== user.id));
                          }
                        }}
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{user.firstName}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{user.lastName}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{user.studentClass}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{user.studentNumber}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{user.campusName}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handleEdit(user)}
                          className="text-indigo-600 hover:text-indigo-800 p-2 hover:bg-indigo-50 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(user.id!)}
                          className="text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
                </div>
                {currentUsers.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    Kayıtlı kullanıcı bulunamadı.
                  </div>
                )}
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg px-4 sm:px-6 py-4 animate-fadeIn">
              <div className="text-sm text-gray-600">
                Sayfa <span className="font-medium">{currentPage}</span> / <span className="font-medium">{totalPages}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="flex items-center px-3 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Önceki
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="flex items-center px-3 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  Sonraki
                  <ChevronRight className="w-4 h-4 ml-1" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-[9999] flex items-center justify-center p-0 animate-fadeIn" onClick={() => setIsAddModalOpen(false)}>
          <div className="bg-gradient-to-br from-white to-indigo-50 w-full h-full overflow-y-auto flex flex-col transform transition-all duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 sm:p-6 flex-shrink-0">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 sm:p-3">
                    <Plus className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-2xl font-bold text-white">{editingUser ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı Ekle'}</h3>
                    <p className="text-xs sm:text-sm text-white/80">Kullanıcı bilgilerini girin</p>
                  </div>
                </div>
                <button onClick={() => setIsAddModalOpen(false)} className="text-white hover:bg-white/20 rounded-full p-2 transition-all duration-200 flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation">
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>
            </div>
            <form onSubmit={handleAddUser} className="p-4 sm:p-6 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2">Ad <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="block w-full border-2 border-gray-200 rounded-xl shadow-sm py-2 sm:py-3 px-3 sm:px-4 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm sm:text-base"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2">Soyad <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="block w-full border-2 border-gray-200 rounded-xl shadow-sm py-2 sm:py-3 px-3 sm:px-4 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm sm:text-base"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2">Sınıf <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formData.studentClass}
                    onChange={(e) => setFormData({ ...formData, studentClass: e.target.value })}
                    className="block w-full border-2 border-gray-200 rounded-xl shadow-sm py-2 sm:py-3 px-3 sm:px-4 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm sm:text-base"
                    placeholder="Örn: 9A"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2">Numara/Branş <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formData.studentNumber}
                    onChange={(e) => setFormData({ ...formData, studentNumber: e.target.value })}
                    className="block w-full border-2 border-gray-200 rounded-xl shadow-sm py-2 sm:py-3 px-3 sm:px-4 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm sm:text-base"
                    required
                  />
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-gray-200 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-gray-700 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-all font-semibold text-sm min-h-[44px] flex items-center justify-center shadow-md hover:shadow-lg hover:scale-105 touch-manipulation"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all font-semibold text-sm min-h-[44px] flex items-center justify-center shadow-md hover:scale-105 touch-manipulation"
                >
                  {editingUser ? 'Güncelle' : 'Ekle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllowedUsersTab;
