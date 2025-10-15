
import React, { useState, useEffect, useMemo } from 'react';
import { useGameReservations } from '../../../contexts/GameReservationContext';
import { ChevronLeft, ChevronRight, Calendar, Clock, Users, XCircle, CheckCircle, Gamepad2, Search, Filter, User, ArrowUpDown, BarChart3, TrendingUp, CheckSquare, Square, X } from 'lucide-react';
import { Line, Bar, Pie } from 'react-chartjs-2';
import { db } from '../../../firebase/config';
import { collection, getDocs } from 'firebase/firestore';

const ITEMS_PER_PAGE = 10;

const AdminGameReservationsTab = () => {
  const { getAllReservations, cancelReservationByAdmin } = useGameReservations();
  const [reservations, setReservations] = useState([]);
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState('desc');
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [gameFilter, setGameFilter] = useState('all');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [selectedReservations, setSelectedReservations] = useState<string[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const usersCol = collection(db, 'users');
      const userSnapshot = await getDocs(usersCol);
      const usersData = {};
      userSnapshot.forEach(doc => {
        usersData[doc.id] = doc.data().displayName;
      });
      setUsers(usersData);

      const reservationsData = await getAllReservations();
      setReservations(reservationsData);
      setLoading(false);
    };
    fetchData();
  }, [getAllReservations]);

  const handleCancelReservation = async (reservationId) => {
    if (window.confirm('Bu randevuyu iptal etmek istediğinizden emin misiniz?')) {
      try {
        await cancelReservationByAdmin(reservationId);
        alert('Randevu başarıyla iptal edildi.');
        const reservationsData = await getAllReservations();
        setReservations(reservationsData);
      } catch (error) {
        console.error('Error cancelling reservation:', error);
        alert('Randevu iptal edilirken bir hata oluştu.');
      }
    }
  };

  const toggleSelectReservation = (reservationId: string) => {
    setSelectedReservations(prev => 
      prev.includes(reservationId) ? prev.filter(id => id !== reservationId) : [...prev, reservationId]
    );
  };

  const toggleSelectAll = () => {
    const currentPageIds = paginatedReservations.map(r => r.id);
    const allSelected = currentPageIds.every(id => selectedReservations.includes(id));
    
    if (allSelected) {
      setSelectedReservations(prev => prev.filter(id => !currentPageIds.includes(id)));
    } else {
      setSelectedReservations(prev => [...new Set([...prev, ...currentPageIds])]);
    }
  };

  const handleBulkCancel = async () => {
    if (selectedReservations.length === 0) {
      alert('Lütfen en az bir randevu seçin.');
      return;
    }

    const activeSelected = selectedReservations.filter(id => {
      const res = reservations.find(r => r.id === id);
      return res && res.status === 'confirmed' && res.endTime.toDate() > new Date();
    });

    if (activeSelected.length === 0) {
      alert('Seçili randevular arasında iptal edilebilir aktif randevu bulunmuyor.');
      return;
    }

    if (!window.confirm(`${activeSelected.length} aktif randevuyu iptal etmek istediğinizden emin misiniz?`)) {
      return;
    }

    try {
      await Promise.all(activeSelected.map(id => cancelReservationByAdmin(id)));
      setSelectedReservations([]);
      alert(`${activeSelected.length} randevu başarıyla iptal edildi.`);
      const reservationsData = await getAllReservations();
      setReservations(reservationsData);
    } catch (error) {
      console.error('Bulk cancel error:', error);
      alert('Toplu iptal sırasında bir hata oluştu.');
    }
  };

  const uniqueGames = useMemo(() => {
    const games = new Set(reservations.map(r => r.gameName));
    return Array.from(games);
  }, [reservations]);

  const sortedAndFilteredReservations = useMemo(() => {
    let filtered = reservations;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(r => 
        r.gameName.toLowerCase().includes(term) ||
        (users[r.userId] || '').toLowerCase().includes(term)
      );
    }

    if (gameFilter !== 'all') {
      filtered = filtered.filter(r => r.gameName === gameFilter);
    }

    if (filterStatus !== 'all') {
        filtered = filtered.filter(r => {
            const now = new Date();
            const isPast = r.endTime.toDate() <= now;
            const isActive = r.endTime.toDate() > now && r.status === 'confirmed';
            const isCancelled = r.status.startsWith('cancelled');

            if (filterStatus === 'active') return isActive;
            if (filterStatus === 'past') return isPast && !isCancelled;
            if (filterStatus === 'cancelled') return isCancelled;
            return true;
        });
    }

    return [...filtered].sort((a, b) => {
      const dateA = a.startTime.toDate().getTime();
      const dateB = b.startTime.toDate().getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });
  }, [reservations, sortOrder, filterStatus, searchTerm, gameFilter, users]);

  const stats = useMemo(() => {
    const now = new Date();
    return {
      total: reservations.length,
      active: reservations.filter(r => r.endTime.toDate() > now && r.status === 'confirmed').length,
      completed: reservations.filter(r => r.endTime.toDate() <= now && !r.status.startsWith('cancelled')).length,
      cancelled: reservations.filter(r => r.status.startsWith('cancelled')).length
    };
  }, [reservations]);

  const totalPages = Math.ceil(sortedAndFilteredReservations.length / itemsPerPage);
  const paginatedReservations = sortedAndFilteredReservations.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const analyticsData = useMemo(() => {
    const now = new Date();
    const last7Days = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      last7Days.push({
        day: date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
        date: date.toDateString()
      });
    }

    const dailyData = last7Days.map(({ date }) => {
      return reservations.filter(r => {
        const resDate = r.startTime.toDate().toDateString();
        return resDate === date;
      }).length;
    });

    const gameDistribution = reservations.reduce((acc, r) => {
      acc[r.gameName] = (acc[r.gameName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topGames = Object.entries(gameDistribution)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const hourDistribution = reservations.reduce((acc, r) => {
      const hour = r.startTime.toDate().getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const popularHours = Object.entries(hourDistribution)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .sort((a, b) => Number(a[0]) - Number(b[0]));

    const occupancyRate = stats.total > 0 ? ((stats.active + stats.completed) / stats.total * 100).toFixed(1) : '0';

    return {
      labels: last7Days.map(d => d.day),
      dailyData,
      topGames,
      popularHours,
      occupancyRate
    };
  }, [reservations, stats]);

  const clearFilters = () => {
    setSearchTerm('');
    setFilterStatus('all');
    setGameFilter('all');
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-lg font-semibold text-gray-700">Randevular yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
      {/* Header */}
      <div className="mb-4 md:mb-8 animate-fadeIn">
        <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg p-4 md:p-6">
          <h2 className="text-xl md:text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2 md:mb-3 flex items-center">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-2 md:p-3 rounded-xl mr-2 md:mr-3">
              <Gamepad2 className="w-5 h-5 md:w-7 md:h-7 text-white" />
            </div>
            Oyun Randevu Yönetimi
          </h2>
          <p className="text-gray-600 text-sm md:text-lg">Tüm oyun randevularını görüntüleyin ve yönetin.</p>
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
              <p className="text-sm text-gray-600">Detaylı grafikler, oyun dağılımı ve popüler saatler</p>
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
          {/* Daily Trend */}
          <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg p-6">
            <h3 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              Günlük Randevu Trendi (Son 7 Gün)
            </h3>
            <div className="h-80">
              <Line
                data={{
                  labels: analyticsData.labels,
                  datasets: [{
                    label: 'Randevu Sayısı',
                    data: analyticsData.dailyData,
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

          {/* Game Distribution & Popular Hours */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Game Distribution */}
            <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg p-6">
              <h3 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">Oyun Dağılımı</h3>
              <div className="h-80">
                <Pie
                  data={{
                    labels: analyticsData.topGames.map(g => g[0]),
                    datasets: [{
                      data: analyticsData.topGames.map(g => g[1]),
                      backgroundColor: [
                        'rgba(239, 68, 68, 0.8)',
                        'rgba(249, 115, 22, 0.8)',
                        'rgba(234, 179, 8, 0.8)',
                        'rgba(34, 197, 94, 0.8)',
                        'rgba(59, 130, 246, 0.8)'
                      ],
                      borderWidth: 2,
                      borderColor: '#fff'
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { position: 'bottom', labels: { padding: 15, font: { size: 12 } } },
                      tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                          label: (context: any) => {
                            const total = analyticsData.topGames.reduce((sum, g) => sum + g[1], 0);
                            const percentage = ((context.parsed / total) * 100).toFixed(1);
                            return `${context.label}: ${context.parsed} (${percentage}%)`;
                          }
                        }
                      }
                    }
                  }}
                />
              </div>
            </div>

            {/* Popular Hours */}
            <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg p-6">
              <h3 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">En Popüler Saatler</h3>
              <div className="h-80">
                <Bar
                  data={{
                    labels: analyticsData.popularHours.map(h => `${h[0]}:00`),
                    datasets: [{
                      label: 'Randevu Sayısı',
                      data: analyticsData.popularHours.map(h => h[1]),
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

          {/* Occupancy Rate */}
          <div className="bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold mb-2">Doluluk Oranı</h3>
                <p className="text-white/90">Tamamlanan ve aktif randevuların toplam randevulara oranı</p>
              </div>
              <div className="text-right">
                <p className="text-6xl font-bold">{analyticsData.occupancyRate}%</p>
                <p className="text-sm text-white/90 mt-2">{stats.active + stats.completed} / {stats.total} randevu</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-4 md:mb-8 animate-fadeIn">
        <div className="bg-gradient-to-br from-blue-500 to-cyan-600 p-3 md:p-6 rounded-xl md:rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm font-medium text-white/90">Toplam Randevu</p>
              <p className="text-xl md:text-3xl font-bold text-white mt-1 md:mt-2">{stats.total}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 md:p-4">
              <Calendar className="w-5 h-5 md:w-8 md:h-8 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-3 md:p-6 rounded-xl md:rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm font-medium text-white/90">Aktif Randevu</p>
              <p className="text-xl md:text-3xl font-bold text-white mt-1 md:mt-2">{stats.active}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 md:p-4">
              <CheckCircle className="w-5 h-5 md:w-8 md:h-8 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-3 md:p-6 rounded-xl md:rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm font-medium text-white/90">Tamamlanan</p>
              <p className="text-xl md:text-3xl font-bold text-white mt-1 md:mt-2">{stats.completed}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 md:p-4">
              <Clock className="w-5 h-5 md:w-8 md:h-8 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-orange-600 p-3 md:p-6 rounded-xl md:rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm font-medium text-white/90">İptal Edilen</p>
              <p className="text-xl md:text-3xl font-bold text-white mt-1 md:mt-2">{stats.cancelled}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 md:p-4">
              <XCircle className="w-5 h-5 md:w-8 md:h-8 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content with Sidebar */}
      <div className="flex flex-col lg:flex-row gap-4 md:gap-6 animate-fadeIn">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="lg:hidden fixed bottom-6 right-6 z-30 p-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all"
        >
          <Filter className="w-6 h-6" />
        </button>

        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar Filters */}
        <div className="w-full lg:w-80 flex-shrink-0">
          <div className={`fixed lg:sticky top-0 left-0 h-screen lg:h-auto w-full lg:w-80 bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg p-4 md:p-6 z-50 transition-transform duration-300 ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          } lg:top-6`}>
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 md:w-5 md:h-5 text-indigo-600" />
                <h3 className="text-base md:text-lg font-bold text-gray-900">Filtreler</h3>
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

            <div className="space-y-4 md:space-y-6">
              {/* Search */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Arama</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Oyun veya kullanıcı ara..."
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
                  {[{ value: 'all', label: 'Tümü', count: stats.total }, 
                    { value: 'active', label: 'Aktif', count: stats.active },
                    { value: 'past', label: 'Tamamlanan', count: stats.completed },
                    { value: 'cancelled', label: 'İptal Edilen', count: stats.cancelled }].map(status => (
                    <label key={status.value} className="flex items-center justify-between p-2 rounded-lg hover:bg-indigo-50 cursor-pointer transition-colors">
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="status"
                          value={status.value}
                          checked={filterStatus === status.value}
                          onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                          className="w-4 h-4 text-indigo-600"
                        />
                        <span className="text-sm font-medium text-gray-700">{status.label}</span>
                      </div>
                      <span className="text-xs font-bold text-gray-500">{status.count}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Game Filter */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">Oyun</label>
                <select
                  value={gameFilter}
                  onChange={(e) => { setGameFilter(e.target.value); setCurrentPage(1); }}
                  className="w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm font-medium"
                >
                  <option value="all">Tüm Oyunlar</option>
                  {uniqueGames.map(game => <option key={game} value={game}>{game}</option>)}
                </select>
              </div>

              {/* Sort */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">Sıralama</label>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="w-full px-3 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 font-semibold text-sm"
                >
                  <ArrowUpDown className="w-4 h-4" />
                  {sortOrder === 'asc' ? 'Eskiye Göre' : 'Yeniye Göre'}
                </button>
              </div>

              {/* Items Per Page */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">Sayfa Başına</label>
                <select
                  value={itemsPerPage}
                  onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                  className="w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm font-medium"
                >
                  <option value={5}>5 randevu</option>
                  <option value={10}>10 randevu</option>
                  <option value={20}>20 randevu</option>
                  <option value={50}>50 randevu</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Reservations List */}
        <div className="flex-1">
          <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg p-4 md:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 md:mb-6">
              <div className="flex items-center gap-2 md:gap-4">
                <h3 className="text-lg md:text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Randevular ({sortedAndFilteredReservations.length})
                </h3>
                {selectedReservations.length > 0 && (
                  <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-bold">
                    {selectedReservations.length} seçili
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600">
                Sayfa {currentPage} / {totalPages || 1}
              </p>
            </div>

            {/* Bulk Actions */}
            {paginatedReservations.length > 0 && (
              <div className="mb-4 md:mb-6 p-3 md:p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border-2 border-indigo-200">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={toggleSelectAll}
                      className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-indigo-300 rounded-lg hover:bg-indigo-50 transition-all font-semibold text-sm text-gray-700"
                    >
                      {paginatedReservations.every(r => selectedReservations.includes(r.id)) ? (
                        <CheckSquare className="w-5 h-5 text-indigo-600" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-400" />
                      )}
                      {paginatedReservations.every(r => selectedReservations.includes(r.id)) ? 'Tümünü Kaldır' : 'Tümünü Seç'}
                    </button>
                    <span className="text-sm text-gray-600">
                      {selectedReservations.length} / {paginatedReservations.length} randevu seçildi
                    </span>
                  </div>
                  
                  {selectedReservations.length > 0 && (
                    <button
                      onClick={handleBulkCancel}
                      className="px-4 py-2 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all duration-300 flex items-center gap-2 font-semibold text-sm"
                    >
                      <XCircle className="w-4 h-4" />
                      Toplu İptal Et
                    </button>
                  )}
                </div>
              </div>
            )}

            {paginatedReservations.length > 0 ? (
              <div className="space-y-3 md:space-y-4">
                {paginatedReservations.map(res => {
                  const now = new Date();
                  const isActive = res.endTime.toDate() > now && res.status === 'confirmed';
                  const isPast = res.endTime.toDate() <= now && !res.status.startsWith('cancelled');
                  const isCancelled = res.status.startsWith('cancelled');
                  
                  return (
                    <div key={res.id} className={`bg-gradient-to-r from-white to-indigo-50/30 p-4 md:p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border-2 ${
                      selectedReservations.includes(res.id) ? 'border-indigo-500 bg-indigo-50/50' : 'border-transparent hover:border-indigo-200'
                    }`}>
                      <div className="flex items-start justify-between gap-6">
                        {/* Checkbox */}
                        <div className="flex items-start pt-2">
                          <button
                            onClick={() => toggleSelectReservation(res.id)}
                            className="p-1 hover:bg-indigo-100 rounded transition-colors"
                          >
                            {selectedReservations.includes(res.id) ? (
                              <CheckSquare className="w-6 h-6 text-indigo-600" />
                            ) : (
                              <Square className="w-6 h-6 text-gray-400" />
                            )}
                          </button>
                        </div>
                        <div className="flex-1">
                          <div className="flex flex-col sm:flex-row items-start justify-between gap-3 mb-3">
                            <div className="flex-1 w-full">
                              <div className="flex items-center gap-2 md:gap-3 mb-2">
                                <Gamepad2 className="w-4 h-4 md:w-5 md:h-5 text-indigo-600" />
                                <h3 className="text-lg md:text-xl font-bold text-gray-900">{res.gameName}</h3>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs md:text-sm text-gray-600 mb-2">
                                <div className="flex items-center gap-1">
                                  <User className="w-3 h-3 md:w-4 md:h-4 text-indigo-600" />
                                  <span className="font-medium">{users[res.userId] || res.userId}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3 md:w-4 md:h-4 text-indigo-600" />
                                  <span>{res.startTime.toDate().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3 md:w-4 md:h-4 text-indigo-600" />
                                  <span className="font-semibold">{res.startTime.toDate().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} - {res.endTime.toDate().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                              </div>
                            </div>
                            
                            <span className={`px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-bold whitespace-nowrap ${
                              isActive ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white' : 
                              isPast ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white' : 
                              'bg-gradient-to-r from-red-500 to-orange-600 text-white'
                            }`}>
                              {isActive ? 'Aktif' : isPast ? 'Tamamlandı' : (res.status === 'cancelled-by-user' ? 'Kullanıcı İptal' : 'Admin İptal')}
                            </span>
                          </div>
                          
                          {isActive && (
                            <button
                              onClick={() => handleCancelReservation(res.id)}
                              className="px-4 py-2 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all duration-300 flex items-center gap-2 font-semibold text-sm"
                            >
                              <XCircle className="w-4 h-4" />
                              Randevuyu İptal Et
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">Filtre kriterlerine uygun randevu bulunamadı.</p>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">{sortedAndFilteredReservations.length}</span> sonuçtan <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> - <span className="font-medium">{Math.min(currentPage * itemsPerPage, sortedAndFilteredReservations.length)}</span> arası gösteriliyor
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Sayfa:</span>
                    <select
                      value={currentPage}
                      onChange={(e) => setCurrentPage(Number(e.target.value))}
                      className="px-3 py-1 bg-white border-2 border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
                    >
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <option key={page} value={page}>{page}</option>
                      ))}
                    </select>
                    <span className="text-sm text-gray-600">/ {totalPages}</span>
                  </div>
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
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-4 py-2 bg-white border-2 border-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 font-semibold"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Önceki
                  </button>
                  
                  {/* Page Numbers */}
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
                          onClick={() => handlePageChange(pageNum)}
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
                    onClick={() => handlePageChange(currentPage + 1)}
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

export default AdminGameReservationsTab;
