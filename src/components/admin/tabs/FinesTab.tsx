import React, { useState, useEffect, useMemo } from 'react';
import { useBooks } from '../../../contexts/BookContext';
import { useSettings } from '../../../contexts/SettingsContext';
import { useBudget } from '../../../contexts/BudgetContext';
import { useCoupons } from '../../../contexts/CouponContext';
import { useAuth } from '../../../contexts/AuthContext';
import SetFineModal from '../SetFineModal';
import ApplyDiscountModal from '../ApplyDiscountModal';
import { DollarSign, Search, Filter, SortAsc, SortDesc, Users, Settings, Ticket, X } from 'lucide-react';
import Swal from 'sweetalert2';
import { useLocation } from 'react-router-dom';

interface BorrowedBook {
  id: string;
  title: string;
  author: string;
  borrowedAt: Date;
  dueDate: Date;
  returnedAt?: Date;
  returnRequestDate?: Date; // İade talep tarihi
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
  const location = useLocation();
  const { allBorrowedBooks, markFineAsPaid } = useBooks();
  const { finePerDay, setFinePerDay, loading: settingsLoading } = useSettings();
  const { addTransaction } = useBudget();
  const { useCoupon, getAvailableCouponsForCategory } = useCoupons();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [selectedBookForDiscount, setSelectedBookForDiscount] = useState<BorrowedBook | null>(null);
  const [appliedDiscounts, setAppliedDiscounts] = useState<Record<string, { couponId: string; discountPercent: number }>>({});
  const [loading, setLoading] = useState(true);
  const [finesSearchQuery, setFinesSearchQuery] = useState(location.state?.searchQuery || '');
  const [finesStatusFilter, setFinesStatusFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [finesSortBy, setFinesSortBy] = useState<'dueDate' | 'amount'>('dueDate');
  const [finesSortOrder, setFinesSortOrder] = useState<'asc' | 'desc'>('desc');
  const [finesCurrentPage, setFinesCurrentPage] = useState(1);
  const [selectedFines, setSelectedFines] = useState<string[]>([]);
  const [isBulkPaying, setIsBulkPaying] = useState(false);
  const [chartView, setChartView] = useState<'monthly' | 'class'>('monthly');
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [classFilter, setClassFilter] = useState('all');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const finesPerPage = 10;

  useEffect(() => {
    if (location.state?.searchQuery) {
      setFinesSearchQuery(location.state.searchQuery);
    }
  }, [location.state]);

  useEffect(() => {
    setFinesCurrentPage(1);
    setSelectedFines([]);
  }, [finesSearchQuery, finesStatusFilter, finesSortBy, finesSortOrder, classFilter]);

  const handleApplyDiscount = (book: BorrowedBook) => {
    setSelectedBookForDiscount(book);
    setIsDiscountModalOpen(true);
  };

  const handleDiscountApplied = (couponId: string, discountPercent: number) => {
    if (!selectedBookForDiscount) return;
    const fineKey = `${selectedBookForDiscount.id}-${selectedBookForDiscount.borrowedBy}`;
    setAppliedDiscounts(prev => ({
      ...prev,
      [fineKey]: { couponId, discountPercent }
    }));
    Swal.fire('Başarılı!', `%${discountPercent} indirim uygulandı!`, 'success');
  };

  const handleRemoveDiscount = (bookId: string, userId: string) => {
    const fineKey = `${bookId}-${userId}`;
    setAppliedDiscounts(prev => {
      const newDiscounts = { ...prev };
      delete newDiscounts[fineKey];
      return newDiscounts;
    });
    Swal.fire('Başarılı!', 'İndirim kaldırıldı!', 'success');
  };

  const handlePaymentReceived = async (bookId: string, userId: string) => {
    const fineKey = `${bookId}-${userId}`;
    const discount = appliedDiscounts[fineKey];
    const book = allBorrowedBooks.find(b => b.id === bookId && b.borrowedBy === userId);
    
    // Öncelik: returnRequestDate > returnedAt > bugün
    let comparisonDate: Date;
    if (book?.returnRequestDate) {
      comparisonDate = new Date(book.returnRequestDate);
    } else if (book?.returnStatus === 'returned' && book?.returnedAt) {
      comparisonDate = new Date(book.returnedAt);
    } else {
      comparisonDate = new Date();
    }
    
    const diffTime = comparisonDate.getTime() - new Date(book?.dueDate || new Date()).getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const originalAmount = diffDays > 0 ? diffDays * finePerDay : 0;
    const finalAmount = discount ? originalAmount - (originalAmount * discount.discountPercent / 100) : originalAmount;
    
    const confirmHtml = discount 
      ? `<div style="text-align: left; padding: 10px;">
          <p><strong>Kullanıcı:</strong> ${book?.userData?.displayName}</p>
          <p><strong>Orijinal Tutar:</strong> <span style="text-decoration: line-through;">${originalAmount.toFixed(2)} TL</span></p>
          <p><strong>İndirim:</strong> %${discount.discountPercent} (-${(originalAmount * discount.discountPercent / 100).toFixed(2)} TL)</p>
          <p style="font-size: 18px; color: #16a34a;"><strong>Ödenecek Tutar:</strong> ${finalAmount.toFixed(2)} TL</p>
        </div>`
      : `<div style="text-align: left; padding: 10px;">
          <p><strong>Kullanıcı:</strong> ${book?.userData?.displayName}</p>
          <p style="font-size: 18px; color: #16a34a;"><strong>Ödenecek Tutar:</strong> ${finalAmount.toFixed(2)} TL</p>
        </div>`;
    
    Swal.fire({
      title: 'Ödeme Onayı',
      html: confirmHtml,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Ödemeyi Onayla',
      cancelButtonText: 'Vazgeç'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          if (discount) {
            await useCoupon(discount.couponId, fineKey, userId);
          }
          
          const paidAmount = await markFineAsPaid(bookId, userId, finePerDay, discount?.discountPercent);
          
          await addTransaction({
            date: new Date(),
            description: `${book?.userData?.displayName} isimli kullanıcıdan ödeme alındı${discount ? ` (%${discount.discountPercent} indirimli)` : ''}`,
            amount: paidAmount,
            type: 'income',
            category: 'Ödeme',
            relatedFineId: fineKey
          });
          
          const receiptHtml = `<div style="text-align: left; padding: 15px; border: 2px solid #e5e7eb; border-radius: 8px; background: #f9fafb;">
            <h3 style="text-align: center; color: #16a34a; margin-bottom: 15px;">✓ ÖDEME MAKBUZU</h3>
            <hr style="margin: 10px 0;">
            <p><strong>Kullanıcı:</strong> ${book?.userData?.displayName}</p>
            <p><strong>Kitap:</strong> ${book?.title}</p>
            <p><strong>Gecikme:</strong> ${diffDays} gün</p>
            ${discount ? `
              <hr style="margin: 10px 0;">
              <p><strong>Orijinal Ceza:</strong> <span style="text-decoration: line-through;">${originalAmount.toFixed(2)} TL</span></p>
              <p><strong>Uygulanan İndirim:</strong> %${discount.discountPercent}</p>
              <p><strong>İndirim Tutarı:</strong> -${(originalAmount * discount.discountPercent / 100).toFixed(2)} TL</p>
              <hr style="margin: 10px 0;">
            ` : ''}
            <p style="font-size: 20px; color: #16a34a; margin-top: 10px;"><strong>Ödenen Tutar:</strong> ${paidAmount.toFixed(2)} TL</p>
            <p style="text-align: center; color: #6b7280; font-size: 12px; margin-top: 15px;">Makbuz No: #${bookId.slice(-6)}</p>
          </div>`;
          
          setAppliedDiscounts(prev => {
            const newDiscounts = { ...prev };
            delete newDiscounts[fineKey];
            return newDiscounts;
          });
          
          Swal.fire({
            title: 'Ödeme Başarılı!',
            html: receiptHtml,
            icon: 'success',
            confirmButtonText: 'Tamam'
          });
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
      
      // Öncelik sırası: returnRequestDate > returnedAt > bugün
      let comparisonDate: Date;
      if (book.returnRequestDate) {
        // İade talebi varsa, talep tarihini kullan (en önemli)
        comparisonDate = new Date(book.returnRequestDate);
      } else if (book.returnStatus === 'returned' && book.returnedAt) {
        // İade edildiyse, iade tarihini kullan
        comparisonDate = new Date(book.returnedAt);
      } else {
        // Henüz iade edilmediyse, bugünü kullan
        comparisonDate = new Date();
      }
      
      const diffTime = comparisonDate.getTime() - new Date(book.dueDate).getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const originalFine = diffDays > 0 ? diffDays * finePerDay : 0;
      
      const fineKey = `${book.id}-${book.borrowedBy}`;
      const discount = appliedDiscounts[fineKey];
      if (discount) {
        return originalFine - (originalFine * discount.discountPercent / 100);
      }
      
      return originalFine;
    };
  }, [finePerDay, appliedDiscounts]);

  const overdueBooks = useMemo(() => {
    const books = (allBorrowedBooks || []).filter(book => {
      if (book.fineStatus === 'paid') return true;
      
      // Öncelik sırası: returnRequestDate > returnedAt > bugün
      let comparisonDate: Date;
      if (book.returnRequestDate) {
        comparisonDate = new Date(book.returnRequestDate);
      } else if (book.returnStatus === 'returned' && book.returnedAt) {
        comparisonDate = new Date(book.returnedAt);
      } else {
        comparisonDate = new Date();
      }
      
      const daysOverdue = Math.ceil(
        (comparisonDate.getTime() - new Date(book.dueDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysOverdue > 0;
    });
    setLoading(false);
    return books;
  }, [allBorrowedBooks]);

  const uniqueClasses = useMemo(() => {
    const classes = new Set(overdueBooks.map(b => b.userData?.studentClass).filter(Boolean));
    return ['all', ...Array.from(classes).sort()];
  }, [overdueBooks]);

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

      const matchesClass = classFilter === 'all' || book.userData?.studentClass === classFilter;

      return matchesSearch && matchesStatus && matchesClass;
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
          for (const key of selectedFines) {
            const [bookId, userId] = key.split('-');
            const book = allBorrowedBooks.find(b => b.id === bookId && b.borrowedBy === userId);
            const paidAmount = await markFineAsPaid(bookId, userId, finePerDay);
            if (paidAmount) {
              await addTransaction({
                date: new Date(),
                description: `${book?.userData?.displayName} isimli kullanıcıdan ödeme alındı`,
                amount: paidAmount,
                type: 'income',
                category: 'Ödeme',
                relatedFineId: key
              });
            }
          }
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 py-8 px-4">
    <div className="max-w-7xl mx-auto">
    <>
      <SetFineModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentRate={finePerDay}
        onSave={setFinePerDay}
      />
      
      <ApplyDiscountModal
        isOpen={isDiscountModalOpen}
        onClose={() => { setIsDiscountModalOpen(false); setSelectedBookForDiscount(null); }}
        userId={selectedBookForDiscount?.borrowedBy || ''}
        bookCategory={(selectedBookForDiscount as any)?.category || ''}
        originalAmount={selectedBookForDiscount ? (() => {
          // Öncelik: returnRequestDate > returnedAt > bugün
          let comparisonDate: Date;
          if (selectedBookForDiscount.returnRequestDate) {
            comparisonDate = new Date(selectedBookForDiscount.returnRequestDate);
          } else if (selectedBookForDiscount.returnStatus === 'returned' && selectedBookForDiscount.returnedAt) {
            comparisonDate = new Date(selectedBookForDiscount.returnedAt);
          } else {
            comparisonDate = new Date();
          }
          const diffTime = comparisonDate.getTime() - new Date(selectedBookForDiscount.dueDate).getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return diffDays > 0 ? diffDays * finePerDay : 0;
        })() : 0}
        onApply={handleDiscountApplied}
      />
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-3 sm:p-6 text-white shadow-lg">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <p className="text-red-100 text-xs sm:text-sm font-medium">Toplam Ceza</p>
              <p className="text-xl sm:text-3xl font-bold mt-1 sm:mt-2">{fineStats.totalFines} TL</p>
            </div>
            <div className="bg-white/20 p-2 sm:p-3 rounded-lg">
              <DollarSign className="w-5 h-5 sm:w-8 sm:h-8" />
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-3 sm:p-6 text-white shadow-lg">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <p className="text-orange-100 text-xs sm:text-sm font-medium">Ödenmemiş Ceza</p>
              <p className="text-xl sm:text-3xl font-bold mt-1 sm:mt-2">{fineStats.unpaidFines}</p>
            </div>
            <div className="bg-white/20 p-2 sm:p-3 rounded-lg">
              <svg className="w-5 h-5 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-3 sm:p-6 text-white shadow-lg">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <p className="text-green-100 text-xs sm:text-sm font-medium">Bugün Ödenen</p>
              <p className="text-xl sm:text-3xl font-bold mt-1 sm:mt-2">{fineStats.paidToday}</p>
            </div>
            <div className="bg-white/20 p-2 sm:p-3 rounded-lg">
              <svg className="w-5 h-5 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-3 sm:p-6 text-white shadow-lg">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <p className="text-blue-100 text-xs sm:text-sm font-medium">Ort. Gecikme</p>
              <p className="text-xl sm:text-3xl font-bold mt-1 sm:mt-2">{fineStats.avgDelay} gün</p>
            </div>
            <div className="bg-white/20 p-2 sm:p-3 rounded-lg">
              <svg className="w-5 h-5 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Visualization Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Monthly Trend Chart */}
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-white/20">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
            Aylık Ceza Trendi
          </h3>
          <div className="flex items-end justify-between h-48 gap-2">
            {monthlyData.map((data, index) => (
              <div key={index} className="flex-1 flex flex-col items-center group">
                <div className="w-full flex flex-col items-center justify-end relative" style={{ height: '160px' }}>
                  <div className="text-xs font-medium text-gray-600 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">{data.count}</div>
                  <div 
                    className="w-full bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t transition-all duration-500 hover:from-indigo-700 hover:to-indigo-500"
                    style={{ height: `${(data.count / maxCount) * 100}%`, minHeight: data.count > 0 ? '8px' : '0' }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 mt-2 font-medium">{data.month}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Class Comparison Chart */}
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-white/20">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Sınıf Bazlı Ceza Dağılımı
          </h3>
          <div className="flex items-end justify-between h-48 gap-1">
            {classFineData.slice(0, 8).map((data, index) => (
              <div 
                key={index} 
                className="flex-1 flex flex-col items-center cursor-pointer group"
                onClick={() => setSelectedClass(data.className)}
              >
                <div className="w-full flex flex-col items-center justify-end relative" style={{ height: '160px' }}>
                  <div className="text-xs font-medium text-gray-600 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">{data.totalAmount.toFixed(0)}₺</div>
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
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                    Ödenen: {data.paidAmount.toFixed(0)}₺<br/>Ödenmemiş: {(data.totalAmount - data.paidAmount).toFixed(0)}₺
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-2 font-medium truncate w-full text-center" title={data.className}>{data.className}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span className="text-gray-600">Ödenen</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span className="text-gray-600">Ödenmemiş</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg overflow-hidden border border-white/20">
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
          {/* Floating Filter Button (Mobile) */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden fixed bottom-6 right-6 z-40 p-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all"
          >
            <Filter className="w-6 h-6" />
          </button>

          {/* Overlay */}
          {isSidebarOpen && (
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}

          <div className="flex flex-col lg:flex-row gap-6">
            {/* Sidebar */}
            <aside className={`fixed lg:sticky top-0 left-0 h-full lg:h-auto w-80 lg:w-64 bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg p-4 sm:p-6 z-50 transition-transform duration-300 ${
              isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
            } lg:flex-shrink-0 border border-white/20`}>
              <div className="flex justify-between items-center mb-4 sm:mb-6">
                <h2 className="text-base sm:text-lg font-semibold flex items-center">
                  <Filter className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-indigo-600" />
                  Filtreler
                </h2>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="lg:hidden text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4 sm:mb-6">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Kullanıcı veya kitap ara..."
                    value={finesSearchQuery}
                    onChange={(e) => setFinesSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                </div>
              </div>

              <div className="space-y-4 sm:space-y-6">
                <div>
                  <h3 className="text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3">Sınıf</h3>
                  <div className="space-y-1 sm:space-y-2 max-h-48 overflow-y-auto">
                    {uniqueClasses.map(c => (
                      <label key={c} className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded touch-manipulation">
                        <input
                          type="radio"
                          name="class"
                          checked={classFilter === c}
                          onChange={() => setClassFilter(c)}
                          className="mr-2 w-4 h-4"
                        />
                        <span className="text-xs sm:text-sm">{c === 'all' ? 'Tümü' : c}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3">Ödeme Durumu</h3>
                  <div className="space-y-1 sm:space-y-2">
                    <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded touch-manipulation">
                      <input
                        type="radio"
                        name="status"
                        checked={finesStatusFilter === 'all'}
                        onChange={() => setFinesStatusFilter('all')}
                        className="mr-2 w-4 h-4"
                      />
                      <span className="text-xs sm:text-sm">Tümü</span>
                    </label>
                    <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded touch-manipulation">
                      <input
                        type="radio"
                        name="status"
                        checked={finesStatusFilter === 'unpaid'}
                        onChange={() => setFinesStatusFilter('unpaid')}
                        className="mr-2 w-4 h-4"
                      />
                      <span className="text-xs sm:text-sm text-red-600">● Ödenmemiş</span>
                    </label>
                    <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded touch-manipulation">
                      <input
                        type="radio"
                        name="status"
                        checked={finesStatusFilter === 'paid'}
                        onChange={() => setFinesStatusFilter('paid')}
                        className="mr-2 w-4 h-4"
                      />
                      <span className="text-xs sm:text-sm text-green-600">● Ödenmiş</span>
                    </label>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3">Sıralama</h3>
                  <div className="space-y-1 sm:space-y-2">
                    <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded touch-manipulation">
                      <input
                        type="radio"
                        name="sort"
                        checked={finesSortBy === 'dueDate' && finesSortOrder === 'desc'}
                        onChange={() => { setFinesSortBy('dueDate'); setFinesSortOrder('desc'); }}
                        className="mr-2 w-4 h-4"
                      />
                      <span className="text-xs sm:text-sm">En Geç İade</span>
                    </label>
                    <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded touch-manipulation">
                      <input
                        type="radio"
                        name="sort"
                        checked={finesSortBy === 'dueDate' && finesSortOrder === 'asc'}
                        onChange={() => { setFinesSortBy('dueDate'); setFinesSortOrder('asc'); }}
                        className="mr-2 w-4 h-4"
                      />
                      <span className="text-xs sm:text-sm">En Erken İade</span>
                    </label>
                    <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded touch-manipulation">
                      <input
                        type="radio"
                        name="sort"
                        checked={finesSortBy === 'amount' && finesSortOrder === 'desc'}
                        onChange={() => { setFinesSortBy('amount'); setFinesSortOrder('desc'); }}
                        className="mr-2 w-4 h-4"
                      />
                      <span className="text-xs sm:text-sm">En Yüksek Ceza</span>
                    </label>
                    <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded touch-manipulation">
                      <input
                        type="radio"
                        name="sort"
                        checked={finesSortBy === 'amount' && finesSortOrder === 'asc'}
                        onChange={() => { setFinesSortBy('amount'); setFinesSortOrder('asc'); }}
                        className="mr-2 w-4 h-4"
                      />
                      <span className="text-xs sm:text-sm">En Düşük Ceza</span>
                    </label>
                  </div>
                </div>
              </div>
            </aside>

            <div className="flex-1">
              <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex gap-2">
                  <button onClick={() => setViewMode('table')} className={`p-2 rounded-lg transition-all duration-200 touch-manipulation ${viewMode === 'table' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  </button>
                  <button onClick={() => setViewMode('card')} className={`p-2 rounded-lg transition-all duration-200 touch-manipulation ${viewMode === 'card' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 6v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                  </button>
                </div>
                <p className="text-xs sm:text-sm text-gray-600">{filteredOverdueBooks.length} ceza bulundu</p>
              </div>

              {selectedFines.length > 0 && (
                <div className="p-3 sm:p-4 bg-indigo-50 border border-indigo-200 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                  <span className="text-xs sm:text-sm font-medium text-indigo-700">
                    {selectedFines.length} ceza seçildi.
                  </span>
                  <button
                    onClick={handleBulkPaymentReceived}
                    disabled={isBulkPaying}
                    className="w-full sm:w-auto px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors min-h-[40px] touch-manipulation"
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
                    : (() => {
                        // Öncelik: returnRequestDate > returnedAt > bugün
                        let comparisonDate: Date;
                        if (book.returnRequestDate) {
                          comparisonDate = new Date(book.returnRequestDate);
                        } else if (book.returnStatus === 'returned' && book.returnedAt) {
                          comparisonDate = new Date(book.returnedAt);
                        } else {
                          comparisonDate = new Date();
                        }
                        return Math.max(0, Math.ceil((comparisonDate.getTime() - new Date(book.dueDate).getTime()) / (1000 * 60 * 60 * 24)));
                      })();
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
                          {appliedDiscounts[fineKey] && (
                            <div className="text-xs text-gray-500 line-through">
                              {(() => {
                                // Öncelik: returnRequestDate > returnedAt > bugün
                                let comparisonDate: Date;
                                if (book.returnRequestDate) {
                                  comparisonDate = new Date(book.returnRequestDate);
                                } else if (book.returnStatus === 'returned' && book.returnedAt) {
                                  comparisonDate = new Date(book.returnedAt);
                                } else {
                                  comparisonDate = new Date();
                                }
                                const diffTime = comparisonDate.getTime() - new Date(book.dueDate).getTime();
                                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                return diffDays > 0 ? diffDays * finePerDay : 0;
                              })()} TL
                            </div>
                          )}
                          <span className="text-sm font-medium text-red-600">{fine.toFixed(2)} TL</span>
                          {appliedDiscounts[fineKey] && (
                            <span className="text-xs font-semibold text-green-600">
                              %{appliedDiscounts[fineKey].discountPercent} indirim uygulandı
                            </span>
                          )}
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
                              {book.discountApplied && book.originalFineAmount && (
                                <span className="text-xs text-green-600 font-semibold">
                                  %{book.discountApplied} indirimli
                                </span>
                              )}
                              {book.fineAmountSnapshot && (
                                <span className="text-xs text-gray-500" title={`Ödenen: ${book.fineAmountSnapshot.toFixed(2)} TL${book.originalFineAmount ? ` (Orijinal: ${book.originalFineAmount.toFixed(2)} TL)` : ''}`}>
                                  Makbuz: #{book.id.slice(-6)}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="flex gap-1">
                              {appliedDiscounts[fineKey] ? (
                                <button
                                  onClick={() => handleRemoveDiscount(book.id, book.borrowedBy)}
                                  className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full hover:bg-red-200 transition-colors"
                                >
                                  İndirimi Kaldır
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleApplyDiscount(book)}
                                  className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition-colors flex items-center gap-1"
                                >
                                  <Ticket className="w-3 h-3" />
                                  İndirim Uygula
                                </button>
                              )}
                              <button
                                onClick={() => handlePaymentReceived(book.id, book.borrowedBy)}
                                className="px-3 py-1 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-full hover:bg-indigo-200 transition-colors"
                              >
                                Ödeme Al
                              </button>
                            </div>
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
                const daysOverdue = book.fineRateSnapshot !== undefined 
                  ? book.daysOverdueSnapshot 
                  : (() => {
                      // Öncelik: returnRequestDate > returnedAt > bugün
                      let comparisonDate: Date;
                      if (book.returnRequestDate) {
                        comparisonDate = new Date(book.returnRequestDate);
                      } else if (book.returnStatus === 'returned' && book.returnedAt) {
                        comparisonDate = new Date(book.returnedAt);
                      } else {
                        comparisonDate = new Date();
                      }
                      return Math.max(0, Math.ceil((comparisonDate.getTime() - new Date(book.dueDate).getTime()) / (1000 * 60 * 60 * 24)));
                    })();
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
                      <div className="pt-3 border-t">
                        <div className="flex items-end justify-between mb-2">
                          <div>
                            <p className="text-xs text-gray-500">Ceza Tutarı</p>
                            {appliedDiscounts[fineKey] && (
                              <p className="text-sm text-gray-500 line-through">
                                {(() => {
                                  // Öncelik: returnRequestDate > returnedAt > bugün
                                  let comparisonDate: Date;
                                  if (book.returnRequestDate) {
                                    comparisonDate = new Date(book.returnRequestDate);
                                  } else if (book.returnStatus === 'returned' && book.returnedAt) {
                                    comparisonDate = new Date(book.returnedAt);
                                  } else {
                                    comparisonDate = new Date();
                                  }
                                  const diffTime = comparisonDate.getTime() - new Date(book.dueDate).getTime();
                                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                  return (diffDays > 0 ? diffDays * finePerDay : 0).toFixed(2);
                                })()} TL
                              </p>
                            )}
                            <p className="text-xl font-bold text-red-600">{fine.toFixed(2)} TL</p>
                          </div>
                          {book.fineStatus === 'paid' ? (
                            <div className="text-right">
                              <span className="px-3 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full inline-flex items-center gap-1">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                Ödendi
                              </span>
                              {book.paymentDate && <p className="text-xs text-gray-500 mt-1">{new Date(book.paymentDate).toLocaleDateString()}</p>}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              {appliedDiscounts[fineKey] ? (
                                <button
                                  onClick={() => handleRemoveDiscount(book.id, book.borrowedBy)}
                                  className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                                >
                                  Kaldır
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleApplyDiscount(book)}
                                  className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors flex items-center gap-1"
                                >
                                  <Ticket className="w-3 h-3" /> İndirim
                                </button>
                              )}
                              <button
                                onClick={() => handlePaymentReceived(book.id, book.borrowedBy)}
                                disabled={selectedFines.length > 0}
                                className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                              >
                                Ödeme Al
                              </button>
                            </div>
                          )}
                        </div>
                        {appliedDiscounts[fineKey] && (
                          <div className="text-right text-xs font-semibold text-green-600">
                            %{appliedDiscounts[fineKey].discountPercent} indirim uygulandı
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              </div>
              )}
              {finesTotalPages > 1 && (
                <div className="flex items-center justify-center gap-2 p-4 border-t mt-4">
                  <button
                    onClick={() => setFinesCurrentPage(p => Math.max(p - 1, 1))}
                    disabled={finesCurrentPage === 1}
                    className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <span className="text-sm text-gray-600">
                    Sayfa {finesCurrentPage} / {finesTotalPages}
                  </span>
                  <button
                    onClick={() => setFinesCurrentPage(p => Math.min(p + 1, finesTotalPages))}
                    disabled={finesCurrentPage === finesTotalPages}
                    className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
    </div>
    </div>
  );
};

export default FinesTab;
