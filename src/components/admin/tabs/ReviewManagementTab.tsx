import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from "../../../firebase/config";
import { Review, Book as BookType } from '../../types';
import { useAuth } from '../../../contexts/AuthContext';
import { Check, X, Trash2, AlertCircle, MessageSquare, Star, ThumbsUp, Clock, Search, Filter, User, Book, ChevronLeft, ChevronRight, CheckSquare, Square, BarChart3, TrendingUp, BookOpen } from 'lucide-react';
import { Line, Bar, Pie } from 'react-chartjs-2';
import Swal from 'sweetalert2';

const ReviewManagementTab: React.FC = () => {
  const { isSuperAdmin, campusId } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [books, setBooks] = useState<Record<string, BookType>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [ratingFilter, setRatingFilter] = useState<number | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedReviews, setSelectedReviews] = useState<string[]>([]);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const q = isSuperAdmin
        ? query(collection(db, 'reviews'), orderBy('createdAt', 'desc'))
        : query(collection(db, 'reviews'), where('campusId', '==', campusId), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const fetchedReviews = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));
      setReviews(fetchedReviews);

      // Fetch books
      const bookIds = [...new Set(fetchedReviews.map(r => r.bookId).filter(Boolean))];
      if (bookIds.length > 0) {
        const booksQuery = isSuperAdmin ? query(collection(db, 'books')) : query(collection(db, 'books'), where('campusId', '==', campusId));
        const booksSnapshot = await getDocs(booksQuery);
        const booksData: Record<string, BookType> = {};
        booksSnapshot.docs.forEach(doc => {
          booksData[doc.id] = { id: doc.id, ...doc.data() } as BookType;
        });
        setBooks(booksData);
      }
    } catch (err) {
      console.error("Error fetching reviews: ", err);
      Swal.fire("Hata!", "Yorumlar yüklenirken bir hata oluştu.", "error");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleUpdateStatus = async (reviewId: string, status: 'approved' | 'rejected') => {
    const reviewRef = doc(db, 'reviews', reviewId);
    try {
      if (status === 'rejected') {
        await deleteDoc(reviewRef);
        setReviews(prev => prev.filter(r => r.id !== reviewId));
        Swal.fire('Başarılı!', 'Yorum başarıyla reddedildi ve silindi.', 'success');
      } else {
        await updateDoc(reviewRef, { status });
        setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, status } : r));
        Swal.fire('Başarılı!', 'Yorum başarıyla onaylandı.', 'success');
      }
    } catch (err) {
      console.error("Error updating review status: ", err);
      Swal.fire("Hata!", "Yorum durumu güncellenirken bir hata oluştu.", "error");
    }
  };

  const handleDelete = async (reviewId: string) => {
    Swal.fire({
      title: 'Emin misiniz?',
      text: "Bu yorumu kalıcı olarak silmek istediğinizden emin misiniz?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Evet, sil!',
      cancelButtonText: 'Vazgeç'
    }).then(async (result) => {
      if (result.isConfirmed) {
        const reviewRef = doc(db, 'reviews', reviewId);
        try {
          await deleteDoc(reviewRef);
          setReviews(prev => prev.filter(r => r.id !== reviewId));
          Swal.fire('Başarılı!', 'Yorum başarıyla silindi.', 'success');
        } catch (err) {
          console.error("Error deleting review: ", err);
          Swal.fire("Hata!", "Yorum silinirken bir hata oluştu.", "error");
        }
      }
    });
  };

  const filteredReviews = useMemo(() => {
    let filtered = reviews.filter(r => r.status === activeTab);
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(r => 
        r.userDisplayName?.toLowerCase().includes(term) ||
        r.reviewText?.toLowerCase().includes(term) ||
        r.bookId?.toLowerCase().includes(term)
      );
    }
    
    if (ratingFilter !== 'all') {
      filtered = filtered.filter(r => r.rating === ratingFilter);
    }
    
    return filtered;
  }, [reviews, activeTab, searchTerm, ratingFilter]);

  const paginatedReviews = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredReviews.slice(start, start + itemsPerPage);
  }, [filteredReviews, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredReviews.length / itemsPerPage);

  const stats = useMemo(() => {
    const total = reviews.length;
    const pending = reviews.filter(r => r.status === 'pending').length;
    const approved = reviews.filter(r => r.status === 'approved').length;
    const avgRating = total > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / total).toFixed(1) : '0.0';
    return { total, pending, approved, avgRating };
  }, [reviews]);

  const analyticsData = useMemo(() => {
    // Puan dağılımı
    const ratingDistribution = [1, 2, 3, 4, 5].map(rating => 
      reviews.filter(r => r.rating === rating).length
    );

    // Aylık trend (son 6 ay)
    const now = new Date();
    const last6Months = [];
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      last6Months.push({
        month: date.toLocaleDateString('tr-TR', { month: 'short' }),
        monthIndex: date.getMonth(),
        year: date.getFullYear()
      });
    }

    const monthlyData = last6Months.map(({ monthIndex, year }) => {
      return reviews.filter(r => {
        const reviewDate = r.createdAt?.toDate();
        return reviewDate && reviewDate.getMonth() === monthIndex && reviewDate.getFullYear() === year;
      }).length;
    });

    // En çok yorum yapan kullanıcılar
    const userCounts = reviews.reduce((acc, r) => {
      const userName = r.userDisplayName || 'Bilinmeyen';
      acc[userName] = (acc[userName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topUsers = Object.entries(userCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      labels: last6Months.map(m => m.month),
      monthlyData,
      ratingDistribution,
      topUsers
    };
  }, [reviews]);

  const clearFilters = () => {
    setSearchTerm('');
    setRatingFilter('all');
    setCurrentPage(1);
  };

  const toggleSelectReview = (reviewId: string) => {
    setSelectedReviews(prev => 
      prev.includes(reviewId) ? prev.filter(id => id !== reviewId) : [...prev, reviewId]
    );
  };

  const toggleSelectAll = () => {
    const currentPageIds = paginatedReviews.map(r => r.id);
    const allSelected = currentPageIds.every(id => selectedReviews.includes(id));
    
    if (allSelected) {
      setSelectedReviews(prev => prev.filter(id => !currentPageIds.includes(id)));
    } else {
      setSelectedReviews(prev => [...new Set([...prev, ...currentPageIds])]);
    }
  };

  const handleBulkAction = async (action: 'approve' | 'delete') => {
    if (selectedReviews.length === 0) {
      Swal.fire('Uyarı', 'Lütfen en az bir yorum seçin.', 'warning');
      return;
    }

    const confirmMsg = action === 'approve' 
      ? `${selectedReviews.length} yorumu onaylamak istediğinizden emin misiniz?`
      : `${selectedReviews.length} yorumu silmek istediğinizden emin misiniz?`;
    
    const result = await Swal.fire({
      title: 'Emin misiniz?',
      text: confirmMsg,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: action === 'approve' ? '#10b981' : '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: action === 'approve' ? 'Evet, onayla!' : 'Evet, sil!',
      cancelButtonText: 'Vazgeç'
    });

    if (!result.isConfirmed) return;

    try {
      if (action === 'approve') {
        await Promise.all(selectedReviews.map(id => 
          updateDoc(doc(db, 'reviews', id), { status: 'approved' })
        ));
        setReviews(prev => prev.map(r => 
          selectedReviews.includes(r.id) ? { ...r, status: 'approved' as const } : r
        ));
      } else {
        await Promise.all(selectedReviews.map(id => deleteDoc(doc(db, 'reviews', id))));
        setReviews(prev => prev.filter(r => !selectedReviews.includes(r.id)));
      }
      setSelectedReviews([]);
      Swal.fire('Başarılı!', 'İşlem başarıyla tamamlandı.', 'success');
    } catch (error) {
      console.error('Bulk action error:', error);
      Swal.fire('Hata!', 'İşlem sırasında bir hata oluştu.', 'error');
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-lg font-semibold text-gray-700">Yorumlar yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
      {/* Header */}
      <div className="mb-8 animate-fadeIn">
        <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg p-6">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3 flex items-center">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-3 rounded-xl mr-3">
              <MessageSquare className="w-7 h-7 text-white" />
            </div>
            Yorum Yönetimi
          </h2>
          <p className="text-gray-600 text-lg">Kullanıcı yorumlarını onaylayın ve yönetin.</p>
        </div>
      </div>

      {/* Analytics Toggle */}
      <div className="mb-8 animate-fadeIn">
        <button
          onClick={() => setShowAnalytics(!showAnalytics)}
          className="w-full bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6 flex items-center justify-between group"
        >
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-3 rounded-xl group-hover:scale-110 transition-transform">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <h3 className="text-xl font-bold text-gray-900">İstatistikler ve Analizler</h3>
              <p className="text-sm text-gray-600">Puan dağılımı, trend analizi ve en aktif kullanıcılar</p>
            </div>
          </div>
          <div className={`transform transition-transform ${showAnalytics ? 'rotate-180' : ''}`}>
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>
      </div>

      {/* Analytics Section */}
      {showAnalytics && (
        <div className="space-y-6 mb-8 animate-fadeIn">
          {/* Monthly Trend */}
          <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg p-6">
            <h3 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              Aylık Yorum Trendi (Son 6 Ay)
            </h3>
            <div className="h-80">
              <Line
                data={{
                  labels: analyticsData.labels,
                  datasets: [{
                    label: 'Yorum Sayısı',
                    data: analyticsData.monthlyData,
                    borderColor: 'rgba(147, 51, 234, 1)',
                    backgroundColor: 'rgba(147, 51, 234, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    pointBackgroundColor: 'rgba(147, 51, 234, 1)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      backgroundColor: 'rgba(0, 0, 0, 0.8)',
                      padding: 12,
                      cornerRadius: 8,
                      titleFont: { size: 14, weight: 'bold' },
                      bodyFont: { size: 13 }
                    }
                  },
                  scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1 } }
                  }
                }}
              />
            </div>
          </div>

          {/* Rating Distribution & Top Users */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Rating Distribution */}
            <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg p-6">
              <h3 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">Puan Dağılımı</h3>
              <div className="h-80">
                <Bar
                  data={{
                    labels: ['1 Yıldız', '2 Yıldız', '3 Yıldız', '4 Yıldız', '5 Yıldız'],
                    datasets: [{
                      label: 'Yorum Sayısı',
                      data: analyticsData.ratingDistribution,
                      backgroundColor: [
                        'rgba(239, 68, 68, 0.8)',
                        'rgba(249, 115, 22, 0.8)',
                        'rgba(234, 179, 8, 0.8)',
                        'rgba(34, 197, 94, 0.8)',
                        'rgba(59, 130, 246, 0.8)'
                      ],
                      borderRadius: 8,
                      borderWidth: 0
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        cornerRadius: 8
                      }
                    },
                    scales: {
                      y: { beginAtZero: true, ticks: { stepSize: 1 } }
                    }
                  }}
                />
              </div>
            </div>

            {/* Top Users */}
            <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg p-6">
              <h3 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">En Çok Yorum Yapan Kullanıcılar</h3>
              <div className="h-80">
                <Bar
                  data={{
                    labels: analyticsData.topUsers.map(u => u[0]),
                    datasets: [{
                      label: 'Yorum Sayısı',
                      data: analyticsData.topUsers.map(u => u[1]),
                      backgroundColor: 'rgba(147, 51, 234, 0.8)',
                      borderRadius: 8,
                      borderWidth: 0
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        cornerRadius: 8
                      }
                    },
                    scales: {
                      y: { beginAtZero: true, ticks: { stepSize: 1 } }
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-8 animate-fadeIn">
        <div className="bg-gradient-to-br from-blue-500 to-cyan-600 p-3 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-white/90">Toplam Yorum</p>
              <p className="text-xl sm:text-3xl font-bold text-white mt-1 sm:mt-2">{stats.total}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 sm:p-4">
              <MessageSquare className="w-5 sm:w-8 h-5 sm:h-8 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-500 to-orange-600 p-3 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-white/90">Bekleyen</p>
              <p className="text-xl sm:text-3xl font-bold text-white mt-1 sm:mt-2">{stats.pending}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 sm:p-4">
              <Clock className="w-5 sm:w-8 h-5 sm:h-8 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-3 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-white/90">Onaylanan</p>
              <p className="text-xl sm:text-3xl font-bold text-white mt-1 sm:mt-2">{stats.approved}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 sm:p-4">
              <ThumbsUp className="w-5 sm:w-8 h-5 sm:h-8 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-3 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-white/90">Ortalama Puan</p>
              <p className="text-xl sm:text-3xl font-bold text-white mt-1 sm:mt-2">{stats.avgRating}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 sm:p-4">
              <Star className="w-5 sm:w-8 h-5 sm:h-8 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content with Sidebar */}
      <div className="flex flex-col lg:flex-row gap-6 animate-fadeIn">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="lg:hidden fixed bottom-6 right-6 z-30 p-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all"
        >
          <Filter className="w-6 h-6" />
        </button>

        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar Filters */}
        <div className="w-full lg:w-80 flex-shrink-0">
          <div className={`fixed lg:sticky top-0 left-0 h-screen lg:h-auto w-full lg:w-80 bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg p-6 z-40 transition-transform duration-300 ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          } lg:top-6`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-bold text-gray-900">Filtreler</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={clearFilters}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-semibold"
                >
                  Temizle
                </button>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="lg:hidden text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="space-y-6">
              {/* Search */}
              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2">Arama</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 sm:w-4 h-3 sm:h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Kullanıcı veya yorum ara..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="w-full pl-9 pr-3 py-2 bg-white border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">Durum</label>
                <div className="space-y-2">
                  {[{ value: 'pending', label: 'Bekleyen', count: stats.pending }, 
                    { value: 'approved', label: 'Onaylanan', count: stats.approved }].map(status => (
                    <label key={status.value} className="flex items-center justify-between p-2 rounded-lg hover:bg-indigo-50 cursor-pointer transition-colors">
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="status"
                          value={status.value}
                          checked={activeTab === status.value}
                          onChange={(e) => { setActiveTab(e.target.value as any); setCurrentPage(1); }}
                          className="w-4 h-4 text-indigo-600"
                        />
                        <span className="text-sm font-medium text-gray-700">{status.label}</span>
                      </div>
                      <span className="text-xs font-bold text-gray-500">{status.count}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Rating Filter */}
              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-3">Puan</label>
                <select
                  value={ratingFilter}
                  onChange={(e) => { setRatingFilter(e.target.value === 'all' ? 'all' : Number(e.target.value)); setCurrentPage(1); }}
                  className="w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm font-medium"
                >
                  <option value="all">Tüm Puanlar</option>
                  <option value={5}>5 Yıldız</option>
                  <option value={4}>4 Yıldız</option>
                  <option value={3}>3 Yıldız</option>
                  <option value={2}>2 Yıldız</option>
                  <option value={1}>1 Yıldız</option>
                </select>
              </div>

              {/* Items Per Page */}
              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-3">Sayfa Başına</label>
                <select
                  value={itemsPerPage}
                  onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                  className="w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm font-medium"
                >
                  <option value={5}>5 yorum</option>
                  <option value={10}>10 yorum</option>
                  <option value={20}>20 yorum</option>
                  <option value={50}>50 yorum</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews Content */}
        <div className="flex-1">
          <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <h3 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Yorumlar ({filteredReviews.length})
                </h3>
                {selectedReviews.length > 0 && (
                  <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-bold">
                    {selectedReviews.length} seçili
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600">
                Sayfa {currentPage} / {totalPages || 1}
              </p>
            </div>

            {/* Bulk Actions */}
            {paginatedReviews.length > 0 && (
              <div className="mb-6 p-3 sm:p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border-2 border-indigo-200">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                  <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                    <button
                      onClick={toggleSelectAll}
                      className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white border-2 border-indigo-300 rounded-lg hover:bg-indigo-50 transition-all font-semibold text-xs sm:text-sm text-gray-700 min-h-[40px] touch-manipulation"
                    >
                      {paginatedReviews.every(r => selectedReviews.includes(r.id)) ? (
                        <CheckSquare className="w-4 sm:w-5 h-4 sm:h-5 text-indigo-600" />
                      ) : (
                        <Square className="w-4 sm:w-5 h-4 sm:h-5 text-gray-400" />
                      )}
                      <span className="hidden sm:inline">{paginatedReviews.every(r => selectedReviews.includes(r.id)) ? 'Tümünü Kaldır' : 'Tümünü Seç'}</span>
                      <span className="sm:hidden">{paginatedReviews.every(r => selectedReviews.includes(r.id)) ? 'Kaldır' : 'Seç'}</span>
                    </button>
                    <span className="text-xs sm:text-sm text-gray-600">
                      {selectedReviews.length} / {paginatedReviews.length} yorum seçildi
                    </span>
                  </div>
                  
                  {selectedReviews.length > 0 && (
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      {activeTab === 'pending' && (
                        <button
                          onClick={() => handleBulkAction('approve')}
                          className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 font-semibold text-xs sm:text-sm min-h-[40px] touch-manipulation"
                        >
                          <Check className="w-3 sm:w-4 h-3 sm:h-4" />
                          <span className="hidden sm:inline">Toplu Onayla</span>
                          <span className="sm:hidden">Onayla</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleBulkAction('delete')}
                        className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 font-semibold text-xs sm:text-sm min-h-[40px] touch-manipulation"
                      >
                        <Trash2 className="w-3 sm:w-4 h-3 sm:h-4" />
                        <span className="hidden sm:inline">Toplu Sil</span>
                        <span className="sm:hidden">Sil</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {paginatedReviews.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">
                  {activeTab === 'pending' ? 'Onay bekleyen yorum bulunmuyor' : 'Onaylanmış yorum bulunmuyor'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {paginatedReviews.map(review => {
                  const book = review.bookId ? books[review.bookId] : null;
                  return (
                  <div key={review.id} className={`bg-gradient-to-r from-white to-indigo-50/30 p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border-2 ${
                    selectedReviews.includes(review.id) ? 'border-indigo-500 bg-indigo-50/50' : 'border-transparent hover:border-indigo-200'
                  }`}>
                    <div className="flex gap-6">
                      {/* Checkbox */}
                      <div className="flex items-start pt-2">
                        <button
                          onClick={() => toggleSelectReview(review.id)}
                          className="p-1 hover:bg-indigo-100 rounded transition-colors"
                        >
                          {selectedReviews.includes(review.id) ? (
                            <CheckSquare className="w-6 h-6 text-indigo-600" />
                          ) : (
                            <Square className="w-6 h-6 text-gray-400" />
                          )}
                        </button>
                      </div>

                      {/* Book Cover */}
                      {book && (
                        <div className="flex-shrink-0">
                          <img
                            src={`https://us-central1-data-49543.cloudfunctions.net/imageProxy?url=${encodeURIComponent(book.coverImage)}`}
                            alt={book.title}
                            className="w-24 h-32 object-cover rounded-lg shadow-md"
                          />
                        </div>
                      )}

                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <User className="w-5 h-5 text-indigo-600" />
                              <h4 className="text-lg font-bold text-gray-900">{review.userDisplayName}</h4>
                              {renderStars(review.rating)}
                            </div>
                            {book && (
                              <div className="flex items-center gap-2 mb-2 p-2 bg-indigo-50 rounded-lg">
                                <BookOpen className="w-4 h-4 text-indigo-600" />
                                <div>
                                  <p className="text-sm font-bold text-gray-900">{book.title}</p>
                                  <p className="text-xs text-gray-600">{book.author}</p>
                                </div>
                              </div>
                            )}
                            <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4 text-indigo-600" />
                                <span>{review.createdAt?.toDate().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <p className="text-gray-700 mb-4 leading-relaxed">{review.reviewText}</p>
                        
                        <div className="flex gap-2">
                          {activeTab === 'pending' && (
                            <>
                              <button
                                onClick={() => handleUpdateStatus(review.id, 'approved')}
                                className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-all duration-200 flex items-center gap-2 font-semibold text-sm"
                              >
                                <Check className="w-4 h-4" />
                                Onayla
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(review.id, 'rejected')}
                                className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-all duration-200 flex items-center gap-2 font-semibold text-sm"
                              >
                                <X className="w-4 h-4" />
                                Reddet
                              </button>
                            </>
                          )}
                          {activeTab === 'approved' && (
                            <button
                              onClick={() => handleDelete(review.id)}
                              className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-all duration-200 flex items-center gap-2 font-semibold text-sm"
                            >
                              <Trash2 className="w-4 h-4" />
                              Sil
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">{filteredReviews.length}</span> sonuçtan <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> - <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredReviews.length)}</span> arası gösteriliyor
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="px-3 py-2 bg-white border-2 border-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold text-sm"
                  >
                    «İlk
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 bg-white border-2 border-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 font-semibold"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Önceki
                  </button>
                  
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-10 h-10 rounded-lg font-semibold transition-all duration-200 ${
                            currentPage === pageNum
                              ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                              : 'bg-white border-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 bg-white border-2 border-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 font-semibold"
                  >
                    Sonraki
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 bg-white border-2 border-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold text-sm"
                  >
                    Son»
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewManagementTab;
