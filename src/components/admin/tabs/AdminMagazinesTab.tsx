import React, { useState } from 'react';
import { useMagazines } from '../../../contexts/MagazineContext';
import { Magazine } from '../../../types';
import { Search, Plus, Edit, Trash2, BookOpen } from 'lucide-react';
import MagazineModal from '../MagazineModal';

const AdminMagazinesTab: React.FC = () => {
  const { magazines, deleteMagazine } = useMagazines();
  const [searchQuery, setSearchQuery] = useState('');
  const [showMagazineModal, setShowMagazineModal] = useState(false);
  const [selectedMagazine, setSelectedMagazine] = useState<Magazine | null>(null);

  const handleAddClick = () => {
    setSelectedMagazine(null);
    setShowMagazineModal(true);
  };

  const handleEditClick = (magazine: Magazine) => {
    setSelectedMagazine(magazine);
    setShowMagazineModal(true);
  };

  const handleDeleteClick = async (magazineId: string) => {
    if (window.confirm('Bu dergiyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
      try {
        await deleteMagazine(magazineId);
        alert('Dergi başarıyla silindi.');
      } catch (error) {
        console.error('Error deleting magazine:', error);
        alert('Dergi silinirken bir hata oluştu.');
      }
    }
  };

  const filteredMagazines = magazines.filter(magazine =>
    magazine.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <BookOpen className="w-6 h-6 mr-2 text-indigo-600" />
            Dergi Yönetimi
          </h2>
          <button
            onClick={handleAddClick}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center"
          >
            <Plus className="w-5 h-5 mr-2" />
            Yeni Dergi Ekle
          </button>
        </div>
      </div>

      <div className="p-6">
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Dergi adı ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredMagazines.map(magazine => (
            <div key={magazine.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <img src={magazine.coverImageUrl} alt={magazine.title} className="w-full h-64 object-cover" />
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 truncate">{magazine.title}</h3>
                <p className="text-sm text-gray-600">{magazine.issue}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => handleEditClick(magazine)}
                    className="px-2 py-1 rounded-lg text-xs font-medium bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors flex items-center"
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    Düzenle
                  </button>
                  <button
                    onClick={() => handleDeleteClick(magazine.id)}
                    className="px-2 py-1 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors flex items-center"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Sil
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <MagazineModal 
        isOpen={showMagazineModal}
        onClose={() => setShowMagazineModal(false)}
        magazine={selectedMagazine}
      />
    </div>
  );
};

export default AdminMagazinesTab;
