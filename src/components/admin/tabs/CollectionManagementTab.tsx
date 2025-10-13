import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Layers, Edit, Trash2, Eye, EyeOff, ChevronLeft, ChevronRight } from 'lucide-react';
import { collection, getDocs, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import CollectionModal, { StoryCollection } from '../CollectionModal';
import Swal from 'sweetalert2';

const CollectionManagementTab: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [collections, setCollections] = useState<StoryCollection[]>([]);
  const [editingCollection, setEditingCollection] = useState<StoryCollection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<'order' | 'title' | 'books'>('order');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;
  const [allLibraryBooks, setAllLibraryBooks] = useState<any[]>([]);

  const filteredCollections = collections
    .filter(c => c.title.toLowerCase().includes(searchTerm.toLowerCase()))
    .filter(c => {
      if (statusFilter === 'active') return c.isActive;
      if (statusFilter === 'inactive') return !c.isActive;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'order') return a.order - b.order;
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'books') return b.books.length - a.books.length;
      return 0;
    });

  const totalPages = Math.ceil(filteredCollections.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCollections = filteredCollections.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, sortBy]);

  const stats = {
    totalCollections: collections.length,
    activeCollections: collections.filter(c => c.isActive).length,
    totalBooks: collections.reduce((sum, c) => sum + c.books.length, 0)
  };

  const fetchCollections = useCallback(async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, 'collections'), orderBy('order', 'asc'));
      const querySnapshot = await getDocs(q);
      const collectionsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StoryCollection));
      setCollections(collectionsData);
    } catch (error) {
      console.error("Error fetching collections: ", error);
      Swal.fire('Hata!', 'Koleksiyonlar getirilirken bir hata oluştu.', 'error');
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchCollections();
    const fetchBooks = async () => {
      try {
        const booksSnapshot = await getDocs(collection(db, 'books'));
        const booksList = booksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAllLibraryBooks(booksList);
      } catch (error) {
        console.error('Error fetching books:', error);
      }
    };
    fetchBooks();
  }, [fetchCollections]);

  const handleAddNew = () => {
    setEditingCollection(null);
    setIsModalOpen(true);
  };

  const handleEdit = (collection: StoryCollection) => {
    setEditingCollection(collection);
    setIsModalOpen(true);
  };

  const handleDelete = async (collectionId: string) => {
    Swal.fire({
      title: 'Emin misiniz?',
      text: "Bu koleksiyonu silmek istediğinizden emin misiniz?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Evet, sil!',
      cancelButtonText: 'İptal'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await deleteDoc(doc(db, 'collections', collectionId));
          setCollections(prev => prev.filter(c => c.id !== collectionId));
          Swal.fire(
            'Silindi!',
            'Koleksiyon başarıyla silindi.',
            'success'
          )
        } catch (error) {
          console.error("Error deleting collection: ", error);
          Swal.fire(
            'Hata!',
            'Koleksiyon silinirken bir hata oluştu.',
            'error'
          )
        }
      }
    });
  };

  const handleSave = (savedCollection: StoryCollection) => {
    if (editingCollection) {
      // Edit
      setCollections(prev => prev.map(c => c.id === savedCollection.id ? savedCollection : c));
    } else {
      // Add
      setCollections(prev => [...prev, savedCollection]);
    }
    // Re-sort the list based on order
    setCollections(prev => [...prev].sort((a, b) => a.order - b.order));
    Swal.fire('Başarılı!', 'Koleksiyon başarıyla kaydedildi.', 'success');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
      <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-xl p-6">
      <div className="mb-4 md:mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 md:gap-0 mb-4 md:mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center">
            <Layers className="w-5 h-5 md:w-6 md:h-6 mr-2 text-indigo-600" />
            Koleksiyon Yönetimi
          </h2>
          <button
            onClick={handleAddNew}
            className="w-full sm:w-auto flex items-center justify-center px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-300 text-sm md:text-base"
          >
            <Plus className="w-4 h-4 md:w-5 md:h-5 mr-2" />
            Yeni Koleksiyon Ekle
          </button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6 mb-4 md:mb-6">
          <div className="bg-gradient-to-br from-blue-500 to-cyan-600 p-4 md:p-6 rounded-xl md:rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-white/90">Toplam Koleksiyon</p>
                <p className="text-2xl md:text-3xl font-bold text-white mt-1 md:mt-2">{stats.totalCollections}</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-3 md:p-4">
                <Layers className="w-6 h-6 md:w-8 md:h-8 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-4 md:p-6 rounded-xl md:rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-white/90">Aktif Koleksiyonlar</p>
                <p className="text-2xl md:text-3xl font-bold text-white mt-1 md:mt-2">{stats.activeCollections}</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-3 md:p-4">
                <Eye className="w-6 h-6 md:w-8 md:h-8 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-4 md:p-6 rounded-xl md:rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-white/90">Toplam Kitap Sayısı</p>
                <p className="text-2xl md:text-3xl font-bold text-white mt-1 md:mt-2">{stats.totalBooks}</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-3 md:p-4">
                <Plus className="w-6 h-6 md:w-8 md:h-8 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Filter Button */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="lg:hidden mb-4 w-full px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl flex items-center justify-center shadow-lg font-semibold"
      >
        <Layers className="w-5 h-5 mr-2" />
        Filtrele
      </button>

      {/* Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className="flex gap-4 md:gap-6">
        {/* Sidebar */}
        <div className={`fixed lg:sticky top-0 left-0 h-screen lg:h-auto w-80 lg:w-64 bg-white/90 backdrop-blur-xl border border-white/20 rounded-none lg:rounded-2xl shadow-xl p-4 md:p-6 z-50 transition-transform duration-300 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900">Filtreler</h3>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden text-gray-500 hover:text-gray-700"
            >
              <Layers className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Arama</label>
              <input
                type="text"
                placeholder="Koleksiyon başlığı..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 bg-white/60 backdrop-blur-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Durum</label>
              <select 
                value={statusFilter} 
                onChange={e => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                className="w-full px-3 py-2 bg-white/60 backdrop-blur-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="all">Tümü</option>
                <option value="active">Aktif</option>
                <option value="inactive">Pasif</option>
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sıralama</label>
              <select 
                value={sortBy} 
                onChange={e => setSortBy(e.target.value as 'order' | 'title' | 'books')}
                className="w-full px-3 py-2 bg-white/60 backdrop-blur-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="order">Sıra</option>
                <option value="title">Başlık</option>
                <option value="books">Kitap Sayısı</option>
              </select>
            </div>

            {/* Clear Filters */}
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setSortBy('order');
              }}
              className="w-full px-4 py-2 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl hover:shadow-lg transition-all duration-300"
            >
              Filtreleri Temizle
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1">
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Koleksiyonlar yükleniyor...</p>
        </div>
      ) : (
        <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {paginatedCollections.map((collection, index) => (
            <div 
              key={collection.id} 
              className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 overflow-hidden"
              style={{ animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both` }}
            >
              {/* Book Preview */}
              <div className="relative h-40 md:h-48 bg-gradient-to-br from-gray-100 to-gray-200 p-3 md:p-4">
                <div className="flex gap-2 h-full justify-center items-center">
                  {collection.books.slice(0, 4).map((book, idx) => {
                    const bookData = allLibraryBooks.find(b => b.id === book.bookId);
                    return (
                      <div 
                        key={idx} 
                        className="relative h-full flex-1 max-w-[80px] rounded-lg overflow-hidden shadow-md transform hover:scale-110 transition-transform duration-300"
                        style={{ 
                          transform: `rotate(${(idx - 1.5) * 3}deg)`,
                          zIndex: 4 - idx 
                        }}
                      >
                        {bookData?.coverImage ? (
                          <img 
                            src={bookData.coverImage} 
                            alt="Book cover" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-indigo-200 to-purple-200 flex items-center justify-center text-xs text-gray-600 font-semibold">
                            Kitap {idx + 1}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                {/* Status Badge */}
                <div className="absolute top-3 right-3">
                  {collection.isActive ? (
                    <span className="px-3 py-1.5 inline-flex items-center text-xs font-bold rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white backdrop-blur-xl shadow-lg">
                      <Eye className="w-4 h-4 mr-1"/> Aktif
                    </span>
                  ) : (
                    <span className="px-3 py-1.5 inline-flex items-center text-xs font-bold rounded-xl bg-gradient-to-r from-red-500 to-pink-600 text-white backdrop-blur-xl shadow-lg">
                      <EyeOff className="w-4 h-4 mr-1"/> Pasif
                    </span>
                  )}
                </div>

                {/* Order Badge */}
                <div className="absolute top-3 left-3">
                  <span className="px-3 py-1.5 text-xs font-bold rounded-xl bg-white/90 backdrop-blur-xl text-indigo-600 shadow-lg">
                    Sıra: {collection.order}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 md:p-6">
                <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2 md:mb-3 line-clamp-2">{collection.title}</h3>
                
                {/* Info Box */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-3 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <Layers className="w-4 h-4 mr-2" />
                    <span>{collection.books.length} Kitap</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleEdit(collection)} 
                    className="flex-1 px-3 md:px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-300 flex items-center justify-center text-sm md:text-base"
                  >
                    <Edit className="w-4 h-4 mr-1 md:mr-2" />
                    <span className="hidden sm:inline">Düzenle</span>
                  </button>
                  <button 
                    onClick={() => handleDelete(collection.id!)} 
                    className="flex-1 px-3 md:px-4 py-2 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-xl hover:shadow-lg transition-all duration-300 flex items-center justify-center text-sm md:text-base"
                  >
                    <Trash2 className="w-4 h-4 mr-1 md:mr-2" />
                    <span className="hidden sm:inline">Sil</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex justify-center">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-2.5 rounded-xl bg-white/90 backdrop-blur-xl border border-white/20 text-gray-700 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-all duration-300 shadow-lg font-medium"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Önceki
              </button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-4 py-2.5 rounded-xl transition-all duration-300 shadow-lg font-medium ${
                    currentPage === page
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white scale-105'
                      : 'bg-white/90 backdrop-blur-xl border border-white/20 text-gray-700 hover:bg-white'
                  }`}
                >
                  {page}
                </button>
              ))}
              
              <button
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-4 py-2.5 rounded-xl bg-white/90 backdrop-blur-xl border border-white/20 text-gray-700 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-all duration-300 shadow-lg font-medium"
              >
                Sonraki
                <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>
        )}
        </>
      )}

      {isModalOpen && (
        <CollectionModal 
          onClose={() => setIsModalOpen(false)} 
          onSave={handleSave}
          collectionToEdit={editingCollection}
        />
      )}
        </div>
      </div>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default CollectionManagementTab;