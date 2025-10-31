import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { AllowedUser } from '../../types';
import { Upload, Trash2, Search, Filter } from 'lucide-react';
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

  const filteredUsers = allowedUsers.filter(user =>
    user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.studentNumber.includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900">İzin Verilen Kullanıcılar</h2>
        <label className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer flex items-center min-h-[44px] w-full sm:w-auto justify-center">
          <Upload className="w-4 h-4 mr-2" />
          Excel İçe Aktar
          <input type="file" accept=".xlsx,.xls" onChange={handleExcelImport} className="hidden" />
        </label>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Ad, soyad veya numara ile ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <select
              value={selectedCampus}
              onChange={(e) => setSelectedCampus(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 min-h-[44px] w-full sm:w-auto"
            >
              {campuses.map(campus => (
                <option key={campus.id} value={campus.id}>{campus.name}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ad</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Soyad</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sınıf</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Numara/Branş</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kampüs</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{user.firstName}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{user.lastName}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{user.studentClass}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{user.studentNumber}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{user.campusName}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(user.id!)}
                        className="text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            {filteredUsers.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                Kayıtlı kullanıcı bulunamadı.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AllowedUsersTab;
