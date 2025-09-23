import React, { useState, useEffect, useRef } from 'react';
import { useBooks } from '../../../contexts/BookContext';
import { BarChart, Download, Users, BookOpen, Book, AlertTriangle, DollarSign, PiggyBank } from 'lucide-react';
import { Bar, Pie } from 'react-chartjs-2';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { collection, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { Book as BookType, UserData } from '../../../types';
import ClassDetailsModal from '../ClassDetailsModal';

const ReportsTab: React.FC = () => {
  const { allBorrowedBooks } = useBooks();
  const [reportData, setReportData] = useState({
    totalUsers: 0,
    totalBooks: 0,
    borrowedBooks: 0,
    overdueBooks: 0,
    totalFines: 0,
    totalPaidFines: 0,
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
  });
  const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const reportContentRef = useRef(null);
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);

  const handleClassClick = (className: string) => {
    setSelectedClass(className);
    setIsClassModalOpen(true);
  };

  const fetchReportData = async (month: string) => {
    try {
      const [usersSnapshot, borrowedBooksSnapshot, booksSnapshot] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'borrowedBooks')),
        getDocs(collection(db, 'books'))
      ]);

      const usersData = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as UserData[];
      const booksData = booksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as BookType[];
      const allBorrowedData = borrowedBooksSnapshot.docs.map(doc => doc.data());

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
      filteredBorrowedBooks.forEach((borrow: any) => {
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
        totalPaidFines,
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
      });
    } catch (error) {
      console.error('Error fetching report data:', error);
    }
  };

  useEffect(() => {
    fetchReportData(reportMonth);
  }, [reportMonth]);

  const exportToPDF = () => {
    const input = reportContentRef.current;
    if (input) {
      html2canvas(input).then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const ratio = canvasWidth / canvasHeight;
        const width = pdfWidth;
        const height = width / ratio;
        pdf.addImage(imgData, 'PNG', 0, 0, width, height);
        pdf.save(`rapor-${reportMonth}.pdf`);
      });
    }
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
    <div ref={reportContentRef} className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <BarChart className="w-6 h-6 mr-2 text-indigo-600" />
          Kütüphane Raporları
        </h2>
        <div className="flex items-center space-x-4">
          <input 
              type="month" 
              value={reportMonth} 
              onChange={(e) => setReportMonth(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <button
            onClick={() => fetchReportData(reportMonth)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center"
          >
            Filtrele
          </button>
          <button
            onClick={exportToPDF}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
          >
            <Download className="w-5 h-5 mr-2" />
            PDF Olarak Dışa Aktar
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-blue-500 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Toplam Kullanıcı</p>
              <p className="text-2xl font-bold text-gray-900">{reportData.totalUsers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center">
            <BookOpen className="w-8 h-8 text-green-500 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Toplam Kitap</p>
              <p className="text-2xl font-bold text-gray-900">{reportData.totalBooks}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center">
            <Book className="w-8 h-8 text-yellow-500 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Ödünç Verilen</p>
              <p className="text-2xl font-bold text-gray-900">{reportData.borrowedBooks}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center">
            <AlertTriangle className="w-8 h-8 text-red-500 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Gecikmiş Kitap</p>
              <p className="text-2xl font-bold text-gray-900">{reportData.overdueBooks}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center">
            <DollarSign className="w-8 h-8 text-purple-500 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Toplam Ceza</p>
              <p className="text-2xl font-bold text-gray-900">{reportData.totalFines} ₺</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center">
            <PiggyBank className="w-8 h-8 text-pink-500 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Kumbara</p>
              <p className="text-2xl font-bold text-gray-900">{reportData.totalPaidFines} ₺</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Aylık Ödünç Alma Trendi</h3>
          <div className="h-64">
            <Bar
              data={{
                labels: reportData.monthlyBorrows.map((item: any) => item.month),
                datasets: [
                  {
                    label: 'Ödünç Alınan Kitap Sayısı',
                    data: reportData.monthlyBorrows.map((item: any) => item.count),
                    backgroundColor: 'rgba(99, 102, 241, 0.8)',
                    borderColor: 'rgba(99, 102, 241, 1)',
                    borderWidth: 1
                  }
                ]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false
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

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Popüler Kategoriler</h3>
          <div className="h-64">
            <Pie
              data={{
                labels: reportData.popularCategories.map((item: any) => item.name),
                datasets: [
                  {
                    data: reportData.popularCategories.map((item: any) => item.count),
                    backgroundColor: colors,
                    borderWidth: 1
                  }
                ]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom'
                  }
                }
              }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Aylık Kullanıcı Kayıt Trendi</h3>
          <div className="h-64">
            <Bar
              data={{
                labels: reportData.userRegistrationTrend.map((item: any) => item.month),
                datasets: [
                  {
                    label: 'Yeni Kullanıcı Sayısı',
                    data: reportData.userRegistrationTrend.map((item: any) => item.count),
                    backgroundColor: 'rgba(75, 192, 192, 0.8)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                  }
                ]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
              }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Aylık Ceza Gelirleri</h3>
          <div className="h-64">
            <Bar
              data={{
                labels: reportData.monthlyFinesTrend.map((item: any) => item.month),
                datasets: [
                  {
                    label: 'Toplanan Ceza (₺)',
                    data: reportData.monthlyFinesTrend.map((item: any) => item.amount),
                    backgroundColor: 'rgba(255, 99, 132, 0.8)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                  }
                ]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
              }}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Ceza Durum Dağılımı</h3>
          <div className="h-64">
            <Pie
              data={{
                labels: ['Ödenen Cezalar', 'Ödenmemiş Cezalar'],
                datasets: [
                  {
                    data: [reportData.finesDistribution.paid, reportData.finesDistribution.unpaid],
                    backgroundColor: ['rgba(75, 192, 192, 0.8)', 'rgba(255, 99, 132, 0.8)'],
                    borderWidth: 1
                  }
                ]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } }
              }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Aylık Koleksiyon Büyüme Trendi</h3>
          <div className="h-64">
            <Bar
              data={{
                labels: reportData.collectionGrowthTrend.map((item: any) => item.month),
                datasets: [
                  {
                    label: 'Eklenen Yeni Kitap Sayısı',
                    data: reportData.collectionGrowthTrend.map((item: any) => item.count),
                    backgroundColor: 'rgba(153, 102, 255, 0.8)',
                    borderColor: 'rgba(153, 102, 255, 1)',
                    borderWidth: 1
                  }
                ]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
              }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">En Popüler Kitaplar (Ay Bazında)</h3>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kitap Adı</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Yazar</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ödünç Alınma Sayısı</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {reportData.popularBooks.map((book: any, index: number) => (
                            <tr key={index}>
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
          <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">En Çok Okunan Yazarlar</h3>
              <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                          <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Yazar</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Okunma Sayısı</th>
                          </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                          {reportData.mostReadAuthors.map((author: any, index: number) => (
                              <tr key={index}>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{author.name}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{author.count}</td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Kayıp Kitaplar</h3>
              <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                          <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kitap Adı</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Yazar</th>
                          </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                          {reportData.lostBooks.map((book: any, index: number) => (
                              <tr key={index}>
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
          <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">En Çok Kitap Okuyan Sınıflar</h3>
              <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                          <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sınıf</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Okunan Kitap Sayısı</th>
                          </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                          {reportData.classReads.most.map((item: any, index: number) => (
                              <tr key={index}>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    <button onClick={() => handleClassClick(item.name)} className="text-indigo-600 hover:text-indigo-900">
                                      {item.name}
                                    </button>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.count}</td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">En Az Kitap Okuyan Sınıflar</h3>
              <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                          <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sınıf</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Okunan Kitap Sayısı</th>
                          </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                          {reportData.classReads.least.map((item: any, index: number) => (
                              <tr key={index}>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    <button onClick={() => handleClassClick(item.name)} className="text-indigo-600 hover:text-indigo-900">
                                      {item.name}
                                    </button>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.count}</td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      </div>

      {isClassModalOpen && (
        <ClassDetailsModal 
          isOpen={isClassModalOpen}
          onClose={() => setIsClassModalOpen(false)}
          className={selectedClass}
          reportMonth={reportMonth}
        />
      )}
    </div>
  );
};

export default ReportsTab;