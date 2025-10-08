import React, { useState, useEffect, useMemo } from 'react';
import { useBooks } from '../../../contexts/BookContext';
import { useSettings } from '../../../contexts/SettingsContext';
import { useBudget } from '../../../contexts/BudgetContext';
import SetFineModal from '../SetFineModal';
import { DollarSign, Search, Filter, SortAsc, SortDesc, Users, Settings } from 'lucide-react';
import Swal from 'sweetalert2';

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
  fineAmountSnapshot?: number;
  fineRateSnapshot?: number;
  daysOverdueSnapshot?: number;
}

const FinesTab: React.FC = () => {
  const { allBorrowedBooks, markFineAsPaid } = useBooks();
  const { finePerDay, setFinePerDay, loading: settingsLoading } = useSettings();
  const { addTransaction } = useBudget();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [finesSearchQuery, setFinesSearchQuery] = useState('');
  const [showFinesFilters, setShowFinesFilters] = useState(false);
  const [finesStatusFilter, setFinesStatusFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [finesSortBy, setFinesSortBy] = useState<'dueDate' | 'amount'>('dueDate');
  const [finesSortOrder, setFinesSortOrder] = useState<'asc' | 'desc'>('desc');
  const [finesCurrentPage, setFinesCurrentPage] = useState(1);
  const [selectedFines, setSelectedFines] = useState<string[]>([]);
  const [isBulkPaying, setIsBulkPaying] = useState(false);
  const [chartView, setChartView] = useState<'monthly' | 'class'>('monthly');
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const finesPerPage = 10;

  useEffect(() => {
    setFinesCurrentPage(1);
    setSelectedFines([]);
  }, [finesSearchQuery, finesStatusFilter, finesSortBy, finesSortOrder]);

  const handlePaymentReceived = async (bookId: string, userId: string) => {
    Swal.fire({
      title: 'Emin misiniz?',
      text: "Bu cezanın ödendiğini onaylamak istediğinizden emin misiniz?",
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Evet, onayla!',
      cancelButtonText: 'Vazgeç'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const paidAmount = await markFineAsPaid(bookId, userId, finePerDay);
          if (paidAmount) {
            const book = allBorrowedBooks.find(b => b.id === bookId && b.borrowedBy === userId);
            addTransaction({
              date: new Date(),
              description: `${book?.userData?.displayName} isimli kullanıdan ödeme alındı`,
              amount: paidAmount,
              type: 'income',
              category: 'Ödeme',
              relatedFineId: `${bookId}-${userId}`
            });
          }
          Swal.fire('Başarılı!', 'Ödeme başarıyla işlendi.', 'success');
        } catch (error) {
          console.error('Error processing payment:', error);
          Swal.fire('Hata!', "Ödeme işlenirken bir hata oluştu.", 'error');
        }
      }
    });
  };

  const calculateFine = useMemo(() => {
    return (book: BorrowedBook): number => {
      if (book.fineStatus === 'paid') {
        return book.fineAmountSnapshot || 0;
      }
      const today = new Date();
      const diffTime = today.getTime() - new Date(book.dueDate).getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? diffDays * finePerDay : 0;
    };
  }, [finePerDay]);

  const overdueBooks = useMemo(() => {
    const books = (allBorrowedBooks || []).filter(book => {
      if (book.fineStatus === 'paid') return true;
      const daysOverdue = Math.ceil(
        (new Date().getTime() - new Date(book.dueDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysOverdue > 0;
    });
    setLoading(false);
    return books;
  }, [allBorrowedBooks]);

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
    }), [overdueBooks, finesSearchQuery, finesStatusFilter, finesSortBy, finesSortOrder, calculateFine]);

  const finesTotalPages = Math.ceil(filteredOverdueBooks.length / finesPerPage);
  const paginatedFines = useMemo(() => filteredOverdueBooks.slice(
    (finesCurrentPage - 1) * finesPerPage,
    finesCurrentPage * finesPerPage
  ), [filteredOverdueBooks, finesCurrentPage]);

  const currentUnpaidFines = useMemo(() => 
    paginatedFines.filter(f => f.fineStatus !== 'paid').map(f => `${f.id}-${f.borrowedBy}`)
  , [paginatedFines]);

  const fineStats = useMemo(() => {
    const totalFines = filteredOverdueBooks.reduce((sum, book) => sum + calculateFine(book), 0);
    const unpaidFines = filteredOverdueBooks.filter(b => b.fineStatus !== 'paid').length;
    const paidToday = filteredOverdueBooks.filter(b => {
      if (!b.paymentDate) return false;
      const today = new Date();
      const payDate = new Date(b.paymentDate);
      return payDate.toDateString() === today.toDateString();
    }).length;
    const avgDelay = filteredOverdueBooks.length > 0
      ? Math.round(filteredOverdueBooks.reduce((sum, book) => {
          const days = Math.ceil((new Date().getTime() - new Date(book.dueDate).getTime()) / (1000 * 60 * 60 * 24));
          return sum + Math.max(0, days);
        }, 0) / filteredOverdueBooks.length)
      : 0;
    return { totalFines, unpaidFines, paidToday, avgDelay };
  }, [filteredOverdueBooks, calculateFine]);

  const monthlyData = useMemo(() => {
    const last6Months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('tr-TR', { month: 'short' });
      const finesInMonth = overdueBooks.filter(book => {
        const dueDate = new Date(book.dueDate);
        return dueDate.getMonth() === date.getMonth() && dueDate.getFullYear() === date.getFullYear();
      }).length;
      last6Months.push({ month: monthName, count: finesInMonth });
    }
    return last6Months;
  }, [overdueBooks]);

  const maxCount = Math.max(...monthlyData.map(d => d.count), 1);

  const classFineData = useMemo(() => {
    const classMap = new Map<string, { count: number; totalAmount: number; paidAmount: number }>();
    overdueBooks.forEach(book => {
      const className = book.userData?.studentClass || 'Bilinmiyor';
      const fine = calculateFine(book);
      const current = classMap.get(className) || { count: 0, totalAmount: 0, paidAmount: 0 };
      classMap.set(className, {
        count: current.count + 1,
        totalAmount: current.totalAmount + fine,
        paidAmount: current.paidAmount + (book.fineStatus === 'paid' ? fine : 0)
      });
    });
    return Array.from(classMap.entries())
      .map(([className, data]) => ({ className, ...data }))
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 8);
  }, [overdueBooks, calculateFine]);

  const classColors = ['bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-orange-500', 'bg-teal-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-rose-500'];
  const maxClassAmount = Math.max(...classFineData.map(d => d.totalAmount), 1);

  const classMonthlyData = useMemo(() => {
    if (!selectedClass) return [];
    const last6Months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('tr-TR', { month: 'short' });
      const booksInMonth = overdueBooks.filter(book => {
        if (book.userData?.studentClass !== selectedClass) return false;
        const dueDate = new Date(book.dueDate);
        return dueDate.getMonth() === date.getMonth() && dueDate.getFullYear() === date.getFullYear();
      });
      const totalAmount = booksInMonth.reduce((sum, book) => sum + calculateFine(book), 0);
      const paidAmount = booksInMonth
        .filter(book => book.fineStatus === 'paid')
        .reduce((sum, book) => sum + calculateFine(book), 0);
      last6Months.push({ month: monthName, totalAmount, paidAmount, unpaidAmount: totalAmount - paidAmount });
    }
    return last6Months;
  }, [selectedClass, overdueBooks, calculateFine]);

  const maxMonthlyAmount = Math.max(...classMonthlyData.map(d => d.totalAmount), 1);

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

    Swal.fire({
      title: 'Emin misiniz?',
      text: `${selectedFines.length} adet cezayı ödenmiş olarak işaretlemek istediğinizden emin misiniz?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Evet, onayla!',
      cancelButtonText: 'Vazgeç'
    }).then(async (result) => {
      if (result.isConfirmed) {
        setIsBulkPaying(true);
        try {
          const promises = selectedFines.map(async (key) => {
            const [bookId, userId] = key.split('-');
            const paidAmount = await markFineAsPaid(bookId, userId, finePerDay);
            if (paidAmount) {
              const book = allBorrowedBooks.find(b => b.id === bookId && b.borrowedBy === userId);
              await addTransaction({
                date: new Date(),
                description: `${book?.userData?.displayName} isimli kullanıdan ödeme alındı`,
                amount: paidAmount,
                type: 'income',
                category: 'Ödeme',
                relatedFineId: key
              });
            }
          });
          await Promise.all(promises);
          Swal.fire('Başarılı!', `${selectedFines.length} ceza başarıyla ödendi olarak işaretlendi.`, 'success');
          setSelectedFines([]);
        } catch (error) {
          console.error("Error bulk paying fines:", error);
          Swal.fire('Hata!', "Toplu ödeme sırasında bir hata oluştu.", 'error');
        } finally {
          setIsBulkPaying(false);
        }
      }
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded w-40 animate-pulse"></div>
        </div>
        <div className="p-6">
          <div className="mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 h-10 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3"><div className="h-4 bg-gray-200 rounded w-4 animate-pulse"></div></th>
                  <th className="px-6 py-3"><div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div></th>
                  <th className="px-6 py-3"><div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div></th>
                  <th className="px-6 py-3"><div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div></th>
                  <th className="px-6 py-3"><div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div></th>
                  <th className="px-6 py-3"><div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div></th>
                  <th className="px-6 py-3"><div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div></th>
                  <th className="px-6 py-3"><div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {[...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-4 animate-pulse"></div></td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
                        <div className="space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
                          <div className="h-3 bg-gray-200 rounded w-24 animate-pulse"></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-40 animate-pulse"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div></td>
                    <td className="px-6 py-4"><div className="h-6 bg-gray-200 rounded-full w-16 animate-pulse"></div></td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <div className="h-4 bg-gray-200 rounded w-12 animate-pulse"></div>
                        <div className="h-6 bg-gray-200 rounded-full w-20 animate-pulse"></div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <SetFineModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentRate={finePerDay}
        onSave={setFinePerDay}
      />
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Toplam Ceza</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{fineStats.totalFines} TL</p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <DollarSign className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Ödenmemiş Ceza</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{fineStats.unpaidFines}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Bugün Ödenen</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{fineStats.paidToday}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Ort. Gecikme</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{fineStats.avgDelay} gün</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Ceza Dağılımı</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setChartView('monthly')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                chartView === 'monthly'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Aylık Trend
            </button>
            <button
              onClick={() => setChartView('class')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                chartView === 'class'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Sınıf Bazında
            </button>
          </div>
        </div>
        {selectedClass && chartView === 'class' && (
          <div className="mb-4 flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Seçili Sınıf: {selectedClass}</span>
            <button
              onClick={() => setSelectedClass(null)}
              className="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded transition-colors"
            >
              Temizle
            </button>
          </div>
        )}
        <div className="flex items-end justify-between h-48 gap-4">
          {chartView === 'monthly' ? (
            monthlyData.map((data, index) => (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div className="w-full flex flex-col items-center justify-end" style={{ height: '160px' }}>
                  <div className="text-xs font-medium text-gray-600 mb-1">{data.count}</div>
                  <div 
                    className="w-full bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t transition-all duration-500 hover:from-indigo-700 hover:to-indigo-500"
                    style={{ height: `${(data.count / maxCount) * 100}%`, minHeight: data.count > 0 ? '8px' : '0' }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 mt-2 font-medium">{data.month}</div>
              </div>
            ))
          ) : selectedClass ? (
            classMonthlyData.map((data, index) => (
              <div key={index} className="flex-1 flex flex-col items-center group">
                <div className="w-full flex flex-col items-center justify-end relative" style={{ height: '160px' }}>
                  <div className="text-xs font-medium text-gray-600 mb-1">{data.totalAmount} TL</div>
                  <div className="w-full flex flex-col justify-end" style={{ height: `${(data.totalAmount / maxMonthlyAmount) * 100}%`, minHeight: data.totalAmount > 0 ? '16px' : '0' }}>
                    <div 
                      className="w-full bg-green-500 hover:bg-green-600 transition-all duration-300 relative"
                      style={{ height: `${data.totalAmount > 0 ? (data.paidAmount / data.totalAmount) * 100 : 0}%`, minHeight: data.paidAmount > 0 ? '4px' : '0' }}
                      title={`Ödenen: ${data.paidAmount} TL`}
                    ></div>
                    <div 
                      className="w-full bg-red-500 hover:bg-red-600 transition-all duration-300 rounded-t"
                      style={{ height: `${data.totalAmount > 0 ? (data.unpaidAmount / data.totalAmount) * 100 : 0}%`, minHeight: data.unpaidAmount > 0 ? '4px' : '0' }}
                      title={`Ödenmemiş: ${data.unpaidAmount} TL`}
                    ></div>
                  </div>
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    Ödenen: {data.paidAmount} TL<br/>Ödenmemiş: {data.unpaidAmount} TL
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-2 font-medium">{data.month}</div>
              </div>
            ))
          ) : (
            classFineData.map((data, index) => (
              <div 
                key={index} 
                className="flex-1 flex flex-col items-center cursor-pointer group"
                onClick={() => setSelectedClass(data.className)}
              >
                <div className="w-full flex flex-col items-center justify-end relative" style={{ height: '160px' }}>
                  <div className="text-xs font-medium text-gray-600 mb-1">{data.count} / {data.totalAmount}TL</div>
                  <div className="w-full flex flex-col justify-end" style={{ height: `${(data.totalAmount / maxClassAmount) * 100}%`, minHeight: data.totalAmount > 0 ? '16px' : '0' }}>
                    <div 
                      className="w-full bg-green-500 group-hover:bg-green-600 transition-all duration-300"
                      style={{ height: `${data.totalAmount > 0 ? (data.paidAmount / data.totalAmount) * 100 : 0}%`, minHeight: data.paidAmount > 0 ? '4px' : '0' }}
                    ></div>
                    <div 
                      className={`w-full ${classColors[index % classColors.length]} group-hover:opacity-80 transition-all duration-300 rounded-t`}
                      style={{ height: `${data.totalAmount > 0 ? ((data.totalAmount - data.paidAmount) / data.totalAmount) * 100 : 0}%`, minHeight: (data.totalAmount - data.paidAmount) > 0 ? '4px' : '0' }}
                    ></div>
                  </div>
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    Ödenen: {data.paidAmount} TL<br/>Ödenmemiş: {data.totalAmount - data.paidAmount} TL
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-2 font-medium truncate w-full text-center" title={data.className}>{data.className}</div>
              </div>
            ))
          )}
        </div>
        {chartView === 'class' && !selectedClass && (
          <div className="mt-4 flex items-center justify-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span className="text-gray-600">Ödenen</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span className="text-gray-600">Ödenmemiş</span>
            </div>
            <span className="text-gray-500 italic">Sınıfa tıklayarak aylık detayı görün</span>
          </div>
        )}
        {chartView === 'class' && selectedClass && (
          <div className="mt-4 flex items-center justify-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span className="text-gray-600">Ödenen</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span className="text-gray-600">Ödenmemiş</span>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <DollarSign className="w-6 h-6 mr-2 text-indigo-600" />
            Kullanıcı Cezaları
          </h2>
          <button
            onClick={() => setIsModalOpen(true)}
            disabled={settingsLoading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center text-sm font-medium disabled:bg-indigo-400 disabled:cursor-not-allowed"
          >
            <Settings className="w-5 h-5 mr-2" />
            Ceza Tutarını Ayarla
          </button>
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
              <div className="flex gap-2">
                <button onClick={() => setViewMode('table')} className={`px-4 py-2 rounded-lg transition-colors ${viewMode === 'table' ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                </button>
                <button onClick={() => setViewMode('card')} className={`px-4 py-2 rounded-lg transition-colors ${viewMode === 'card' ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                </button>
                <button onClick={() => setShowFinesFilters(!showFinesFilters)} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center justify-center">
                  <Filter className="w-5 h-5 mr-2" />Filtrele
                </button>
              </div>
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

          {viewMode === 'table' ? (
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" colSpan={2}>Kitap Bilgileri</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ödünç Tarihi</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İade Tarihi</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gecikme</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ceza Tutarı</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedFines.map((book) => {
                  const fineKey = `${book.id}-${book.borrowedBy}`;
                  const isFinalized = book.fineRateSnapshot !== undefined;
                  const daysOverdue = isFinalized
                    ? book.daysOverdueSnapshot
                    : Math.max(0, Math.ceil((new Date().getTime() - new Date(book.dueDate).getTime()) / (1000 * 60 * 60 * 24)));
                  const fine = calculateFine(book);

                  return (
                    <tr key={fineKey} className={`transition-colors ${
                    selectedFines.includes(fineKey) ? 'bg-indigo-50' :
                    daysOverdue > 30 ? 'bg-red-50 hover:bg-red-100' :
                    daysOverdue > 14 ? 'bg-orange-50 hover:bg-orange-100' :
                    'hover:bg-gray-50'
                  }`}>
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
                        <div className="flex items-center gap-3">
                          {book.userData?.photoURL ? (
                            <img 
                              src={book.userData.photoURL} 
                              alt={book.userData.displayName}
                              className="w-10 h-10 rounded-full object-cover"
                              onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/40'; }}
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <Users className="w-5 h-5 text-gray-400" />
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-gray-900">{book.userData?.displayName || 'İsimsiz Kullanıcı'}</div>
                            <div className="text-gray-500 text-xs">{book.userData?.studentClass} - {book.userData?.studentNumber}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img 
                            src={book.coverImage || 'https://via.placeholder.com/40x56'} 
                            alt={book.title}
                            className="w-10 h-14 object-cover rounded shadow-sm"
                            onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/40x56'; }}
                          />
                          <div className="min-w-0">
                            <div className="font-medium text-gray-900 truncate">{book.title}</div>
                            <div className="text-xs text-gray-500">Kod: {book.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {new Date(book.borrowedAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {new Date(book.dueDate).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          daysOverdue > 30 ? 'bg-red-100 text-red-800' :
                          daysOverdue > 14 ? 'bg-orange-100 text-orange-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {daysOverdue > 30 ? 'Yüksek' : daysOverdue > 14 ? 'Orta' : 'Düşük'} - {daysOverdue} gün
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col space-y-1">
                          <span className="text-sm font-medium text-red-600">{fine} TL</span>
                          {book.fineStatus === 'paid' ? (
                            <div className="flex flex-col gap-1">
                              <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full inline-flex items-center gap-1">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                Ödendi
                              </span>
                              {book.paymentDate && (
                                <span className="text-xs text-gray-500">
                                  {new Date(book.paymentDate).toLocaleDateString()}
                                </span>
                              )}
                              {book.fineAmountSnapshot && (
                                <span className="text-xs text-gray-500" title={`Ödeme Tutarı: ${book.fineAmountSnapshot} TL`}>
                                  Makbuz: #{book.id.slice(-6)}
                                </span>
                              )}
                            </div>
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
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedFines.map((book) => {
                const fineKey = `${book.id}-${book.borrowedBy}`;
                const daysOverdue = book.fineRateSnapshot !== undefined ? book.daysOverdueSnapshot : Math.max(0, Math.ceil((new Date().getTime() - new Date(book.dueDate).getTime()) / (1000 * 60 * 60 * 24)));
                const fine = calculateFine(book);
                return (
                  <div key={fineKey} className={`bg-white rounded-lg shadow-md overflow-hidden transition-all hover:shadow-lg ${daysOverdue > 30 ? 'border-l-4 border-red-500' : daysOverdue > 14 ? 'border-l-4 border-orange-500' : 'border-l-4 border-yellow-500'}`}>
                    <div className="p-4">
                      {book.fineStatus !== 'paid' && <div className="flex justify-end mb-2"><input type="checkbox" className="h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" checked={selectedFines.includes(fineKey)} onChange={() => handleSelectFine(fineKey)} /></div>}
                      <div className="flex items-start gap-4 mb-4">
                        <img src={book.coverImage || 'https://via.placeholder.com/60x84'} alt={book.title} className="w-15 h-20 object-cover rounded shadow" onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/60x84'; }} />
                        <div className="flex-1 min-w-0"><h3 className="font-bold text-gray-900 mb-1 line-clamp-2">{book.title}</h3><p className="text-xs text-gray-500">Kod: {book.id}</p></div>
                      </div>
                      <div className="flex items-center gap-3 mb-3 pb-3 border-b">
                        {book.userData?.photoURL ? <img src={book.userData.photoURL} alt={book.userData.displayName} className="w-10 h-10 rounded-full object-cover" onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/40'; }} /> : <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center"><Users className="w-5 h-5 text-gray-400" /></div>}
                        <div className="flex-1 min-w-0"><p className="font-medium text-gray-900 text-sm truncate">{book.userData?.displayName || 'İsimsiz Kullanıcı'}</p><p className="text-xs text-gray-500">{book.userData?.studentClass} - {book.userData?.studentNumber}</p></div>
                      </div>
                      <div className="space-y-2 mb-3">
                        <div className="flex items-center justify-between text-sm"><span className="text-gray-600">Ödünç:</span><span className="font-medium">{new Date(book.borrowedAt).toLocaleDateString()}</span></div>
                        <div className="flex items-center justify-between text-sm"><span className="text-gray-600">İade:</span><span className="font-medium">{new Date(book.dueDate).toLocaleDateString()}</span></div>
                        <div className="flex items-center justify-between text-sm"><span className="text-gray-600">Gecikme:</span><span className={`px-2 py-1 rounded-full text-xs font-medium ${daysOverdue > 30 ? 'bg-red-100 text-red-800' : daysOverdue > 14 ? 'bg-orange-100 text-orange-800' : 'bg-yellow-100 text-yellow-800'}`}>{daysOverdue > 30 ? 'Yüksek' : daysOverdue > 14 ? 'Orta' : 'Düşük'} - {daysOverdue} gün</span></div>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t">
                        <div><p className="text-xs text-gray-500">Ceza Tutarı</p><p className="text-xl font-bold text-red-600">{fine} TL</p></div>
                        {book.fineStatus === 'paid' ? <div className="text-right"><span className="px-3 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full inline-flex items-center gap-1"><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>Ödendi</span>{book.paymentDate && <p className="text-xs text-gray-500 mt-1">{new Date(book.paymentDate).toLocaleDateString()}</p>}</div> : <button onClick={() => handlePaymentReceived(book.id, book.borrowedBy)} disabled={selectedFines.length > 0} className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed">Ödeme Al</button>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
    </>
  );
};

export default FinesTab;
