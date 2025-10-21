import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Package, Clock, CheckCircle, XCircle, Search, Filter, X, Ticket, Ban, ShoppingBag, TrendingUp, Award } from 'lucide-react';
import { useShop } from '../contexts/ShopContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import Swal from 'sweetalert2';

const MyOrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const { orders, products, fetchOrders } = useShop();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled'>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  const toggleOrderExpand = (orderId: string) => {
    setExpandedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'preparing': return 'bg-blue-100 text-blue-800';
      case 'ready': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Beklemede';
      case 'preparing': return 'Hazırlanıyor';
      case 'ready': return 'Teslim Hazır';
      case 'completed': return 'Tamamlandı';
      case 'cancelled': return 'İptal Edildi';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-5 h-5" />;
      case 'preparing': return <Package className="w-5 h-5" />;
      case 'ready': return <CheckCircle className="w-5 h-5" />;
      case 'completed': return <CheckCircle className="w-5 h-5" />;
      case 'cancelled': return <XCircle className="w-5 h-5" />;
      default: return <Package className="w-5 h-5" />;
    }
  };

  const filteredAndSortedOrders = orders
    .filter(order => {
      const matchesSearch = 
        order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.items.some(item => item.productName.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const dateA = a.createdAt.seconds * 1000;
      const dateB = b.createdAt.seconds * 1000;
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setSortOrder('newest');
  };

  // İstatistikler
  const statistics = useMemo(() => {
    const totalOrders = orders.length;
    const totalSpent = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const completedOrders = orders.filter(o => o.status === 'completed').length;
    const totalSaved = orders.reduce((sum, order) => sum + (order.discountAmount || 0), 0);
    
    // En çok sipariş edilen ürün
    const productCounts: Record<string, { name: string; count: number }> = {};
    orders.forEach(order => {
      order.items.forEach(item => {
        if (!productCounts[item.productId]) {
          productCounts[item.productId] = { name: item.productName, count: 0 };
        }
        productCounts[item.productId].count += item.quantity;
      });
    });
    const topProduct = Object.values(productCounts).sort((a, b) => b.count - a.count)[0];

    return {
      totalOrders,
      totalSpent,
      completedOrders,
      totalSaved,
      topProduct
    };
  }, [orders]);

  const handleCancelOrder = async (orderId: string) => {
    const result = await Swal.fire({
      title: 'Siparişi İptal Et?',
      text: 'Bu işlem geri alınamaz. Siparişinizi iptal etmek istediğinizden emin misiniz?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Evet, İptal Et',
      cancelButtonText: 'Vazgeç'
    });

    if (result.isConfirmed) {
      try {
        await updateDoc(doc(db, 'orders', orderId), {
          status: 'cancelled'
        });
        await Swal.fire({
          icon: 'success',
          title: 'Sipariş İptal Edildi',
          text: 'Siparişiniz başarıyla iptal edildi.',
          confirmButtonColor: '#4F46E5'
        });
        await fetchOrders();
      } catch (error) {
        await Swal.fire({
          icon: 'error',
          title: 'Hata!',
          text: 'Sipariş iptal edilirken bir hata oluştu.',
          confirmButtonColor: '#EF4444'
        });
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <button onClick={() => navigate('/shop')} className="flex items-center text-gray-600 hover:text-gray-900">
            <ChevronLeft className="w-5 h-5 mr-1" />
            Mağazaya Dön
          </button>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Siparişlerim</h1>
          <p className="text-sm sm:text-base text-gray-600">Tüm siparişlerinizi buradan takip edebilirsiniz</p>
        </div>

        {/* İstatistik Kartları */}
        {orders.length > 0 && (
          <div className="mb-6 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Toplam Sipariş */}
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl sm:rounded-2xl shadow-lg p-3 sm:p-4 text-white">
              <div className="flex items-center justify-between mb-2">
                <ShoppingBag className="w-6 h-6 sm:w-8 sm:h-8 text-white/80" />
                <div className="p-1.5 sm:p-2 bg-white/20 rounded-lg">
                  <Package className="w-3 h-3 sm:w-4 sm:h-4" />
                </div>
              </div>
              <p className="text-xs sm:text-sm font-medium text-white/90">Toplam Sipariş</p>
              <p className="text-xl sm:text-2xl md:text-3xl font-bold mt-1">{statistics.totalOrders}</p>
            </div>

            {/* Toplam Harcama */}
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl sm:rounded-2xl shadow-lg p-3 sm:p-4 text-white">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-white/80" />
                <div className="p-1.5 sm:p-2 bg-white/20 rounded-lg">
                  <span className="text-xs sm:text-sm font-bold">TL</span>
                </div>
              </div>
              <p className="text-xs sm:text-sm font-medium text-white/90">Toplam Harcama</p>
              <p className="text-xl sm:text-2xl md:text-3xl font-bold mt-1">{statistics.totalSpent} TL</p>
            </div>

            {/* Tamamlanan */}
            <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl sm:rounded-2xl shadow-lg p-3 sm:p-4 text-white">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-white/80" />
                <div className="p-1.5 sm:p-2 bg-white/20 rounded-lg">
                  <span className="text-xs sm:text-sm font-bold">✓</span>
                </div>
              </div>
              <p className="text-xs sm:text-sm font-medium text-white/90">Tamamlanan</p>
              <p className="text-xl sm:text-2xl md:text-3xl font-bold mt-1">{statistics.completedOrders}</p>
            </div>

            {/* Toplam Tasarruf */}
            <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-xl sm:rounded-2xl shadow-lg p-3 sm:p-4 text-white">
              <div className="flex items-center justify-between mb-2">
                <Ticket className="w-6 h-6 sm:w-8 sm:h-8 text-white/80" />
                <div className="p-1.5 sm:p-2 bg-white/20 rounded-lg">
                  <Award className="w-3 h-3 sm:w-4 sm:h-4" />
                </div>
              </div>
              <p className="text-xs sm:text-sm font-medium text-white/90">Toplam Tasarruf</p>
              <p className="text-xl sm:text-2xl md:text-3xl font-bold mt-1">{statistics.totalSaved} TL</p>
            </div>
          </div>
        )}

        {/* En Çok Sipariş Edilen */}
        {orders.length > 0 && statistics.topProduct && (
          <div className="mb-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border border-purple-200">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl">
                <Award className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-600 font-medium">En Çok Sipariş Ettiğiniz Ürün</p>
                <p className="text-base sm:text-lg font-bold text-gray-900">{statistics.topProduct.name}</p>
                <p className="text-xs sm:text-sm text-purple-600 font-semibold">{statistics.topProduct.count} adet</p>
              </div>
            </div>
          </div>
        )}

        {/* Floating Filter Button (Mobile) */}
        {orders.length > 0 && (
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden fixed bottom-6 left-6 z-40 p-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all"
          >
            <Filter className="w-6 h-6" />
          </button>
        )}

        {/* Overlay */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        <div className="flex gap-6">
          {/* Sidebar */}
          {orders.length > 0 && (
            <aside className={`fixed lg:sticky top-0 left-0 h-full lg:h-auto w-80 lg:w-64 bg-white/90 backdrop-blur-xl lg:rounded-2xl shadow-lg p-4 sm:p-6 z-50 transition-transform duration-300 ${
              isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
            } lg:flex-shrink-0 border border-white/20`}>
              <div className="flex justify-between items-center mb-4 sm:mb-6">
                <h2 className="text-lg font-semibold flex items-center">
                  <Filter className="w-5 h-5 mr-2 text-indigo-600" />
                  Filtreler
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={handleClearFilters}
                    className="px-3 py-1 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all"
                  >
                    Temizle
                  </button>
                  <button
                    onClick={() => setIsSidebarOpen(false)}
                    className="lg:hidden text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="mb-4 sm:mb-6">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Sipariş ara..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                </div>
              </div>

              <div className="space-y-4 sm:space-y-6">
                {/* Durum Filtresi */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Durum</h3>
                  <div className="space-y-2">
                    <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input
                        type="radio"
                        name="status"
                        checked={statusFilter === 'all'}
                        onChange={() => setStatusFilter('all')}
                        className="mr-2"
                      />
                      <span className="text-sm">Tümü</span>
                    </label>
                    <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input
                        type="radio"
                        name="status"
                        checked={statusFilter === 'pending'}
                        onChange={() => setStatusFilter('pending')}
                        className="mr-2"
                      />
                      <span className="text-sm text-yellow-600">● Beklemede</span>
                    </label>
                    <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input
                        type="radio"
                        name="status"
                        checked={statusFilter === 'preparing'}
                        onChange={() => setStatusFilter('preparing')}
                        className="mr-2"
                      />
                      <span className="text-sm text-blue-600">● Hazırlanıyor</span>
                    </label>
                    <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input
                        type="radio"
                        name="status"
                        checked={statusFilter === 'ready'}
                        onChange={() => setStatusFilter('ready')}
                        className="mr-2"
                      />
                      <span className="text-sm text-green-600">● Teslim Hazır</span>
                    </label>
                    <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input
                        type="radio"
                        name="status"
                        checked={statusFilter === 'completed'}
                        onChange={() => setStatusFilter('completed')}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-600">● Tamamlandı</span>
                    </label>
                    <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input
                        type="radio"
                        name="status"
                        checked={statusFilter === 'cancelled'}
                        onChange={() => setStatusFilter('cancelled')}
                        className="mr-2"
                      />
                      <span className="text-sm text-red-600">● İptal Edildi</span>
                    </label>
                  </div>
                </div>

                {/* Sıralama */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Sıralama</h3>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="newest">Yeni → Eski</option>
                    <option value="oldest">Eski → Yeni</option>
                  </select>
                </div>
              </div>
            </aside>
          )}

          {/* Main Content Area */}
          <div className="flex-1">
            {/* Aktif Filtreler */}
            {orders.length > 0 && (searchQuery || statusFilter !== 'all') && (
              <div className="mb-6 flex flex-wrap items-center gap-2">
                {searchQuery && (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 shadow-sm">
                    Aranan: {searchQuery}
                    <button onClick={() => setSearchQuery('')} className="ml-2 text-gray-500 hover:text-gray-700">
                      <X className="w-4 h-4" />
                    </button>
                  </span>
                )}
                {statusFilter !== 'all' && (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-800 shadow-sm">
                    Durum: {getStatusText(statusFilter)}
                    <button onClick={() => setStatusFilter('all')} className="ml-2 text-indigo-500 hover:text-indigo-700">
                      <X className="w-4 h-4" />
                    </button>
                  </span>
                )}
              </div>
            )}

        {filteredAndSortedOrders.length === 0 && orders.length === 0 ? (
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-8 sm:p-12 text-center">
            <Package className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">Henüz Siparişiniz Yok</h3>
            <p className="text-sm sm:text-base text-gray-600 mb-6">Mağazadan ürün sipariş ederek başlayın</p>
            <button onClick={() => navigate('/shop')} className="px-6 py-3 text-sm sm:text-base bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
              Mağazaya Git
            </button>
          </div>
        ) : filteredAndSortedOrders.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-16">
            <Filter className="w-32 h-32 mb-6 text-gray-300" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Sipariş bulunamadı</h3>
            <p className="text-gray-500 mb-6">Aradığınız kriterlere uygun sipariş bulunmuyor.</p>
            <button onClick={handleClearFilters} className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
              Filtreleri Temizle
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:gap-4">
            {filteredAndSortedOrders.map((order, index) => {
              const isExpanded = expandedOrders.has(order.id);
              return (
              <div 
                key={order.id} 
                className="bg-white/90 backdrop-blur-xl rounded-xl shadow-lg overflow-hidden border border-white/20 hover:shadow-xl transition-all duration-300"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {/* Kompakt Header */}
                <div 
                  onClick={() => toggleOrderExpand(order.id)}
                  className="p-4 cursor-pointer hover:bg-gray-50/50 transition-all"
                >
                  <div className="flex items-center justify-between gap-4">
                    {/* Sol: Durum + Sipariş Bilgisi */}
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`p-2 rounded-lg flex-shrink-0 ${
                        order.status === 'completed' ? 'bg-green-100' :
                        order.status === 'ready' ? 'bg-green-100' :
                        order.status === 'preparing' ? 'bg-blue-100' :
                        order.status === 'cancelled' ? 'bg-red-100' :
                        'bg-yellow-100'
                      }`}>
                        {getStatusIcon(order.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-bold text-gray-900">#{order.id.slice(0, 8).toUpperCase()}</p>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            order.status === 'completed' ? 'bg-green-100 text-green-700' :
                            order.status === 'ready' ? 'bg-green-100 text-green-700' :
                            order.status === 'preparing' ? 'bg-blue-100 text-blue-700' :
                            order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {getStatusText(order.status)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 truncate">{order.items.length} ürün • {new Date(order.createdAt.seconds * 1000).toLocaleDateString('tr-TR')}</p>
                      </div>
                    </div>

                    {/* Sağ: Fiyat + Expand */}
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{order.totalAmount} TL</p>
                      </div>
                      <button className="p-2 hover:bg-gray-100 rounded-lg transition-all">
                        <ChevronLeft className={`w-5 h-5 text-gray-600 transition-transform ${
                          isExpanded ? '-rotate-90' : 'rotate-180'
                        }`} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Genişletilebilir İçerik */}
                {isExpanded && (
                  <div className="border-t border-gray-200 p-4 bg-gray-50/50">

                    {/* Mini Timeline */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-gray-600">Sipariş Durumu</span>
                        <span className="text-xs text-gray-500">{new Date(order.createdAt.seconds * 1000).toLocaleString('tr-TR')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          order.status !== 'cancelled' ? 'bg-green-500' : 'bg-gray-300'
                        }`}>
                          <CheckCircle className="w-4 h-4 text-white" />
                        </div>
                        <div className={`flex-1 h-1 rounded ${
                          ['preparing', 'ready', 'completed'].includes(order.status) ? 'bg-blue-500' : 'bg-gray-200'
                        }`}></div>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          ['ready', 'completed'].includes(order.status) ? 'bg-green-500' : 'bg-gray-200'
                        }`}>
                          <CheckCircle className="w-4 h-4 text-white" />
                        </div>
                        <div className={`flex-1 h-1 rounded ${
                          order.status === 'completed' ? 'bg-green-500' : 'bg-gray-200'
                        }`}></div>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          order.status === 'completed' ? 'bg-green-500' : order.status === 'cancelled' ? 'bg-red-500' : 'bg-gray-200'
                        }`}>
                          {order.status === 'cancelled' ? (
                            <XCircle className="w-4 h-4 text-white" />
                          ) : (
                            <CheckCircle className="w-4 h-4 text-white" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Ürünler */}
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Ürünler</h4>
                      <div className="space-y-2">
                        {order.items.map((item, idx) => {
                          const product = products?.find(p => p.id === item.productId);
                          return (
                            <div key={idx} className="flex items-center gap-3 p-2 bg-white rounded-lg">
                              {product?.image && (
                                <img 
                                  src={product.image} 
                                  alt={item.productName}
                                  className="w-12 h-12 object-cover rounded-lg flex-shrink-0"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{item.productName}</p>
                                <p className="text-xs text-gray-500">{item.price} TL x {item.quantity}</p>
                              </div>
                              <span className="text-sm font-bold text-gray-900">{item.price * item.quantity} TL</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Kupon Bilgisi */}
                    {order.couponId && order.discountAmount && (
                      <div className="mb-4 p-3 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Ticket className="w-4 h-4 text-green-600" />
                          <span className="text-xs font-semibold text-green-900">İndirim Kuponu</span>
                        </div>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Ara Toplam:</span>
                            <span className="font-semibold text-gray-900">{order.totalAmount + order.discountAmount} TL</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-green-600">İndirim:</span>
                            <span className="font-semibold text-green-600">-{order.discountAmount} TL</span>
                          </div>
                          <div className="flex justify-between pt-1 border-t border-green-200">
                            <span className="font-bold text-gray-900">Toplam:</span>
                            <span className="font-bold text-green-600">{order.totalAmount} TL</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {order.notes && (
                      <div className="mb-4 p-3 bg-white rounded-lg border border-gray-200">
                        <h4 className="text-xs font-semibold text-gray-600 mb-1">Sipariş Notu</h4>
                        <p className="text-sm text-gray-700">{order.notes}</p>
                      </div>
                    )}

                    {/* Alt Bilgiler */}
                    <div className="flex items-center justify-between pt-3 border-t">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600">Ödeme:</span>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          order.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {order.paymentStatus === 'paid' ? '✓ Ödendi' : '💵 Nakit'
                        }
                        </span>
                      </div>
                      {order.status === 'pending' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancelOrder(order.id);
                          }}
                          className="px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all flex items-center gap-1 text-xs font-semibold"
                        >
                          <Ban className="w-3 h-3" />
                          İptal Et
                        </button>
                      )}
                    </div>

                    {/* Durum Mesajları */}
                    {order.status === 'ready' && (
                      <div className="mt-3 p-3 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                        <p className="text-xs font-semibold text-green-900">🎉 Siparişiniz hazır! Kütüphaneden teslim alabilirsiniz.</p>
                      </div>
                    )}

                    {order.status === 'cancelled' && (
                      <div className="mt-3 p-3 bg-gradient-to-br from-red-50 to-pink-50 border border-red-200 rounded-lg">
                        <p className="text-xs font-semibold text-red-900">❌ Bu sipariş iptal edilmiştir.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
            })}
          </div>
        )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyOrdersPage;
