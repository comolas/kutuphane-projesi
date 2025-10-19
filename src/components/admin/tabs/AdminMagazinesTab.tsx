import React, { useState, useMemo } from 'react';
import { useMagazines } from '../../../contexts/MagazineContext';
import { Magazine } from '../../../types';
import { Search, Plus, Edit, Trash2, BookOpen, Filter, X } from 'lucide-react';
import MagazineModal from '../MagazineModal';
import Swal from 'sweetalert2';

const AdminMagazinesTab: React.FC = () => {
  const { magazines, deleteMagazine } = useMagazines();
  const [searchQuery, setSearchQuery] = useState('');
  const [showMagazineModal, setShowMagazineModal] = useState(false);
  const [selectedMagazine, setSelectedMagazine] = useState<Magazine | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState('newest');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    magazines.forEach(magazine => {
      magazine.tags?.forEach(tag => {
        if(tag) tags.add(tag);
      });
    });
    return Array.from(tags);
  }, [magazines]);

  const handleTagClick = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleAddClick = () => {
    setSelectedMagazine(null);
    setShowMagazineModal(true);
  };

  const handleEditClick = (magazine: Magazine) => {
    setSelectedMagazine(magazine);
    setShowMagazineModal(true);
  };

  const handleDeleteClick = async (magazineId: string) => {
    Swal.fire({
      title: 'Emin misiniz?',
      text: "Bu dergiyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Evet, sil!',
      cancelButtonText: 'Vazgeç'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await deleteMagazine(magazineId);
          Swal.fire('Başarılı!', 'Dergi başarıyla silindi.', 'success');
        } catch (error) {
          console.error('Error deleting magazine:', error);
          Swal.fire('Hata!', 'Dergi silinirken bir hata oluştu.', 'error');
        }
      }
    });
  };

  const filteredMagazines = useMemo(() => {
    const filtered = magazines.filter(magazine => {
      const matchesSearch = magazine.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            magazine.issue.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTags = selectedTags.length === 0 ||
                          selectedTags.every(tag => magazine.tags?.includes(tag));
      return matchesSearch && matchesTags;
    });

    return filtered.sort((a, b) => {
      switch (sortOrder) {
        case 'newest':
          return (b.addedAt?.seconds || 0) - (a.addedAt?.seconds || 0);
        case 'oldest':
          return (a.addedAt?.seconds || 0) - (b.addedAt?.seconds || 0);
        case 'title-asc':
          return a.title.localeCompare(b.title);
        case 'title-desc':
          return b.title.localeCompare(a.title);
        default:
          return 0;
      }
    });
  }, [magazines, searchQuery, selectedTags, sortOrder]);

  return (
    <>
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-8 px-4">
    <div className="max-w-7xl mx-auto">
    <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg overflow-hidden border border-white/20">
      <div className="p-3 sm:p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center">
            <BookOpen className="w-5 sm:w-6 h-5 sm:h-6 mr-2 text-indigo-600" />
            Dergi Yönetimi
          </h2>
          <button
            onClick={handleAddClick}
            className="px-3 sm:px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center text-xs sm:text-sm min-h-[40px] touch-manipulation"
          >
            <Plus className="w-4 sm:w-5 h-4 sm:h-5 mr-2" />
            Yeni Dergi Ekle
          </button>
        </div>
      </div>

      <div className="p-3 sm:p-6">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="lg:hidden fixed bottom-20 right-6 z-50 p-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all"
        >
          <Filter className="w-6 h-6" />
        </button>

        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        <div className="flex flex-col lg:flex-row gap-6">
          <aside className={`fixed lg:sticky top-0 left-0 h-screen lg:h-auto w-full lg:w-64 bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg p-3 sm:p-6 flex-shrink-0 border border-white/20 z-50 transition-transform duration-300 ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold flex items-center">
                <Filter className="w-5 h-5 mr-2 text-indigo-600" />
                Filtreler
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedTags([]);
                    setSortOrder('newest');
                  }}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  Temizle
                </button>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="lg:hidden text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="mb-6">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Dergi ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Sıralama</h3>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="newest">En Yeni</option>
                  <option value="oldest">En Eski</option>
                  <option value="title-asc">A'dan Z'ye</option>
                  <option value="title-desc">Z'den A'ya</option>
                </select>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Etiketler</h3>
                <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto">
                  {allTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => handleTagClick(tag)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                        selectedTags.includes(tag)
                          ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          <div className="flex-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredMagazines.map((magazine, index) => (
            <div key={magazine.id} className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg overflow-hidden group transition-all duration-300 hover:scale-105 hover:shadow-2xl border border-white/20" style={{ animationDelay: `${index * 0.1}s` }}>
              <div className="relative overflow-hidden aspect-[3/4]">
                <img src={magazine.coverImageUrl} alt={magazine.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
              </div>
              <div className="p-4">
                <h2 className="text-lg font-bold text-gray-900 truncate" title={magazine.title}>{magazine.title}</h2>
                <p className="text-sm text-gray-600 mt-1">{magazine.issue}</p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => handleEditClick(magazine)}
                    className="flex-1 px-3 py-2 bg-white/90 backdrop-blur-sm text-indigo-600 rounded-xl text-xs font-semibold shadow-md hover:bg-white transition-all flex items-center justify-center min-h-[40px] touch-manipulation"
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    Düzenle
                  </button>
                  <button
                    onClick={() => handleDeleteClick(magazine.id)}
                    className="flex-1 px-3 py-2 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-xl text-xs font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center min-h-[40px] touch-manipulation"
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
        </div>
      </div>
    </div>
    </div>
    </div>

      <MagazineModal 
        isOpen={showMagazineModal}
        onClose={() => setShowMagazineModal(false)}
        magazine={selectedMagazine}
      />
    </>
  );
};

export default AdminMagazinesTab;