import React, { useState, useEffect, useMemo } from 'react';
import { useBooks } from '../../../contexts/BookContext';
import { DollarSign, Search, Filter, SortAsc, SortDesc, Users } from 'lucide-react';

interface BorrowedBook {
  id: string;
  title: string;
  author: string;
  borrowedAt: Date;
  dueDate: Date;
  returnedAt?: Date;
  borrowedBy: string;
  returnStatus: 'borrowed' | 'returned' | 'pending';
  fineStatus?: 'pending' | 'paid';
  fineAmount?: number;
  paymentDate?: Date;
  userData?: {
    displayName: string;
    studentClass: string;
    studentNumber: string;
  };
}

const FinesTab: React.FC = () => {
  const { allBorrowedBooks, markFineAsPaid } = useBooks();
  const [finesSearchQuery, setFinesSearchQuery] = useState('');
  const [showFinesFilters, setShowFinesFilters] = useState(false);
  const [finesStatusFilter, setFinesStatusFilter] = useState<'all' | 'paid' | 'unpaid'>('unpaid');
  const [finesSortBy, setFinesSortBy] = useState<'dueDate' | 'amount'>('dueDate');
  const [finesSortOrder, setFinesSortOrder] = useState<'asc' | 'desc'>('desc');
  const [finesCurrentPage, setFinesCurrentPage] = useState(1);
  const [selectedFines, setSelectedFines] = useState<string[]>([]);
  const [isBulkPaying, setIsBulkPaying] = useState(false);
  const finesPerPage = 10;

  useEffect(() => {
    setFinesCurrentPage(1);
    setSelectedFines([]);
  }, [finesSearchQuery, finesStatusFilter, finesSortBy, finesSortOrder]);

  const handlePaymentReceived = async (bookId: string, userId: string) => {
    if (window.confirm("Bu cezanın ödendiğini onaylamak istediğinizden emin misiniz?")) {
      try {
        await markFineAsPaid(bookId, userId);
      } catch (error) {
        console.error('Error processing payment:', error);
        alert("Ödeme işlenirken bir hata oluştu.");
      }
    }
  };

  const overdueBooks = useMemo(() => (allBorrowedBooks || []).filter(book => {
    const daysOverdue = Math.ceil(
      (new Date().getTime() - new Date(book.dueDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysOverdue > 0;
  }), [allBorrowedBooks]);

  const calculateFine = (book: BorrowedBook): number => {
    if (book.fineStatus === 'paid') {
      return book.fineAmount || 0;
    }
    const today = new Date();
    const diffTime = today.getTime() - new Date(book.dueDate).getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays * 5 : 0;
  };

  const filteredOverdueBooks = useMemo(() => overdueBooks
    .filter(book => {
      const matchesSearch = 
        (book.title?.toLowerCase() || '').includes(finesSearchQuery.toLowerCase()) ||
        (book.userData?.displayName?.toLowerCase() || '').includes(finesSearchQuery.toLowerCase()) ||
        (book.userData?.studentNumber?.toLowerCase() || '').includes(finesSearchQuery.toLowerCase());

      const matchesStatus = 
        finesStatusFilter === 'all' ||
        (finesStatusFilter === 'paid' && book.fineStatus === 'paid') ||
        (finesStatusFilter === 'unpaid' && book.fineStatus !== 'paid');

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (finesSortBy === 'amount') {
        const fineA = calculateFine(a);
        const fineB = calculateFine(b);
        return finesSortOrder === 'asc' ? fineA - fineB : fineB - fineA;
      } else {
        return finesSortOrder === 'asc' 
          ? new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
          : new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
      }
    }), [overdueBooks, finesSearchQuery, finesStatusFilter, finesSortBy, finesSortOrder]);

  const finesTotalPages = Math.ceil(filteredOverdueBooks.length / finesPerPage);
  const paginatedFines = useMemo(() => filteredOverdueBooks.slice(
    (finesCurrentPage - 1) * finesPerPage,
    finesCurrentPage * finesPerPage
  ), [filteredOverdueBooks, finesCurrentPage]);

  const currentUnpaidFines = useMemo(() => 
    paginatedFines.filter(f => f.fineStatus !== 'paid').map(f => `${f.id}-${f.borrowedBy}`)
  , [paginatedFines]);

  const handleSelectFine = (fineKey: string) => {
    setSelectedFines(prev => 
      prev.includes(fineKey) ? prev.filter(k => k !== fineKey) : [...prev, fineKey]
    );
  };

  const handleSelectAll = () => {
    if (selectedFines.length === currentUnpaidFines.length) {
      setSelectedFines([]);
    } else {
      setSelectedFines(currentUnpaidFines);
    }
  };

  const handleBulkPaymentReceived = async () => {
    if (selectedFines.length === 0) return;

    if (window.confirm(`${selectedFines.length} adet cezayı ödenmiş olarak işaretlemek istediğinizden emin misiniz?`)) {
      setIsBulkPaying(true);
      try {
        const promises = selectedFines.map(key => {
          const [bookId, userId] = key.split('-');
          return markFineAsPaid(bookId, userId);
        });
        await Promise.all(promises);
        alert(`${selectedFines.length} ceza başarıyla ödendi olarak işaretlendi.`);
        setSelectedFines([]);
      } catch (error) {
        console.error("Error bulk paying fines:", error);
        alert("Toplu ödeme sırasında bir hata oluştu.");
      } finally {
        setIsBulkPaying(false);
      }
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center">
          <DollarSign className="w-6 h-6 mr-2 text-indigo-600" />
          Kullanıcı Cezaları
        </h2>
      </div>

      <div className="p-6">
        <div className="mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Kullanıcı adı, öğrenci no veya kitap adı..."
                  value={finesSearchQuery}
                  onChange={(e) => setFinesSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
              </div>
            </div>
            <button
              onClick={() => setShowFinesFilters(!showFinesFilters)}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center justify-center"
            >
              <Filter className="w-5 h-5 mr-2" />
              Filtrele
            </button>
          </div>

          {showFinesFilters && (
            <div className="mt-4 bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ödeme Durumu</label>
                  <select
                    value={finesStatusFilter}
                    onChange={(e) => setFinesStatusFilter(e.target.value as 'all' | 'paid' | 'unpaid')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="all">Tümü</option>
                    <option value="paid">Ödenmiş</option>
                    <option value="unpaid">Ödenmemiş</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sıralama</label>
                  <select
                    value={finesSortBy}
                    onChange={(e) => setFinesSortBy(e.target.value as 'dueDate' | 'amount')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="dueDate">İade Tarihine Göre</option>
                    <option value="amount">Ceza Tutarına Göre</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sıralama Yönü</label>
                  <button
                    onClick={() => setFinesSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center"
                  >
                    {finesSortOrder === 'asc' ? (
                      <><SortAsc className="w-5 h-5 mr-2" /> Artan</>
                    ) : (
                      <><SortDesc className="w-5 h-5 mr-2" /> Azalan</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {selectedFines.length > 0 && (
          <div className="p-4 bg-indigo-50 border-t border-b border-indigo-200 flex items-center justify-between mb-6">
            <span className="text-sm font-medium text-indigo-700">
              {selectedFines.length} ceza seçildi.
            </span>
            <button
              onClick={handleBulkPaymentReceived}
              disabled={isBulkPaying}
              className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors"
            >
              {isBulkPaying ? 'İşleniyor...' : 'Seçili Olanları Öde'}
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  {currentUnpaidFines.length > 0 && (
                    <input 
                      type="checkbox"
                      className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      checked={selectedFines.length === currentUnpaidFines.length && currentUnpaidFines.length > 0}
                      onChange={handleSelectAll}
                    />
                  )}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kullanıcı Bilgileri</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kitap Kodu</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kitap Adı</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ödünç Tarihi</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İade Tarihi</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gecikme</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ceza Tutarı</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedFines.map((book) => {
                const fineKey = `${book.id}-${book.borrowedBy}`;
                const daysOverdue = Math.ceil(
                  (new Date().getTime() - new Date(book.dueDate).getTime()) / (1000 * 60 * 60 * 24)
                );
                const fine = calculateFine(book);

                return (
                  <tr key={fineKey} className={selectedFines.includes(fineKey) ? 'bg-indigo-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {book.fineStatus !== 'paid' && (
                        <input 
                          type="checkbox"
                          className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                          checked={selectedFines.includes(fineKey)}
                          onChange={() => handleSelectFine(fineKey)}
                        />
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <Users className="w-4 h-4 mr-2 text-gray-400" />
                        <div>
                          <div className="font-medium text-gray-900">{book.userData?.displayName || 'İsimsiz Kullanıcı'}</div>
                          <div className="text-gray-500">{book.userData?.studentClass} - {book.userData?.studentNumber}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{book.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{book.title}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(book.borrowedAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(book.dueDate).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">{daysOverdue} gün</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-red-600">{fine} TL</span>
                        {book.fineStatus === 'paid' ? (
                          <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Ödeme Alındı</span>
                        ) : (
                          <button
                            onClick={() => handlePaymentReceived(book.id, book.borrowedBy)}
                            disabled={selectedFines.length > 0}
                            className="px-3 py-1 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-full hover:bg-indigo-200 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                          >
                            Ödeme Al
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {finesTotalPages > 1 && (
          <div className="p-6 bg-white border-t border-gray-200 flex justify-between items-center">
            <p className="text-sm text-gray-600">Sayfa {finesCurrentPage} / {finesTotalPages} ({filteredOverdueBooks.length} sonuç)</p>
            <div className="flex space-x-2">
              <button
                onClick={() => setFinesCurrentPage(p => Math.max(p - 1, 1))}
                disabled={finesCurrentPage === 1}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Önceki
              </button>
              <button
                onClick={() => setFinesCurrentPage(p => Math.min(p + 1, finesTotalPages))}
                disabled={finesCurrentPage === finesTotalPages}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Sonraki
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FinesTab;
