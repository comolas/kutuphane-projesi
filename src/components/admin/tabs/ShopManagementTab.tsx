import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Package, DollarSign, Filter, X, Search, ShoppingBag, TrendingUp, AlertTriangle, XCircle, Award, Minus, Eye, Calendar, ShoppingCart, Upload, Clock, CheckCircle, CreditCard, ChevronDown, ChevronUp, User, Mail, Tag } from 'lucide-react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp, query, where } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { Product, Order } from '../../../types';
import { useAuth } from '../../../contexts/AuthContext';

const ShopManagementTab: React.FC = () => {
  const { isSuperAdmin, campusId } = useAuth();
  const [activeView, setActiveView] = useState<'products' | 'orders'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importError, setImportError] = useState<string>('');
  const [formData, setFormData] = useState({
    name: '',
    category: 'aksesuar' as 'aksesuar' | 'kiyafet' | 'kirtasiye',
    price: 0,
    stock: 0,
    image: '',
    description: '',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<string>('default');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [stockFilter, setStockFilter] = useState<'all' | 'out' | 'low' | 'normal'>('all');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Order filters
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | Order['status']>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<'all' | Order['paymentStatus']>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<'all' | 'cash' | 'coupon'>('all');
  const [orderSortOrder, setOrderSortOrder] = useState<string>('newest');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [showOrderDetailModal, setShowOrderDetailModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    fetchProducts();
    fetchOrders();
  }, []);

  const fetchProducts = async () => {
    const productsCollection = collection(db, 'products');
    const productsQuery = isSuperAdmin ? productsCollection : query(productsCollection, where('campusId', '==', campusId));
    const snapshot = await getDocs(productsQuery);
    setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
  };

  const fetchOrders = async () => {
    const ordersCollection = collection(db, 'orders');
    const ordersQuery = isSuperAdmin ? ordersCollection : query(ordersCollection, where('campusId', '==', campusId));
    const snapshot = await getDocs(ordersQuery);
    setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
  };

  const handleSaveProduct = async () => {
    if (editingProduct) {
      await updateDoc(doc(db, 'products', editingProduct.id), formData);
    } else {
      await addDoc(collection(db, 'products'), { ...formData, createdAt: Timestamp.now() });
    }
    setShowProductModal(false);
    setEditingProduct(null);
    setFormData({ name: '', category: 'aksesuar', price: 0, stock: 0, image: '', description: '' });
    fetchProducts();
  };

  const handleDeleteProduct = async (id: string) => {
    if (confirm('Bu ürünü silmek istediğinizden emin misiniz?')) {
      await deleteDoc(doc(db, 'products', id));
      fetchProducts();
    }
  };

  const handleQuickStockUpdate = async (productId: string, change: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const newStock = Math.max(0, product.stock + change);
    await updateDoc(doc(db, 'products', productId), { stock: newStock });
    fetchProducts();
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          setImportError('CSV dosyası boş veya geçersiz.');
          return;
        }

        const headers = lines[0].split(',').map(h => h.trim());
        const requiredHeaders = ['name', 'category', 'price', 'stock', 'image', 'description'];
        
        if (!requiredHeaders.every(h => headers.includes(h))) {
          setImportError(`CSV başlıkları eksik. Gerekli: ${requiredHeaders.join(', ')}`);
          return;
        }

        let successCount = 0;
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          const product: any = {};
          
          headers.forEach((header, index) => {
            product[header] = values[index];
          });

          if (!product.name || !product.category || !product.price) continue;

          await addDoc(collection(db, 'products'), {
            name: product.name,
            category: product.category as 'aksesuar' | 'kiyafet' | 'kirtasiye',
            price: Number(product.price) || 0,
            stock: Number(product.stock) || 0,
            image: product.image || '',
            description: product.description || '',
            createdAt: Timestamp.now()
          });
          successCount++;
        }

        setImportError('');
        setShowImportModal(false);
        fetchProducts();
        alert(`${successCount} ürün başarıyla eklendi!`);
      } catch (error) {
        setImportError('CSV işlenirken hata oluştu: ' + (error as Error).message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleUpdateOrderStatus = async (orderId: string, status: Order['status']) => {
    await updateDoc(doc(db, 'orders', orderId), { status });
    fetchOrders();
  };

  const handleUpdatePaymentStatus = async (orderId: string, paymentStatus: Order['paymentStatus']) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    await updateDoc(doc(db, 'orders', orderId), { paymentStatus });
    
    // Ödeme durumu "ödendi" olarak değiştirildiğinde bütçeye gelir ekle
    if (paymentStatus === 'paid' && order.paymentStatus === 'waiting') {
      await addDoc(collection(db, 'transactions'), {
        type: 'income',
        amount: order.totalAmount,
        category: 'Ödeme',
        description: `${order.userName} isimli kullanıcıdan sipariş ödemesi alındı`,
        date: Timestamp.now()
      });
    }
    
    fetchOrders();
  };

  const categories = Array.from(new Set(products.map(p => p.category)));
  const maxPriceValue = Math.max(...products.map(p => p.price), 1000);

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSortOrder('default');
    setPriceRange([0, maxPriceValue]);
    setMinPrice('');
    setMaxPrice('');
    setStockFilter('all');
  };

  const handleClearOrderFilters = () => {
    setOrderSearchQuery('');
    setOrderStatusFilter('all');
    setPaymentStatusFilter('all');
    setPaymentMethodFilter('all');
    setOrderSortOrder('newest');
  };

  const filteredAndSortedProducts = products.filter(p => {
    const matchesSearch = p.name.toLocaleLowerCase('tr-TR').includes(searchQuery.toLocaleLowerCase('tr-TR'));
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    
    const effectiveMinPrice = minPrice ? Number(minPrice) : priceRange[0];
    const effectiveMaxPrice = maxPrice ? Number(maxPrice) : priceRange[1];
    const matchesPrice = p.price >= effectiveMinPrice && p.price <= effectiveMaxPrice;
    
    const matchesStock = stockFilter === 'all' ||
      (stockFilter === 'out' && p.stock === 0) ||
      (stockFilter === 'low' && p.stock > 0 && p.stock <= 3) ||
      (stockFilter === 'normal' && p.stock > 3);
    
    return matchesSearch && matchesCategory && matchesPrice && matchesStock;
  }).sort((a, b) => {
    switch (sortOrder) {
      case 'price-asc': return a.price - b.price;
      case 'price-desc': return b.price - a.price;
      case 'name-asc': return a.name.localeCompare(b.name, 'tr-TR');
      case 'name-desc': return b.name.localeCompare(a.name, 'tr-TR');
      case 'stock-asc': return a.stock - b.stock;
      case 'stock-desc': return b.stock - a.stock;
      default: return 0;
    }
  });

  const filteredAndSortedOrders = orders.filter(o => {
    const matchesSearch = orderSearchQuery === '' || 
      o.userName.toLocaleLowerCase('tr-TR').includes(orderSearchQuery.toLocaleLowerCase('tr-TR')) ||
      o.userEmail.toLocaleLowerCase('tr-TR').includes(orderSearchQuery.toLocaleLowerCase('tr-TR'));
    
    const matchesStatus = orderStatusFilter === 'all' || o.status === orderStatusFilter;
    const matchesPaymentStatus = paymentStatusFilter === 'all' || o.paymentStatus === paymentStatusFilter;
    const matchesPaymentMethod = paymentMethodFilter === 'all' || o.paymentMethod === paymentMethodFilter;
    
    return matchesSearch && matchesStatus && matchesPaymentStatus && matchesPaymentMethod;
  }).sort((a, b) => {
    switch (orderSortOrder) {
      case 'newest': return b.createdAt.seconds - a.createdAt.seconds;
      case 'oldest': return a.createdAt.seconds - b.createdAt.seconds;
      case 'amount-desc': return b.totalAmount - a.totalAmount;
      case 'amount-asc': return a.totalAmount - b.totalAmount;
      default: return 0;
    }
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <div className="mb-6 flex gap-4">
        <button
          onClick={() => setActiveView('products')}
          className={`px-6 py-3 rounded-lg font-semibold transition-all ${
            activeView === 'products' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' : 'bg-white/90 backdrop-blur-xl text-gray-700 border border-white/20'
          }`}
        >
          <Package className="w-5 h-5 inline mr-2" />
          Ürünler
        </button>
        <button
          onClick={() => setActiveView('orders')}
          className={`px-6 py-3 rounded-lg font-semibold transition-all ${
            activeView === 'orders' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' : 'bg-white/90 backdrop-blur-xl text-gray-700 border border-white/20'
          }`}
        >
          <DollarSign className="w-5 h-5 inline mr-2" />
          Siparişler
        </button>
      </div>

      {activeView === 'products' && (
        <div>
          {/* Floating Filter Button (Mobile) */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden fixed bottom-6 left-6 z-40 p-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all"
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

          <div className="flex gap-6">
            {/* Sidebar */}
            <aside className={`fixed lg:sticky top-0 left-0 h-full lg:h-auto w-80 lg:w-64 bg-white/90 backdrop-blur-xl lg:rounded-2xl shadow-lg p-6 z-50 transition-transform duration-300 ${
              isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
            } lg:flex-shrink-0 border border-white/20`}>
              <div className="flex justify-between items-center mb-6">
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

              {/* Search */}
              <div className="mb-6">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Ürün ara..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                </div>
              </div>

              <div className="space-y-6">
                {/* Category */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Kategori</h3>
                  <div className="space-y-2">
                    <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input
                        type="radio"
                        name="category"
                        checked={selectedCategory === 'all'}
                        onChange={() => setSelectedCategory('all')}
                        className="mr-2"
                      />
                      <span className="text-sm">Tümü</span>
                    </label>
                    {categories.map(cat => (
                      <label key={cat} className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                        <input
                          type="radio"
                          name="category"
                          checked={selectedCategory === cat}
                          onChange={() => setSelectedCategory(cat)}
                          className="mr-2"
                        />
                        <span className="text-sm capitalize">{cat}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Sort */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Sıralama</h3>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="default">Varsayılan</option>
                    <option value="price-asc">Fiyat (Düşük-Yüksek)</option>
                    <option value="price-desc">Fiyat (Yüksek-Düşük)</option>
                    <option value="name-asc">İsim (A-Z)</option>
                    <option value="name-desc">İsim (Z-A)</option>
                    <option value="stock-asc">Stok (Az-Çok)</option>
                    <option value="stock-desc">Stok (Çok-Az)</option>
                  </select>
                </div>

                {/* Price Range */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Fiyat Aralığı</h3>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        value={minPrice}
                        onChange={(e) => setMinPrice(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={maxPriceValue}
                      value={maxPrice ? Number(maxPrice) : priceRange[1]}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>{minPrice || priceRange[0]} ₺</span>
                      <span>{maxPrice || priceRange[1]} ₺</span>
                    </div>
                  </div>
                </div>

                {/* Stock Filter */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Stok Durumu</h3>
                  <div className="space-y-2">
                    <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input
                        type="radio"
                        name="stock"
                        checked={stockFilter === 'all'}
                        onChange={() => setStockFilter('all')}
                        className="mr-2"
                      />
                      <span className="text-sm">Tümü</span>
                    </label>
                    <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input
                        type="radio"
                        name="stock"
                        checked={stockFilter === 'out'}
                        onChange={() => setStockFilter('out')}
                        className="mr-2"
                      />
                      <span className="text-sm text-red-600">● Stokta Yok</span>
                    </label>
                    <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input
                        type="radio"
                        name="stock"
                        checked={stockFilter === 'low'}
                        onChange={() => setStockFilter('low')}
                        className="mr-2"
                      />
                      <span className="text-sm text-orange-600">● Düşük Stok (≤3)</span>
                    </label>
                    <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input
                        type="radio"
                        name="stock"
                        checked={stockFilter === 'normal'}
                        onChange={() => setStockFilter('normal')}
                        className="mr-2"
                      />
                      <span className="text-sm text-green-600">● Normal Stok (&gt;3)</span>
                    </label>
                  </div>
                </div>
              </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1">
              <div className="mb-6 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">Ürün Yönetimi</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowImportModal(true)}
                    className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2"
                  >
                    <Upload className="w-5 h-5" />
                    CSV Yükle
                  </button>
                  <button
                    onClick={() => {
                      setEditingProduct(null);
                      setFormData({ name: '', category: 'aksesuar', price: 0, stock: 0, image: '', description: '' });
                      setShowProductModal(true);
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Yeni Ürün
                  </button>
                </div>
              </div>

              {/* Statistics Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
                <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-6 text-white shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-indigo-100 text-sm font-medium">Toplam Ürün</p>
                      <p className="text-3xl font-bold mt-2">{products.length}</p>
                    </div>
                    <div className="bg-white/20 p-3 rounded-lg">
                      <Package className="w-8 h-8" />
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-sm font-medium">Stok Değeri</p>
                      <p className="text-3xl font-bold mt-2">{products.reduce((sum, p) => sum + (p.price * p.stock), 0).toLocaleString('tr-TR')} ₺</p>
                    </div>
                    <div className="bg-white/20 p-3 rounded-lg">
                      <TrendingUp className="w-8 h-8" />
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-100 text-sm font-medium">Düşük Stok</p>
                      <p className="text-3xl font-bold mt-2">{products.filter(p => p.stock > 0 && p.stock <= 3).length}</p>
                    </div>
                    <div className="bg-white/20 p-3 rounded-lg">
                      <AlertTriangle className="w-8 h-8" />
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-6 text-white shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-red-100 text-sm font-medium">Stokta Yok</p>
                      <p className="text-3xl font-bold mt-2">{products.filter(p => p.stock === 0).length}</p>
                    </div>
                    <div className="bg-white/20 p-3 rounded-lg">
                      <XCircle className="w-8 h-8" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Best Selling Product */}
              {(() => {
                const productSales = orders
                  .filter(o => o.status === 'completed')
                  .flatMap(o => o.items)
                  .reduce((acc, item) => {
                    acc[item.productId] = (acc[item.productId] || 0) + item.quantity;
                    return acc;
                  }, {} as Record<string, number>);
                
                const bestSellingId = Object.entries(productSales).sort(([,a], [,b]) => b - a)[0]?.[0];
                const bestProduct = products.find(p => p.id === bestSellingId);
                const totalSold = bestSellingId ? productSales[bestSellingId] : 0;

                return bestProduct ? (
                  <div className="bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-500 rounded-xl shadow-lg p-6 mb-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="bg-white/20 p-3 rounded-lg">
                          <Award className="w-8 h-8 text-white" />
                        </div>
                        <div>
                          <p className="text-white/90 text-sm font-medium">🏆 En Çok Satan Ürün</p>
                          <p className="text-2xl font-bold text-white mt-1">{bestProduct.name}</p>
                          <p className="text-sm text-white/80 mt-1">{totalSold} adet satıldı • {(totalSold * bestProduct.price).toLocaleString('tr-TR')} ₺ gelir</p>
                        </div>
                      </div>
                      <img src={bestProduct.image} alt={bestProduct.name} className="w-20 h-20 object-cover rounded-xl shadow-lg" />
                    </div>
                  </div>
                ) : null;
              })()}

              {/* Active Filters */}
              <div className="mb-6 flex flex-wrap items-center gap-2">
                {searchQuery && (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 shadow-sm">
                    Aranan: {searchQuery}
                    <button onClick={() => setSearchQuery('')} className="ml-2 text-gray-500 hover:text-gray-700">
                      <X className="w-4 h-4" />
                    </button>
                  </span>
                )}
                {selectedCategory !== 'all' && (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 shadow-sm">
                    Kategori: {selectedCategory}
                    <button onClick={() => setSelectedCategory('all')} className="ml-2 text-purple-500 hover:text-purple-700">
                      <X className="w-4 h-4" />
                    </button>
                  </span>
                )}
                {(minPrice || maxPrice) && (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 shadow-sm">
                    Fiyat: {minPrice || '0'} - {maxPrice || priceRange[1]} ₺
                    <button onClick={() => { setMinPrice(''); setMaxPrice(''); }} className="ml-2 text-green-500 hover:text-green-700">
                      <X className="w-4 h-4" />
                    </button>
                  </span>
                )}
                {stockFilter !== 'all' && (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-gradient-to-r from-orange-100 to-red-100 text-orange-800 shadow-sm">
                    Stok: {stockFilter === 'out' ? 'Stokta Yok' : stockFilter === 'low' ? 'Düşük' : 'Normal'}
                    <button onClick={() => setStockFilter('all')} className="ml-2 text-orange-500 hover:text-orange-700">
                      <X className="w-4 h-4" />
                    </button>
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredAndSortedProducts.map(product => (
                  <div key={product.id} className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg overflow-hidden border border-white/20 hover:scale-105 transition-all duration-300 cursor-pointer" onClick={() => { setSelectedProduct(product); setShowDetailModal(true); }}>
                    <div className="relative aspect-square">
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                      {product.stock <= 3 && product.stock > 0 && (
                        <div className="absolute top-2 left-2 px-2 py-1 bg-gradient-to-r from-orange-500 to-red-600 text-white text-xs font-bold rounded-lg shadow-lg animate-pulse">
                          🔥 Son {product.stock} Adet!
                        </div>
                      )}
                      {product.stock > 3 && product.stock <= 10 && (
                        <div className="absolute top-2 left-2 px-2 py-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold rounded-lg shadow-lg">
                          ⚡ Az Kaldı!
                        </div>
                      )}
                      {product.stock === 0 && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                          <span className="text-white font-bold text-lg">Stokta Yok</span>
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-lg mb-2 line-clamp-2">{product.name}</h3>
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">{product.description}</p>
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{product.price} TL</span>
                        <span className={`text-sm font-semibold ${
                          product.stock === 0 ? 'text-red-600' : product.stock <= 3 ? 'text-orange-600' : 'text-gray-500'
                        }`}>Stok: {product.stock}</span>
                      </div>
                      {/* Quick Stock Update */}
                      <div className="flex items-center justify-between mb-3 p-2 bg-gray-50 rounded-lg">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleQuickStockUpdate(product.id, -1); }}
                          disabled={product.stock === 0}
                          className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          <Minus className="w-4 h-4 text-gray-700" />
                        </button>
                        <span className="text-sm font-semibold text-gray-700">Stok: {product.stock}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleQuickStockUpdate(product.id, 1); }}
                          className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-all"
                        >
                          <Plus className="w-4 h-4 text-gray-700" />
                        </button>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedProduct(product); setShowDetailModal(true); }}
                          className="flex-1 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all flex items-center justify-center gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          Detay
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingProduct(product);
                            setFormData({
                              name: product.name,
                              category: product.category,
                              price: product.price,
                              stock: product.stock,
                              image: product.image,
                              description: product.description,
                            });
                            setShowProductModal(true);
                          }}
                          className="flex-1 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:shadow-lg transition-all flex items-center justify-center gap-2"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteProduct(product.id); }}
                          className="p-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:shadow-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeView === 'orders' && (
        <div>
          {/* Floating Filter Button (Mobile) */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden fixed bottom-6 left-6 z-40 p-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all"
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

          <div className="flex gap-6">
            {/* Sidebar */}
            <aside className={`fixed lg:sticky top-0 left-0 h-full lg:h-auto w-80 lg:w-64 bg-white/90 backdrop-blur-xl lg:rounded-2xl shadow-lg p-6 z-50 transition-transform duration-300 ${
              isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
            } lg:flex-shrink-0 border border-white/20`}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold flex items-center">
                  <Filter className="w-5 h-5 mr-2 text-indigo-600" />
                  Filtreler
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={handleClearOrderFilters}
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

              {/* Search */}
              <div className="mb-6">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Kullanıcı ara..."
                    value={orderSearchQuery}
                    onChange={(e) => setOrderSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                </div>
              </div>

              <div className="space-y-6">
                {/* Order Status */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Sipariş Durumu</h3>
                  <div className="space-y-2">
                    <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input
                        type="radio"
                        name="orderStatus"
                        checked={orderStatusFilter === 'all'}
                        onChange={() => setOrderStatusFilter('all')}
                        className="mr-2"
                      />
                      <span className="text-sm">Tümü</span>
                    </label>
                    <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input
                        type="radio"
                        name="orderStatus"
                        checked={orderStatusFilter === 'pending'}
                        onChange={() => setOrderStatusFilter('pending')}
                        className="mr-2"
                      />
                      <span className="text-sm text-yellow-600">● Beklemede</span>
                    </label>
                    <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input
                        type="radio"
                        name="orderStatus"
                        checked={orderStatusFilter === 'preparing'}
                        onChange={() => setOrderStatusFilter('preparing')}
                        className="mr-2"
                      />
                      <span className="text-sm text-blue-600">● Hazırlanıyor</span>
                    </label>
                    <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input
                        type="radio"
                        name="orderStatus"
                        checked={orderStatusFilter === 'ready'}
                        onChange={() => setOrderStatusFilter('ready')}
                        className="mr-2"
                      />
                      <span className="text-sm text-purple-600">● Hazır</span>
                    </label>
                    <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input
                        type="radio"
                        name="orderStatus"
                        checked={orderStatusFilter === 'completed'}
                        onChange={() => setOrderStatusFilter('completed')}
                        className="mr-2"
                      />
                      <span className="text-sm text-green-600">● Tamamlandı</span>
                    </label>
                    <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input
                        type="radio"
                        name="orderStatus"
                        checked={orderStatusFilter === 'cancelled'}
                        onChange={() => setOrderStatusFilter('cancelled')}
                        className="mr-2"
                      />
                      <span className="text-sm text-red-600">● İptal</span>
                    </label>
                  </div>
                </div>

                {/* Payment Status */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Ödeme Durumu</h3>
                  <div className="space-y-2">
                    <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input
                        type="radio"
                        name="paymentStatus"
                        checked={paymentStatusFilter === 'all'}
                        onChange={() => setPaymentStatusFilter('all')}
                        className="mr-2"
                      />
                      <span className="text-sm">Tümü</span>
                    </label>
                    <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input
                        type="radio"
                        name="paymentStatus"
                        checked={paymentStatusFilter === 'waiting'}
                        onChange={() => setPaymentStatusFilter('waiting')}
                        className="mr-2"
                      />
                      <span className="text-sm text-orange-600">● Bekleniyor</span>
                    </label>
                    <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input
                        type="radio"
                        name="paymentStatus"
                        checked={paymentStatusFilter === 'paid'}
                        onChange={() => setPaymentStatusFilter('paid')}
                        className="mr-2"
                      />
                      <span className="text-sm text-green-600">● Ödendi</span>
                    </label>
                  </div>
                </div>

                {/* Payment Method */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Ödeme Yöntemi</h3>
                  <div className="space-y-2">
                    <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input
                        type="radio"
                        name="paymentMethod"
                        checked={paymentMethodFilter === 'all'}
                        onChange={() => setPaymentMethodFilter('all')}
                        className="mr-2"
                      />
                      <span className="text-sm">Tümü</span>
                    </label>
                    <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input
                        type="radio"
                        name="paymentMethod"
                        checked={paymentMethodFilter === 'cash'}
                        onChange={() => setPaymentMethodFilter('cash')}
                        className="mr-2"
                      />
                      <span className="text-sm">Nakit</span>
                    </label>
                    <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input
                        type="radio"
                        name="paymentMethod"
                        checked={paymentMethodFilter === 'coupon'}
                        onChange={() => setPaymentMethodFilter('coupon')}
                        className="mr-2"
                      />
                      <span className="text-sm">Kupon</span>
                    </label>
                  </div>
                </div>

                {/* Sort */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Sıralama</h3>
                  <select
                    value={orderSortOrder}
                    onChange={(e) => setOrderSortOrder(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="newest">En Yeni</option>
                    <option value="oldest">En Eski</option>
                    <option value="amount-desc">Tutar (Yüksek-Düşük)</option>
                    <option value="amount-asc">Tutar (Düşük-Yüksek)</option>
                  </select>
                </div>
              </div>
            </aside>

            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-6 text-gray-900">Sipariş Yönetimi</h2>

          {/* Statistics Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Toplam Sipariş</p>
                  <p className="text-3xl font-bold mt-2">{orders.length}</p>
                </div>
                <div className="bg-white/20 p-3 rounded-lg">
                  <ShoppingCart className="w-8 h-8" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Toplam Gelir</p>
                  <p className="text-3xl font-bold mt-2">{orders.filter(o => o.status === 'completed').reduce((sum, o) => sum + o.totalAmount, 0).toLocaleString('tr-TR')} ₺</p>
                </div>
                <div className="bg-white/20 p-3 rounded-lg">
                  <TrendingUp className="w-8 h-8" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium">Bekleyen</p>
                  <p className="text-3xl font-bold mt-2">{orders.filter(o => o.status === 'pending' || o.status === 'preparing').length}</p>
                </div>
                <div className="bg-white/20 p-3 rounded-lg">
                  <Clock className="w-8 h-8" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Ödeme Bekleyen</p>
                  <p className="text-3xl font-bold mt-2">{orders.filter(o => o.paymentStatus === 'waiting').length}</p>
                </div>
                <div className="bg-white/20 p-3 rounded-lg">
                  <CreditCard className="w-8 h-8" />
                </div>
              </div>
            </div>
          </div>

              {/* Active Filters */}
              <div className="mb-6 flex flex-wrap items-center gap-2">
                {orderSearchQuery && (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 shadow-sm">
                    Aranan: {orderSearchQuery}
                    <button onClick={() => setOrderSearchQuery('')} className="ml-2 text-gray-500 hover:text-gray-700">
                      <X className="w-4 h-4" />
                    </button>
                  </span>
                )}
                {orderStatusFilter !== 'all' && (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 shadow-sm">
                    Durum: {orderStatusFilter === 'pending' ? 'Beklemede' : orderStatusFilter === 'preparing' ? 'Hazırlanıyor' : orderStatusFilter === 'ready' ? 'Hazır' : orderStatusFilter === 'completed' ? 'Tamamlandı' : 'İptal'}
                    <button onClick={() => setOrderStatusFilter('all')} className="ml-2 text-blue-500 hover:text-blue-700">
                      <X className="w-4 h-4" />
                    </button>
                  </span>
                )}
                {paymentStatusFilter !== 'all' && (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 shadow-sm">
                    Ödeme: {paymentStatusFilter === 'waiting' ? 'Bekleniyor' : 'Ödendi'}
                    <button onClick={() => setPaymentStatusFilter('all')} className="ml-2 text-green-500 hover:text-green-700">
                      <X className="w-4 h-4" />
                    </button>
                  </span>
                )}
                {paymentMethodFilter !== 'all' && (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 shadow-sm">
                    Yöntem: {paymentMethodFilter === 'cash' ? 'Nakit' : 'Kupon'}
                    <button onClick={() => setPaymentMethodFilter('all')} className="ml-2 text-purple-500 hover:text-purple-700">
                      <X className="w-4 h-4" />
                    </button>
                  </span>
                )}
              </div>

              <div className="space-y-4">
                {filteredAndSortedOrders.map(order => {
                  const isExpanded = expandedOrderId === order.id;
                  const statusColors = {
                    pending: 'from-yellow-400 to-yellow-500',
                    preparing: 'from-blue-400 to-blue-500',
                    ready: 'from-purple-400 to-purple-500',
                    completed: 'from-green-400 to-green-500',
                    cancelled: 'from-red-400 to-red-500'
                  };
                  const statusLabels = {
                    pending: 'Beklemede',
                    preparing: 'Hazırlanıyor',
                    ready: 'Hazır',
                    completed: 'Tamamlandı',
                    cancelled: 'İptal'
                  };

                  return (
                    <div key={order.id} className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 overflow-hidden">
                      {/* Header - Always Visible */}
                      <div 
                        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-bold text-lg text-gray-900">{order.userName}</h3>
                              <span className={`px-3 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r ${statusColors[order.status]}`}>
                                {statusLabels[order.status]}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {new Date(order.createdAt.seconds * 1000).toLocaleDateString('tr-TR')}
                              </span>
                              <span className="flex items-center gap-1">
                                <Package className="w-4 h-4" />
                                {order.items.length} ürün
                              </span>
                              <span className="flex items-center gap-1">
                                <Tag className="w-4 h-4" />
                                {order.paymentMethod === 'cash' ? 'Nakit' : 'Kupon'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{order.totalAmount} ₺</p>
                              <span className={`text-xs font-semibold ${order.paymentStatus === 'paid' ? 'text-green-600' : 'text-orange-600'}`}>
                                {order.paymentStatus === 'paid' ? 'Ödendi' : 'Ödeme Bekleniyor'}
                              </span>
                            </div>
                            {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                          </div>
                        </div>
                      </div>

                      {/* Expanded Content */}
                      {isExpanded && (
                        <div className="border-t border-gray-200 p-4 bg-gray-50/50 space-y-4">
                          {/* View Detail Button */}
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); setShowOrderDetailModal(true); }}
                            className="w-full py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all flex items-center justify-center gap-2"
                          >
                            <Eye className="w-4 h-4" />
                            Detaylı Görüntüle
                          </button>
                          {/* User Info */}
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Mail className="w-4 h-4" />
                            {order.userEmail}
                          </div>

                          {/* Products */}
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                              <ShoppingCart className="w-4 h-4" />
                              Ürünler
                            </h4>
                            <div className="space-y-2">
                              {order.items.map((item, idx) => {
                                const product = products.find(p => p.id === item.productId);
                                return (
                                  <div key={idx} className="flex items-center gap-3 bg-white rounded-lg p-3 border border-gray-200">
                                    {product?.image && (
                                      <img src={product.image} alt={item.productName} className="w-12 h-12 object-cover rounded-lg" />
                                    )}
                                    <div className="flex-1">
                                      <p className="font-semibold text-gray-900">{item.productName}</p>
                                      <p className="text-sm text-gray-600">{item.price} ₺ x {item.quantity}</p>
                                    </div>
                                    <p className="font-bold text-indigo-600">{item.price * item.quantity} ₺</p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Coupon Info */}
                          {order.couponId && order.discountAmount && (
                            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-3">
                              <p className="text-sm font-semibold text-green-800">
                                🎫 Kupon İndirimi: -{order.discountAmount} ₺
                              </p>
                            </div>
                          )}

                          {/* Notes */}
                          {order.notes && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                              <p className="text-sm text-blue-900"><strong>Not:</strong> {order.notes}</p>
                            </div>
                          )}

                          {/* Status Update */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Sipariş Durumu</label>
                              <select
                                value={order.status}
                                onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value as Order['status'])}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                              >
                                <option value="pending">Beklemede</option>
                                <option value="preparing">Hazırlanıyor</option>
                                <option value="ready">Hazır</option>
                                <option value="completed">Tamamlandı</option>
                                <option value="cancelled">İptal</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Ödeme Durumu</label>
                              <select
                                value={order.paymentStatus}
                                onChange={(e) => handleUpdatePaymentStatus(order.id, e.target.value as Order['paymentStatus'])}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                              >
                                <option value="waiting">Ödeme Bekleniyor</option>
                                <option value="paid">Ödendi</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl">
            <div className="p-6 border-b bg-gradient-to-r from-green-500 to-emerald-600">
              <h2 className="text-2xl font-bold text-white flex items-center">
                <Upload className="w-6 h-6 mr-2" />
                CSV'den Toplu Ürün Yükle
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">CSV Formatı:</h3>
                <code className="text-sm text-blue-800 block bg-white p-3 rounded border border-blue-200">
                  name,category,price,stock,image,description<br/>
                  Kalem Seti,kirtasiye,25,50,https://...,Renkli kalem seti<br/>
                  Okul Çantası,aksesuar,150,20,https://...,Sırt çantası
                </code>
                <p className="text-sm text-blue-700 mt-2">
                  <strong>Kategori değerleri:</strong> aksesuar, kiyafet, kirtasiye
                </p>
              </div>

              {importError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">{importError}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">CSV Dosyası Seç</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleImportCSV}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
            </div>
            <div className="p-6 border-t flex gap-2">
              <button
                onClick={() => { setShowImportModal(false); setImportError(''); }}
                className="flex-1 py-2 border rounded-lg hover:bg-gray-100"
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Detail Modal */}
      {showDetailModal && selectedProduct && (() => {
        const productOrders = orders.filter(o => o.items.some(i => i.productId === selectedProduct.id));
        const completedOrders = productOrders.filter(o => o.status === 'completed');
        const totalSold = completedOrders.reduce((sum, o) => sum + o.items.filter(i => i.productId === selectedProduct.id).reduce((s, i) => s + i.quantity, 0), 0);
        const totalRevenue = completedOrders.reduce((sum, o) => sum + o.items.filter(i => i.productId === selectedProduct.id).reduce((s, i) => s + (i.price * i.quantity), 0), 0);

        return (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowDetailModal(false)}>
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b bg-gradient-to-r from-indigo-500 to-purple-600">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-white flex items-center">
                    <Eye className="w-6 h-6 mr-2" />
                    Ürün Detayları
                  </h2>
                  <button onClick={() => setShowDetailModal(false)} className="text-white/80 hover:text-white transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Left: Image */}
                  <div className="md:w-1/3">
                    <img src={selectedProduct.image} alt={selectedProduct.name} className="w-full aspect-square object-cover rounded-xl shadow-lg" />
                    <div className="mt-4 space-y-2">
                      <button
                        onClick={() => {
                          setShowDetailModal(false);
                          setEditingProduct(selectedProduct);
                          setFormData({
                            name: selectedProduct.name,
                            category: selectedProduct.category,
                            price: selectedProduct.price,
                            stock: selectedProduct.stock,
                            image: selectedProduct.image,
                            description: selectedProduct.description,
                          });
                          setShowProductModal(true);
                        }}
                        className="w-full py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:shadow-lg transition-all flex items-center justify-center gap-2"
                      >
                        <Edit className="w-4 h-4" />
                        Düzenle
                      </button>
                      <button
                        onClick={() => { setShowDetailModal(false); handleDeleteProduct(selectedProduct.id); }}
                        className="w-full py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:shadow-lg transition-all flex items-center justify-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Sil
                      </button>
                    </div>
                  </div>

                  {/* Right: Details */}
                  <div className="md:w-2/3 space-y-6">
                    <div>
                      <h3 className="text-3xl font-bold text-gray-900 mb-2">{selectedProduct.name}</h3>
                      <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-semibold capitalize">{selectedProduct.category}</span>
                    </div>

                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4">
                      <p className="text-gray-700 leading-relaxed">{selectedProduct.description}</p>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white border border-gray-200 rounded-xl p-4">
                        <p className="text-sm text-gray-600 mb-1">Fiyat</p>
                        <p className="text-2xl font-bold text-indigo-600">{selectedProduct.price} ₺</p>
                      </div>
                      <div className="bg-white border border-gray-200 rounded-xl p-4">
                        <p className="text-sm text-gray-600 mb-1">Mevcut Stok</p>
                        <p className={`text-2xl font-bold ${
                          selectedProduct.stock === 0 ? 'text-red-600' : selectedProduct.stock <= 3 ? 'text-orange-600' : 'text-green-600'
                        }`}>{selectedProduct.stock}</p>
                      </div>
                      <div className="bg-white border border-gray-200 rounded-xl p-4">
                        <p className="text-sm text-gray-600 mb-1">Toplam Satış</p>
                        <p className="text-2xl font-bold text-purple-600">{totalSold} adet</p>
                      </div>
                      <div className="bg-white border border-gray-200 rounded-xl p-4">
                        <p className="text-sm text-gray-600 mb-1">Toplam Gelir</p>
                        <p className="text-2xl font-bold text-green-600">{totalRevenue.toLocaleString('tr-TR')} ₺</p>
                      </div>
                    </div>

                    {/* Recent Orders */}
                    {completedOrders.length > 0 && (
                      <div>
                        <h4 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
                          <ShoppingCart className="w-5 h-5 mr-2 text-indigo-600" />
                          Son Siparişler ({completedOrders.length})
                        </h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {completedOrders.slice(0, 5).map(order => {
                            const orderItem = order.items.find(i => i.productId === selectedProduct.id);
                            return (
                              <div key={order.id} className="bg-gray-50 rounded-lg p-3 flex justify-between items-center">
                                <div>
                                  <p className="text-sm font-semibold text-gray-900">{order.userName}</p>
                                  <p className="text-xs text-gray-600 flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {new Date(order.createdAt.seconds * 1000).toLocaleDateString('tr-TR')}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-bold text-indigo-600">{orderItem?.quantity} adet</p>
                                  <p className="text-xs text-gray-600">{((orderItem?.price || 0) * (orderItem?.quantity || 0)).toLocaleString('tr-TR')} ₺</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Order Detail Modal */}
      {showOrderDetailModal && selectedOrder && (() => {
        const statusColors = {
          pending: 'from-yellow-400 to-yellow-500',
          preparing: 'from-blue-400 to-blue-500',
          ready: 'from-purple-400 to-purple-500',
          completed: 'from-green-400 to-green-500',
          cancelled: 'from-red-400 to-red-500'
        };
        const statusLabels = {
          pending: 'Beklemede',
          preparing: 'Hazırlanıyor',
          ready: 'Hazır',
          completed: 'Tamamlandı',
          cancelled: 'İptal'
        };

        return (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowOrderDetailModal(false)}>
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b bg-gradient-to-r from-indigo-500 to-purple-600">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-white flex items-center">
                    <ShoppingCart className="w-6 h-6 mr-2" />
                    Sipariş Detayları
                  </h2>
                  <button onClick={() => setShowOrderDetailModal(false)} className="text-white/80 hover:text-white transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Order Info */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Sipariş ID</p>
                    <p className="font-mono text-sm text-gray-900">{selectedOrder.id}</p>
                  </div>
                  <span className={`px-4 py-2 rounded-full text-sm font-bold text-white bg-gradient-to-r ${statusColors[selectedOrder.status]}`}>
                    {statusLabels[selectedOrder.status]}
                  </span>
                </div>

                {/* User Info */}
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4">
                  <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <User className="w-5 h-5 text-indigo-600" />
                    Müşteri Bilgileri
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Ad Soyad</p>
                      <p className="font-semibold text-gray-900">{selectedOrder.userName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">E-posta</p>
                      <p className="font-semibold text-gray-900">{selectedOrder.userEmail}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Sipariş Tarihi</p>
                      <p className="font-semibold text-gray-900">{new Date(selectedOrder.createdAt.seconds * 1000).toLocaleString('tr-TR')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Ödeme Yöntemi</p>
                      <p className="font-semibold text-gray-900">{selectedOrder.paymentMethod === 'cash' ? 'Nakit' : 'Kupon'}</p>
                    </div>
                  </div>
                </div>

                {/* Products */}
                <div>
                  <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Package className="w-5 h-5 text-indigo-600" />
                    Ürünler ({selectedOrder.items.length})
                  </h3>
                  <div className="space-y-3">
                    {selectedOrder.items.map((item, idx) => {
                      const product = products.find(p => p.id === item.productId);
                      return (
                        <div key={idx} className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl p-4">
                          {product?.image && (
                            <img src={product.image} alt={item.productName} className="w-20 h-20 object-cover rounded-lg shadow-md" />
                          )}
                          <div className="flex-1">
                            <p className="font-bold text-gray-900">{item.productName}</p>
                            <p className="text-sm text-gray-600">Birim Fiyat: {item.price} ₺</p>
                            <p className="text-sm text-gray-600">Adet: {item.quantity}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-indigo-600">{item.price * item.quantity} ₺</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Price Summary */}
                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Ara Toplam</span>
                    <span className="font-semibold text-gray-900">{selectedOrder.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)} ₺</span>
                  </div>
                  {selectedOrder.couponId && selectedOrder.discountAmount && (
                    <div className="flex justify-between text-sm">
                      <span className="text-green-600">🎫 Kupon İndirimi</span>
                      <span className="font-semibold text-green-600">-{selectedOrder.discountAmount} ₺</span>
                    </div>
                  )}
                  <div className="border-t border-gray-300 pt-2 flex justify-between">
                    <span className="font-bold text-gray-900">Toplam</span>
                    <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{selectedOrder.totalAmount} ₺</span>
                  </div>
                </div>

                {/* Payment Status */}
                <div className={`rounded-xl p-4 ${selectedOrder.paymentStatus === 'paid' ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'}`}>
                  <div className="flex items-center gap-2">
                    <CreditCard className={`w-5 h-5 ${selectedOrder.paymentStatus === 'paid' ? 'text-green-600' : 'text-orange-600'}`} />
                    <span className={`font-semibold ${selectedOrder.paymentStatus === 'paid' ? 'text-green-900' : 'text-orange-900'}`}>
                      {selectedOrder.paymentStatus === 'paid' ? 'Ödeme Tamamlandı' : 'Ödeme Bekleniyor'}
                    </span>
                  </div>
                </div>

                {/* Notes */}
                {selectedOrder.notes && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <h3 className="font-bold text-blue-900 mb-2">Sipariş Notu</h3>
                    <p className="text-sm text-blue-800">{selectedOrder.notes}</p>
                  </div>
                )}

                {/* Status Update */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Sipariş Durumu</label>
                    <select
                      value={selectedOrder.status}
                      onChange={(e) => {
                        handleUpdateOrderStatus(selectedOrder.id, e.target.value as Order['status']);
                        setSelectedOrder({ ...selectedOrder, status: e.target.value as Order['status'] });
                      }}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="pending">Beklemede</option>
                      <option value="preparing">Hazırlanıyor</option>
                      <option value="ready">Hazır</option>
                      <option value="completed">Tamamlandı</option>
                      <option value="cancelled">İptal</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Ödeme Durumu</label>
                    <select
                      value={selectedOrder.paymentStatus}
                      onChange={(e) => {
                        handleUpdatePaymentStatus(selectedOrder.id, e.target.value as Order['paymentStatus']);
                        setSelectedOrder({ ...selectedOrder, paymentStatus: e.target.value as Order['paymentStatus'] });
                      }}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="waiting">Ödeme Bekleniyor</option>
                      <option value="paid">Ödendi</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b bg-gradient-to-r from-indigo-500 to-purple-600">
              <h2 className="text-2xl font-bold text-white flex items-center">
                <ShoppingBag className="w-6 h-6 mr-2" />
                {editingProduct ? 'Ürün Düzenle' : 'Yeni Ürün Ekle'}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Ürün Adı</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Kategori</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="aksesuar">Aksesuar</option>
                  <option value="kiyafet">Kıyafet</option>
                  <option value="kirtasiye">Kırtasiye</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Fiyat (TL)</label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Stok</label>
                <input
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Resim URL</label>
                <input
                  type="text"
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Açıklama</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                  rows={3}
                />
              </div>
            </div>
            <div className="p-6 border-t flex gap-2">
              <button
                onClick={() => setShowProductModal(false)}
                className="flex-1 py-2 border rounded-lg hover:bg-gray-100"
              >
                İptal
              </button>
              <button
                onClick={handleSaveProduct}
                className="flex-1 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all"
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShopManagementTab;
