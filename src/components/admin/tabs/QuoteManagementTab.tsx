import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, doc, deleteDoc, addDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { Plus, Search, Edit, Trash2, BookText } from 'lucide-react';
import QuoteModal from '../QuoteModal';
import BulkAddQuoteModal from '../BulkAddQuoteModal'; // Import the new modal
import Swal from 'sweetalert2';

interface Quote {
  id: string;
  text: string;
  author: string;
  book: string;
}

const QuoteManagementTab: React.FC = () => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [authorFilter, setAuthorFilter] = useState('all');
  const [bookFilter, setBookFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showBulkAddModal, setShowBulkAddModal] = useState(false); // New state for bulk add modal
  const [quoteToEdit, setQuoteToEdit] = useState<Quote | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchQuotes = async () => {
    setLoading(true);
    try {
      const quotesCollection = collection(db, 'quotes');
      const quoteSnapshot = await getDocs(quotesCollection);
      const quotesList = quoteSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Quote));
      setQuotes(quotesList);
    } catch (error) {
      console.error("Alıntılar çekilirken hata:", error);
      Swal.fire('Hata!', 'Alıntılar çekilirken bir hata oluştu.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, []);

  const authors = useMemo(() => ['all', ...Array.from(new Set(quotes.map(q => q.author)))], [quotes]);
  const books = useMemo(() => ['all', ...Array.from(new Set(quotes.map(q => q.book)))], [quotes]);

  const stats = useMemo(() => ({
    totalQuotes: quotes.length,
    totalAuthors: new Set(quotes.map(q => q.author)).size,
    totalBooks: new Set(quotes.map(q => q.book)).size
  }), [quotes]);

  const filteredQuotes = useMemo(() => {
    return quotes
      .filter(quote => 
        authorFilter === 'all' || quote.author === authorFilter
      )
      .filter(quote => 
        bookFilter === 'all' || quote.book === bookFilter
      )
      .filter(quote => 
        quote.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quote.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quote.book.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [quotes, searchTerm, authorFilter, bookFilter]);

  const paginatedQuotes = useMemo(() => {
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    return filteredQuotes.slice(indexOfFirstItem, indexOfLastItem);
  }, [filteredQuotes, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredQuotes.length / itemsPerPage);

  const handleOpenModal = (quote: Quote | null) => {
    setQuoteToEdit(quote);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setQuoteToEdit(null);
    setIsModalOpen(false);
  };

  const handleSaveQuote = async (quoteData: Omit<Quote, 'id'> & { id?: string }) => {
    try {
      if (quoteData.id) {
        const quoteRef = doc(db, 'quotes', quoteData.id);
        const { id, ...dataToUpdate } = quoteData;
        await updateDoc(quoteRef, dataToUpdate);
        Swal.fire('Başarılı!', 'Alıntı başarıyla güncellendi.', 'success');
      } else {
        await addDoc(collection(db, 'quotes'), quoteData);
        Swal.fire('Başarılı!', 'Alıntı başarıyla eklendi.', 'success');
      }
      handleCloseModal();
      fetchQuotes();
    } catch (error) {
      console.error("Alıntı kaydedilirken hata:", error);
      Swal.fire("Hata!", "Hata: Alıntı kaydedilemedi.", 'error');
    }
  };

  const handleDelete = async (id: string) => {
    Swal.fire({
      title: 'Emin misiniz?',
      text: "Bu alıntıyı silmek istediğinizden emin misiniz?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Evet, sil!',
      cancelButtonText: 'Vazgeç'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await deleteDoc(doc(db, 'quotes', id));
          fetchQuotes();
          Swal.fire('Başarılı!', 'Alıntı başarıyla silindi.', 'success');
        } catch (error) {
          console.error("Alıntı silinirken hata:", error);
          Swal.fire("Hata!", "Hata: Alıntı silinemedi.", 'error');
        }
      }
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
      <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-xl p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center mb-6">
            <BookText className="w-6 h-6 mr-2 text-indigo-600" />
            Alıntı Yönetimi
          </h2>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-gradient-to-br from-blue-500 to-cyan-600 p-6 rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white/90">Toplam Alıntı</p>
                  <p className="text-3xl font-bold text-white mt-2">{stats.totalQuotes}</p>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-full p-4">
                  <BookText className="w-8 h-8 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-6 rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white/90">Toplam Yazar</p>
                  <p className="text-3xl font-bold text-white mt-2">{stats.totalAuthors}</p>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-full p-4">
                  <Edit className="w-8 h-8 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-pink-500 to-rose-600 p-6 rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white/90">Toplam Kitap</p>
                  <p className="text-3xl font-bold text-white mt-2">{stats.totalBooks}</p>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-full p-4">
                  <Search className="w-8 h-8 text-white" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3">

            <button 
              onClick={() => handleOpenModal(null)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center"
            >
              <Plus className="w-5 h-5 mr-2" />
              Yeni Alıntı Ekle
            </button>
            <button 
              onClick={() => setShowBulkAddModal(true)} // New button to open bulk add modal
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
            >
              <Plus className="w-5 h-5 mr-2" />
              Toplu Alıntı Ekle
            </button>
          </div>
        </div>

        {/* Mobile Filter Button */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="lg:hidden mb-4 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl flex items-center justify-center shadow-lg"
        >
          <Search className="w-5 h-5 mr-2" />
          Filtrele
        </button>

        {/* Overlay */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        <div className="flex gap-6">
          {/* Sidebar */}
          <div className={`fixed lg:sticky top-0 left-0 h-screen lg:h-auto w-80 lg:w-64 bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-xl p-6 z-50 transition-transform duration-300 ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">Filtreler</h3>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="lg:hidden text-gray-500 hover:text-gray-700"
              >
                <Search className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Arama</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Alıntı, yazar, kitap..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white/60 backdrop-blur-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Yazar</label>
                <select 
                  value={authorFilter} 
                  onChange={e => setAuthorFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-white/60 backdrop-blur-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  {authors.map(author => <option key={author} value={author}>{author === 'all' ? 'Tüm Yazarlar' : author}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Kitap</label>
                <select 
                  value={bookFilter} 
                  onChange={e => setBookFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-white/60 backdrop-blur-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  {books.map(book => <option key={book} value={book}>{book === 'all' ? 'Tüm Kitaplar' : book}</option>)}
                </select>
              </div>

              <button
                onClick={() => {
                  setSearchTerm('');
                  setAuthorFilter('all');
                  setBookFilter('all');
                }}
                className="w-full px-4 py-2 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl hover:shadow-lg transition-all duration-300"
              >
                Filtreleri Temizle
              </button>
            </div>
          </div>

          <div className="flex-1">

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            <p className="mt-4 text-gray-600">Yükleniyor...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {paginatedQuotes.map((quote, index) => (
              <div 
                key={quote.id} 
                className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 p-4 md:p-6"
                style={{ animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both` }}
              >
                <div className="mb-3 md:mb-4">
                  <p className="text-gray-700 italic text-base md:text-lg leading-relaxed">"{quote.text}"</p>
                </div>
                
                <div className="border-t border-gray-200 pt-4 space-y-2">
                  <div className="flex items-center text-sm">
                    <span className="font-semibold text-gray-900 mr-2">Yazar:</span>
                    <span className="text-gray-600">{quote.author}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <span className="font-semibold text-gray-900 mr-2">Kitap:</span>
                    <span className="text-gray-600">{quote.book}</span>
                  </div>
                </div>

                <div className="flex gap-2 mt-3 md:mt-4">
                  <button 
                    onClick={() => handleOpenModal(quote)} 
                    className="flex-1 px-3 md:px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-300 flex items-center justify-center text-sm md:text-base"
                  >
                    <Edit className="w-4 h-4 mr-1 md:mr-2" />
                    <span className="hidden sm:inline">Düzenle</span>
                  </button>
                  <button 
                    onClick={() => handleDelete(quote.id)} 
                    className="flex-1 px-3 md:px-4 py-2 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-xl hover:shadow-lg transition-all duration-300 flex items-center justify-center text-sm md:text-base"
                  >
                    <Trash2 className="w-4 h-4 mr-1 md:mr-2" />
                    <span className="hidden sm:inline">Sil</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 md:mt-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <p className="text-xs md:text-sm text-gray-700">
              Toplam {filteredQuotes.length} alıntı | Sayfa <span className="font-medium">{currentPage}</span> / <span className="font-medium">{totalPages}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 md:px-4 py-2 text-xs md:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Önceki
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-3 md:px-4 py-2 text-xs md:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sonraki
            </button>
          </div>
        </div>
          </div>
        </div>

      <QuoteModal 
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveQuote}
        quoteToEdit={quoteToEdit}
      />

      {/* Bulk Add Quote Modal */}
      <BulkAddQuoteModal
        isOpen={showBulkAddModal}
        onClose={() => setShowBulkAddModal(false)}
        onQuotesAdded={fetchQuotes} // Refetch quotes after bulk add
      />
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

export default QuoteManagementTab;
