import React, { useState, useEffect, useMemo } from 'react';
import { useBooks } from '../../../contexts/BookContext';
import { Library, Search, ChevronUp, Users, CheckCircle } from 'lucide-react';
import UserDetailsModal from '../UserDetailsModal';

const BorrowedBooksTab: React.FC = () => {
  const { allBorrowedBooks, adminReturnBook, adminBatchReturnBooks } = useBooks();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'borrowed' | 'returned'>('all');
  const [sortBy, setSortBy] = useState<'dueDate' | 'borrowedAt'>('dueDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingReturn, setLoadingReturn] = useState<string | null>(null);
  const [selectedBooks, setSelectedBooks] = useState<string[]>([]);
  const [isBatchReturning, setIsBatchReturning] = useState(false);
  const [isUserDetailsModalOpen, setIsUserDetailsModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const booksPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
    setSelectedBooks([]);
  }, [searchQuery, statusFilter, sortBy, sortOrder]);

  const handleReturnBook = async (bookId: string, userId: string, bookTitle: string) => {
    const confirmReturn = window.confirm(`'${bookTitle}' adlı kitabı iade olarak işaretlemek istediğinizden emin misiniz?`);
    if (confirmReturn) {
      setLoadingReturn(`${userId}_${bookId}`);
      try {
        await adminReturnBook(bookId, userId);
      } catch (error) {
        console.error("Failed to return book:", error);
        alert("Kitap iade edilirken bir hata oluştu.");
      } finally {
        setLoadingReturn(null);
      }
    }
  };

  const handleUserClick = (userId: string) => {
    setSelectedUserId(userId);
    setIsUserDetailsModalOpen(true);
  };

  const filteredBooks = useMemo(() => (allBorrowedBooks || [])
    .filter(book => {
      const matchesSearch = (book.title?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (book.id?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (book.userData?.displayName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (book.userData?.studentNumber?.toLowerCase() || '').includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || book.returnStatus === statusFilter;

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const dateA = sortBy === 'dueDate' ? new Date(a.dueDate).getTime() : new Date(a.borrowedAt).getTime();
      const dateB = sortBy === 'dueDate' ? new Date(b.dueDate).getTime() : new Date(b.borrowedAt).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    }), [allBorrowedBooks, searchQuery, statusFilter, sortBy, sortOrder]);

  const totalPages = Math.ceil(filteredBooks.length / booksPerPage);
  const paginatedBooks = useMemo(() => filteredBooks.slice(
    (currentPage - 1) * booksPerPage,
    currentPage * booksPerPage
  ), [filteredBooks, currentPage, booksPerPage]);

  const handleSelectBook = (bookKey: string) => {
    setSelectedBooks(prev => 
      prev.includes(bookKey) ? prev.filter(k => k !== bookKey) : [...prev, bookKey]
    );
  };

  const currentReturnableBooks = useMemo(() => 
    paginatedBooks.filter(b => b.returnStatus !== 'returned').map(b => `${b.borrowedBy}_${b.id}`)
  , [paginatedBooks]);

  const handleSelectAll = () => {
    if (selectedBooks.length === currentReturnableBooks.length) {
      setSelectedBooks([]);
    } else {
      setSelectedBooks(currentReturnableBooks);
    }
  };

  const handleBatchReturn = async () => {
    if (selectedBooks.length === 0) return;

    const confirm = window.confirm(`${selectedBooks.length} adet kitabı iade olarak işaretlemek istediğinizden emin misiniz?`);
    if (confirm) {
      setIsBatchReturning(true);
      try {
        const booksToReturn = selectedBooks.map(key => {
          const [userId, bookId] = key.split('_');
          return { userId, bookId };
        });
        await adminBatchReturnBooks(booksToReturn);
        setSelectedBooks([]);
      } catch (error) {
        console.error("Failed to batch return books:", error);
        alert("Kitaplar toplu iade edilirken bir hata oluştu.");
      } finally {
        setIsBatchReturning(false);
      }
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Library className="w-6 h-6 mr-2 text-indigo-600" />
            Ödünç Verilen Kitaplar
          </h2>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
            <div className="relative">
              <input
                type="text"
                placeholder="Kitap adı, kodu veya öğrenci..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-full"
              />
              <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'borrowed' | 'returned')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="all">Tüm Durumlar</option>
              <option value="borrowed">Ödünç Verilmiş</option>
              <option value="returned">İade Edilmiş</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'dueDate' | 'borrowedAt')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="dueDate">İade Tarihine Göre</option>
              <option value="borrowedAt">Ödünç Alma Tarihine Göre</option>
            </select>
            <button
              onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center"
            >
              {sortOrder === 'asc' ? 'Artan' : 'Azalan'}
              <ChevronUp className={`w-4 h-4 ml-2 transform transition-transform ${
                sortOrder === 'desc' ? 'rotate-180' : ''
              }`} />
            </button>
          </div>
        </div>
        {selectedBooks.length > 0 && (
          <div className="p-4 bg-indigo-50 border-t border-b border-indigo-200 flex items-center justify-between">
            <span className="text-sm font-medium text-indigo-700">
              {selectedBooks.length} kitap seçildi.
            </span>
            <button
              onClick={handleBatchReturn}
              disabled={isBatchReturning}
              className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors"
            >
              {isBatchReturning ? 'İşleniyor...' : 'Seçilenleri İade Et'}
            </button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">
                <input 
                  type="checkbox"
                  className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  checked={currentReturnableBooks.length > 0 && selectedBooks.length === currentReturnableBooks.length}
                  onChange={handleSelectAll}
                  disabled={currentReturnableBooks.length === 0}
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kitap Kodu</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kitap Adı</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kullanıcı Bilgileri</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ödünç Tarihi</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İade Tarihi</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedBooks.map((book) => {
              const bookKey = `${book.borrowedBy}_${book.id}`;
              let statusElement;

              if (book.returnStatus === 'returned') {
                if (book.returnedAt) {
                  const returnedAt = new Date(book.returnedAt);
                  const dueDate = new Date(book.dueDate);
                  if (returnedAt <= dueDate) {
                    statusElement = (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Zamanında İade Edildi
                      </span>
                    );
                  } else {
                    statusElement = (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        Geç İade Edildi
                      </span>
                    );
                  }
                } else {
                  statusElement = (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      İade Edildi
                    </span>
                  );
                }
              } else {
                const daysRemaining = Math.ceil(
                  (new Date(book.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                );
                const isOverdue = daysRemaining < 0;

                if (isOverdue) {
                  statusElement = (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      {`${Math.abs(daysRemaining)} gün gecikmiş`}
                    </span>
                  );
                } else if (daysRemaining <= 3) {
                  statusElement = (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      {`${daysRemaining} gün kaldı`}
                    </span>
                  );
                } else {
                  statusElement = (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {`${daysRemaining} gün kaldı`}
                    </span>
                  );
                }
              }

              return (
                <tr key={bookKey} className={selectedBooks.includes(bookKey) ? 'bg-indigo-50' : ''}>
                   <td className="px-6 py-4 whitespace-nowrap">
                    {book.returnStatus !== 'returned' && (
                      <input 
                        type="checkbox"
                        className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        checked={selectedBooks.includes(bookKey)}
                        onChange={() => handleSelectBook(bookKey)}
                      />
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{book.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{book.title}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <Users className="w-4 h-4 mr-2 text-gray-400" />
                      <div>
                        <div 
                          className="font-medium text-gray-900 cursor-pointer hover:text-indigo-600"
                          onClick={() => handleUserClick(book.borrowedBy)}
                        >
                          {book.userData?.displayName || 'İsimsiz Kullanıcı'}
                        </div>
                        <div className="text-gray-500">{book.userData?.studentClass} - {book.userData?.studentNumber}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(book.borrowedAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(book.dueDate).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {statusElement}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {book.returnStatus !== 'returned' ? (
                      <button
                        onClick={() => handleReturnBook(book.id, book.borrowedBy, book.title)}
                        disabled={loadingReturn === bookKey || selectedBooks.length > 0}
                        className="text-indigo-600 hover:text-indigo-900 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                      >
                        {loadingReturn === bookKey ? 'İşleniyor...' : 'İade Al'}
                      </button>
                    ) : (
                      <div className="flex items-center text-green-600">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        İade Edildi
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="p-6 bg-white border-t border-gray-200 flex justify-between items-center">
          <p className="text-sm text-gray-600">Sayfa {currentPage} / {totalPages} ({filteredBooks.length} sonuç)</p>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Önceki
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Sonraki
            </button>
          </div>
        </div>
      )}
       <UserDetailsModal
        isOpen={isUserDetailsModalOpen}
        onClose={() => setIsUserDetailsModalOpen(false)}
        userId={selectedUserId}
      />
    </div>
  );
};

export default BorrowedBooksTab;
