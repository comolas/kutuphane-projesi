import React, { useState, useMemo } from 'react';
import { useRequests } from '../../contexts/RequestContext';
import { MessageSquare, Search, Filter, User, Clock, AlertCircle, CheckCircle, ChevronDown, ChevronUp, Send, X, BarChart3, TrendingUp, CheckSquare, Square, Trash2 } from 'lucide-react';
import { Line, Bar, Pie } from 'react-chartjs-2';
import Swal from 'sweetalert2';

const RequestsTab: React.FC = () => {
  const { requests, loading, sendResponse, updateRequestStatus } = useRequests();
  const [requestSortBy, setRequestSortBy] = useState<'createdAt' | 'priority'>('createdAt');
  const [requestSortOrder, setRequestSortOrder] = useState<'asc' | 'desc'>('desc');
  const [requestStatusFilter, setRequestStatusFilter] = useState<'all' | 'pending' | 'in-progress' | 'completed'>('all');
  const [requestPriorityFilter, setRequestPriorityFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [requestCategoryFilter, setRequestCategoryFilter] = useState<'all' | 'Kitap Önerisi' | 'Teknik Sorun' | 'Üyelik Bilgileri' | 'Genel Geri Bildirim'>('all');
  const [requestSearchQuery, setRequestSearchQuery] = useState('');
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [responseText, setResponseText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);

  const stats = useMemo(() => {
    const total = requests.length;
    const pending = requests.filter(r => r.status === 'pending').length;
    const inProgress = requests.filter(r => r.status === 'in-progress').length;
    const completed = requests.filter(r => r.status === 'completed').length;
    return { total, pending, inProgress, completed };
  }, [requests]);

  const analyticsData = useMemo(() => {
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
      return requests.filter(r => {
        const reqDate = r.createdAt;
        return reqDate.getMonth() === monthIndex && reqDate.getFullYear() === year;
      }).length;
    });

    // Kategori dağılımı
    const categoryData = ['Kitap Önerisi', 'Teknik Sorun', 'Üyelik Bilgileri', 'Genel Geri Bildirim'].map(cat =>
      requests.filter(r => r.category === cat).length
    );

    // Öncelik dağılımı
    const priorityData = [1, 2, 3].map(p => {
      const priority = p === 3 ? 'high' : p === 2 ? 'medium' : 'low';
      return requests.filter(r => r.priority === priority).length;
    });

    // En aktif kullanıcılar
    const userCounts = requests.reduce((acc, r) => {
      const userName = r.userData?.displayName || 'Bilinmeyen';
      acc[userName] = (acc[userName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topUsers = Object.entries(userCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      labels: last6Months.map(m => m.month),
      monthlyData,
      categoryData,
      priorityData,
      topUsers
    };
  }, [requests]);

  const handleSendResponse = async () => {
    if (!selectedRequest || !responseText.trim()) return;
    await sendResponse(selectedRequest.id, responseText);
    setSelectedRequest(null);
    setResponseText('');
  };

  const toggleSelectRequest = (requestId: string) => {
    setSelectedRequests(prev => 
      prev.includes(requestId) ? prev.filter(id => id !== requestId) : [...prev, requestId]
    );
  };

  const toggleSelectAll = () => {
    const currentPageIds = paginatedRequests.map(r => r.id);
    const allSelected = currentPageIds.every(id => selectedRequests.includes(id));
    
    if (allSelected) {
      setSelectedRequests(prev => prev.filter(id => !currentPageIds.includes(id)));
    } else {
      setSelectedRequests(prev => [...new Set([...prev, ...currentPageIds])]);
    }
  };

  const handleBulkStatusChange = async (status: 'in-progress' | 'completed') => {
    if (selectedRequests.length === 0) {
      Swal.fire('Uyarı', 'Lütfen en az bir talep seçin.', 'warning');
      return;
    }

    const statusText = status === 'in-progress' ? 'İşleme Al' : 'Tamamla';
    const result = await Swal.fire({
      title: 'Emin misiniz?',
      text: `${selectedRequests.length} talebi "${statusText}" olarak işaretlemek istediğinizden emin misiniz?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: status === 'completed' ? '#10b981' : '#3b82f6',
      cancelButtonColor: '#6b7280',
      confirmButtonText: `Evet, ${statusText}!`,
      cancelButtonText: 'Vazgeç'
    });

    if (!result.isConfirmed) return;

    try {
      await Promise.all(selectedRequests.map(id => updateRequestStatus(id, status)));
      setSelectedRequests([]);
      Swal.fire('Başarılı!', `${selectedRequests.length} talep başarıyla güncellendi.`, 'success');
    } catch (error) {
      console.error('Bulk status change error:', error);
      Swal.fire('Hata!', 'İşlem sırasında bir hata oluştu.', 'error');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRequests.length === 0) {
      Swal.fire('Uyarı', 'Lütfen en az bir talep seçin.', 'warning');
      return;
    }

    const result = await Swal.fire({
      title: 'Emin misiniz?',
      text: `${selectedRequests.length} talebi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Evet, sil!',
      cancelButtonText: 'Vazgeç'
    });

    if (!result.isConfirmed) return;

    try {
      // Note: updateRequestStatus fonksiyonu ile silme işlemi yapılabilir veya ayrı bir delete fonksiyonu eklenebilir
      Swal.fire('Bilgi', 'Silme işlemi için backend desteği gereklidir.', 'info');
      setSelectedRequests([]);
    } catch (error) {
      console.error('Bulk delete error:', error);
      Swal.fire('Hata!', 'İşlem sırasında bir hata oluştu.', 'error');
    }
  };

  const filteredRequests = requests
    .filter(request => {
      const matchesSearch = 
        request.title.toLowerCase().includes(requestSearchQuery.toLowerCase()) ||
        request.content.toLowerCase().includes(requestSearchQuery.toLowerCase()) ||
        request.userData?.displayName?.toLowerCase().includes(requestSearchQuery.toLowerCase());

      const matchesStatus = requestStatusFilter === 'all' || request.status === requestStatusFilter;
      const matchesPriority = requestPriorityFilter === 'all' || request.priority === requestPriorityFilter;
      const matchesCategory = requestCategoryFilter === 'all' || request.category === requestCategoryFilter;

      return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
    })
    .sort((a, b) => {
      if (requestSortBy === 'priority') {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const priorityA = priorityOrder[a.priority];
        const priorityB = priorityOrder[b.priority];
        return requestSortOrder === 'asc' ? priorityA - priorityB : priorityB - priorityA;
      } else {
        return requestSortOrder === 'asc'
          ? a.createdAt.getTime() - b.createdAt.getTime()
          : b.createdAt.getTime() - a.createdAt.getTime();
      }
    });

  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const paginatedRequests = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRequests.slice(start, start + itemsPerPage);
  }, [filteredRequests, currentPage, itemsPerPage]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-lg font-semibold text-gray-700">Talepler yükleniyor...</p>
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
            Gönderilen Talepler
          </h2>
          <p className="text-gray-600 text-lg">Kullanıcı taleplerini yönetin ve yanıtlayın.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8 animate-fadeIn">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-white/90">Toplam Talepler</p>
              <p className="text-xl sm:text-3xl font-bold text-white mt-1 sm:mt-2">{stats.total}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 sm:p-4">
              <MessageSquare className="w-5 h-5 sm:w-8 sm:h-8 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-500 to-orange-600 p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-white/90">Bekleyen</p>
              <p className="text-xl sm:text-3xl font-bold text-white mt-1 sm:mt-2">{stats.pending}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 sm:p-4">
              <Clock className="w-5 h-5 sm:w-8 sm:h-8 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-cyan-600 p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-white/90">İşleniyor</p>
              <p className="text-xl sm:text-3xl font-bold text-white mt-1 sm:mt-2">{stats.inProgress}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 sm:p-4">
              <AlertCircle className="w-5 h-5 sm:w-8 sm:h-8 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-white/90">Tamamlanan</p>
              <p className="text-xl sm:text-3xl font-bold text-white mt-1 sm:mt-2">{stats.completed}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 sm:p-4">
              <CheckCircle className="w-5 h-5 sm:w-8 sm:h-8 text-white" />
            </div>
          </div>
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
              <p className="text-sm text-gray-600">Talep trendi, kategori dağılımı ve en aktif kullanıcılar</p>
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
              Aylık Talep Trendi (Son 6 Ay)
            </h3>
            <div className="h-80">
              <Line
                data={{
                  labels: analyticsData.labels,
                  datasets: [{
                    label: 'Talep Sayısı',
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

          {/* Category & Priority Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Distribution */}
            <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg p-6">
              <h3 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">Kategori Dağılımı</h3>
              <div className="h-80">
                <Pie
                  data={{
                    labels: ['Kitap Önerisi', 'Teknik Sorun', 'Üyelik Bilgileri', 'Genel Geri Bildirim'],
                    datasets: [{
                      data: analyticsData.categoryData,
                      backgroundColor: [
                        'rgba(99, 102, 241, 0.8)',
                        'rgba(236, 72, 153, 0.8)',
                        'rgba(34, 197, 94, 0.8)',
                        'rgba(251, 146, 60, 0.8)'
                      ],
                      borderWidth: 0
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { position: 'bottom' },
                      tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        cornerRadius: 8
                      }
                    }
                  }}
                />
              </div>
            </div>

            {/* Priority Distribution */}
            <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg p-6">
              <h3 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">Öncelik Dağılımı</h3>
              <div className="h-80">
                <Bar
                  data={{
                    labels: ['Düşük', 'Orta', 'Yüksek'],
                    datasets: [{
                      label: 'Talep Sayısı',
                      data: analyticsData.priorityData,
                      backgroundColor: [
                        'rgba(34, 197, 94, 0.8)',
                        'rgba(251, 146, 60, 0.8)',
                        'rgba(239, 68, 68, 0.8)'
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
          </div>

          {/* Top Users */}
          <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg p-6">
            <h3 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">En Aktif Kullanıcılar</h3>
            <div className="h-80">
              <Bar
                data={{
                  labels: analyticsData.topUsers.map(u => u[0]),
                  datasets: [{
                    label: 'Talep Sayısı',
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
      )}

      {/* Main Content with Sidebar */}
      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 animate-fadeIn">
        {/* Sidebar Filters */}
        <div className="w-full lg:w-80 flex-shrink-0">
          <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 lg:sticky lg:top-6">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
                <h3 className="text-base sm:text-lg font-bold text-gray-900">Filtreler</h3>
              </div>
            </div>

            <div className="space-y-4 sm:space-y-6">
              {/* Search */}
              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2">Arama</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Talep, kullanıcı ara..."
                    value={requestSearchQuery}
                    onChange={(e) => setRequestSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-xs sm:text-sm"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2 sm:mb-3">Durum</label>
                <div className="space-y-1 sm:space-y-2">
                  {[{ value: 'all', label: 'Tümü', count: stats.total }, 
                    { value: 'pending', label: 'Bekleyen', count: stats.pending },
                    { value: 'in-progress', label: 'İşleniyor', count: stats.inProgress },
                    { value: 'completed', label: 'Tamamlanan', count: stats.completed }].map(status => (
                    <label key={status.value} className="flex items-center justify-between p-2 rounded-lg hover:bg-indigo-50 cursor-pointer transition-colors touch-manipulation">
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="status"
                          value={status.value}
                          checked={requestStatusFilter === status.value}
                          onChange={(e) => setRequestStatusFilter(e.target.value as any)}
                          className="w-4 h-4 text-indigo-600"
                        />
                        <span className="text-xs sm:text-sm font-medium text-gray-700">{status.label}</span>
                      </div>
                      <span className="text-xs font-bold text-gray-500">{status.count}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Priority Filter */}
              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2 sm:mb-3">Öncelik</label>
                <select
                  value={requestPriorityFilter}
                  onChange={(e) => setRequestPriorityFilter(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-xs sm:text-sm font-medium"
                >
                  <option value="all">Tüm Öncelikler</option>
                  <option value="high">Yüksek</option>
                  <option value="medium">Orta</option>
                  <option value="low">Düşük</option>
                </select>
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2 sm:mb-3">Kategori</label>
                <select
                  value={requestCategoryFilter}
                  onChange={(e) => setRequestCategoryFilter(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-xs sm:text-sm font-medium"
                >
                  <option value="all">Tüm Kategoriler</option>
                  <option value="Kitap Önerisi">Kitap Önerisi</option>
                  <option value="Teknik Sorun">Teknik Sorun</option>
                  <option value="Üyelik Bilgileri">Üyelik Bilgileri</option>
                  <option value="Genel Geri Bildirim">Genel Geri Bildirim</option>
                </select>
              </div>

              {/* Items Per Page */}
              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2 sm:mb-3">Sayfa Başına</label>
                <select
                  value={itemsPerPage}
                  onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                  className="w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-xs sm:text-sm font-medium"
                >
                  <option value={10}>10 talep</option>
                  <option value={20}>20 talep</option>
                  <option value={50}>50 talep</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Requests Content */}
        <div className="flex-1">
          <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg p-6">

            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <h3 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Talepler ({filteredRequests.length})
                </h3>
                {selectedRequests.length > 0 && (
                  <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-bold">
                    {selectedRequests.length} seçili
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600">
                Sayfa {currentPage} / {totalPages || 1}
              </p>
            </div>

            {/* Bulk Actions */}
            {paginatedRequests.length > 0 && (
              <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border-2 border-indigo-200">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
                    <button
                      onClick={toggleSelectAll}
                      className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white border-2 border-indigo-300 rounded-lg hover:bg-indigo-50 transition-all font-semibold text-xs sm:text-sm text-gray-700 min-h-[40px] touch-manipulation w-full sm:w-auto justify-center"
                    >
                      {paginatedRequests.every(r => selectedRequests.includes(r.id)) ? (
                        <CheckSquare className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
                      ) : (
                        <Square className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                      )}
                      {paginatedRequests.every(r => selectedRequests.includes(r.id)) ? 'Tümünü Kaldır' : 'Tümünü Seç'}
                    </button>
                    <span className="text-xs sm:text-sm text-gray-600">
                      {selectedRequests.length} / {paginatedRequests.length} talep seçildi
                    </span>
                  </div>
                  
                  {selectedRequests.length > 0 && (
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => handleBulkStatusChange('in-progress')}
                        className="px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-lg hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 font-semibold text-xs sm:text-sm min-h-[40px] touch-manipulation"
                      >
                        <AlertCircle className="w-4 h-4" />
                        Toplu İşleme Al
                      </button>
                      <button
                        onClick={() => handleBulkStatusChange('completed')}
                        className="px-3 sm:px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 font-semibold text-xs sm:text-sm min-h-[40px] touch-manipulation"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Toplu Tamamla
                      </button>
                      <button
                        onClick={handleBulkDelete}
                        className="px-3 sm:px-4 py-2 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 font-semibold text-xs sm:text-sm min-h-[40px] touch-manipulation"
                      >
                        <Trash2 className="w-4 h-4" />
                        Toplu Sil
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {paginatedRequests.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">Talep bulunamadı</p>
              </div>
            ) : (
              <div className="space-y-4">
                {paginatedRequests.map((request) => (
                  <div key={request.id} className={`bg-gradient-to-r from-white to-indigo-50/30 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border-2 overflow-hidden ${
                    selectedRequests.includes(request.id) ? 'border-indigo-500 bg-indigo-50/50' : 'border-transparent hover:border-indigo-200'
                  }`}>
                    <div className="p-6 flex gap-4">
                      {/* Checkbox */}
                      <div className="flex items-start pt-1">
                        <button
                          onClick={() => toggleSelectRequest(request.id)}
                          className="p-1 hover:bg-indigo-100 rounded transition-colors"
                        >
                          {selectedRequests.includes(request.id) ? (
                            <CheckSquare className="w-6 h-6 text-indigo-600" />
                          ) : (
                            <Square className="w-6 h-6 text-gray-400" />
                          )}
                        </button>
                      </div>

                      <div className="flex-1">
                        <div
                          onClick={() => setExpandedRequestId(expandedRequestId === request.id ? null : request.id)}
                          className="cursor-pointer"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="text-lg font-bold text-gray-900">{request.title}</h4>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                  request.priority === 'high' ? 'bg-gradient-to-r from-red-500 to-pink-600 text-white' : 
                                  request.priority === 'medium' ? 'bg-gradient-to-r from-yellow-500 to-orange-600 text-white' : 
                                  'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
                                }`}>
                                  {request.priority === 'high' ? 'Yüksek' : request.priority === 'medium' ? 'Orta' : 'Düşük'}
                                </span>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                  request.status === 'completed' ? 'bg-green-100 text-green-700' : 
                                  request.status === 'in-progress' ? 'bg-blue-100 text-blue-700' : 
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {request.status === 'completed' ? 'Tamamlandı' : request.status === 'in-progress' ? 'İşleniyor' : 'Bekliyor'}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                                <div className="flex items-center gap-1">
                                  <User className="w-4 h-4 text-indigo-600" />
                                  <span>{request.userData?.displayName}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Clock className="w-4 h-4 text-indigo-600" />
                                  <span>{request.createdAt.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                </div>
                                <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-semibold">{request.category}</span>
                              </div>
                            </div>
                            <button className="p-2 hover:bg-indigo-100 rounded-lg transition-colors">
                              {expandedRequestId === request.id ? (
                                <ChevronUp className="w-5 h-5 text-gray-600" />
                              ) : (
                                <ChevronDown className="w-5 h-5 text-gray-600" />
                              )}
                            </button>
                          </div>
                          
                          {!expandedRequestId || expandedRequestId !== request.id ? (
                            <p className="text-gray-600 text-sm line-clamp-2 break-words">{request.content}</p>
                          ) : null}
                        </div>

                        {expandedRequestId === request.id && (
                          <div className="px-2 sm:px-6 pb-4 sm:pb-6 border-t border-gray-200 pt-4 ml-0 sm:ml-10">
                            <div className="bg-white rounded-lg p-3 sm:p-4 mb-4">
                              <p className="text-gray-700 leading-relaxed break-words whitespace-pre-wrap">{request.content}</p>
                            </div>
                            
                            {request.response && (
                              <div className="bg-indigo-50 rounded-lg p-3 sm:p-4 mb-4 border-2 border-indigo-200">
                                <div className="flex items-center gap-2 mb-2">
                                  <CheckCircle className="w-5 h-5 text-indigo-600" />
                                  <span className="font-bold text-indigo-900">Yanıt:</span>
                                </div>
                                <p className="text-gray-700 mb-2 break-words whitespace-pre-wrap">{request.response}</p>
                                <p className="text-sm text-gray-500">{request.responseDate?.toLocaleDateString('tr-TR')}</p>
                              </div>
                            )}
                            
                            <div className="flex flex-col sm:flex-row gap-2">
                              <button
                                onClick={(e) => { e.stopPropagation(); setSelectedRequest(request); }}
                                className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-all duration-200 flex items-center justify-center gap-2 font-semibold text-sm min-h-[40px] touch-manipulation"
                              >
                                <Send className="w-4 h-4" />
                                Yanıtla
                              </button>
                              {request.status === 'pending' && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); updateRequestStatus(request.id, 'in-progress'); }}
                                  className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-all duration-200 flex items-center justify-center gap-2 font-semibold text-sm min-h-[40px] touch-manipulation"
                                >
                                  <AlertCircle className="w-4 h-4" />
                                  İşleme Al
                                </button>
                              )}
                              {request.status === 'in-progress' && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); updateRequestStatus(request.id, 'completed'); }}
                                  className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-all duration-200 flex items-center justify-center gap-2 font-semibold text-sm min-h-[40px] touch-manipulation"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                  Tamamla
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 pt-6 border-t border-gray-200">
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
                    className="px-4 py-2 bg-white border-2 border-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold"
                  >
                    Önceki
                  </button>
                  
                  <span className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-semibold">
                    {currentPage} / {totalPages}
                  </span>
                  
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 bg-white border-2 border-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold"
                  >
                    Sonraki
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

      {/* Response Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => { setSelectedRequest(null); setResponseText(''); }}>
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl max-w-2xl w-full border-2 border-white/20" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Send className="w-6 h-6" />
                  Talebi Yanıtla
                </h3>
                <button
                  onClick={() => { setSelectedRequest(null); setResponseText(''); }}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="mb-4 p-4 bg-indigo-50 rounded-lg border-2 border-indigo-200">
                <div className="font-bold text-gray-900 mb-2">{selectedRequest.title}</div>
                <div className="text-gray-700 text-sm">{selectedRequest.content}</div>
                <div className="flex items-center gap-2 mt-3 text-xs text-gray-600">
                  <User className="w-4 h-4" />
                  <span>{selectedRequest.userData?.displayName}</span>
                </div>
              </div>
              
              <label className="block text-sm font-bold text-gray-700 mb-2">Yanıtınız</label>
              <textarea
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder="Yanıtınızı yazın..."
                className="w-full h-32 px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none transition-all"
              />
            </div>
            
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => { setSelectedRequest(null); setResponseText(''); }}
                className="px-6 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all font-semibold"
              >
                İptal
              </button>
              <button
                onClick={handleSendResponse}
                disabled={!responseText.trim()}
                className="px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-semibold"
              >
                <Send className="w-4 h-4" />
                Yanıtı Gönder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestsTab;