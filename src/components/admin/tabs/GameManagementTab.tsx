import React, { useState, useMemo } from 'react';
import { useGames, Game } from '../../../contexts/GameContext';
import GameModal from '../GameModal';
import { Plus, Edit, Trash2, Gamepad2, Search, Filter, Grid3x3, List, ChevronLeft, ChevronRight, TrendingUp, Users, Calendar, BarChart3, X } from 'lucide-react';
import { Bar, Pie } from 'react-chartjs-2';
import Swal from 'sweetalert2';

const GameManagementTab: React.FC = () => {
  const { games, addGame, updateGame, deleteGame, loading } = useGames();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [gameToEdit, setGameToEdit] = useState<Game | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleOpenModal = (game?: Game) => {
    setGameToEdit(game);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setGameToEdit(undefined);
    setIsModalOpen(false);
  };

  const handleSaveGame = async (gameData: Omit<Game, 'id'>) => {
    try {
      if (gameToEdit) {
        await updateGame(gameToEdit.id, gameData);
        Swal.fire('Başarılı!', 'Oyun başarıyla güncellendi.', 'success');
      } else {
        await addGame(gameData);
        Swal.fire('Başarılı!', 'Oyun başarıyla eklendi.', 'success');
      }
      handleCloseModal();
    } catch (error) {
      console.error("Failed to save game:", error);
      Swal.fire('Hata!', 'Oyun kaydedilirken bir hata oluştu.', 'error');
    }
  };

  const handleDeleteGame = async (id: string) => {
    Swal.fire({
      title: 'Emin misiniz?',
      text: "Bu oyunu silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Evet, sil!',
      cancelButtonText: 'İptal'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await deleteGame(id);
          Swal.fire(
            'Silindi!',
            'Oyun başarıyla silindi.',
            'success'
          )
        } catch (error) {
          console.error("Failed to delete game:", error);
          Swal.fire(
            'Hata!',
            'Oyun silinirken bir hata oluştu.',
            'error'
          )
        }
      }
    });
  };

  const filteredGames = useMemo(() => {
    if (!searchTerm) return games;
    const term = searchTerm.toLowerCase();
    return games.filter(g => 
      g.name.toLowerCase().includes(term) ||
      g.description?.toLowerCase().includes(term)
    );
  }, [games, searchTerm]);

  const paginatedGames = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredGames.slice(start, start + itemsPerPage);
  }, [filteredGames, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredGames.length / itemsPerPage);

  const stats = useMemo(() => ({
    total: games.length,
    withReservations: 0, // Bu veri randevu sisteminden gelebilir
    popular: games.length > 0 ? games[0]?.name : 'N/A'
  }), [games]);

  const analyticsData = useMemo(() => {
    // Simüle edilmiş kategori dağılımı (gerçek uygulamada oyunlara kategori eklenebilir)
    const categories = {
      'Strateji': Math.floor(games.length * 0.3),
      'Aile': Math.floor(games.length * 0.25),
      'Kart': Math.floor(games.length * 0.2),
      'Parti': Math.floor(games.length * 0.15),
      'Diğer': Math.floor(games.length * 0.1)
    };

    // Simüle edilmiş popülerlik (gerçek uygulamada randevu sayılarından gelir)
    const topGames = games.slice(0, 5).map((game, index) => ({
      name: game.name,
      reservations: Math.floor(Math.random() * 50) + 10
    })).sort((a, b) => b.reservations - a.reservations);

    // Simüle edilmiş kullanım oranı
    const usageRate = games.length > 0 ? ((stats.withReservations / games.length) * 100).toFixed(1) : '0';

    return {
      categories,
      topGames,
      usageRate
    };
  }, [games, stats]);

  const clearFilters = () => {
    setSearchTerm('');
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-lg font-semibold text-gray-700">Oyunlar yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
      {/* Header */}
      <div className="mb-8 animate-fadeIn">
        <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3 flex items-center">
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-3 rounded-xl mr-3">
                  <Gamepad2 className="w-7 h-7 text-white" />
                </div>
                Oyun Yönetimi
              </h2>
              <p className="text-gray-600 text-lg">Oyunları ekleyin, düzenleyin ve yönetin.</p>
            </div>
            <button 
              onClick={() => handleOpenModal()} 
              className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-300 flex items-center gap-2 font-semibold"
            >
              <Plus className="w-5 h-5" />
              Yeni Oyun Ekle
            </button>
          </div>
        </div>
      </div>

      <GameModal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        onSave={handleSaveGame} 
        gameToEdit={gameToEdit} 
      />

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
              <p className="text-sm text-gray-600">Oyun dağılımı, popülerlik ve kullanım oranları</p>
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
          {/* Category Distribution & Top Games */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Distribution */}
            <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg p-6">
              <h3 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">Kategori Dağılımı</h3>
              <div className="h-80">
                <Pie
                  data={{
                    labels: Object.keys(analyticsData.categories),
                    datasets: [{
                      data: Object.values(analyticsData.categories),
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
                            const total = Object.values(analyticsData.categories).reduce((sum: number, val) => sum + (val as number), 0);
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

            {/* Top Games */}
            <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg p-6">
              <h3 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">En Popüler Oyunlar</h3>
              <div className="h-80">
                <Bar
                  data={{
                    labels: analyticsData.topGames.map(g => g.name),
                    datasets: [{
                      label: 'Randevu Sayısı',
                      data: analyticsData.topGames.map(g => g.reservations),
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
                      y: { beginAtZero: true, ticks: { stepSize: 5 } }
                    }
                  }}
                />
              </div>
            </div>
          </div>

          {/* Usage Rate */}
          <div className="bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold mb-2">Kullanım Oranı</h3>
                <p className="text-white/90">Aktif randevusu olan oyunların toplam oyunlara oranı</p>
              </div>
              <div className="text-right">
                <p className="text-6xl font-bold">{analyticsData.usageRate}%</p>
                <p className="text-sm text-white/90 mt-2">{stats.withReservations} / {stats.total} oyun</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 mb-8 animate-fadeIn">
        <div className="bg-gradient-to-br from-blue-500 to-cyan-600 p-3 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-white/90">Toplam Oyun</p>
              <p className="text-xl sm:text-3xl font-bold text-white mt-1 sm:mt-2">{stats.total}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 sm:p-4">
              <Gamepad2 className="w-5 sm:w-8 h-5 sm:h-8 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-3 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-white/90">Aktif Randevulu</p>
              <p className="text-xl sm:text-3xl font-bold text-white mt-1 sm:mt-2">{stats.withReservations}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 sm:p-4">
              <Calendar className="w-5 sm:w-8 h-5 sm:h-8 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-3 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-white/90">En Popüler</p>
              <p className="text-base sm:text-xl font-bold text-white mt-1 sm:mt-2 truncate">{stats.popular}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 sm:p-4">
              <TrendingUp className="w-5 sm:w-8 h-5 sm:h-8 text-white" />
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
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar Filters */}
        <div className="w-full lg:w-80 flex-shrink-0">
          <div className={`fixed lg:sticky top-0 left-0 h-screen lg:h-auto w-full lg:w-80 bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg p-6 z-50 transition-transform duration-300 ${
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
                    placeholder="Oyun ara..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="w-full pl-9 pr-3 py-2 bg-white border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
                  />
                </div>
              </div>

              {/* View Mode */}
              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-3">Görünüm</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`px-3 py-2 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                      viewMode === 'grid' ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white' : 'bg-white border-2 border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Grid3x3 className="w-4 h-4" />
                    Grid
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-3 py-2 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                      viewMode === 'list' ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white' : 'bg-white border-2 border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <List className="w-4 h-4" />
                    Liste
                  </button>
                </div>
              </div>

              {/* Items Per Page */}
              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-3">Sayfa Başına</label>
                <select
                  value={itemsPerPage}
                  onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                  className="w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm font-medium"
                >
                  <option value={6}>6 oyun</option>
                  <option value={12}>12 oyun</option>
                  <option value={24}>24 oyun</option>
                  <option value={48}>48 oyun</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Games Content */}
        <div className="flex-1">
          <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Oyunlar ({filteredGames.length})
              </h3>
              <p className="text-sm text-gray-600">
                Sayfa {currentPage} / {totalPages || 1}
              </p>
            </div>

            {paginatedGames.length > 0 ? (
              <>
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {paginatedGames.map((game) => (
                      <div key={game.id} className="bg-gradient-to-br from-white to-indigo-50/30 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border-2 border-transparent hover:border-indigo-200 group">
                        <div className="relative h-48 bg-gradient-to-br from-indigo-100 to-purple-100 overflow-hidden">
                          {game.imageUrl ? (
                            <img src={game.imageUrl} alt={game.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Gamepad2 className="w-20 h-20 text-indigo-300" />
                            </div>
                          )}
                        </div>
                        <div className="p-4">
                          <h4 className="text-lg font-bold text-gray-900 mb-2 truncate">{game.name}</h4>
                          <p className="text-sm text-gray-600 line-clamp-2 mb-4">{game.description || 'Açıklama yok'}</p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleOpenModal(game)}
                              className="flex-1 px-3 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-all duration-200 flex items-center justify-center gap-2 font-semibold text-sm"
                            >
                              <Edit className="w-4 h-4" />
                              Düzenle
                            </button>
                            <button
                              onClick={() => handleDeleteGame(game.id)}
                              className="flex-1 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-all duration-200 flex items-center justify-center gap-2 font-semibold text-sm"
                            >
                              <Trash2 className="w-4 h-4" />
                              Sil
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {paginatedGames.map((game) => (
                      <div key={game.id} className="bg-gradient-to-r from-white to-indigo-50/30 p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-indigo-200">
                        <div className="flex gap-6">
                          <div className="w-32 h-32 flex-shrink-0 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl overflow-hidden">
                            {game.imageUrl ? (
                              <img src={game.imageUrl} alt={game.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Gamepad2 className="w-16 h-16 text-indigo-300" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <h4 className="text-xl font-bold text-gray-900 mb-2">{game.name}</h4>
                            <p className="text-sm text-gray-600 mb-4">{game.description || 'Açıklama yok'}</p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleOpenModal(game)}
                                className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-all duration-200 flex items-center gap-2 font-semibold text-sm"
                              >
                                <Edit className="w-4 h-4" />
                                Düzenle
                              </button>
                              <button
                                onClick={() => handleDeleteGame(game.id)}
                                className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-all duration-200 flex items-center gap-2 font-semibold text-sm"
                              >
                                <Trash2 className="w-4 h-4" />
                                Sil
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <Gamepad2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">Filtre kriterlerine uygun oyun bulunamadı.</p>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">{filteredGames.length}</span> sonuçtan <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> - <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredGames.length)}</span> arası gösteriliyor
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

export default GameManagementTab;