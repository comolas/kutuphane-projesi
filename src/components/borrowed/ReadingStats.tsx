import React, { useMemo, useState } from 'react';
import { Book } from '../../types';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import { Book as BookIcon, Bookmark, Calendar, Hash, Clock, Star, BookOpen, Edit, ChevronLeft, ChevronRight } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface ReadingStatsProps {
  returnedBooks: Book[];
  onOpenRateModal: (book: Book) => void;
}

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string | number; color: string }> = ({ icon, label, value, color }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm flex items-center">
    <div className={`flex-shrink-0 ${color} rounded-full p-3`}>
      {icon}
    </div>
    <div className="ml-4">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  </div>
);

const ReadingStats: React.FC<ReadingStatsProps> = ({ returnedBooks, onOpenRateModal }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const booksPerPage = 10;

  const stats = useMemo(() => {
    if (returnedBooks.length === 0) {
      return null;
    }

    const totalBooksRead = returnedBooks.length;
    const totalPagesRead = returnedBooks.reduce((sum, book) => sum + (book.pageCount || 0), 0);

    const now = new Date();
    const booksThisMonth = returnedBooks.filter(b => {
        const returnedDate = b.returnedAt ? new Date(b.returnedAt) : null;
        return returnedDate && returnedDate.getFullYear() === now.getFullYear() && returnedDate.getMonth() === now.getMonth();
    }).length;

    const booksThisYear = returnedBooks.filter(b => {
        const returnedDate = b.returnedAt ? new Date(b.returnedAt) : null;
        return returnedDate && returnedDate.getFullYear() === now.getFullYear();
    }).length;

    const totalReadingTime = returnedBooks.reduce((sum, book) => {
        if (book.borrowedAt && book.returnedAt) {
            const diff = new Date(book.returnedAt).getTime() - new Date(book.borrowedAt).getTime();
            return sum + diff;
        }
        return sum;
    }, 0);
    const avgReadingDays = totalBooksRead > 0 ? Math.round((totalReadingTime / (1000 * 60 * 60 * 24)) / totalBooksRead) : 0;

    const categoryCounts = returnedBooks.reduce((acc, book) => {
      acc[book.category] = (acc[book.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const authorCounts = returnedBooks.reduce((acc, book) => {
        acc[book.author] = (acc[book.author] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
    const favoriteCategory = Object.keys(categoryCounts).reduce((a, b) => categoryCounts[a] > categoryCounts[b] ? a : b, '-');
    const favoriteAuthor = Object.keys(authorCounts).reduce((a, b) => authorCounts[a] > authorCounts[b] ? a : b, '-');

    const monthlyDistribution = Array(12).fill(0);
    returnedBooks.forEach(book => {
        if (book.returnedAt) {
            const month = new Date(book.returnedAt).getMonth();
            monthlyDistribution[month]++;
        }
    });

    return {
      totalBooksRead,
      totalPagesRead,
      booksThisMonth,
      booksThisYear,
      avgReadingDays,
      favoriteCategory,
      favoriteAuthor,
      categoryCounts,
      monthlyDistribution
    };
  }, [returnedBooks]);

  const sortedReturnedBooks = useMemo(() => [...returnedBooks].reverse(), [returnedBooks]);

  const totalPages = Math.ceil(sortedReturnedBooks.length / booksPerPage);
  const startIndex = (currentPage - 1) * booksPerPage;
  const endIndex = startIndex + booksPerPage;
  const currentHistoryBooks = sortedReturnedBooks.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const generatePageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  if (!stats) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8 text-center mt-6">
        <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz Okuma Geçmişiniz Yok</h3>
        <p className="text-gray-600">Kitapları okuyup iade ettikçe, okuma karneniz burada oluşmaya başlayacak.</p>
      </div>
    );
  }

  const pieChartData = {
    labels: Object.keys(stats.categoryCounts),
    datasets: [
      {
        label: 'Okunan Kitap Sayısı',
        data: Object.values(stats.categoryCounts),
        backgroundColor: [
          '#4F46E5', '#7C3AED', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#8B5CF6'
        ],
        borderColor: '#fff',
        borderWidth: 2,
      },
    ],
  };

  const barChartData = {
    labels: ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'],
    datasets: [
      {
        label: 'Okunan Kitap Sayısı',
        data: stats.monthlyDistribution,
        backgroundColor: 'rgba(79, 70, 229, 0.8)',
        borderRadius: 4,
      },
    ],
  };

  return (
    <div className="mt-6 space-y-8">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={<BookIcon className="w-6 h-6 text-blue-600" />} label="Toplam Okunan Kitap" value={stats.totalBooksRead} color="bg-blue-100" />
        <StatCard icon={<BookOpen className="w-6 h-6 text-green-600" />} label="Toplam Okunan Sayfa" value={stats.totalPagesRead.toLocaleString()} color="bg-green-100" />
        <StatCard icon={<Clock className="w-6 h-6 text-yellow-600" />} label="Ortalama Okuma Süresi" value={`${stats.avgReadingDays} gün`} color="bg-yellow-100" />
        <StatCard icon={<Star className="w-6 h-6 text-purple-600" />} label="Favori Yazarınız" value={stats.favoriteAuthor} color="bg-purple-100" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3 bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Aylık Okuma Performansı</h3>
          <Bar data={barChartData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
        </div>
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Okunan Tür Dağılımı</h3>
          <Pie data={pieChartData} options={{ responsive: true }} />
        </div>
      </div>

      {/* Reading History List */}
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Okuma Geçmişi</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kitap Adı</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Yazar</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kategori</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İade Tarihi</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Eylemler</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentHistoryBooks.map(book => (
                <tr key={`${book.id}-${book.borrowedAt}`}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{book.title}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{book.author}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{book.category}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{book.returnedAt ? new Date(book.returnedAt).toLocaleDateString() : '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button 
                      onClick={() => onOpenRateModal(book)}
                      className="text-indigo-600 hover:text-indigo-900 flex items-center"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      İncele ve Puanla
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="mt-6 flex justify-center">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-2 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Önceki
              </button>
              {generatePageNumbers().map((page, index) => {
                if (page === '...') {
                  return <span key={`dots-${index}`} className="px-3 py-2 text-gray-500">...</span>;
                }
                return (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page as number)}
                    className={`px-3 py-2 rounded-lg border transition-colors ${
                      currentPage === page
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-2 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                Sonraki
                <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReadingStats;
