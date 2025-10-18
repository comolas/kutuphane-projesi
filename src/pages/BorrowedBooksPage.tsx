import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { ChevronLeft, AlertCircle, Clock, Search, Filter, X, SortAsc, SortDesc, ChevronRight, BookCheck, History, ShieldQuestion, Book as BookIcon, Bookmark, Calendar as CalendarIcon, BarChart2 } from 'lucide-react';
import { useBooks } from '../contexts/BookContext';
import { useAuth } from '../contexts/AuthContext';
import { useCoupons } from '../contexts/CouponContext';
import { useSpinWheel } from '../contexts/SpinWheelContext';
import { db } from '../firebase/config';
import { doc, getDoc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import BookDetailsModal from '../components/common/BookDetailsModal';
import ReadingStats from '../components/borrowed/ReadingStats';
import { Book } from '../types';
import Swal from 'sweetalert2';

// Reusable Confirmation Modal Component
const BorrowedBooksPage: React.FC = () => {
  const navigate = useNavigate();
  const { borrowedBooks, requestReturn, extendBook, canExtend } = useBooks();
  const { user, userData } = useAuth();
  const { coupons } = useCoupons();
  const { userSpinData } = useSpinWheel();
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'active' | 'stats'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'dueDate' | 'borrowedAt'>('dueDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const booksPerPage = 12;

  const returnedBooks = useMemo(() => 
    borrowedBooks.filter(b => b.returnStatus === 'returned'), 
    [borrowedBooks]
  );

  const handleReturn = async (bookId: string, bookTitle: string) => {
    Swal.fire({
      title: 'İade Talebi Onayı',
      text: `"${bookTitle}" adlı kitap için iade talebi oluşturmak istediğinizden emin misiniz?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Onayla',
      cancelButtonText: 'Vazgeç',
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await requestReturn(bookId);
          Swal.fire('Başarılı!', 'Kitap iade talebiniz alındı.', 'success');
        } catch (error: any) {
          console.error('Error returning book:', error);
          Swal.fire('Hata!', error.message || 'Kitap iade edilirken bir hata oluştu. Lütfen tekrar deneyin.', 'error');
        }
      }
    });
  };

  const handleExtend = async (bookId: string, bookTitle: string) => {
    Swal.fire({
      title: 'Süre Uzatma Onayı',
      text: `"${bookTitle}" adlı kitabın süresini 7 gün uzatmak istediğinizden emin misiniz?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Onayla',
      cancelButtonText: 'Vazgeç',
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await extendBook(bookId);
          Swal.fire('Başarılı!', 'Kitap süresi başarıyla uzatıldı.', 'success');
        } catch (error: any) {
          console.error('Error extending book:', error);
          if (error.code === 'permission-denied') {
            Swal.fire('Hata!', 'Bu kitabın süresini uzatma izniniz yok. Kitap zaten uzatılmış olabilir.', 'error');
          } else {
            Swal.fire('Hata!', 'Kitap süresi uzatılırken bir hata oluştu. Lütfen tekrar deneyin.', 'error');
          }
        }
      }
    });
  };

  const handleSubmitReview = async ({ rating, text }: { rating: number; text: string }) => {
    if (!selectedBook || !user || !userData) {
      Swal.fire("Hata!", "Yorum göndermek için giriş yapmalısınız.", "error");
      return;
    }

    try {
      await addDoc(collection(db, 'reviews'), {
        bookId: selectedBook.id,
        userId: user.uid,
        userDisplayName: userData.displayName || user.email,
        rating,
        reviewText: text,
        createdAt: serverTimestamp(),
        status: 'pending',
        helpfulVotes: [],
      });
      setIsModalOpen(false);
      Swal.fire("Başarılı!", "Değerlendirmeniz için teşekkürler! Yorumunuz onaylandıktan sonra yayınlanacaktır.", "success");
    } catch (error) {
      console.error("Error submitting review: ", error);
      Swal.fire("Hata!", "Yorumunuz gönderilirken bir hata oluştu.", "error");
    }
  };

  const handleOpenReviewModal = (book: Book) => {
    setSelectedBook(book);
    setIsReviewMode(true);
    setIsModalOpen(true);
  };

  const getDaysRemaining = (dueDate: Date) => {
    const today = new Date();
    const diff = dueDate.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const activeBooks = useMemo(() => 
    borrowedBooks
    .filter(book => book.returnStatus !== 'returned')
    .filter(book => 
      (book.title?.toLowerCase() ?? '').includes(searchQuery.toLowerCase()) ||
      (book.author?.toLowerCase() ?? '').includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const dateA = sortBy === 'dueDate' ? a.dueDate.getTime() : a.borrowedAt.getTime();
      const dateB = sortBy === 'dueDate' ? b.dueDate.getTime() : b.borrowedAt.getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    }),
    [borrowedBooks, searchQuery, sortBy, sortOrder]
  );

  const totalPages = Math.ceil(activeBooks.length / booksPerPage);
  const startIndex = (currentPage - 1) * booksPerPage;
  const endIndex = startIndex + booksPerPage;
  const currentBooks = activeBooks.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab, sortBy, sortOrder]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
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
            src="https://lottie.host/14df7d93-d29f-43c4-b928-0678071dc7e6/xr3hSXiymd.json"
            loop
            autoplay
            style={{ width: '300px', height: '300px' }}
          />
        </div>

        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Ödünç Aldığım Kitaplar</h1>
          <p className="mt-2 text-gray-600">
            Kütüphaneden ödünç aldığınız kitapları ve okuma istatistiklerinizi buradan takip edebilirsiniz.
          </p>
        </div>



        <div className="mb-6 bg-white/60 backdrop-blur-xl rounded-2xl p-2 shadow-lg">
          <nav className="flex space-x-2" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('active')}
              className={`flex-1 py-3 px-4 rounded-xl font-medium text-sm flex items-center justify-center transition-all ${
                activeTab === 'active'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-white/50'
              }`}
            >
              <BookCheck className="w-5 h-5 mr-2" />
              Aktif Ödünç Aldıklarım
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`flex-1 py-3 px-4 rounded-xl font-medium text-sm flex items-center justify-center transition-all ${
                activeTab === 'stats'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-white/50'
              }`}
            >
              <BarChart2 className="w-5 h-5 mr-2" />
              Okuma Karnem
            </button>
          </nav>
        </div>

        {activeTab === 'stats' && <ReadingStats returnedBooks={returnedBooks} onOpenRateModal={handleOpenReviewModal} />}

        {activeTab === 'active' && (
          <>
            <div className="mt-4 flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Kitap adı veya yazar ara..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white/60 backdrop-blur-xl border border-white/20 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white/80 transition-all shadow-lg"
                  />
                  <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
                </div>
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-6 py-3 bg-white/60 backdrop-blur-xl border border-white/20 rounded-xl text-gray-700 hover:bg-white/80 flex items-center justify-center transition-all shadow-lg font-medium"
              >
                <Filter className="w-5 h-5 mr-2" />
                Sırala
              </button>
            </div>

            {showFilters && (
              <div className="mt-4 bg-white/60 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-white/20">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sıralama Ölçütü
                    </label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as 'dueDate' | 'borrowedAt')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="dueDate">İade Tarihine Göre</option>
                      <option value="borrowedAt">Ödünç Alma Tarihine Göre</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sıralama Yönü
                    </label>
                    <button
                      onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center"
                    >
                      {sortOrder === 'asc' ? (
                        <>
                          <SortAsc className="w-5 h-5 mr-2" />
                          Artan
                        </>
                      ) : (
                        <>
                          <SortDesc className="w-5 h-5 mr-2" />
                          Azalan
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {currentBooks.length === 0 ? (
              <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-8 text-center mt-6 border border-white/20">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Aktif olarak ödünç aldığınız kitap bulunmuyor
                </h3>
                <p className="text-gray-600 mb-4">
                  Kütüphane kataloğundan yeni maceralar keşfedebilirsiniz.
                </p>
                <button
                  onClick={() => navigate('/catalog')}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Kataloğa Git
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 mt-4 sm:mt-6">
                  {currentBooks.map((book, index) => {
                    const daysRemaining = getDaysRemaining(book.dueDate);
                    const isOverdue = daysRemaining < 0;

                    return (
                      <div 
                        key={`${book.id}-${book.borrowedAt}`} 
                        className="group bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 overflow-hidden flex flex-col border border-white/20"
                        style={{ animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both` }}
                      >
                        <div className="relative overflow-hidden" style={{ aspectRatio: '2/3' }}>
                          <img 
                            src={book.coverImage} 
                            alt={book.title} 
                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          
                          {/* Status Badge */}
                          <div className={`absolute top-3 right-3 px-3 py-1.5 rounded-xl text-xs font-bold backdrop-blur-xl shadow-lg ${
                            isOverdue 
                              ? 'bg-gradient-to-r from-red-500 to-pink-600 text-white' 
                              : daysRemaining <= 3 
                              ? 'bg-gradient-to-r from-yellow-500 to-amber-600 text-white' 
                              : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
                          }`}>
                            {isOverdue
                              ? `${Math.abs(daysRemaining)} gün gecikmiş`
                              : `${daysRemaining} gün`}
                          </div>

                          {/* Extended Badge */}
                          {book.extended && (
                            <div className="absolute top-3 left-3 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/90 backdrop-blur-xl text-indigo-600 shadow-lg">
                              Uzatılmış
                            </div>
                          )}

                          {/* Extension Reward Badge */}
                          {userSpinData && userSpinData.borrowExtensionCount === 2 && canExtend(book.id) && (
                            <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg flex items-center gap-1 animate-pulse">
                              🎁 2x Uzatma
                            </div>
                          )}
                        </div>

                        <div className="p-4 flex flex-col flex-grow">
                          <h3 className="font-semibold text-gray-900 line-clamp-2 mb-1">{book.title}</h3>
                          <p className="text-sm text-gray-600 mb-3">{book.author}</p>
                          
                          {/* Info Box */}
                          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-3 mb-3">
                            <div className="flex items-center text-xs text-gray-600">
                              <CalendarIcon className="w-4 h-4 mr-1.5" />
                              <span>Son Teslim: {book.dueDate.toLocaleDateString('tr-TR')}</span>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="space-y-2 mt-auto">
                            {/* Extend Button - First */}
                            {book.returnStatus !== 'pending' && (
                              canExtend(book.id) ? (
                                <button
                                  onClick={() => handleExtend(book.id, book.title)}
                                  className="w-full px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl text-sm font-semibold hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
                                >
                                  <Clock className="w-4 h-4" />
                                  Süre Uzat (7 Gün)
                                </button>
                              ) : (
                                <div className="w-full px-4 py-2.5 bg-gray-300 text-gray-600 rounded-xl text-sm font-semibold text-center cursor-not-allowed flex items-center justify-center gap-2">
                                  <Clock className="w-4 h-4" />
                                  Uzatma Hakkı Bitti
                                </div>
                              )
                            )}
                            
                            {/* Return Button - Second */}
                            {book.returnStatus === 'pending' ? (
                              <div className="w-full px-4 py-2.5 bg-gradient-to-r from-yellow-500 to-amber-600 text-white rounded-xl text-sm font-bold text-center shadow-md">
                                İade Talebi Gönderildi
                              </div>
                            ) : (
                              <button
                                onClick={() => handleReturn(book.id, book.title)}
                                className="w-full px-4 py-2.5 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-xl text-sm font-semibold hover:shadow-xl hover:scale-105 transition-all duration-300"
                              >
                                İade Et
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
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

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-6 sm:mt-8 flex justify-center">
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      {/* Previous Button */}
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-white/60 backdrop-blur-xl border border-white/20 text-sm sm:text-base text-gray-700 hover:bg-white/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-all shadow-lg font-medium"
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Önceki
                      </button>

                      {/* Page Numbers */}
                      {generatePageNumbers().map((page, index) => {
                        if (page === '...') {
                          return <span key={`dots-${index}`} className="px-3 py-2 text-gray-500">...</span>;
                        }
                        return (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page as number)}
                            className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border transition-all shadow-lg text-sm sm:text-base font-medium ${
                              currentPage === page
                                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-transparent'
                                : 'bg-white/60 backdrop-blur-xl border-white/20 text-gray-700 hover:bg-white/80'
                            }`}
                          >
                            {page}
                          </button>
                        );
                      })}

                      {/* Next Button */}
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-white/60 backdrop-blur-xl border border-white/20 text-sm sm:text-base text-gray-700 hover:bg-white/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-all shadow-lg font-medium"
                      >
                        Sonraki
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
      <BookDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        book={selectedBook}
        onSubmitReview={handleSubmitReview}
        isReviewMode={isReviewMode}
      />

    </div>
  );
};

export default BorrowedBooksPage;