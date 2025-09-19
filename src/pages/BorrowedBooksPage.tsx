import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { ChevronLeft, AlertCircle, Clock, Search, Filter, X, SortAsc, SortDesc, ChevronRight, BookCheck, History, ShieldQuestion, Book as BookIcon, Bookmark, Calendar as CalendarIcon, BarChart2 } from 'lucide-react';
import { useBooks } from '../contexts/BookContext';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase/config';
import { doc, getDoc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import BookDetailsModal from '../components/common/BookDetailsModal';
import ReadingStats from '../components/borrowed/ReadingStats';
import { Book } from '../types';

// Reusable Confirmation Modal Component
const ConfirmationModal: React.FC<{ 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: () => void; 
  title: string; 
  message: string; 
}> = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full">
        <div className="p-6">
          <div className="flex items-start">
            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 sm:mx-0 sm:h-10 sm:w-10">
              <ShieldQuestion className="h-6 w-6 text-indigo-600" aria-hidden="true" />
            </div>
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
              <h3 className="text-lg leading-6 font-medium text-gray-900">{title}</h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500">{message}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse rounded-b-xl">
          <button
            type="button"
            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            Onayla
          </button>
          <button
            type="button"
            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
            onClick={onClose}
          >
            Vazgeç
          </button>
        </div>
      </div>
    </div>
  );
};

const BorrowedBooksPage: React.FC = () => {
  const navigate = useNavigate();
  const { borrowedBooks, requestReturn, extendBook, canExtend } = useBooks();
  const { user, userData } = useAuth();
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<'active' | 'stats'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'dueDate' | 'borrowedAt'>('dueDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const booksPerPage = 12;

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [modalContent, setModalContent] = useState({ title: '', message: '', onConfirm: () => {} });

  const returnedBooks = useMemo(() => 
    borrowedBooks.filter(b => b.returnStatus === 'returned'), 
    [borrowedBooks]
  );

  const handleReturn = async (bookId: string) => {
    try {
      await requestReturn(bookId);
      setErrorMessage(null);
    } catch (error: any) {
      console.error('Error returning book:', error);
      setErrorMessage(error.message || 'Kitap iade edilirken bir hata oluştu. Lütfen tekrar deneyin.');
    }
  };

  const handleExtend = async (bookId: string) => {
    try {
      setErrorMessage(null);
      await extendBook(bookId);
    } catch (error: any) {
      console.error('Error extending book:', error);
      if (error.code === 'permission-denied') {
        setErrorMessage('Bu kitabın süresini uzatma izniniz yok. Kitap zaten uzatılmış olabilir.');
      } else {
        setErrorMessage('Kitap süresi uzatılırken bir hata oluştu. Lütfen tekrar deneyin.');
      }
    }
  };

  const handleSubmitReview = async ({ rating, text }: { rating: number; text: string }) => {
    if (!selectedBook || !user || !userData) {
      alert("Yorum göndermek için giriş yapmalısınız.");
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
      alert("Değerlendirmeniz için teşekkürler! Yorumunuz onaylandıktan sonra yayınlanacaktır.");
    } catch (error) {
      console.error("Error submitting review: ", error);
      alert("Yorumunuz gönderilirken bir hata oluştu.");
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
    <div className="min-h-screen bg-gray-50 py-8">
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

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Ödünç Aldığım Kitaplar</h1>
          <p className="mt-2 text-gray-600">
            Kütüphaneden ödünç aldığınız kitapları ve okuma istatistiklerinizi buradan takip edebilirsiniz.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <p className="text-red-700">{errorMessage}</p>
            </div>
          </div>
        )}

        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('active')}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                  activeTab === 'active'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <BookCheck className="w-5 h-5 mr-2" />
                Aktif Ödünç Aldıklarım
              </button>
              <button
                onClick={() => setActiveTab('stats')}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                  activeTab === 'stats'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <BarChart2 className="w-5 h-5 mr-2" />
                Okuma Karnem
              </button>
            </nav>
          </div>
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
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
                </div>
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center justify-center"
              >
                <Filter className="w-5 h-5 mr-2" />
                Sırala
              </button>
            </div>

            {showFilters && (
              <div className="mt-4 bg-white rounded-lg shadow-sm p-4 border border-gray-200">
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
              <div className="bg-white rounded-xl shadow-sm p-8 text-center mt-6">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
                  {currentBooks.map(book => {
                    const daysRemaining = getDaysRemaining(book.dueDate);
                    const isOverdue = daysRemaining < 0;

                    return (
                      <div key={`${book.id}-${book.borrowedAt}`} className="bg-white rounded-xl shadow-sm overflow-hidden flex flex-col">
                        <img src={book.coverImage} alt={book.title} className="w-full h-48 object-cover" />
                        <div className="p-4 flex flex-col flex-grow">
                          <h3 className="font-semibold text-gray-900">{book.title}</h3>
                          <p className="text-sm text-gray-600">{book.author}</p>
                          
                          <div className="mt-3 flex-grow flex flex-col justify-end">
                            <div className={`text-sm mb-2 flex items-center ${
                              isOverdue ? 'text-red-600' : daysRemaining <= 3 ? 'text-yellow-600' : 'text-gray-600'
                            }`}>
                              <Clock className="w-4 h-4 mr-1" />
                              {isOverdue
                                ? `${Math.abs(daysRemaining)} gün gecikmiş`
                                : `${daysRemaining} gün kaldı`}
                            </div>
                            <div className="text-xs text-gray-500 mb-3">
                              Son Teslim: {book.dueDate.toLocaleDateString()}
                              {book.extended && ' (Uzatılmış)'}
                            </div>
                            <div className="space-y-2">
                              {book.returnStatus === 'pending' ? (
                                <div className="w-full px-4 py-2 bg-yellow-50 text-yellow-600 rounded-lg text-sm font-medium text-center">
                                  İade Talebi Gönderildi
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    setModalContent({
                                      title: 'İade Talebi Onayı',
                                      message: `"${book.title}" adlı kitap için iade talebi oluşturmak istediğinizden emin misiniz?`,
                                      onConfirm: () => handleReturn(book.id)
                                    });
                                    setShowConfirmModal(true);
                                  }}
                                  className="w-full px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                                >
                                  İade Et
                                </button>
                              )}
                              {canExtend(book.id) && !book.returnStatus && (
                                <button
                                  onClick={() => {
                                    setModalContent({
                                      title: 'Süre Uzatma Onayı',
                                      message: `"${book.title}" adlı kitabın süresini 7 gün uzatmak istediğinizden emin misiniz?`,
                                      onConfirm: () => handleExtend(book.id)
                                    });
                                    setShowConfirmModal(true);
                                  }}
                                  className="w-full px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  7 Gün Uzat
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-8 flex justify-center">
                    <div className="flex items-center space-x-2">
                      {/* Previous Button */}
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-3 py-2 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
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
                            className={`px-3 py-2 rounded-lg border transition-colors ${
                              currentPage === page
                                ? 'bg-indigo-600 text-white border-indigo-600'
                                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
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
                        className="px-3 py-2 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
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
      <ConfirmationModal 
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={modalContent.onConfirm}
        title={modalContent.title}
        message={modalContent.message}
      />
    </div>
  );
};

export default BorrowedBooksPage;