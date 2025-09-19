import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { ChevronLeft, Search, Filter, X, AlertTriangle, Eye, ExternalLink, Tag, BookOpen, Ruler, Calendar, Star, CheckCircle, Heart, AlertCircle, MessageSquare } from 'lucide-react';
import { Book } from '../types';
import { useBooks } from '../contexts/BookContext';
import { db } from '../firebase/config';
import { collection, getDocs, addDoc, deleteDoc, query, where, Timestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import ReviewModal from '../components/common/ReviewModal';

const CatalogPage: React.FC = () => {
  const navigate = useNavigate();
  const { allBooks, borrowBook, isBorrowed, isBookBorrowed, getBookStatus } = useBooks();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [tagQuery, setTagQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [availability, setAvailability] = useState<'all' | 'available' | 'borrowed' | 'lost'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [showBookDetails, setShowBookDetails] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [userFavorites, setUserFavorites] = useState<string[]>([]); // State to store favorite book IDs
  const [currentPage, setCurrentPage] = useState(1);
  const booksPerPage = 12;
  const [sortOrder, setSortOrder] = useState<string>('default'); // New state for sorting

  useEffect(() => {
    if (user) {
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
    } else {
      setUserFavorites([]); // Clear favorites if user logs out
    }
  }, [user]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage('');
      }, 3000); // Hide after 3 seconds
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Get unique categories
  const categories = Array.from(new Set(allBooks.map(book => book.category)));

  const handleBorrowRequest = async (book: Book) => {
    try {
      setErrorMessage(null); // Clear any previous error messages
      await borrowBook(book);
      setSuccessMessage('Kitap başarıyla ödünç alındı!');
    } catch (error: any) {
      console.error('Error borrowing book:', error);
      setErrorMessage(error.message || 'Kitap ödünç alınırken bir hata oluştu.');
      setSuccessMessage(''); // Clear success message if there was an error
    }
  };

  const handleToggleFavorite = async (bookId: string) => {
    if (!user) {
      alert('Favorilere eklemek için giriş yapmalısınız.'); // Or show a proper login prompt
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
        setSuccessMessage('Kitap favorilerinizden kaldırıldı.');
      } else {
        // Add to favorites
        await addDoc(favoritesRef, {
          userId: user.uid,
          bookId: bookId,
          favoritedAt: Timestamp.now()
        });
        setUserFavorites(prev => [...prev, bookId]);
        setSuccessMessage('Kitap favorilerinize eklendi.');
      }
      setErrorMessage(null);
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
      setErrorMessage('Favori işlemi sırasında bir hata oluştu.');
    }
  };

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

  const filteredAndSortedBooks = allBooks.filter(book => {
    const matchesSearch = book.title.toLocaleLowerCase('tr-TR').includes(searchQuery.toLocaleLowerCase('tr-TR')) ||
      book.author.toLocaleLowerCase('tr-TR').includes(searchQuery.toLocaleLowerCase('tr-TR'));

    const matchesTag = !tagQuery || (book.tags && book.tags.some(tag => typeof tag === 'string' && tag.toLocaleLowerCase('tr-TR').includes(tagQuery.toLocaleLowerCase('tr-TR'))));

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

  // Pagination logic
  const indexOfLastBook = currentPage * booksPerPage;
  const indexOfFirstBook = indexOfLastBook - booksPerPage;
  const paginatedBooks = filteredAndSortedBooks.slice(indexOfFirstBook, indexOfLastBook);

  const totalPages = Math.ceil(filteredAndSortedBooks.length / booksPerPage);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            Geri Dön
          </button>
        </div>

        <div className="flex justify-center">
          <DotLottieReact
            src="https://lottie.host/06e92ec9-c24d-4b52-83b7-e767c90eceb7/Xhyy8gxnmO.json"
            loop
            autoplay
            style={{ width: '300px', height: '300px' }}
          />
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Kitap Kataloğu</h1>
          <p className="mt-2 text-gray-600">
            Kütüphanemizdeki tüm kitapları keşfedin ve arayın.
          </p>
        </div>

        {successMessage && (
          <div className="mb-6 p-4 bg-green-100 text-green-700 rounded-lg flex items-center">
            <CheckCircle className="w-5 h-5 mr-2" />
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <p className="text-red-700">{errorMessage}</p>
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-6 mb-4">
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Kitap veya yazar ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
            </div>
          </div>
          
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Etiket ara..."
                value={tagQuery}
                onChange={(e) => setTagQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <Tag className="absolute left-3 top-2.5 text-gray-400" size={20} />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 focus:ring-2 focus:ring-indigo-500"
            >
              <Filter className="w-5 h-5 mr-2" />
              <span>Filtrele</span>
            </button>
            <button
              onClick={handleClearFilters}
              className="flex items-center px-4 py-2 border border-red-200 bg-red-50 rounded-lg text-red-600 hover:bg-red-100 focus:ring-2 focus:ring-red-400"
            >
              <X className="w-5 h-5 mr-2" />
              <span>Temizle</span>
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Filtreler</h2>
              <button
                onClick={() => setShowFilters(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Kategori</h3>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="all">Tümü</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Durum</h3>
                <select
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value as 'all' | 'available' | 'borrowed' | 'lost')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="all">Tümü</option>
                  <option value="available">Müsait</option>
                  <option value="borrowed">Ödünç Verilmiş</option>
                  <option value="lost">Kayıp</option>
                </select>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Sıralama</h3>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="default">Varsayılan</option>
                  <option value="title-asc">Başlığa Göre (A-Z)</option>
                  <option value="title-desc">Başlığa Göre (Z-A)</option>
                  <option value="author-asc">Yazara Göre (A-Z)</option>
                  <option value="author-desc">Yazara Göre (Z-A)</option>
                  <option value="rating-desc">Puana Göre (Yüksekten Düşüğe)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        <div className="mb-8 flex flex-wrap items-center gap-2">
          {searchQuery && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-gray-200 text-gray-800">
              Aranan: {searchQuery}
              <button onClick={() => setSearchQuery('')} className="ml-1.5 flex-shrink-0 text-gray-500 hover:text-gray-700">
                <X className="w-4 h-4" />
              </button>
            </span>
          )}
          {tagQuery && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-gray-200 text-gray-800">
              Etiket: {tagQuery}
              <button onClick={() => setTagQuery('')} className="ml-1.5 flex-shrink-0 text-gray-500 hover:text-gray-700">
                <X className="w-4 h-4" />
              </button>
            </span>
          )}
          {selectedCategory !== 'all' && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
              Kategori: {selectedCategory}
              <button onClick={() => setSelectedCategory('all')} className="ml-1.5 flex-shrink-0 text-indigo-500 hover:text-indigo-700">
                <X className="w-4 h-4" />
              </button>
            </span>
          )}
          {availability !== 'all' && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
              Durum: {availability === 'available' ? 'Müsait' : availability === 'borrowed' ? 'Ödünç Verilmiş' : 'Kayıp'}
              <button onClick={() => setAvailability('all')} className="ml-1.5 flex-shrink-0 text-orange-500 hover:text-orange-700">
                <X className="w-4 h-4" />
              </button>
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {paginatedBooks.map(book => {
            const bookStatus = getBookStatus(book.id);
            const userBorrowed = isBorrowed(book.id);
            const isPending = userBorrowed && book.borrowStatus === 'pending';
            return (
              <div key={book.id} className="bg-white rounded-xl shadow-sm overflow-hidden relative">
                <button
                  onClick={() => handleToggleFavorite(book.id)}
                  className="absolute top-2 right-2 z-10 p-1.5 bg-white/80 backdrop-blur-sm rounded-full text-gray-600 hover:text-red-500 transition-colors"
                >
                  <Heart className={`w-5 h-5 ${userFavorites.includes(book.id) ? 'text-red-500 fill-current' : ''}`} />
                </button>
                <img src={book.coverImage} alt={book.title} className="w-full h-85 object-cover" />
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900">{book.title}</h3>
                  <p className="text-sm text-gray-600">{book.author}</p>
                  <p className="text-xs text-gray-500 mt-1">{book.publisher}</p>
                  <div className="flex items-center mt-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          (book.averageRating || 0) >= star ? 'text-yellow-400' : 'text-gray-300'
                        }`}
                      />
                    ))}
                    <span className="ml-2 text-xs text-gray-600">
                      {(book.averageRating || 0).toFixed(1)} ({book.reviewCount || 0})
                    </span>
                  </div>
                  <div className="mt-3 flex justify-between items-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      isPending
                        ? 'bg-yellow-100 text-yellow-800'
                        : bookStatus === 'lost'
                        ? 'bg-red-100 text-red-800'
                        : bookStatus === 'borrowed'
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {isPending 
                        ? 'Onay Bekliyor' 
                        : bookStatus === 'lost' 
                        ? 'Kayıp' 
                        : bookStatus === 'borrowed' 
                        ? 'Ödünç Verildi' 
                        : 'Müsait'}
                    </span>
                    <div className="flex space-x-2">
                    <button
                      onClick={() => handleInspectReviews(book)}
                      className="px-2 py-1 rounded-lg text-xs font-medium bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors flex items-center"
                    >
                      <MessageSquare className="w-3 h-3 mr-1" />
                      Yorumlar
                    </button>
                    {bookStatus === 'available' && !isPending && (
                      <>
                        <button
                          onClick={() => handleInspectBook(book)}
                          className="px-2 py-1 rounded-lg text-xs font-medium bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors flex items-center"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          İncele
                        </button>
                        <button
                          onClick={() => handleBorrowRequest(book)}
                          className="px-2 py-1 rounded-lg text-xs font-medium bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                        >
                          Ödünç Al
                        </button>
                      </>
                    )}
                    </div>
                    {bookStatus === 'lost' && (
                      <div className="flex items-center text-red-600">
                        <AlertTriangle className="w-4 h-4 mr-1" />
                        <span className="text-xs">Kayıp</span>
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    Konum: {book.location}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {totalPages > 1 && (
          <div className="mt-8 flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Sayfa {currentPage} / {totalPages}
            </p>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Önceki
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Sonraki
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Book Details Modal */}
      {showBookDetails && selectedBook && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-10xl w-full max-h-[120vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <BookOpen className="w-6 h-6 mr-2 text-indigo-600" />
                Kitap Detayları
              </h2>
              <button
                onClick={() => setShowBookDetails(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(100vh-120px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Book Cover and Basic Info */}
                <div className="space-y-6">
                  <div className="text-center">
                    <img
                      src={selectedBook.coverImage}
                      alt={selectedBook.title}
                      className="w-56 h-80 object-cover rounded-lg shadow-lg mx-auto"
                    />
                  </div>
                  
                  <div className="text-center space-y-2">
                    <h3 className="text-2xl font-bold text-gray-900">{selectedBook.title}</h3>
                    <p className="text-lg text-gray-600">{selectedBook.author}</p>
                    <p className="text-sm text-gray-500">{selectedBook.publisher}</p>
                    <div className="flex items-center justify-center mt-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        getBookStatus(selectedBook.id) === 'lost'
                          ? 'bg-red-100 text-red-800'
                          : getBookStatus(selectedBook.id) === 'borrowed'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {getBookStatus(selectedBook.id) === 'lost' 
                          ? 'Kayıp' 
                          : getBookStatus(selectedBook.id) === 'borrowed' 
                          ? 'Ödünç Verildi' 
                          : 'Müsait'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Detailed Information */}
                <div className="space-y-6">
                  {/* Physical Properties */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <Ruler className="w-5 h-5 mr-2 text-indigo-600" />
                      Fiziksel Özellikler
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Sayfa Sayısı:</span>
                        <span className="font-small">{selectedBook.pageCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Boyut:</span>
                        <span className="font-small">{selectedBook.dimensions}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Ağırlık:</span>
                        <span className="font-small">{selectedBook.weight}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Cilt:</span>
                        <span className="font-small">{selectedBook.binding}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Konum:</span>
                        <span className="font-small">{selectedBook.location}</span>
                      </div>
                    </div>
                  </div>

                  {/* Back Cover Description */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Arka Kapak</h4>
                    <div className="bg-indigo-50 rounded-lg p-4">
                      <p className="text-gray-700 leading-relaxed">
                        {selectedBook.backCover}
                      </p>
                    </div>
                  </div>

                  {/* Tags */}
                  {selectedBook.tags && selectedBook.tags.length > 0 && (
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Tag className="w-5 h-5 mr-2 text-indigo-600" />
                        Etiketler
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedBook.tags.slice(0, 5).map((tag, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* More Info Link */}
                  <div className="pt-4 border-t border-gray-200">
                    <a
                      href={generateBookDetailsUrl(selectedBook.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Kitap hakkında daha fazla bilgi almak için tıklayınız
                    </a>
                  </div>

                  {/* Action Buttons */}
                  {getBookStatus(selectedBook.id) === 'available' && !isBorrowed(selectedBook.id) && (
                    <div className="pt-4">
                      <button
                        onClick={() => {
                          handleBorrowRequest(selectedBook);
                          setShowBookDetails(false);
                        }}
                        className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                      >
                        Ödünç Al
                      </button>
                    </div>
                  )}
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
    </div>
  );
};

export default CatalogPage;
