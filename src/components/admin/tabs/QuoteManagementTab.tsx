import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, doc, deleteDoc, addDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { Plus, Search, Edit, Trash2, BookText } from 'lucide-react';
import QuoteModal from '../QuoteModal';

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
  const [quoteToEdit, setQuoteToEdit] = useState<Quote | null>(null);

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
        const quoteRef = doc(db, 'quotes', quoteData.id);
        const { id, ...dataToUpdate } = quoteData;
        await updateDoc(quoteRef, dataToUpdate);
      } else {
        await addDoc(collection(db, 'quotes'), quoteData);
      }
      handleCloseModal();
      fetchQuotes();
    } catch (error) {
      console.error("Alıntı kaydedilirken hata:", error);
      alert("Hata: Alıntı kaydedilemedi.");
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Bu alıntıyı silmek istediğinizden emin misiniz?")) {
      try {
        await deleteDoc(doc(db, 'quotes', id));
        fetchQuotes();
      } catch (error) {
        console.error("Alıntı silinirken hata:", error);
        alert("Hata: Alıntı silinemedi.");
      }
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <BookText className="w-6 h-6 mr-2 text-indigo-600" />
            Alıntı Yönetimi
          </h2>
          <button 
            onClick={() => handleOpenModal(null)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center"
          >
            <Plus className="w-5 h-5 mr-2" />
            Yeni Alıntı Ekle
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="relative md:col-span-1">
            <input
              type="text"
              placeholder="Arama yap..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
          </div>
          <select 
            value={authorFilter} 
            onChange={e => setAuthorFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            {authors.map(author => <option key={author} value={author}>{author === 'all' ? 'Tüm Yazarlar' : author}</option>)}
          </select>
          <select 
            value={bookFilter} 
            onChange={e => setBookFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            {books.map(book => <option key={book} value={book}>{book === 'all' ? 'Tüm Kitaplar' : book}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/2">Alıntı</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Yazar</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kitap</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={4} className="text-center py-8">Yükleniyor...</td></tr>
              ) : (paginatedQuotes.map(quote => (
                <tr key={quote.id}>
                  <td className="px-6 py-4"><p className="text-sm text-gray-700 italic">"{quote.text}"</p></td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{quote.author}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{quote.book}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button onClick={() => handleOpenModal(quote)} className="text-indigo-600 hover:text-indigo-900"><Edit className="w-5 h-5" /></button>
                    <button onClick={() => handleDelete(quote.id)} className="text-red-600 hover:text-red-900"><Trash2 className="w-5 h-5" /></button>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-700">
              Toplam {filteredQuotes.length} alıntı | Sayfa <span className="font-medium">{currentPage}</span> / <span className="font-medium">{totalPages}</span>
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Önceki
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sonraki
            </button>
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

export default QuoteManagementTab;
