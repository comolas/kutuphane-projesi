import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ShoppingCart, Plus, Minus, Trash2, Package, Search, Filter, X, Eye, Tag, Ticket } from 'lucide-react';
import { useShop } from '../contexts/ShopContext';
import { useCoupons } from '../contexts/CouponContext';
import { Product } from '../types';
import { UserCoupon } from '../types/coupon';
import Swal from 'sweetalert2';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import OptimizedImage from '../components/common/OptimizedImage';

const ShopPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { products, cart, appliedCoupon, addToCart, removeFromCart, updateCartQuantity, applyCoupon, removeCoupon, getCartTotal, getDiscountAmount, getFinalTotal, getCartItemCount, createOrder } = useShop();
  const { coupons } = useCoupons();
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'aksesuar' | 'kiyafet' | 'kirtasiye'>('all');
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod] = useState<'cash'>('cash');
  const [notes, setNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 12;
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showProductDetails, setShowProductDetails] = useState(false);
  const [sortOrder, setSortOrder] = useState<string>('default');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [maxPrice, setMaxPrice] = useState(1000);
  const [showImageZoom, setShowImageZoom] = useState(false);
  const [zoomedImage, setZoomedImage] = useState('');
  const [showCouponSelect, setShowCouponSelect] = useState(false);

  const availableShopCoupons = coupons.filter(c => 
    !c.isUsed && 
    c.type === 'shop-discount' &&
    c.expiryDate > new Date()
  );

  useEffect(() => {
    if (products.length > 0) {
      const max = Math.max(...products.map(p => p.price));
      setMaxPrice(Math.ceil(max / 100) * 100);
      setPriceRange([0, Math.ceil(max / 100) * 100]);
    }
  }, [products]);

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLocaleLowerCase('tr-TR').includes(searchQuery.toLocaleLowerCase('tr-TR')) ||
      product.description.toLocaleLowerCase('tr-TR').includes(searchQuery.toLocaleLowerCase('tr-TR'));
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    const matchesPrice = product.price >= priceRange[0] && product.price <= priceRange[1];
    return matchesSearch && matchesCategory && matchesPrice;
  }).sort((a, b) => {
    switch (sortOrder) {
      case 'price-asc':
        return a.price - b.price;
      case 'price-desc':
        return b.price - a.price;
      case 'name-asc':
        return a.name.localeCompare(b.name, 'tr-TR');
      case 'name-desc':
        return b.name.localeCompare(a.name, 'tr-TR');
      case 'stock-desc':
        return b.stock - a.stock;
      default:
        return 0;
    }
  });

  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const paginatedProducts = filteredProducts.slice(indexOfFirstProduct, indexOfLastProduct);
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);

  const getCartProduct = (productId: string) => {
    return cart.find(item => item.productId === productId);
  };

  const getProductById = (productId: string) => {
    return products.find(p => p.id === productId);
  };

  const handleCheckout = async () => {
    try {
      await createOrder(paymentMethod, notes);
      await Swal.fire({
        icon: 'success',
        title: t('shop.orderCreated'),
        text: t('shop.orderCreatedText'),
        confirmButtonColor: '#4F46E5'
      });
      setShowCheckout(false);
      setShowCart(false);
      navigate('/my-orders');
    } catch (error: any) {
      await Swal.fire({
        icon: 'error',
        title: t('shop.error'),
        text: error.message,
        confirmButtonColor: '#EF4444'
      });
    }
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSortOrder('default');
    setPriceRange([0, maxPrice]);
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-4 flex justify-between items-center">
          <button onClick={() => navigate('/dashboard')} className="flex items-center text-gray-600 hover:text-gray-900">
            <ChevronLeft className="w-5 h-5 mr-1" />
            {t('common.back')}
          </button>
          <button onClick={() => setShowCart(true)} className="relative p-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all">
            <ShoppingCart className="w-6 h-6" />
            {getCartItemCount() > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold shadow-lg">
                {getCartItemCount()}
              </span>
            )}
          </button>
        </div>

        <div className="flex justify-center">
          <DotLottieReact
            src="https://lottie.host/8df91219-90cf-4ac3-8df6-e06a06a2bd33/71Uiblorwn.lottie"
            loop
            autoplay
            className="w-48 h-48 md:w-72 md:h-72"
          />
        </div>

        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">{t('shop.title')}</h1>
          <p className="mt-2 text-gray-600">{t('shop.description')}</p>
        </div>

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
          <aside className={`fixed lg:sticky top-0 left-0 h-full lg:h-auto w-80 lg:w-64 bg-white/90 backdrop-blur-xl lg:rounded-2xl shadow-lg p-4 sm:p-6 z-50 transition-transform duration-300 ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          } lg:flex-shrink-0 border border-white/20`}>
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <h2 className="text-lg font-semibold flex items-center">
                <Filter className="w-5 h-5 mr-2 text-indigo-600" />
                {t('shop.filters')}
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={handleClearFilters}
                  className="px-3 py-1 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all"
                >
                  {t('shop.clear')}
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
                  placeholder={t('shop.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
              </div>
            </div>

            <div className="space-y-4 sm:space-y-6">
              {/* Sort Order */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('shop.sorting')}</h3>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="default">{t('shop.sortDefault')}</option>
                  <option value="price-asc">{t('shop.sortPriceAsc')}</option>
                  <option value="price-desc">{t('shop.sortPriceDesc')}</option>
                  <option value="name-asc">{t('shop.sortNameAsc')}</option>
                  <option value="name-desc">{t('shop.sortNameDesc')}</option>
                  <option value="stock-desc">{t('shop.sortStockDesc')}</option>
                </select>
              </div>

              {/* Price Range Filter */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('shop.priceRange')}</h3>
                <div className="space-y-3">
                  <input
                    type="range"
                    min="0"
                    max={maxPrice}
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={priceRange[0]}
                      onChange={(e) => setPriceRange([parseInt(e.target.value) || 0, priceRange[1]])}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder={t('shop.min')}
                    />
                    <span className="text-gray-500">-</span>
                    <input
                      type="number"
                      value={priceRange[1]}
                      onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value) || maxPrice])}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder={t('shop.max')}
                    />
                  </div>
                  <div className="text-xs text-gray-600 text-center">
                    {priceRange[0]} TL - {priceRange[1]} TL
                  </div>
                </div>
              </div>

              {/* Category Filter */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('shop.category')}</h3>
                <div className="space-y-2">
                  <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <input
                      type="radio"
                      name="category"
                      checked={selectedCategory === 'all'}
                      onChange={() => setSelectedCategory('all')}
                      className="mr-2"
                    />
                    <span className="text-sm">{t('shop.all')}</span>
                  </label>
                  <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <input
                      type="radio"
                      name="category"
                      checked={selectedCategory === 'aksesuar'}
                      onChange={() => setSelectedCategory('aksesuar')}
                      className="mr-2"
                    />
                    <span className="text-sm">{t('shop.accessory')}</span>
                  </label>
                  <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <input
                      type="radio"
                      name="category"
                      checked={selectedCategory === 'kiyafet'}
                      onChange={() => setSelectedCategory('kiyafet')}
                      className="mr-2"
                    />
                    <span className="text-sm">{t('shop.clothing')}</span>
                  </label>
                  <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <input
                      type="radio"
                      name="category"
                      checked={selectedCategory === 'kirtasiye'}
                      onChange={() => setSelectedCategory('kirtasiye')}
                      className="mr-2"
                    />
                    <span className="text-sm">{t('shop.stationery')}</span>
                  </label>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content Area */}
          <div className="flex-1">
            {/* Active Filters */}
            <div className="mb-6 flex flex-wrap items-center gap-2">
              {searchQuery && (
                <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 shadow-sm">
                  {t('shop.searched')}: {searchQuery}
                  <button onClick={() => setSearchQuery('')} className="ml-2 text-gray-500 hover:text-gray-700">
                    <X className="w-4 h-4" />
                  </button>
                </span>
              )}
              {selectedCategory !== 'all' && (
                <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 shadow-sm">
                  {t('shop.categoryLabel')}: {selectedCategory === 'aksesuar' ? t('shop.accessory') : selectedCategory === 'kiyafet' ? t('shop.clothing') : t('shop.stationery')}
                  <button onClick={() => setSelectedCategory('all')} className="ml-2 text-purple-500 hover:text-purple-700">
                    <X className="w-4 h-4" />
                  </button>
                </span>
              )}
              {sortOrder !== 'default' && (
                <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-gradient-to-r from-blue-100 to-indigo-100 text-indigo-800 shadow-sm">
                  {t('shop.sorting')}: {sortOrder === 'price-asc' ? t('shop.sortPriceAsc') : sortOrder === 'price-desc' ? t('shop.sortPriceDesc') : sortOrder === 'name-asc' ? t('shop.sortNameAsc') : sortOrder === 'name-desc' ? t('shop.sortNameDesc') : t('shop.sortStockDesc')}
                  <button onClick={() => setSortOrder('default')} className="ml-2 text-indigo-500 hover:text-indigo-700">
                    <X className="w-4 h-4" />
                  </button>
                </span>
              )}
              {(priceRange[0] !== 0 || priceRange[1] !== maxPrice) && (
                <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 shadow-sm">
                  {t('shop.price')}: {priceRange[0]}-{priceRange[1]} TL
                  <button onClick={() => setPriceRange([0, maxPrice])} className="ml-2 text-green-500 hover:text-green-700">
                    <X className="w-4 h-4" />
                  </button>
                </span>
              )}
            </div>

            {paginatedProducts.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-16">
                <Package className="w-32 h-32 mb-6 text-gray-300" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">{t('shop.noProducts')}</h3>
                <p className="text-gray-500">{t('shop.noProductsDesc')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
                {paginatedProducts.map((product, index) => {
                  const cartItem = getCartProduct(product.id);
                  return (
                    <div 
                      key={product.id} 
                      className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg overflow-hidden relative group transition-all duration-300 hover:scale-105 hover:shadow-2xl border border-white/20"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <div className="relative overflow-hidden aspect-square">
                        <div className="absolute top-2 left-2 z-10 space-y-1">
                          {product.stock === 0 ? (
                            <span className="block px-2 py-1 rounded-lg text-xs font-bold shadow-md bg-gradient-to-r from-red-500 to-pink-600 text-white animate-pulse">
                              {t('shop.outOfStock')}
                            </span>
                          ) : product.stock <= 3 ? (
                            <span className="block px-2 py-1 rounded-lg text-xs font-bold shadow-md bg-gradient-to-r from-orange-500 to-red-500 text-white animate-pulse">
                              {t('shop.lastItems', { count: product.stock })}
                            </span>
                          ) : product.stock <= 10 && (
                            <span className="block px-2 py-1 rounded-lg text-xs font-bold shadow-md bg-gradient-to-r from-yellow-400 to-orange-500 text-white">
                              {t('shop.lowStock')}
                            </span>
                          )}
                        </div>
                        <OptimizedImage 
                          src={product.image} 
                          alt={product.name} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="absolute bottom-0 left-0 right-0 p-3 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                            <button
                              onClick={() => { setSelectedProduct(product); setShowProductDetails(true); }}
                              className="w-full px-3 py-2 bg-white/90 backdrop-blur-sm text-gray-900 rounded-xl text-xs font-semibold shadow-md hover:bg-white transition-all flex items-center justify-center mb-2"
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              {t('shop.inspect')}
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="font-bold text-gray-900 text-sm line-clamp-2 mb-1">{product.name}</h3>
                        <p className="text-xs text-gray-600 line-clamp-2 mb-2">{product.description}</p>
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-xl font-bold text-indigo-600">{product.price} TL</span>
                          <span className="text-xs text-gray-500">{t('shop.stock')}: {product.stock}</span>
                        </div>
                        {cartItem ? (
                          <div className="flex items-center justify-center gap-3">
                            <button onClick={() => updateCartQuantity(product.id, cartItem.quantity - 1)} className="p-2 bg-gradient-to-r from-gray-100 to-gray-200 rounded-lg hover:shadow-md transition-all">
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="font-bold text-lg min-w-[30px] text-center">{cartItem.quantity}</span>
                            <button onClick={() => updateCartQuantity(product.id, cartItem.quantity + 1)} className="p-2 bg-gradient-to-r from-gray-100 to-gray-200 rounded-lg hover:shadow-md transition-all" disabled={cartItem.quantity >= product.stock}>
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => addToCart(product.id)} className="w-full py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold" disabled={product.stock === 0}>
                            {product.stock === 0 ? t('shop.outOfStock') : t('shop.addToCart')}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {totalPages > 1 && (
              <div className="mt-6 sm:mt-8 flex justify-center items-center space-x-2 sm:space-x-4">
                <button
                  onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-4 sm:px-6 py-2 sm:py-2.5 bg-white/60 backdrop-blur-xl border border-white/20 rounded-xl text-sm sm:text-base text-gray-700 hover:bg-white/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg font-medium"
                >
                  {t('shop.previous')}
                </button>
                <span className="px-3 sm:px-4 py-2 bg-white/60 backdrop-blur-xl rounded-xl text-sm sm:text-base text-gray-700 font-semibold shadow-lg">
                  {t('shop.page', { current: currentPage, total: totalPages })}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-4 sm:px-6 py-2 sm:py-2.5 bg-white/60 backdrop-blur-xl border border-white/20 rounded-xl text-sm sm:text-base text-gray-700 hover:bg-white/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg font-medium"
                >
                  {t('shop.next')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sepet Modal */}
      {showCart && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-0">
          <div className="bg-white rounded-3xl w-full h-full overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 p-6 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <ShoppingCart className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">{t('shop.cart')}</h2>
                  <p className="text-white/80 text-sm">{t('shop.items', { count: cart.length })}</p>
                </div>
              </div>
              <button onClick={() => setShowCart(false)} className="p-2 hover:bg-white/20 rounded-lg transition-all">
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(85vh-180px)]">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="p-6 bg-gray-100 rounded-full mb-4">
                    <ShoppingCart className="w-16 h-16 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">{t('shop.emptyCart')}</h3>
                  <p className="text-gray-600 mb-6">{t('shop.emptyCartDesc')}</p>
                  <button onClick={() => setShowCart(false)} className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all">
                    {t('shop.startShopping')}
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {cart.map(item => {
                      const product = getProductById(item.productId);
                      if (!product) return null;
                      return (
                        <div key={item.productId} className="flex items-center gap-4 p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl hover:shadow-md transition-all group">
                          <div className="relative">
                            <OptimizedImage src={product.image} alt={product.name} className="w-24 h-24 object-cover rounded-xl shadow-md" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-bold text-gray-900 mb-1">{product.name}</h3>
                            <p className="text-sm text-gray-600 mb-2">{product.price} TL × {item.quantity}</p>
                            <div className="flex items-center gap-2">
                              <button onClick={() => updateCartQuantity(product.id, item.quantity - 1)} className="p-1.5 bg-white rounded-lg hover:bg-gray-200 transition-all shadow-sm">
                                <Minus className="w-4 h-4" />
                              </button>
                              <span className="font-semibold text-sm min-w-[30px] text-center">{item.quantity}</span>
                              <button onClick={() => updateCartQuantity(product.id, item.quantity + 1)} className="p-1.5 bg-white rounded-lg hover:bg-gray-200 transition-all shadow-sm" disabled={item.quantity >= product.stock}>
                                <Plus className="w-4 h-4" />
                              </button>
                              <button onClick={() => removeFromCart(product.id)} className="ml-auto p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-indigo-600">{product.price * item.quantity} TL</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
            {cart.length > 0 && (
              <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 border-t">
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">{t('shop.subtotal')}</span>
                    <span className="text-sm font-semibold text-gray-900">{getCartTotal()} TL</span>
                  </div>
                  {appliedCoupon && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-green-600">{t('shop.discount')} (%{appliedCoupon.discountPercent})</span>
                      <span className="text-sm font-semibold text-green-600">-{getDiscountAmount()} TL</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-lg font-semibold text-gray-700">{t('shop.total')}</span>
                    <span className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{getFinalTotal()} TL</span>
                  </div>
                </div>
                <button onClick={() => setShowCheckout(true)} className="w-full py-4 bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 text-white rounded-xl font-bold text-lg hover:shadow-xl transition-all transform hover:scale-[1.02]">
                  {t('shop.completeOrder')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <Package className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">{t('shop.orderSummary')}</h2>
              </div>
              <p className="text-white/80 text-sm">{t('shop.lastStep')}</p>
            </div>
            <div className="p-6 space-y-6">
              {/* Ödeme Yöntemi */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">{t('shop.paymentMethod')}</label>
                <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500 rounded-lg">
                      <span className="text-2xl">💵</span>
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{t('shop.cashPayment')}</p>
                      <p className="text-sm text-gray-600">{t('shop.payOnPickup')}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Kupon Seçimi */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">{t('shop.discountCoupon')}</label>
                {appliedCoupon ? (
                  <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-500 rounded-lg">
                          <Ticket className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{t('shop.couponApplied', { percent: appliedCoupon.discountPercent })}</p>
                          <p className="text-sm text-gray-600">-{getDiscountAmount()} TL</p>
                        </div>
                      </div>
                      <button onClick={removeCoupon} className="p-2 hover:bg-red-50 rounded-lg transition-all">
                        <X className="w-5 h-5 text-red-500" />
                      </button>
                    </div>
                  </div>
                ) : availableShopCoupons.length > 0 ? (
                  <button
                    onClick={() => setShowCouponSelect(true)}
                    className="w-full p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 text-gray-600 hover:text-indigo-600"
                  >
                    <Ticket className="w-5 h-5" />
                    <span className="font-semibold">{t('shop.selectCoupon', { count: availableShopCoupons.length })}</span>
                  </button>
                ) : (
                  <div className="p-4 bg-gray-50 border-2 border-gray-200 rounded-xl text-center">
                    <p className="text-sm text-gray-500">{t('shop.noCoupons')}</p>
                  </div>
                )}
              </div>

              {/* Sipariş Özeti */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">{t('shop.orderDetails')}</label>
                <div className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl space-y-2">
                  {cart.map(item => {
                    const product = getProductById(item.productId);
                    if (!product) return null;
                    return (
                      <div key={item.productId} className="flex justify-between items-center">
                        <span className="text-sm text-gray-700">{product.name} × {item.quantity}</span>
                        <span className="text-sm font-semibold text-gray-900">{product.price * item.quantity} TL</span>
                      </div>
                    );
                  })}
                  <div className="pt-2 border-t border-gray-300 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{t('shop.subtotal')}</span>
                      <span className="text-sm font-semibold text-gray-900">{getCartTotal()} TL</span>
                    </div>
                    {appliedCoupon && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-green-600">{t('shop.discount')} (%{appliedCoupon.discountPercent})</span>
                        <span className="text-sm font-semibold text-green-600">-{getDiscountAmount()} TL</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-2 border-t border-gray-300">
                      <span className="font-bold text-gray-900">{t('shop.total')}</span>
                      <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{getFinalTotal()} TL</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sipariş Notu */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">{t('shop.orderNote')}</label>
                <textarea 
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)} 
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" 
                  rows={3} 
                  placeholder={t('shop.orderNotePlaceholder')}
                ></textarea>
              </div>

              {/* Bilgilendirme */}
              <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl">
                <div className="flex gap-3">
                  <div className="flex-shrink-0">
                    <div className="p-2 bg-blue-500 rounded-lg">
                      <span className="text-xl">ℹ️</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-blue-900 mb-1">{t('shop.infoTitle')}</p>
                    <p className="text-sm text-blue-800">{t('shop.infoText')}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 border-t flex gap-3">
              <button onClick={() => setShowCheckout(false)} className="flex-1 py-3 border-2 border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-white transition-all">
                {t('shop.cancel')}
              </button>
              <button onClick={handleCheckout} className="flex-1 py-3 bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 text-white rounded-xl font-bold hover:shadow-xl transition-all transform hover:scale-[1.02]">
                {t('shop.confirmOrder')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Details Modal */}
      {showProductDetails && selectedProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-0">
          <div className="bg-white w-full h-full shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 p-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white flex items-center">
                <Package className="w-6 h-6 mr-2" />
                Ürün Detayları
              </h2>
              <button
                onClick={() => setShowProductDetails(false)}
                className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/20 rounded-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex flex-col md:flex-row h-[calc(100%-80px)]">
              {/* Left Side */}
              <div className="md:w-2/5 bg-gradient-to-br from-gray-100 to-gray-200 p-4 sm:p-8 flex flex-col items-center justify-center">
                <div className="relative mb-4 sm:mb-6 group cursor-pointer" onClick={() => { setZoomedImage(selectedProduct.image); setShowImageZoom(true); }}>
                  <OptimizedImage
                    src={selectedProduct.image}
                    alt={selectedProduct.name}
                    className="w-64 h-64 sm:w-80 sm:h-80 object-cover rounded-2xl shadow-2xl transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all rounded-2xl flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg">
                      <Eye className="w-6 h-6 text-gray-900" />
                    </div>
                  </div>
                  <div className="absolute top-3 left-3 space-y-1">
                    {selectedProduct.stock === 0 ? (
                      <span className="block px-3 py-1.5 rounded-xl text-xs font-bold shadow-lg backdrop-blur-sm bg-red-500/90 text-white animate-pulse">
                        ⚠️ Stokta Yok
                      </span>
                    ) : selectedProduct.stock <= 3 ? (
                      <span className="block px-3 py-1.5 rounded-xl text-xs font-bold shadow-lg backdrop-blur-sm bg-orange-500/90 text-white animate-pulse">
                        🔥 Son {selectedProduct.stock} Adet!
                      </span>
                    ) : selectedProduct.stock <= 10 && (
                      <span className="block px-3 py-1.5 rounded-xl text-xs font-bold shadow-lg backdrop-blur-sm bg-yellow-400/90 text-white">
                        ⚡ Az Kaldı!
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="text-center mb-6">
                  <p className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
                    {selectedProduct.price} TL
                  </p>
                  <p className="text-sm text-gray-600">Stok: {selectedProduct.stock} adet</p>
                </div>

                {selectedProduct.stock > 0 && (
                  <button
                    onClick={() => {
                      addToCart(selectedProduct.id);
                      Swal.fire({
                        icon: 'success',
                        title: 'Sepete Eklendi!',
                        text: `${selectedProduct.name} sepetinize eklendi.`,
                        confirmButtonColor: '#4F46E5',
                        timer: 2000
                      });
                    }}
                    className="w-full max-w-xs px-6 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                  >
                    Sepete Ekle
                  </button>
                )}
              </div>

              {/* Right Side */}
              <div className="md:w-3/5 overflow-y-auto p-4 sm:p-8 space-y-6">
                <div>
                  <h3 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-2">{selectedProduct.name}</h3>
                  <div className="inline-block px-3 py-1 bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 rounded-lg text-sm font-semibold">
                    {selectedProduct.category === 'aksesuar' ? 'Aksesuar' : selectedProduct.category === 'kiyafet' ? 'Kıyafet' : 'Kırtasiye'}
                  </div>
                </div>

                <div>
                  <h4 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">Ürün Açıklaması</h4>
                  <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6">
                    <p className="text-gray-700 leading-relaxed">
                      {selectedProduct.description}
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center">
                    <Tag className="w-6 h-6 mr-2 text-indigo-600" />
                    Ürün Özellikleri
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                      <p className="text-sm text-gray-500 mb-1">Kategori</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {selectedProduct.category === 'aksesuar' ? 'Aksesuar' : selectedProduct.category === 'kiyafet' ? 'Kıyafet' : 'Kırtasiye'}
                      </p>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                      <p className="text-sm text-gray-500 mb-1">Fiyat</p>
                      <p className="text-lg font-semibold text-indigo-600">{selectedProduct.price} TL</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                      <p className="text-sm text-gray-500 mb-1">Stok Durumu</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {selectedProduct.stock === 0 ? 'Tükendi' : selectedProduct.stock <= 5 ? `Son ${selectedProduct.stock} Adet` : 'Stokta Var'}
                      </p>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                      <p className="text-sm text-gray-500 mb-1">Ürün Kodu</p>
                      <p className="text-lg font-semibold text-gray-900">{selectedProduct.id.slice(0, 8).toUpperCase()}</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0">
                      <div className="p-2 bg-blue-500 rounded-lg">
                        <span className="text-xl">ℹ️</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-blue-900 mb-1">Teslimat Bilgisi</p>
                      <p className="text-sm text-blue-800">Siparişiniz hazırlandığında size bildirim gönderilecektir. Ürünü kütüphaneden teslim alırken nakit ödeme yapabilirsiniz.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Zoom Modal */}
      {showImageZoom && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={() => setShowImageZoom(false)}>
          <button
            onClick={() => setShowImageZoom(false)}
            className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <div className="relative max-w-6xl max-h-[90vh] w-full h-full flex items-center justify-center">
            <img
              src={zoomedImage}
              alt="Zoomed product"
              className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full">
            <p className="text-white text-sm font-medium">Kapatmak için tıklayın</p>
          </div>
        </div>
      )}

      {/* Coupon Select Modal */}
      {showCouponSelect && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 p-6 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <Ticket className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Kupon Seç</h2>
              </div>
              <button onClick={() => setShowCouponSelect(false)} className="p-2 hover:bg-white/20 rounded-lg transition-all">
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-100px)]">
              {availableShopCoupons.length === 0 ? (
                <div className="text-center py-12">
                  <Ticket className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">Kullanılabilir kuponunuz yok</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {availableShopCoupons.map(coupon => (
                    <div
                      key={coupon.id}
                      onClick={() => {
                        applyCoupon(coupon);
                        setShowCouponSelect(false);
                        Swal.fire({
                          icon: 'success',
                          title: 'Kupon Uygulandı!',
                          text: `%${coupon.discountPercent} indirim sepetinize eklendi.`,
                          confirmButtonColor: '#4F46E5',
                          timer: 2000
                        });
                      }}
                      className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg p-6 text-white relative overflow-hidden cursor-pointer hover:scale-105 transition-all"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-5xl font-bold">%{coupon.discountPercent}</span>
                          <Ticket className="w-8 h-8" />
                        </div>
                        <h4 className="text-xl font-bold mb-2">Mağaza İndirimi</h4>
                        <div className="text-sm opacity-90">
                          <p>SKT: {coupon.expiryDate.toLocaleDateString('tr-TR')}</p>
                          <p className="mt-1">{Math.ceil((coupon.expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} gün kaldı</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShopPage;
