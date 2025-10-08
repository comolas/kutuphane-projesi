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

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string | number; gradient: string; index: number }> = ({ icon, label, value, gradient, index }) => (
  <div 
    className={`${gradient} p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105`}
    style={{ animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both` }}
  >
    <div className="flex items-center">
      <div className="flex-shrink-0 bg-white/20 backdrop-blur-sm rounded-full p-4">
        {icon}
      </div>
      <div className="ml-4">
        <p className="text-sm font-medium text-white/90">{label}</p>
        <p className="text-3xl font-bold text-white">{value}</p>
      </div>
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
    const totalPagesRead = returnedBooks.reduce((sum, book) => sum + (Number(book.pageCount) || 0), 0);

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
    <>
    <div className="mt-6 space-y-8">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={<BookIcon className="w-12 h-12 text-white" />} label="Toplam Okunan Kitap" value={stats.totalBooksRead} gradient="bg-gradient-to-br from-blue-500 to-cyan-600" index={0} />
        <StatCard icon={<BookOpen className="w-12 h-12 text-white" />} label="Toplam Okunan Sayfa" value={stats.totalPagesRead.toLocaleString()} gradient="bg-gradient-to-br from-green-500 to-emerald-600" index={1} />
        <StatCard icon={<Clock className="w-12 h-12 text-white" />} label="Ortalama Okuma Süresi" value={`${stats.avgReadingDays} gün`} gradient="bg-gradient-to-br from-yellow-500 to-orange-600" index={2} />
        <StatCard icon={<Star className="w-12 h-12 text-white" />} label="Favori Yazarınız" value={stats.favoriteAuthor} gradient="bg-gradient-to-br from-purple-500 to-indigo-600" index={3} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3 bg-white/90 backdrop-blur-xl border border-white/20 p-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300">
          <h3 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-6">Aylık Okuma Performansı</h3>
          <Bar data={barChartData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
        </div>
        <div className="lg:col-span-2 bg-white/90 backdrop-blur-xl border border-white/20 p-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300">
          <h3 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-6">Okunan Tür Dağılımı</h3>
          <Pie data={pieChartData} options={{ responsive: true }} />
        </div>
      </div>

      {/* Reading History Cards */}
      <div className="bg-white/90 backdrop-blur-xl border border-white/20 p-6 rounded-2xl shadow-xl">
        <h3 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-6">Okuma Geçmişi</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {currentHistoryBooks.map((book, index) => (
            <div 
              key={`${book.id}-${book.borrowedAt}`} 
              className="group bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 overflow-hidden flex flex-col"
              style={{ animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both` }}
            >
              <div className="relative overflow-hidden" style={{ aspectRatio: '2/3' }}>
                <img 
                  src={book.coverImage} 
                  alt={book.title} 
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                {/* Okundu Badge */}
                <div className="absolute top-3 right-3 px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-green-500 to-emerald-600 text-white backdrop-blur-xl shadow-lg">
                  Okundu
                </div>
              </div>

              <div className="p-4 flex flex-col flex-grow">
                <h4 className="font-semibold text-gray-900 line-clamp-2 mb-1">{book.title}</h4>
                <p className="text-sm text-gray-600 mb-3">{book.author}</p>
                
                {/* Info Box */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-3 mb-3">
                  <div className="flex items-center text-xs text-gray-600 mb-1.5">
                    <Calendar className="w-4 h-4 mr-1.5" />
                    <span>{book.returnedAt ? new Date(book.returnedAt).toLocaleDateString('tr-TR') : '-'}</span>
                  </div>
                  <div className="flex items-center text-xs text-gray-600">
                    <Bookmark className="w-4 h-4 mr-1.5" />
                    <span>{book.category}</span>
                  </div>
                </div>

                {/* Action Button */}
                <button 
                  onClick={() => onOpenRateModal(book)}
                  className="w-full px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl text-sm font-semibold hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center justify-center mt-auto"
                >
                  <Edit className="w-4 h-4 mr-1.5" />
                  Yorumla ve Puanla
                </button>
              </div>
            </div>
          ))}
        </div>
        {totalPages > 1 && (
          <div className="mt-8 flex justify-center">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-4 py-2.5 rounded-xl bg-white/90 backdrop-blur-xl border border-white/20 text-gray-700 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-all duration-300 shadow-lg font-medium"
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
                    className={`px-4 py-2.5 rounded-xl transition-all duration-300 shadow-lg font-medium ${
                      currentPage === page
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white scale-105'
                        : 'bg-white/90 backdrop-blur-xl border border-white/20 text-gray-700 hover:bg-white'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-4 py-2.5 rounded-xl bg-white/90 backdrop-blur-xl border border-white/20 text-gray-700 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-all duration-300 shadow-lg font-medium"
              >
                Sonraki
                <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>

    <style>{`
      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `}</style>
    </>
  );
};

export default ReadingStats;
