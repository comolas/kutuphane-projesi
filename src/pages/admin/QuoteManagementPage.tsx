import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, doc, deleteDoc, addDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import QuoteModal from '../../components/admin/QuoteModal';
import Swal from 'sweetalert2';

interface Quote {
  id: string;
  text: string;
  author: string;
  book: string;
}

const QuoteManagementPage: React.FC = () => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [authorFilter, setAuthorFilter] = useState('all');
  const [bookFilter, setBookFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [quoteToEdit, setQuoteToEdit] = useState<Quote | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const fetchQuotes = async () => {
    setLoading(true);
    try {
      const quotesCollection = collection(db, 'quotes');
      const quoteSnapshot = await getDocs(quotesCollection);
      const quotesList = quoteSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Quote));
      setQuotes(quotesList);
    } catch (error) {
      console.error("Alıntılar çekilirken hata:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, []);

  const authors = useMemo(() => ['all', ...Array.from(new Set(quotes.map(q => q.author)))], [quotes]);
  const books = useMemo(() => ['all', ...Array.from(new Set(quotes.map(q => q.book)))], [quotes]);

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
        // Update existing quote
        const quoteRef = doc(db, 'quotes', quoteData.id);
        const { id, ...dataToUpdate } = quoteData;
        await updateDoc(quoteRef, dataToUpdate);
      } else {
        // Add new quote
        await addDoc(collection(db, 'quotes'), quoteData);
      }
      handleCloseModal();
      fetchQuotes(); // Refresh the list
      Swal.fire('Başarılı!', 'Alıntı başarıyla kaydedildi.', 'success');
    } catch (error) {
      console.error("Alıntı kaydedilirken hata:", error);
      Swal.fire('Hata!', 'Alıntı kaydedilemedi.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    Swal.fire({
      title: 'Emin misiniz?',
      text: "Bu alıntıyı silmek istediğinizden emin misiniz?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Evet, sil!',
      cancelButtonText: 'İptal'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await deleteDoc(doc(db, 'quotes', id));
          fetchQuotes(); // Listeyi yenile
          Swal.fire(
            'Silindi!',
            'Alıntı başarıyla silindi.',
            'success'
          )
        } catch (error) {
          console.error("Alıntı silinirken hata:", error);
          Swal.fire(
            'Hata!',
            'Alıntı silinemedi.',
            'error'
          )
        }
      }
    });
  };

  return (
    <div className="p-4 sm:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Alıntı Yönetimi</h1>
          <button 
            onClick={() => handleOpenModal(null)}
            className="px-3 sm:px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center text-sm sm:text-base touch-manipulation min-h-[44px]"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            Yeni Alıntı Ekle
          </button>
        </div>

        {/* Search and Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="relative md:col-span-1">
            <input
              type="text"
              placeholder="Arama yap..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base"
            />
            <Search className="absolute left-2.5 sm:left-3 top-2.5 text-gray-400" size={18} />
          </div>
          <select 
            value={authorFilter} 
            onChange={e => setAuthorFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base"
          >
            {authors.map(author => <option key={author} value={author}>{author === 'all' ? 'Tüm Yazarlar' : author}</option>)}
          </select>
          <select 
            value={bookFilter} 
            onChange={e => setBookFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base"
          >
            {books.map(book => <option key={book} value={book}>{book === 'all' ? 'Tüm Kitaplar' : book}</option>)}
          </select>
        </div>

        {/* Quotes Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/2">Alıntı</th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Yazar</th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Kitap</th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={4} className="text-center py-6 sm:py-8 text-sm">Yükleniyor...</td></tr>
              ) : (paginatedQuotes.map(quote => (
                <tr key={quote.id}>
                  <td className="px-3 sm:px-6 py-3 sm:py-4">
                    <p className="text-xs sm:text-sm text-gray-700 italic line-clamp-2">"{quote.text}"</p>
                    <div className="sm:hidden text-xs text-gray-500 mt-1">{quote.author} - {quote.book}</div>
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 hidden sm:table-cell">{quote.author}</td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 hidden md:table-cell">{quote.book}</td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm font-medium space-x-1 sm:space-x-2">
                    <button onClick={() => handleOpenModal(quote)} className="text-indigo-600 hover:text-indigo-900 touch-manipulation p-1"><Edit className="w-4 h-4 sm:w-5 sm:h-5" /></button>
                    <button onClick={() => handleDelete(quote.id)} className="text-red-600 hover:text-red-900 touch-manipulation p-1"><Trash2 className="w-4 h-4 sm:w-5 sm:h-5" /></button>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div>
            <p className="text-xs sm:text-sm text-gray-700 text-center sm:text-left">
              Toplam {filteredQuotes.length} alıntı | Sayfa <span className="font-medium">{currentPage}</span> / <span className="font-medium">{totalPages}</span>
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
            >
              Önceki
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
            >
              Sonraki
            </button>
          </div>
        </div>
      </div>
      <QuoteModal 
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveQuote}
        quoteToEdit={quoteToEdit}
      />
    </div>
  );
};

export default QuoteManagementPage;