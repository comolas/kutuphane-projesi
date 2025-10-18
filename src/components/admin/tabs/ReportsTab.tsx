import React, { useState, useEffect, useRef } from 'react';
import { useBooks } from '../../../contexts/BookContext';
import { useBudget } from '../../../contexts/BudgetContext'; // Import useBudget
import { BarChart, Download, Users, BookOpen, Book, AlertTriangle, DollarSign, PiggyBank } from 'lucide-react';
import { Bar, Pie } from 'react-chartjs-2';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { collection, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import ClassDetailsModal from '../ClassDetailsModal';
import { Book as BookType, UserData } from '../../../types';

const ReportsTab: React.FC = () => {
  const { /* allBorrowedBooks */ } = useBooks();
  const { summary } = useBudget(); // Use budget context
  const [reportData, setReportData] = useState<{
    totalUsers: number;
    totalBooks: number;
    borrowedBooks: number;
    overdueBooks: number;
    totalFines: number;
    monthlyBorrows: { month: string; count: number }[];
    userRegistrationTrend: { month: string; count: number }[];
    monthlyFinesTrend: { month: string; amount: number }[];
    finesDistribution: { paid: number; unpaid: number };
    collectionGrowthTrend: { month: string; count: number }[];
    popularBooks: { title: string; author: string; count: number }[];
    categoryDistribution: { category: string; count: number }[];
    userActivity: { name: string; count: number }[];
    mostReadAuthors: { name: string; count: number }[];
    lostBooks: BookType[];
    popularCategories: { name: string; count: number }[];
    classReads: { most: { name: string; count: number }[]; least: { name: string; count: number; }[]; };
    allBorrowedData: any[]; 
    usersData: UserData[];
  }>({
    totalUsers: 0,
    totalBooks: 0,
    borrowedBooks: 0,
    overdueBooks: 0,
    totalFines: 0,
    monthlyBorrows: [],
    userRegistrationTrend: [],
    monthlyFinesTrend: [],
    finesDistribution: { paid: 0, unpaid: 0 },
    collectionGrowthTrend: [],
    popularBooks: [],
    categoryDistribution: [],
    userActivity: [],
    mostReadAuthors: [],
    lostBooks: [],
    popularCategories: [],
    classReads: { most: [], least: [] },
    allBorrowedData: [],
    usersData: [],
  });
  const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const reportContentRef = useRef(null);
  const [selectedClass, setSelectedClass] = useState<string>('Tüm Sınıflar');
  const [allClasses, setAllClasses] = useState<string[]>([]);
  const [classMonthlyBorrows, setClassMonthlyBorrows] = useState<{ month: string; count: number }[]>([]);
  const [isClassDetailsModalOpen, setIsClassDetailsModalOpen] = useState(false);
  const [selectedClassForDetails, setSelectedClassForDetails] = useState<{ className: string; month: string } | null>(null);
  const [isExporting, setIsExporting] = useState(false);


  const fetchReportData = async (month: string) => {
    try {
      const [usersSnapshot, borrowedBooksSnapshot, booksSnapshot] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'borrowedBooks')),
        getDocs(collection(db, 'books'))
      ]);

      const usersData = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        uid: doc.id,
        displayName: doc.data().displayName || '',
        email: doc.data().email || '',
        photoURL: doc.data().photoURL || '',
        studentClass: doc.data().studentClass || '',
        role: doc.data().role || 'student',
        createdAt: doc.data().createdAt || null,
        personalization: doc.data().personalization || null,
      })) as UserData[];
      const booksData = booksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as BookType[];
      const allBorrowedData = borrowedBooksSnapshot.docs.map(doc => doc.data());

      const uniqueClasses = Array.from(new Set(usersData.map(user => user.studentClass).filter(Boolean))) as string[];
      setAllClasses(uniqueClasses);

      // This calculation is now done in BudgetContext. We use summary.totalBudget instead for the main display.
      // However, the local calculation is still needed for the finesDistribution chart.
      const totalPaidFines = allBorrowedData
        .filter(book => book.fineStatus === 'paid' && book.fineAmount)
        .reduce((sum, book) => sum + (book.fineAmount || 0), 0);

      const [year, m] = month.split('-').map(Number);
      const startDate = new Date(year, m - 1, 1);
      const endDate = new Date(year, m, 0, 23, 59, 59);

      const filteredBorrowedBooks = allBorrowedData
        .filter(borrow => {
            if (!borrow.borrowedAt) return false;
            const borrowedAt = (borrow.borrowedAt as Timestamp).toDate();
            return borrowedAt >= startDate && borrowedAt <= endDate;
        });

      const totalUsers = usersSnapshot.size;
      const totalBooks = booksSnapshot.size;
      const borrowedBooksCount = filteredBorrowedBooks.length;

      let overdueCount = 0;
      let totalFinesAmount = 0;
      const today = new Date();
      
      borrowedBooksSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.returnStatus === 'borrowed') {
          const dueDate = (data.dueDate as Timestamp).toDate();
          if (today > dueDate) {
            overdueCount++;
            const daysOverdue = Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
            totalFinesAmount += daysOverdue * 5; // 5 TL per day
          }
        }
      });

      const finesDistribution = {
        paid: totalPaidFines,
        unpaid: totalFinesAmount
      };

      const monthlyBorrows: { month: string, count: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthName = date.toLocaleDateString('tr-TR', { month: 'long' });
        
        let count = 0;
        borrowedBooksSnapshot.forEach(doc => {
          const data = doc.data();
          if (data.borrowedAt) {
            const borrowDate = (data.borrowedAt as Timestamp).toDate();
            if (borrowDate.getMonth() === date.getMonth() && borrowDate.getFullYear() === date.getFullYear()) {
              count++;
            }
          }
        });
        
        monthlyBorrows.push({ month: monthName, count });
      }

      const monthlyRegistrations: { month: string, count: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthName = date.toLocaleDateString('tr-TR', { month: 'long' });
        
        let count = 0;
        usersSnapshot.forEach(doc => {
          const data = doc.data();
          if (data.createdAt) { 
            const registrationDate = (data.createdAt as Timestamp).toDate();
            if (registrationDate.getMonth() === date.getMonth() && registrationDate.getFullYear() === date.getFullYear()) {
              count++;
            }
          }
        });
        
        monthlyRegistrations.push({ month: monthName, count });
      }

      const monthlyFines: { month: string, amount: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthName = date.toLocaleDateString('tr-TR', { month: 'long' });
        
        let amount = 0;
        allBorrowedData.forEach(borrow => {
          if (borrow.fineStatus === 'paid' && borrow.paymentDate) {
            let returnDate: Date;
            if (typeof borrow.paymentDate.toDate === 'function') {
              returnDate = borrow.paymentDate.toDate();
            } else {
              returnDate = new Date(borrow.paymentDate);
            }

            if (!isNaN(returnDate.getTime())) {
              if (returnDate.getMonth() === date.getMonth() && returnDate.getFullYear() === date.getFullYear()) {
                amount += borrow.fineAmount || 0;
              }
            }
          }
        });
        
        monthlyFines.push({ month: monthName, amount });
      }

      const monthlyBookAdditions: { month: string, count: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthName = date.toLocaleDateString('tr-TR', { month: 'long' });
        
        let count = 0;
        booksSnapshot.forEach(doc => {
          const data = doc.data();
          if (data.addedDate) {
            let addedDate: Date;
            if (typeof data.addedDate.toDate === 'function') {
              addedDate = data.addedDate.toDate();
            } else {
              addedDate = new Date(data.addedDate);
            }

            if (!isNaN(addedDate.getTime())) {
              if (addedDate.getMonth() === date.getMonth() && addedDate.getFullYear() === date.getFullYear()) {
                count++;
              }
            }
          }
        });
        
        monthlyBookAdditions.push({ month: monthName, count });
      }

      const bookBorrowCounts: { [key: string]: number } = {};
      filteredBorrowedBooks.forEach((borrow: any) => {
        const bookId = borrow.bookId;
        if (bookId) {
          bookBorrowCounts[bookId] = (bookBorrowCounts[bookId] || 0) + 1;
        }
      });

      const sortedPopularBooks = Object.entries(bookBorrowCounts)
        .sort(([, countA], [, countB]) => countB - countA)
        .slice(0, 10);

      const popularBooksData = sortedPopularBooks.map(([bookId, count]) => {
        const bookDetails = booksData.find(b => b.id === bookId);
        return {
          title: bookDetails?.title || 'Bilinmeyen Kitap',
          author: bookDetails?.author || 'Bilinmeyen Yazar',
          count: count
        };
      });

      const categoryCount: { [key: string]: number } = {};
      filteredBorrowedBooks.forEach((borrow: any) => {
        const book = booksData.find(b => b.id === borrow.bookId);
        if (book) {
            const category = book.category || 'Diğer';
            categoryCount[category] = (categoryCount[category] || 0) + 1;
        }
      });

      const userBorrowCount: { [key: string]: number } = {};
      filteredBorrowedBooks.forEach((borrow: any) => {
        const userId = borrow.userId;
        userBorrowCount[userId] = (userBorrowCount[userId] || 0) + 1;
      });

      const userActivity: { name: string, count: number }[] = [];
      for (const [userId, count] of Object.entries(userBorrowCount)) {
        const user = usersData.find(u => u.uid === userId);
        if (user) {
          userActivity.push({
            name: user.displayName || 'Bilinmeyen',
            count: count as number
          });
        }
      }
      userActivity.sort((a, b) => b.count - a.count).splice(10);

      const authorReadCounts: { [key: string]: number } = {};
      filteredBorrowedBooks.forEach((borrow: any) => {
          const book = booksData.find(b => b.id === borrow.bookId);
          if (book && book.author) {
              authorReadCounts[book.author] = (authorReadCounts[book.author] || 0) + 1;
          }
      });
      const mostReadAuthors = Object.entries(authorReadCounts)
          .map(([name, count]) => ({ name, count: count as number }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);

      const lostBooks = booksData.filter(book => book.status === 'lost');

      const popularCategories = Object.entries(categoryCount)
          .map(([name, count]) => ({ name, count: count as number }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);

      const classReadsCount: { [key: string]: number } = {};
      allBorrowedData.forEach((borrow: any) => { // Changed from filteredBorrowedBooks to allBorrowedData
          const user = usersData.find(u => u.uid === borrow.userId);
          if (user && user.studentClass) {
              classReadsCount[user.studentClass] = (classReadsCount[user.studentClass] || 0) + 1;
          }
      });
      const classReadsArray = Object.entries(classReadsCount)
          .map(([name, count]) => ({ name, count: count as number }))
          .sort((a, b) => b.count - a.count);
      
      const classReads = {
          most: classReadsArray.slice(0, 5),
          least: classReadsArray.slice(-5).reverse(),
      };

      setReportData({
        totalUsers,
        totalBooks,
        borrowedBooks: borrowedBooksCount,
        overdueBooks: overdueCount,
        totalFines: totalFinesAmount,
        monthlyBorrows,
        userRegistrationTrend: monthlyRegistrations,
        monthlyFinesTrend: monthlyFines,
        finesDistribution,
        collectionGrowthTrend: monthlyBookAdditions,
        popularBooks: popularBooksData,
        categoryDistribution: Object.entries(categoryCount).map(([category, count]) => ({ category, count: count as number })),
        userActivity,
        mostReadAuthors,
        lostBooks,
        popularCategories,
        classReads,
        allBorrowedData, // Store for calculations
        usersData, // Store for calculations
      });
    } catch (error) {
      console.error('Error fetching report data:', error);
    }
  };

  useEffect(() => {
    fetchReportData(reportMonth);
  }, [reportMonth]);

  useEffect(() => {
    if (!reportData.allBorrowedData.length) return;

    const selectedYear = parseInt(reportMonth.split('-')[0], 10);
    const selectedMonth = parseInt(reportMonth.split('-')[1], 10);
    const startYear = selectedMonth < 9 ? selectedYear - 1 : selectedYear;

    const academicYearMonths = [
      { name: 'Eylül', monthIndex: 8, year: startYear },
      { name: 'Ekim', monthIndex: 9, year: startYear },
      { name: 'Kasım', monthIndex: 10, year: startYear },
      { name: 'Aralık', monthIndex: 11, year: startYear },
      { name: 'Ocak', monthIndex: 0, year: startYear + 1 },
      { name: 'Şubat', monthIndex: 1, year: startYear + 1 },
      { name: 'Mart', monthIndex: 2, year: startYear + 1 },
      { name: 'Nisan', monthIndex: 3, year: startYear + 1 },
      { name: 'Mayıs', monthIndex: 4, year: startYear + 1 },
      { name: 'Haziran', monthIndex: 5, year: startYear + 1 },
    ];

    const monthlyData = academicYearMonths.map(({ name, monthIndex, year }) => {
      let count = 0;

      const classUsers = selectedClass === 'Tüm Sınıflar' 
        ? reportData.usersData
        : reportData.usersData.filter(u => u.studentClass === selectedClass);
      
      const userIdsInClass = classUsers.map(u => u.uid);

      reportData.allBorrowedData.forEach((borrow: any) => {
        if (userIdsInClass.includes(borrow.userId)) {
          const borrowDate = (borrow.borrowedAt as Timestamp).toDate();
          if (borrowDate.getMonth() === monthIndex && borrowDate.getFullYear() === year) {
            count++;
          }
        }
      });

      return { month: name, count, year, monthIndex };
    });

    setClassMonthlyBorrows(monthlyData);

  }, [selectedClass, reportData.allBorrowedData, reportData.usersData, reportMonth]);

  const exportToPDF = async () => {
    const input = reportContentRef.current;
    if (!input) return;

    setIsExporting(true);
    try {
      const canvas = await html2canvas(input, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#f8f9fa'
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const ratio = canvasWidth / canvasHeight;
      const imgWidth = pdfWidth;
      const imgHeight = imgWidth / ratio;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, '', 'FAST');
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, '', 'FAST');
        heightLeft -= pdfHeight;
      }

      pdf.save(`kutuphane-raporu-${reportMonth}.pdf`);
    } catch (error) {
      console.error('PDF oluşturma hatası:', error);
      alert('PDF oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsExporting(false);
    }
  };

  const createGradient = (ctx: CanvasRenderingContext2D, color1: string, color2: string) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, color1);
    gradient.addColorStop(1, color2);
    return gradient;
  };

  const colors = [
    'rgba(255, 99, 132, 0.8)',
    'rgba(54, 162, 235, 0.8)',
    'rgba(255, 206, 86, 0.8)',
    'rgba(75, 192, 192, 0.8)',
    'rgba(153, 102, 255, 0.8)',
    'rgba(255, 159, 64, 0.8)',
    'rgba(255, 99, 255, 0.8)',
    'rgba(54, 162, 64, 0.8)',
    'rgba(255, 206, 192, 0.8)'
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
    <div ref={reportContentRef} className="space-y-8">
      <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 mb-6 sm:mb-8">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center">
            <BarChart className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-indigo-600" />
            Kütüphane Raporları
          </h2>
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 sm:gap-3 w-full lg:w-auto">
            <input 
                type="month" 
                value={reportMonth} 
                onChange={(e) => setReportMonth(e.target.value)}
                className="px-3 sm:px-4 py-2 bg-white/80 backdrop-blur-sm border border-indigo-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-xs sm:text-sm"
            />
            <button
              onClick={() => fetchReportData(reportMonth)}
              className="px-4 sm:px-6 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg sm:rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2 font-semibold text-xs sm:text-sm min-h-[40px] touch-manipulation"
            >
              Filtrele
            </button>
            <button
              onClick={exportToPDF}
              disabled={isExporting}
              className="px-4 sm:px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg sm:rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 font-semibold text-xs sm:text-sm min-h-[40px] touch-manipulation"
            >
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white"></div>
                  <span className="hidden sm:inline">Oluşturuluyor...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="hidden sm:inline">PDF Dışa Aktar</span>
                  <span className="sm:hidden">PDF</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-cyan-600 p-3 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300" style={{ animationDelay: '0s' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-white/90">Toplam Kullanıcı</p>
              <p className="text-xl sm:text-3xl font-bold text-white mt-1 sm:mt-2">{reportData.totalUsers}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 sm:p-4">
              <Users className="w-6 h-6 sm:w-12 sm:h-12 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-3 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-white/90">Toplam Kitap</p>
              <p className="text-xl sm:text-3xl font-bold text-white mt-1 sm:mt-2">{reportData.totalBooks}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 sm:p-4">
              <BookOpen className="w-6 h-6 sm:w-12 sm:h-12 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-500 to-orange-600 p-3 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-white/90">Ödünç Verilen</p>
              <p className="text-xl sm:text-3xl font-bold text-white mt-1 sm:mt-2">{reportData.borrowedBooks}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 sm:p-4">
              <Book className="w-6 h-6 sm:w-12 sm:h-12 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-pink-600 p-3 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-white/90">Gecikmiş Kitap</p>
              <p className="text-xl sm:text-3xl font-bold text-white mt-1 sm:mt-2">{reportData.overdueBooks}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 sm:p-4">
              <AlertTriangle className="w-6 h-6 sm:w-12 sm:h-12 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-3 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300" style={{ animationDelay: '0.4s' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-white/90">Toplam Ceza</p>
              <p className="text-xl sm:text-3xl font-bold text-white mt-1 sm:mt-2">{reportData.totalFines} ₺</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 sm:p-4">
              <DollarSign className="w-6 h-6 sm:w-12 sm:h-12 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-pink-500 to-rose-600 p-3 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300" style={{ animationDelay: '0.5s' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-white/90">Kumbara</p>
              <p className="text-xl sm:text-3xl font-bold text-white mt-1 sm:mt-2">{summary.totalBudget.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 sm:p-4">
              <PiggyBank className="w-6 h-6 sm:w-12 sm:h-12 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Kullanıcı Analizi */}
      <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6 mb-8">
        <div className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-6 py-4 -mx-6 -mt-6 rounded-t-2xl mb-6">
          <h3 className="text-lg font-semibold flex items-center">
            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Kullanıcı Analizi
          </h3>
        </div>
        {(() => {
          const studentsWithData = reportData.usersData.filter((u: any) => u.personalization?.isCompleted);
          
          if (studentsWithData.length === 0) {
            return (
              <div className="text-center py-12 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border-2 border-dashed border-purple-200">
                <div className="text-6xl mb-4">📊</div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Kullanıcı Analizi Hazırlanıyor</h3>
                <p className="text-gray-600 mb-4">Öğrenciler kişiselleştirme sorularını yanıtladıkça bu bölümde grafikler görünecek.</p>
                <p className="text-sm text-gray-500">({reportData.usersData.length} kullanıcıdan {studentsWithData.length} kişiselleştirme tamamladı)</p>
              </div>
            );
          }

          const categories: Record<string, number> = {};
          const topics: Record<string, number> = {};
          const magazines: Record<string, number> = {};
          const influences: Record<string, number> = {};
          const interests: Record<string, number> = {};

          studentsWithData.forEach((user: any) => {
            const p = user.personalization!;
            p.favoriteCategories?.forEach((c: string) => categories[c] = (categories[c] || 0) + 1);
            p.favoriteTopics?.forEach((t: string) => topics[t] = (topics[t] || 0) + 1);
            p.favoriteMagazines?.forEach((m: string) => magazines[m] = (magazines[m] || 0) + 1);
            if (p.readingInfluence) influences[p.readingInfluence] = (influences[p.readingInfluence] || 0) + 1;
            p.interests?.forEach((i: string) => interests[i] = (interests[i] || 0) + 1);
          });

          const categoryChartData = {
            labels: Object.keys(categories),
            datasets: [{ label: 'Öğrenci Sayısı', data: Object.values(categories), backgroundColor: ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#14b8a6', '#f97316', '#84cc16'] }]
          };

          const topicChartData = {
            labels: Object.keys(topics),
            datasets: [{ label: 'Öğrenci Sayısı', data: Object.values(topics), backgroundColor: '#ec4899' }]
          };

          const magazineChartData = {
            labels: Object.keys(magazines),
            datasets: [{ label: 'Öğrenci Sayısı', data: Object.values(magazines), backgroundColor: '#f59e0b' }]
          };

          const influenceChartData = {
            labels: Object.keys(influences),
            datasets: [{ label: 'Öğrenci Sayısı', data: Object.values(influences), backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'] }]
          };

          const interestChartData = {
            labels: Object.keys(interests),
            datasets: [{ label: 'Öğrenci Sayısı', data: Object.values(interests), backgroundColor: '#10b981' }]
          };

          const topCategory = Object.entries(categories).sort((a, b) => b[1] - a[1])[0];
          const topTopic = Object.entries(topics).sort((a, b) => b[1] - a[1])[0];
          const topInfluence = Object.entries(influences).sort((a, b) => b[1] - a[1])[0];

          return (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4">
                  <p className="text-purple-600 text-sm font-medium mb-1">Veri Tamamlama</p>
                  <p className="text-3xl font-bold text-purple-700">{Math.round((studentsWithData.length / reportData.usersData.length) * 100)}%</p>
                  <p className="text-xs text-purple-600 mt-1">{studentsWithData.length}/{reportData.usersData.length} kullanıcı</p>
                </div>
                <div className="bg-gradient-to-br from-pink-50 to-pink-100 border border-pink-200 rounded-lg p-4">
                  <p className="text-pink-600 text-sm font-medium mb-1">En Popüler Kategori</p>
                  <p className="text-lg font-bold text-pink-700">{topCategory?.[0] || '-'}</p>
                  <p className="text-xs text-pink-600 mt-1">{topCategory?.[1] || 0} kullanıcı</p>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-4">
                  <p className="text-orange-600 text-sm font-medium mb-1">En Popüler Konu</p>
                  <p className="text-lg font-bold text-orange-700">{topTopic?.[0] || '-'}</p>
                  <p className="text-xs text-orange-600 mt-1">{topTopic?.[1] || 0} kullanıcı</p>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-600 text-sm font-medium mb-1">En Etkili Faktör</p>
                  <p className="text-lg font-bold text-blue-700">{topInfluence?.[0] || '-'}</p>
                  <p className="text-xs text-blue-600 mt-1">{topInfluence?.[1] || 0} kullanıcı</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
                    <span className="w-1 h-5 bg-purple-500 rounded-full mr-2"></span>
                    Kategori Tercihleri
                  </h3>
                  <div className="h-64"><Pie data={categoryChartData} options={{ maintainAspectRatio: false }} /></div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
                    <span className="w-1 h-5 bg-pink-500 rounded-full mr-2"></span>
                    Konu Tercihleri
                  </h3>
                  <div className="h-64"><Bar data={topicChartData} options={{ maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }} /></div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
                    <span className="w-1 h-5 bg-orange-500 rounded-full mr-2"></span>
                    Dergi Tercihleri
                  </h3>
                  <div className="h-64"><Bar data={magazineChartData} options={{ maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }} /></div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
                    <span className="w-1 h-5 bg-blue-500 rounded-full mr-2"></span>
                    Okuma Etkisi
                  </h3>
                  <div className="h-64"><Pie data={influenceChartData} options={{ maintainAspectRatio: false }} /></div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
                  <span className="w-1 h-5 bg-green-500 rounded-full mr-2"></span>
                  İlgi Alanları
                </h3>
                <div className="h-64"><Bar data={interestChartData} options={{ maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }} /></div>
              </div>

              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border-l-4 border-indigo-500 rounded-lg p-6">
                <h3 className="font-bold text-indigo-900 mb-4 flex items-center">
                  <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Öneriler & İçgörüler
                </h3>
                <ul className="space-y-2">
                  {topCategory && (
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2">•</span>
                      <span className="text-gray-700"><strong>{topCategory[0]}</strong> kategorisi en popüler (%{Math.round((topCategory[1] / studentsWithData.length) * 100)}). Koleksiyonu güçlendirin.</span>
                    </li>
                  )}
                  {topTopic && (
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2">•</span>
                      <span className="text-gray-700"><strong>{topTopic[0]}</strong> konusu ilgi çekiyor. Bu konuda etkinlik düzenleyin.</span>
                    </li>
                  )}
                  {topInfluence && topInfluence[0] === 'Sosyal Medya' && (
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2">•</span>
                      <span className="text-gray-700">Sosyal medya etkisi yüksek. Instagram/TikTok kampanyaları düşünün.</span>
                    </li>
                  )}
                  {topInfluence && topInfluence[0] === 'Öğretmen' && (
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2">•</span>
                      <span className="text-gray-700">Öğretmen etkisi güçlü. Öğretmen işbirliklerini artırın.</span>
                    </li>
                  )}
                </ul>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Class Utilization Chart */}
      <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-4 -mx-6 -mt-6 rounded-t-2xl mb-6">
          <h3 className="text-lg font-semibold">Sınıf Bazında Kütüphane Kullanımı</h3>
        </div>
        <div className="mb-4">
          <label htmlFor="class-select" className="block text-sm font-medium text-gray-700 mb-2">Sınıf Seç:</label>
          <select
            id="class-select"
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
          >
            <option value="Tüm Sınıflar">Tüm Sınıflar</option>
            {allClasses.map(className => (
              <option key={className} value={className}>{className}</option>
            ))}
          </select>
        </div>
        <div className="h-96">
          <Bar
            data={{
              labels: classMonthlyBorrows.map((item: any) => item.month),
              datasets: [
                {
                  label: 'Ödünç Alınan Kitap Sayısı',
                  data: classMonthlyBorrows.map((item: any) => item.count),
                  backgroundColor: (context: any) => {
                    const ctx = context.chart.ctx;
                    return createGradient(ctx, 'rgba(99, 102, 241, 0.8)', 'rgba(139, 92, 246, 0.4)');
                  },
                  borderColor: 'rgba(99, 102, 241, 1)',
                  borderWidth: 2,
                  borderRadius: 8
                }
              ]
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              animation: {
                duration: 1000,
                easing: 'easeInOutQuart'
              },
              onClick: (event, elements) => {
                if (elements.length > 0 && selectedClass !== 'Tüm Sınıflar') {
                  const elementIndex = elements[0].index;
                  const data = classMonthlyBorrows[elementIndex];
                  const monthString = (data.monthIndex + 1).toString().padStart(2, '0');
                  
                  setSelectedClassForDetails({ 
                    className: selectedClass,
                    month: `${data.year}-${monthString}`
                  });
                  setIsClassDetailsModalOpen(true);
                }
              },
              plugins: {
                legend: {
                  display: true,
                  position: 'top' as const,
                  align: 'end' as const,
                  labels: {
                    boxWidth: 12,
                    padding: 15,
                    font: { size: 12 }
                  }
                },
                tooltip: {
                  enabled: true,
                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  padding: 12,
                  cornerRadius: 8,
                  titleFont: { size: 14, weight: 'bold' },
                  bodyFont: { size: 13 },
                  callbacks: {
                    label: (context: any) => {
                      return `Kitap Sayısı: ${context.parsed.y}`;
                    }
                  }
                }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  ticks: { precision: 0 }
                }
              }
            }}
          />
        </div>
      </div>

      {isClassDetailsModalOpen && (
        <ClassDetailsModal 
          isOpen={isClassDetailsModalOpen}
          onClose={() => setIsClassDetailsModalOpen(false)}
          className={selectedClassForDetails?.className || null}
          reportMonth={selectedClassForDetails?.month || ''}
        />
      )}


      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6">
          <div className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white px-6 py-4 -mx-6 -mt-6 rounded-t-2xl mb-6">
            <h3 className="text-lg font-semibold">Aylık Ödünç Alma Trendi</h3>
          </div>
          <div className="h-64">
            <Bar
              data={{
                labels: reportData.monthlyBorrows.map((item: any) => item.month),
                datasets: [
                  {
                    label: 'Ödünç Alınan Kitap Sayısı',
                    data: reportData.monthlyBorrows.map((item: any) => item.count),
                    backgroundColor: (context: any) => {
                      const ctx = context.chart.ctx;
                      return createGradient(ctx, 'rgba(59, 130, 246, 0.8)', 'rgba(147, 197, 253, 0.4)');
                    },
                    borderColor: 'rgba(59, 130, 246, 1)',
                    borderWidth: 2,
                    borderRadius: 8
                  }
                ]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                  duration: 1000,
                  easing: 'easeInOutQuart'
                },
                plugins: {
                  legend: {
                    display: true,
                    position: 'top' as const,
                    align: 'end' as const,
                    labels: {
                      boxWidth: 12,
                      padding: 15,
                      font: { size: 12 }
                    }
                  },
                  tooltip: {
                    enabled: true,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    cornerRadius: 8,
                    titleFont: { size: 14, weight: 'bold' },
                    bodyFont: { size: 13 },
                    callbacks: {
                      label: (context: any) => {
                        return `Kitap Sayısı: ${context.parsed.y}`;
                      }
                    }
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: { precision: 0 }
                  }
                }
              }}
            />
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6">
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-4 -mx-6 -mt-6 rounded-t-2xl mb-6">
            <h3 className="text-lg font-semibold">Popüler Kategoriler</h3>
          </div>
          <div className="h-64">
            <Pie
              data={{
                labels: reportData.popularCategories.map((item: any) => item.name),
                datasets: [
                  {
                    data: reportData.popularCategories.map((item: any) => item.count),
                    backgroundColor: colors,
                    borderWidth: 2,
                    borderColor: '#fff',
                    hoverOffset: 15
                  }
                ]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                  animateRotate: true,
                  animateScale: true,
                  duration: 1000,
                  easing: 'easeInOutQuart'
                },
                plugins: {
                  legend: {
                    position: 'right' as const,
                    align: 'center' as const,
                    labels: {
                      boxWidth: 12,
                      padding: 10,
                      font: { size: 11 }
                    }
                  },
                  tooltip: {
                    enabled: true,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    cornerRadius: 8,
                    titleFont: { size: 14, weight: 'bold' },
                    bodyFont: { size: 13 },
                    callbacks: {
                      label: (context: any) => {
                        const label = context.label || '';
                        const value = context.parsed || 0;
                        const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                        const percentage = ((value / total) * 100).toFixed(1);
                        return `${label}: ${value} (${percentage}%)`;
                      }
                    }
                  }
                }
              }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6">
          <div className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-6 py-4 -mx-6 -mt-6 rounded-t-2xl mb-6">
            <h3 className="text-lg font-semibold">Aylık Kullanıcı Kayıt Trendi</h3>
          </div>
          <div className="h-64">
            <Bar
              data={{
                labels: reportData.userRegistrationTrend.map((item: any) => item.month),
                datasets: [
                  {
                    label: 'Yeni Kullanıcı Sayısı',
                    data: reportData.userRegistrationTrend.map((item: any) => item.count),
                    backgroundColor: (context: any) => {
                      const ctx = context.chart.ctx;
                      return createGradient(ctx, 'rgba(139, 92, 246, 0.8)', 'rgba(196, 181, 253, 0.4)');
                    },
                    borderColor: 'rgba(139, 92, 246, 1)',
                    borderWidth: 2,
                    borderRadius: 8
                  }
                ]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                  duration: 1000,
                  easing: 'easeInOutQuart'
                },
                plugins: {
                  legend: {
                    display: true,
                    position: 'top' as const,
                    align: 'end' as const,
                    labels: {
                      boxWidth: 12,
                      padding: 15,
                      font: { size: 12 }
                    }
                  },
                  tooltip: {
                    enabled: true,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    cornerRadius: 8,
                    titleFont: { size: 14, weight: 'bold' },
                    bodyFont: { size: 13 },
                    callbacks: {
                      label: (context: any) => {
                        return `Kullanıcı Sayısı: ${context.parsed.y}`;
                      }
                    }
                  }
                },
                scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
              }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6">
          <div className="bg-gradient-to-r from-red-500 to-pink-600 text-white px-6 py-4 -mx-6 -mt-6 rounded-t-2xl mb-6">
            <h3 className="text-lg font-semibold">Aylık Ceza Gelirleri</h3>
          </div>
          <div className="h-64">
            <Bar
              data={{
                labels: reportData.monthlyFinesTrend.map((item: any) => item.month),
                datasets: [
                  {
                    label: 'Toplanan Ceza (₺)',
                    data: reportData.monthlyFinesTrend.map((item: any) => item.amount),
                    backgroundColor: (context: any) => {
                      const ctx = context.chart.ctx;
                      return createGradient(ctx, 'rgba(239, 68, 68, 0.8)', 'rgba(252, 165, 165, 0.4)');
                    },
                    borderColor: 'rgba(239, 68, 68, 1)',
                    borderWidth: 2,
                    borderRadius: 8
                  }
                ]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                  duration: 1000,
                  easing: 'easeInOutQuart'
                },
                plugins: {
                  legend: {
                    display: true,
                    position: 'top' as const,
                    align: 'end' as const,
                    labels: {
                      boxWidth: 12,
                      padding: 15,
                      font: { size: 12 }
                    }
                  },
                  tooltip: {
                    enabled: true,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    cornerRadius: 8,
                    titleFont: { size: 14, weight: 'bold' },
                    bodyFont: { size: 13 },
                    callbacks: {
                      label: (context: any) => {
                        return `Ceza: ${context.parsed.y} ₺`;
                      }
                    }
                  }
                },
                scales: { y: { beginAtZero: true } }
              }}
            />
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6">
          <div className="bg-gradient-to-r from-yellow-500 to-orange-600 text-white px-6 py-4 -mx-6 -mt-6 rounded-t-2xl mb-6">
            <h3 className="text-lg font-semibold">Ceza Durum Dağılımı</h3>
          </div>
          <div className="h-64">
            <Pie
              data={{
                labels: ['Ödenen Cezalar', 'Ödenmemiş Cezalar'],
                datasets: [
                  {
                    data: [reportData.finesDistribution.paid, reportData.finesDistribution.unpaid],
                    backgroundColor: ['rgba(34, 197, 94, 0.8)', 'rgba(239, 68, 68, 0.8)'],
                    borderWidth: 2,
                    borderColor: '#fff',
                    hoverOffset: 15
                  }
                ]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                  animateRotate: true,
                  animateScale: true,
                  duration: 1000,
                  easing: 'easeInOutQuart'
                },
                plugins: {
                  legend: {
                    position: 'bottom' as const,
                    align: 'center' as const,
                    labels: {
                      boxWidth: 12,
                      padding: 15,
                      font: { size: 12 }
                    }
                  },
                  tooltip: {
                    enabled: true,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    cornerRadius: 8,
                    titleFont: { size: 14, weight: 'bold' },
                    bodyFont: { size: 13 },
                    callbacks: {
                      label: (context: any) => {
                        const label = context.label || '';
                        const value = context.parsed || 0;
                        return `${label}: ${value.toFixed(2)} ₺`;
                      }
                    }
                  }
                }
              }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">
        <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6">
          <div className="bg-gradient-to-r from-pink-500 to-rose-600 text-white px-6 py-4 -mx-6 -mt-6 rounded-t-2xl mb-6">
            <h3 className="text-lg font-semibold">Aylık Koleksiyon Büyüme Trendi</h3>
          </div>
          <div className="h-64">
            <Bar
              data={{
                labels: reportData.collectionGrowthTrend.map((item: any) => item.month),
                datasets: [
                  {
                    label: 'Eklenen Yeni Kitap Sayısı',
                    data: reportData.collectionGrowthTrend.map((item: any) => item.count),
                    backgroundColor: (context: any) => {
                      const ctx = context.chart.ctx;
                      return createGradient(ctx, 'rgba(236, 72, 153, 0.8)', 'rgba(251, 207, 232, 0.4)');
                    },
                    borderColor: 'rgba(236, 72, 153, 1)',
                    borderWidth: 2,
                    borderRadius: 8
                  }
                ]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                  duration: 1000,
                  easing: 'easeInOutQuart'
                },
                plugins: {
                  legend: {
                    display: true,
                    position: 'top' as const,
                    align: 'end' as const,
                    labels: {
                      boxWidth: 12,
                      padding: 15,
                      font: { size: 12 }
                    }
                  },
                  tooltip: {
                    enabled: true,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    cornerRadius: 8,
                    titleFont: { size: 14, weight: 'bold' },
                    bodyFont: { size: 13 },
                    callbacks: {
                      label: (context: any) => {
                        return `Kitap Sayısı: ${context.parsed.y}`;
                      }
                    }
                  }
                },
                scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
              }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-4 -mx-6 -mt-6 rounded-t-2xl mb-6">
              <h3 className="text-lg font-semibold">En Popüler Kitaplar (Ay Bazında)</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full">
                    <thead>
                        <tr className="bg-gradient-to-r from-indigo-500 to-purple-600">
                            <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Kitap Adı</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Yazar</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Ödünç Alınma Sayısı</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reportData.popularBooks.map((book: any, index: number) => (
                            <tr key={index} className={`hover:bg-indigo-50 transition-colors ${index % 2 === 0 ? 'bg-white/50' : 'bg-gray-50/50'}`}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{book.title}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{book.author}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{book.count}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6">
              <div className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white px-6 py-4 -mx-6 -mt-6 rounded-t-2xl mb-6">
                <h3 className="text-lg font-semibold">En Çok Okunan Yazarlar</h3>
              </div>
              <div className="overflow-x-auto">
                  <table className="min-w-full">
                      <thead>
                          <tr className="bg-gradient-to-r from-blue-500 to-cyan-600">
                              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Yazar</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Okunma Sayısı</th>
                          </tr>
                      </thead>
                      <tbody>
                          {reportData.mostReadAuthors.map((author: any, index: number) => (
                              <tr key={index} className={`hover:bg-blue-50 transition-colors ${index % 2 === 0 ? 'bg-white/50' : 'bg-gray-50/50'}`}>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{author.name}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{author.count}</td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
          <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6">
              <div className="bg-gradient-to-r from-red-500 to-pink-600 text-white px-6 py-4 -mx-6 -mt-6 rounded-t-2xl mb-6">
                <h3 className="text-lg font-semibold">Kayıp Kitaplar</h3>
              </div>
              <div className="overflow-x-auto">
                  <table className="min-w-full">
                      <thead>
                          <tr className="bg-gradient-to-r from-red-500 to-pink-600">
                              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Kitap Adı</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Yazar</th>
                          </tr>
                      </thead>
                      <tbody>
                          {reportData.lostBooks.map((book: any, index: number) => (
                              <tr key={index} className={`hover:bg-red-50 transition-colors ${index % 2 === 0 ? 'bg-white/50' : 'bg-gray-50/50'}`}>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{book.title}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{book.author}</td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6">
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-4 -mx-6 -mt-6 rounded-t-2xl mb-6">
                <h3 className="text-lg font-semibold">En Çok Kitap Okuyan Sınıflar</h3>
              </div>
              <div className="overflow-x-auto">
                  <table className="min-w-full">
                      <thead>
                          <tr className="bg-gradient-to-r from-green-500 to-emerald-600">
                              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Sınıf</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Okunan Kitap Sayısı</th>
                          </tr>
                      </thead>
                      <tbody>
                          {reportData.classReads.most.map((item: any, index: number) => (
                              <tr key={index} className={`hover:bg-green-50 transition-colors ${index % 2 === 0 ? 'bg-white/50' : 'bg-gray-50/50'}`}>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {item.name}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.count}</td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
          <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6">
              <div className="bg-gradient-to-r from-yellow-500 to-orange-600 text-white px-6 py-4 -mx-6 -mt-6 rounded-t-2xl mb-6">
                <h3 className="text-lg font-semibold">En Az Kitap Okuyan Sınıflar</h3>
              </div>
              <div className="overflow-x-auto">
                  <table className="min-w-full">
                      <thead>
                          <tr className="bg-gradient-to-r from-yellow-500 to-orange-600">
                              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Sınıf</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Okunan Kitap Sayısı</th>
                          </tr>
                      </thead>
                      <tbody>
                          {reportData.classReads.least.map((item: any, index: number) => (
                              <tr key={index} className={`hover:bg-yellow-50 transition-colors ${index % 2 === 0 ? 'bg-white/50' : 'bg-gray-50/50'}`}>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {item.name}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.count}</td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      </div>

    </div>
    </div>
  );
};

export default ReportsTab;
