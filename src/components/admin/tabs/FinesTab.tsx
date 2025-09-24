import React, { useState, useEffect, useMemo } from 'react';
import { useBooks } from '../../../contexts/BookContext';
import { DollarSign, Search, CheckCircle, AlertTriangle, Users } from 'lucide-react';

const FinesTab: React.FC = () => {
  const { allBorrowedBooks, markFineAsPaid } = useBooks();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingPayment, setLoadingPayment] = useState<string | null>(null);
  const finesPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const booksWithFines = useMemo(() => {
    return allBorrowedBooks.filter(book => {
      const today = new Date();
      const dueDate = new Date(book.dueDate);
      const diffTime = today.getTime() - dueDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // Show books that have fines (overdue) or have paid fines
      return diffDays > 0 || book.fineStatus === 'paid';
    });
  }, [allBorrowedBooks]);

  const filteredFines = useMemo(() => {
    return booksWithFines.filter(book => {
      const matchesSearch = 
        (book.title?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (book.userData?.displayName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (book.userData?.studentNumber?.toLowerCase() || '').includes(searchQuery.toLowerCase());

      const matchesStatus = 
        statusFilter === 'all' || 
        (statusFilter === 'pending' && book.fineStatus !== 'paid') ||
        (statusFilter === 'paid' && book.fineStatus === 'paid');

      return matchesSearch && matchesStatus;
    });
  }, [booksWithFines, searchQuery, statusFilter]);

  const totalPages = Math.ceil(filteredFines.length / finesPerPage);
  const paginatedFines = useMemo(() => {
    const startIndex = (currentPage - 1) * finesPerPage;
    return filteredFines.slice(startIndex, startIndex + finesPerPage);
  }, [filteredFines, currentPage]);

  const calculateFine = (book: any) => {
    // If fine is already paid, return the fixed amount
    if (book.fineStatus === 'paid') {
      return book.fineAmount || 0;
    }
    
    // Calculate current fine for unpaid fines
    const today = new Date();
    const dueDate = new Date(book.dueDate);
    const diffTime = today.getTime() - dueDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays * 5 : 0;
  };

  const handleMarkAsPaid = async (bookId: string, userId: string, bookTitle: string) => {
    const confirmPayment = window.confirm(`${bookTitle} için ceza ödemesini aldığınızı onaylıyor musunuz?`);
    if (confirmPayment) {
      setLoadingPayment(`${userId}_${bookId}`);
      try {
        await markFineAsPaid(bookId, userId);
        alert('Ceza ödemesi başarıyla kaydedildi.');
      } catch (error) {
        console.error('Error marking fine as paid:', error);
        alert('Ceza ödemesi kaydedilirken bir hata oluştu.');
      } finally {
        setLoadingPayment(null);
      }
    }
  };

  const totalUnpaidFines = useMemo(() => {
    return filteredFines
      .filter(book => book.fineStatus !== 'paid')
      .reduce((sum, book) => sum + calculateFine(book), 0);
  }, [filteredFines]);

  const totalPaidFines = useMemo(() => {
    return filteredFines
      .filter(book => book.fineStatus === 'paid')
      .reduce((sum, book) => sum + (book.fineAmount || 0), 0);
  }, [filteredFines]);

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <DollarSign className="w-6 h-6 mr-2 text-indigo-600" />
            Kullanıcı Cezaları
          </h2>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
            <div className="relative">
              <input
                type="text"
                placeholder="Kitap adı, kullanıcı..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-full"
              />
              <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'pending' | 'paid')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="all">Tüm Cezalar</option>
              <option value="pending">Ödenmemiş</option>
              <option value="paid">Ödenmiş</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="p-6 border-b border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-red-50 rounded-lg p-4">
            <div className="flex items-center">
              <AlertTriangle className="w-8 h-8 text-red-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-red-600">Toplam Ödenmemiş Ceza</p>
                <p className="text-2xl font-bold text-red-900">{totalUnpaidFines} TL</p>
              </div>
            </div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-green-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-green-600">Toplam Ödenmiş Ceza</p>
                <p className="text-2xl font-bold text-green-900">{totalPaidFines} TL</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kullanıcı Bilgileri</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kitap</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teslim Tarihi</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ceza Tutarı</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedFines.length > 0 ? (
              paginatedFines.map((book) => {
                const fineAmount = calculateFine(book);
                const bookKey = `${book.borrowedBy}_${book.id}`;
                const today = new Date();
                const dueDate = new Date(book.dueDate);
                const diffTime = today.getTime() - dueDate.getTime();
                const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                return (
                  <tr key={bookKey}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Users className="w-4 h-4 mr-2 text-gray-400" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {book.userData?.displayName || 'İsimsiz Kullanıcı'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {book.userData?.studentClass} - {book.userData?.studentNumber}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{book.title}</div>
                      <div className="text-sm text-gray-500">Kod: {book.id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {dueDate.toLocaleDateString()}
                      {daysOverdue > 0 && book.fineStatus !== 'paid' && (
                        <div className="text-red-600 font-medium">
                          {daysOverdue} gün gecikmiş
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">{fineAmount} TL</div>
                      {book.fineStatus === 'paid' && book.paymentDate && (
                        <div className="text-xs text-gray-500">
                          Ödeme: {new Date(book.paymentDate).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {book.fineStatus === 'paid' ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Ödendi
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                          Ödenmedi
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {book.fineStatus !== 'paid' ? (
                        <button
                          onClick={() => handleMarkAsPaid(book.id, book.borrowedBy, book.title)}
                          disabled={loadingPayment === bookKey}
                          className="text-green-600 hover:text-green-900 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                        >
                          {loadingPayment === bookKey ? 'İşleniyor...' : 'Ödeme Alındı'}
                        </button>
                      ) : (
                        <div className="flex items-center text-green-600">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Ödeme Alındı
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  Aranan kriterlere uygun ceza bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="p-6 bg-white border-t border-gray-200 flex justify-between items-center">
          <p className="text-sm text-gray-600">
            Sayfa {currentPage} / {totalPages} ({filteredFines.length} sonuç)
          </p>
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
    </div>
  );
};

export default FinesTab;