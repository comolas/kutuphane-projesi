import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import OptimizedImage from '../components/common/OptimizedImage';
import { ChevronLeft, Search, Filter, X, AlertTriangle, Eye, ExternalLink, Tag, BookOpen, Ruler, Star, Heart, MessageSquare, UserPlus } from 'lucide-react';
import { Book } from '../types';
import { useBooks } from '../contexts/BookContext';
import { db } from '../firebase/config';
import { collection, getDocs, addDoc, deleteDoc, query, where, Timestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { debounce } from '../utils/debounce';
import ReviewModal from '../components/common/ReviewModal';
import StoryTray from '../components/catalog/StoryTray';
import RecommendBookModal from '../components/teacher/RecommendBookModal';
import Swal from 'sweetalert2';

// Add borrowMessages to the import from useBooks
const CatalogPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { allBooks, borrowBook, isBorrowed, getBookStatus, borrowMessages } = useBooks();
  const { user, isTeacher } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [tagQuery, setTagQuery] = useState('');
  const [debouncedTagQuery, setDebouncedTagQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [availability, setAvailability] = useState<'all' | 'available' | 'borrowed' | 'lost'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [showBookDetails, setShowBookDetails] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showRecommendModal, setShowRecommendModal] = useState(false);
  const [bookToRecommend, setBookToRecommend] = useState<Book | null>(null);
  const [userFavorites, setUserFavorites] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const booksPerPage = 12;
  const [sortOrder, setSortOrder] = useState<string>('default'); // New state for sorting
  const [recommendedBooksForModal, setRecommendedBooksForModal] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const debouncedSearch = useMemo(
    () => debounce((value: string) => setDebouncedSearchQuery(value), 300),
    []
  );

  const debouncedTagSearch = useMemo(
    () => debounce((value: string) => setDebouncedTagQuery(value), 300),
    []
  );

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    debouncedSearch(value);
  }, [debouncedSearch]);

  const handleTagChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTagQuery(value);
    debouncedTagSearch(value);
  }, [debouncedTagSearch]);

  useEffect(() => {
    if (!user) {
      setUserFavorites([]);
      return;
    }
    const fetchUserFavorites = async () => {
      try {
        const favoritesRef = collection(db, 'favorites');
        const q = query(favoritesRef, where('userId', '==', user.uid));
        const querySnapshot = await getDocs(q);
        const favoriteBookIds = querySnapshot.docs.map(doc => doc.data().bookId as string);
        setUserFavorites(favoriteBookIds);
      } catch (error) {
        console.error('Error fetching user favorites:', error);
      }
    };
    fetchUserFavorites();
  }, [user?.uid]);

  useEffect(() => {
    // Simulate loading for books
    if (allBooks.length > 0) {
      setIsLoading(false);
    }
  }, [allBooks]);

  // Çark ödülünden gelen kategoriyi otomatik seç
  useEffect(() => {
    const state = location.state as { selectedCategory?: string };
    if (state?.selectedCategory) {
      setSelectedCategory(state.selectedCategory);
      // State'i temizle
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state]);

  // Get unique categories
  const categories = Array.from(new Set(allBooks.map(book => book.category)));

  const handleBorrowRequest = useCallback(async (book: Book) => {
    try {
      await borrowBook(book);
      Swal.fire('Başarılı!', 'Kitap başarıyla ödünç alındı!', 'success');
    } catch (error: any) {
      console.error('Error borrowing book:', error);
      Swal.fire('Hata!', error.message || 'Kitap ödünç alınırken bir hata oluştu.', 'error');
    }
  }, [borrowBook]);

  const handleToggleFavorite = useCallback(async (bookId: string) => {
    if (!user) {
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: 'Favorilere eklemek için giriş yapmalısınız.',
        confirmButtonText: 'Tamam'
      });
      return;
    }
    try {
      const favoritesRef = collection(db, 'favorites');
      const isCurrentlyFavorite = userFavorites.includes(bookId);

      if (isCurrentlyFavorite) {
        // Remove from favorites
        const q = query(favoritesRef, where('userId', '==', user.uid), where('bookId', '==', bookId));
        const querySnapshot = await getDocs(q);
        querySnapshot.docs.forEach(async (doc) => {
          await deleteDoc(doc.ref);
        });
        setUserFavorites(prev => prev.filter(id => id !== bookId));
        Swal.fire('Başarılı!', 'Kitap favorilerinizden kaldırıldı.', 'success');
      } else {
        // Add to favorites
        await addDoc(favoritesRef, {
          userId: user.uid,
          bookId: bookId,
          favoritedAt: Timestamp.now()
        });
        setUserFavorites(prev => [...prev, bookId]);
        Swal.fire('Başarılı!', 'Kitap favorilerinize eklendi.', 'success');
      }
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
      Swal.fire('Hata!', 'Favori işlemi sırasında bir hata oluştu.', 'error');
    }
  }, [user, userFavorites]);

  const generateBookDetailsUrl = (bookId: string) => {
    const baseUrl = 'https://drive.google.com/file/d/';
    const viewSuffix = '/view?usp=sharing';
    const fileIds = {
      'TR-HK-1': '1KbrvPNIZTeuUrbm-FRzpNF0AqVf2R7QY',
      'TR-HK-2': '1AbcdefGhijklmnopQrstuvwxyz123456',
      'TR-HK-3': '1BcdefGhijklmnopQrstuvwxyz1234567',
    };
    const fileId = fileIds[bookId as keyof typeof fileIds] || '1KbrvPNIZTeuUrbm-FRzpNF0AqVf2R7QY';
    return `${baseUrl}${fileId}${viewSuffix}`;
  };

  const handleInspectBook = (book: Book) => {
    setSelectedBook(book);
    setShowBookDetails(true);
  };

  const handleInspectReviews = (book: Book) => {
    setSelectedBook(book);
    setShowReviewModal(true);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setTagQuery('');
    setAvailability('all');
    setSelectedCategory('all');
    setSortOrder('default');
    setCurrentPage(1);
  };

  const getRecommendedBooksByTags = (currentBook: Book) => {
    if (!currentBook.tags || currentBook.tags.length < 2) return [];

    const currentBookTags = new Set(currentBook.tags.map(tag => typeof tag === 'string' ? tag.toLowerCase() : ''));

    return allBooks.filter(book => {
      if (book.id === currentBook.id || !book.tags || book.tags.length < 2) return false;

      const otherBookTags = new Set(book.tags.map(tag => typeof tag === 'string' ? tag.toLowerCase() : ''));
      let commonTagsCount = 0;
      currentBookTags.forEach(tag => {
        if (otherBookTags.has(tag)) {
          commonTagsCount++;
        }
      });
      return commonTagsCount >= 2;
    });
  };

  useEffect(() => {
    if (selectedBook) {
      setRecommendedBooksForModal(getRecommendedBooksByTags(selectedBook));
    } else {
      setRecommendedBooksForModal([]);
    }
  }, [selectedBook, allBooks]);

  const filteredAndSortedBooks = useMemo(() => {
    return allBooks.filter(book => {
      const matchesSearch = book.title.toLocaleLowerCase('tr-TR').includes(debouncedSearchQuery.toLocaleLowerCase('tr-TR')) ||
        book.author.toLocaleLowerCase('tr-TR').includes(debouncedSearchQuery.toLocaleLowerCase('tr-TR'));

      const matchesTag = !debouncedTagQuery || (book.tags && book.tags.some(tag => typeof tag === 'string' && tag.toLocaleLowerCase('tr-TR').includes(debouncedTagQuery.toLocaleLowerCase('tr-TR'))));

      const bookStatus = getBookStatus(book.id);
      const matchesAvailability = availability === 'all' ||
        (availability === 'available' && bookStatus === 'available') ||
        (availability === 'borrowed' && bookStatus === 'borrowed') ||
        (availability === 'lost' && bookStatus === 'lost');

      const matchesCategory = selectedCategory === 'all' || book.category === selectedCategory;

      return matchesSearch && matchesAvailability && matchesCategory && matchesTag;
    }).sort((a, b) => {
      switch (sortOrder) {
        case 'title-asc':
          return a.title.localeCompare(b.title, 'tr-TR');
        case 'title-desc':
          return b.title.localeCompare(a.title, 'tr-TR');
        case 'author-asc':
          return a.author.localeCompare(b.author, 'tr-TR');
        case 'author-desc':
          return b.author.localeCompare(a.author, 'tr-TR');
        case 'rating-desc':
          return (b.averageRating || 0) - (a.averageRating || 0);
        default:
          return 0;
      }
    });
  }, [allBooks, debouncedSearchQuery, debouncedTagQuery, availability, selectedCategory, sortOrder, getBookStatus]);

  // Pagination logic
  const indexOfLastBook = currentPage * booksPerPage;
  const indexOfFirstBook = indexOfLastBook - booksPerPage;
  const paginatedBooks = filteredAndSortedBooks.slice(indexOfFirstBook, indexOfLastBook);

  const totalPages = Math.ceil(filteredAndSortedBooks.length / booksPerPage);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            {t('common.cancel')}
          </button>
        </div>

        <div className="flex justify-center">
          <DotLottieReact
            src="https://lottie.host/06e92ec9-c24d-4b52-83b7-e767c90eceb7/Xhyy8gxnmO.json"
            loop
            autoplay
            className="w-48 h-48 md:w-72 md:h-72"
          />
        </div>

        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">{t('books.title')}</h1>
          <p className="mt-2 text-gray-600">
            {t('catalog.searchPlaceholder')}
          </p>
        </div>

        <StoryTray />



        {/* Floating Filter Button (Mobile) */}
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="lg:hidden fixed bottom-6 right-6 z-40 p-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all"
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
          <aside className={`fixed lg:sticky top-0 left-0 h-full lg:h-auto w-80 lg:w-64 bg-white/90 backdrop-blur-xl lg:rounded-2xl shadow-lg p-4 sm:p-6 z-50 transition-transform duration-300 overflow-y-auto ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          } lg:flex-shrink-0 border border-white/20`}>
              <div className="flex justify-between items-center mb-4 sm:mb-6">
                <h2 className="text-lg font-semibold flex items-center">
                  <Filter className="w-5 h-5 mr-2 text-indigo-600" />
                  {t('common.filter')}
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={handleClearFilters}
                    className="px-3 py-1 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all"
                  >
                    {t('common.delete')}
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
                    placeholder={t('catalog.searchPlaceholder')}
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                </div>
              </div>

              <div className="space-y-4 sm:space-y-6">
                {/* Tag Search */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('common.search')}</h3>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder={t('common.search')}
                      value={tagQuery}
                      onChange={handleTagChange}
                      className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    <Tag className="absolute left-2.5 top-2.5 text-gray-400" size={16} />
                  </div>
                </div>

                {/* Category Filter */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('books.category')}</h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input
                        type="radio"
                        name="category"
                        checked={selectedCategory === 'all'}
                        onChange={() => setSelectedCategory('all')}
                        className="mr-2"
                      />
                      <span className="text-sm">{t('catalog.all')}</span>
                    </label>
                    {categories.map(category => (
                      <label key={category} className="flex items-center cursor-pointer hover:bg-gray-50 p-2.5 rounded touch-manipulation min-h-[44px]">
                        <input
                          type="radio"
                          name="category"
                          checked={selectedCategory === category}
                          onChange={() => setSelectedCategory(category)}
                          className="mr-2"
                        />
                        <span className="text-sm">{category}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Availability Filter */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('books.status')}</h3>
                  <div className="space-y-2">
                    <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2.5 rounded touch-manipulation min-h-[44px]">
                      <input
                        type="radio"
                        name="availability"
                        checked={availability === 'all'}
                        onChange={() => setAvailability('all')}
                        className="mr-2"
                      />
                      <span className="text-sm">{t('catalog.all')}</span>
                    </label>
                    <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2.5 rounded touch-manipulation min-h-[44px]">
                      <input
                        type="radio"
                        name="availability"
                        checked={availability === 'available'}
                        onChange={() => setAvailability('available')}
                        className="mr-2"
                      />
                      <span className="text-sm text-green-600">● {t('books.available')}</span>
                    </label>
                    <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2.5 rounded touch-manipulation min-h-[44px]">
                      <input
                        type="radio"
                        name="availability"
                        checked={availability === 'borrowed'}
                        onChange={() => setAvailability('borrowed')}
                        className="mr-2"
                      />
                      <span className="text-sm text-orange-600">● {t('books.borrowed')}</span>
                    </label>
                    <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2.5 rounded touch-manipulation min-h-[44px]">
                      <input
                        type="radio"
                        name="availability"
                        checked={availability === 'lost'}
                        onChange={() => setAvailability('lost')}
                        className="mr-2"
                      />
                      <span className="text-sm text-red-600">● {t('books.lost')}</span>
                    </label>
                  </div>
                </div>

                {/* Sort Order */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('catalog.sortBy')}</h3>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="default">{t('catalog.newest')}</option>
                    <option value="title-asc">{t('catalog.titleAZ')}</option>
                    <option value="title-desc">{t('catalog.titleZA')}</option>
                    <option value="author-asc">{t('catalog.authorAZ')}</option>
                    <option value="author-desc">{t('catalog.authorAZ')}</option>
                    <option value="rating-desc">{t('common.search')}</option>
                  </select>
                </div>
              </div>
          </aside>

          {/* Main Content Area */}
          <div className="flex-1">

            {/* Active Filters */}
            <div className="mb-6 flex flex-wrap items-center gap-2">
              {searchQuery && (
                <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 shadow-sm">
                  {t('common.search')}: {searchQuery}
                  <button onClick={() => setSearchQuery('')} className="ml-2 text-gray-500 hover:text-gray-700">
                    <X className="w-4 h-4" />
                  </button>
                </span>
              )}
              {tagQuery && (
                <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-gradient-to-r from-blue-100 to-indigo-100 text-indigo-800 shadow-sm">
                  {t('common.search')}: {tagQuery}
                  <button onClick={() => setTagQuery('')} className="ml-2 text-indigo-500 hover:text-indigo-700">
                    <X className="w-4 h-4" />
                  </button>
                </span>
              )}
              {selectedCategory !== 'all' && (
                <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 shadow-sm">
                  {t('books.category')}: {selectedCategory}
                  <button onClick={() => setSelectedCategory('all')} className="ml-2 text-purple-500 hover:text-purple-700">
                    <X className="w-4 h-4" />
                  </button>
                </span>
              )}
              {availability !== 'all' && (
                <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-gradient-to-r from-orange-100 to-red-100 text-orange-800 shadow-sm">
                  {t('books.status')}: {availability === 'available' ? t('books.available') : availability === 'borrowed' ? t('books.borrowed') : t('books.lost')}
                  <button onClick={() => setAvailability('all')} className="ml-2 text-orange-500 hover:text-orange-700">
                    <X className="w-4 h-4" />
                  </button>
                </span>
              )}
            </div>

            {isLoading ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg overflow-hidden animate-pulse border border-white/20">
                    <div className="w-full aspect-[2/3] bg-gradient-to-br from-gray-200 to-gray-300"></div>
                    <div className="p-4 space-y-3">
                      <div className="h-5 bg-gray-300 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-300 rounded w-1/2"></div>
                      <div className="h-4 bg-gray-300 rounded w-2/3"></div>
                      <div className="flex justify-between items-center mt-3">
                        <div className="h-6 bg-gray-300 rounded w-20"></div>
                        <div className="h-8 bg-gray-300 rounded w-24"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : paginatedBooks.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-16">
                <div className="w-32 h-32 mb-6 text-gray-300">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">{t('catalog.noResults')}</h3>
                <p className="text-gray-500">{t('catalog.noResults')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
                {paginatedBooks.map((book, index) => {
                  const bookStatus = getBookStatus(book.id);
                  const hasPendingRequest = borrowMessages.some(m => 
                    m.bookId === book.id && 
                    m.userId === user?.uid && 
                    m.status === 'pending'
                  );
                  return (
                    <div 
                      key={book.id} 
                      className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg overflow-hidden relative group transition-all duration-300 hover:scale-105 hover:shadow-2xl border border-white/20"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <div className="relative overflow-hidden aspect-[2/3]">
                        <div className="absolute top-2 left-2 z-10">
                          <span className={`px-2 py-1 rounded-lg text-xs font-bold shadow-md ${
                            hasPendingRequest
                              ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white'
                              : bookStatus === 'lost'
                              ? 'bg-gradient-to-r from-red-500 to-pink-600 text-white'
                              : bookStatus === 'borrowed'
                              ? 'bg-gradient-to-r from-orange-400 to-red-500 text-white'
                              : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
                          }`}>
                            {hasPendingRequest 
                              ? t('common.loading') 
                              : bookStatus === 'lost' 
                              ? t('books.lost') 
                              : bookStatus === 'borrowed' 
                              ? t('books.borrowed') 
                              : t('books.available')}
                          </span>
                        </div>
                        <button
                          onClick={() => handleToggleFavorite(book.id)}
                          className="absolute top-2 right-2 z-10 p-2 bg-white/90 backdrop-blur-sm rounded-full text-gray-600 hover:text-red-500 transition-all duration-300 hover:scale-110 shadow-md min-h-[44px] min-w-[44px] flex items-center justify-center"
                        >
                          <Heart className={`w-5 h-5 transition-all ${userFavorites.includes(book.id) ? 'text-red-500 fill-current scale-110' : ''}`} />
                        </button>
                        <OptimizedImage 
                          src={book.coverImage} 
                          alt={book.title} 
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="absolute bottom-0 left-0 right-0 p-3 space-y-2 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                            <button
                              onClick={() => handleInspectReviews(book)}
                              className="w-full px-3 py-2.5 bg-white/90 backdrop-blur-sm text-gray-900 rounded-xl text-xs font-semibold shadow-md hover:bg-white transition-all flex items-center justify-center min-h-[44px]"
                            >
                              <MessageSquare className="w-3 h-3 mr-1" />
                              {t('bookDetails.reviews')}
                            </button>
                            {isTeacher && (
                              <button
                                onClick={() => { setBookToRecommend(book); setShowRecommendModal(true); }}
                                className="w-full px-3 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl text-xs font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center min-h-[44px]"
                              >
                                <UserPlus className="w-3 h-3 mr-1" />
                                {t('common.search')}
                              </button>
                            )}
                            {bookStatus === 'available' && !hasPendingRequest && (
                              <>
                                <button
                                  onClick={() => handleInspectBook(book)}
                                  className="w-full px-3 py-2.5 bg-white/90 backdrop-blur-sm text-gray-900 rounded-xl text-xs font-semibold shadow-md hover:bg-white transition-all flex items-center justify-center min-h-[44px]"
                                >
                                  <Eye className="w-3 h-3 mr-1" />
                                  {t('common.search')}
                                </button>
                                <button
                                  onClick={() => handleBorrowRequest(book)}
                                  className="w-full px-3 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl text-xs font-semibold shadow-md hover:shadow-lg transition-all min-h-[44px]"
                                >
                                  {t('bookDetails.borrow')}
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="font-bold text-gray-900 text-sm line-clamp-2 mb-1">{book.title}</h3>
                        <p className="text-xs text-gray-600">{book.author}</p>
                        <div className="flex items-center mt-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-3 h-3 ${
                                (book.averageRating || 0) >= star ? 'text-yellow-400 fill-current' : 'text-gray-300'
                              }`}
                            />
                          ))}
                          <span className="ml-1 text-xs text-gray-600 font-medium">
                            {(book.averageRating || 0).toFixed(1)}
                          </span>
                        </div>
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
                  className="px-4 sm:px-6 py-2.5 bg-white/60 backdrop-blur-xl border border-white/20 rounded-xl text-sm sm:text-base text-gray-700 hover:bg-white/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg font-medium min-h-[44px]"
                >
                  {t('catalog.oldest')}
                </button>
                <span className="px-3 sm:px-4 py-2.5 bg-white/60 backdrop-blur-xl rounded-xl text-sm sm:text-base text-gray-700 font-semibold shadow-lg">
                  {t('bookDetails.pages')} {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-4 sm:px-6 py-2.5 bg-white/60 backdrop-blur-xl border border-white/20 rounded-xl text-sm sm:text-base text-gray-700 hover:bg-white/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg font-medium min-h-[44px]"
                >
                  {t('catalog.newest')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Book Details Modal */}
      {showBookDetails && selectedBook && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-0">
          <div className="bg-white w-full h-full shadow-2xl overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 p-6 flex justify-between items-center flex-shrink-0">
              <h2 className="text-2xl font-bold text-white flex items-center">
                <BookOpen className="w-6 h-6 mr-2" />
                {t('books.title')}
              </h2>
              <button
                onClick={() => setShowBookDetails(false)}
                className="text-white/80 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
              {/* Left Side */}
              <div className="md:w-2/5 bg-gradient-to-br from-gray-100 to-gray-200 p-4 sm:p-8 flex flex-col items-center justify-center">
                <div className="relative mb-4 sm:mb-6">
                  <OptimizedImage
                    src={selectedBook.coverImage}
                    alt={selectedBook.title}
                    className="w-48 h-72 sm:w-64 sm:h-96 object-cover rounded-2xl shadow-2xl"
                    width={256}
                    height={384}
                  />
                  <div className="absolute top-3 right-3">
                    <span className={`px-3 py-1.5 rounded-xl text-xs font-bold shadow-lg backdrop-blur-sm ${
                      getBookStatus(selectedBook.id) === 'lost'
                        ? 'bg-red-500/90 text-white'
                        : getBookStatus(selectedBook.id) === 'borrowed'
                        ? 'bg-orange-500/90 text-white'
                        : 'bg-green-500/90 text-white'
                    }`}>
                      {getBookStatus(selectedBook.id) === 'lost' 
                        ? t('books.lost') 
                        : getBookStatus(selectedBook.id) === 'borrowed' 
                        ? t('books.borrowed') 
                        : t('books.available')}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-6 h-6 ${
                        (selectedBook.averageRating || 0) >= star ? 'text-yellow-400 fill-current' : 'text-gray-300'
                      }`}
                    />
                  ))}
                  <span className="ml-2 text-lg font-semibold text-gray-700">
                    {(selectedBook.averageRating || 0).toFixed(1)}
                  </span>
                </div>

                {getBookStatus(selectedBook.id) === 'available' && !isBorrowed(selectedBook.id) && (
                  <button
                    onClick={() => {
                      handleBorrowRequest(selectedBook);
                      setShowBookDetails(false);
                    }}
                    className="w-full max-w-xs px-6 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all min-h-[44px]"
                  >
                    {t('bookDetails.borrow')}
                  </button>
                )}
              </div>

              {/* Right Side */}
              <div className="md:w-3/5 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 md:space-y-8">
                <div>
                  <h3 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-2">{selectedBook.title}</h3>
                  <p className="text-lg sm:text-xl text-gray-600 mb-1">{selectedBook.author}</p>
                  <p className="text-sm text-gray-500">{selectedBook.publisher}</p>
                </div>

                <div>
                  <h4 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">{t('footer.about')}</h4>
                  <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6">
                    <p className="text-gray-700 leading-relaxed">
                      {selectedBook.backCover}
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center">
                    <Ruler className="w-6 h-6 mr-2 text-indigo-600" />
                    {t('common.info')}
                  </h4>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                      <p className="text-sm text-gray-500 mb-1">{t('bookDetails.pages')}</p>
                      <p className="text-lg font-semibold text-gray-900">{selectedBook.pageCount}</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                      <p className="text-sm text-gray-500 mb-1">{t('common.info')}</p>
                      <p className="text-lg font-semibold text-gray-900">{selectedBook.dimensions}</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                      <p className="text-sm text-gray-500 mb-1">{t('common.info')}</p>
                      <p className="text-lg font-semibold text-gray-900">{selectedBook.weight}</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                      <p className="text-sm text-gray-500 mb-1">{t('common.info')}</p>
                      <p className="text-lg font-semibold text-gray-900">{selectedBook.binding}</p>
                    </div>
                  </div>
                </div>

                {recommendedBooksForModal.length > 0 && (
                  <div>
                    <h4 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center">
                      <BookOpen className="w-6 h-6 mr-2 text-indigo-600" />
                      {t('books.title')}
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                      {recommendedBooksForModal.slice(0, 6).map(book => (
                        <div key={book.id} className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200 hover:shadow-lg transition-all hover:scale-105">
                          <div className="relative aspect-[2/3]">
                            <OptimizedImage src={book.coverImage} alt={book.title} className="w-full h-full object-cover" />
                          </div>
                          <div className="p-3">
                            <h5 className="font-semibold text-gray-900 text-sm line-clamp-1">{book.title}</h5>
                            <p className="text-xs text-gray-600 line-clamp-1">{book.author}</p>
                            <button
                              onClick={() => handleBorrowRequest(book as Book)}
                              className="mt-2 w-full px-3 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg text-xs font-semibold hover:shadow-md transition-all min-h-[44px]"
                            >
                              {t('bookDetails.borrow')}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedBook.tags && selectedBook.tags.length > 0 && (
                  <div>
                    <h4 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center">
                      <Tag className="w-6 h-6 mr-2 text-indigo-600" />
                      {t('common.search')}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedBook.tags.slice(0, 8).map((tag, index) => (
                        <span
                          key={index}
                          className="px-4 py-2 bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 rounded-xl text-sm font-semibold shadow-sm"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-gray-200">
                  <a
                    href={generateBookDetailsUrl(selectedBook.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-xl font-semibold hover:shadow-md transition-all"
                  >
                    <ExternalLink className="w-5 h-5 mr-2" />
                    {t('common.info')}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && selectedBook && (
        <ReviewModal
          bookId={selectedBook.id}
          bookTitle={selectedBook.title}
          onClose={() => setShowReviewModal(false)}
        />
      )}

      {/* Recommend Book Modal */}
      {showRecommendModal && bookToRecommend && (
        <RecommendBookModal
          book={bookToRecommend}
          onClose={() => { setShowRecommendModal(false); setBookToRecommend(null); }}
        />
      )}
    </div>
  );
};

export default CatalogPage;
