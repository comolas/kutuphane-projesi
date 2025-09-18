import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, Heart, AlertCircle, BookOpen, CheckCircle, Search, SortAsc, SortDesc, Edit, StickyNote, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase/config';
import { collection, query, where, getDocs, deleteDoc, updateDoc, doc } from 'firebase/firestore';
import { Book as BookType } from '../types';
import { useBooks } from '../contexts/BookContext';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

// Extend the BookType to include favoritedAt and note for sorting and display purposes
interface FavoriteBook extends BookType {
  favoritedAt: Date;
  note?: string;
}

const FavoritesPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getBookStatus, borrowBook, isBorrowed } = useBooks();
  const [favoriteBooks, setFavoriteBooks] = useState<FavoriteBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('date-desc');
  const booksPerPage = 8;

  // State for the notes modal
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [editingNoteBook, setEditingNoteBook] = useState<FavoriteBook | null>(null);
  const [noteText, setNoteText] = useState('');

  useEffect(() => {
    const fetchFavorites = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const favoritesRef = collection(db, 'favorites');
        const q = query(favoritesRef, where('userId', '==', user.uid));
        const querySnapshot = await getDocs(q);
        
        const favoritedItems = querySnapshot.docs.map(doc => ({ ...(doc.data() as { bookId: string; favoritedAt: Timestamp; note?: string }), docId: doc.id }));
        const favoritedBookIds = favoritedItems.map(item => item.bookId);

        if (favoritedBookIds.length > 0) {
          const booksRef = collection(db, 'books');
          const booksQuery = query(booksRef, where('id', 'in', favoritedBookIds));
          const booksSnapshot = await getDocs(booksQuery);
          const booksData = booksSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as BookType[];

          const favoritedDetailsMap = new Map(favoritedItems.map(item => [item.bookId, { favoritedAt: item.favoritedAt.toDate(), note: item.note }]));

          const combinedBookData = booksData.map(book => ({
            ...book,
            favoritedAt: favoritedDetailsMap.get(book.id)?.favoritedAt || new Date(),
            note: favoritedDetailsMap.get(book.id)?.note
          }));

          setFavoriteBooks(combinedBookData);
        } else {
          setFavoriteBooks([]);
        }
      } catch (err: any) {
        console.error('Error fetching favorite books:', err);
        setError('Favori kitaplar yüklenirken bir hata oluştu.');
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, [user]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handleRemoveFavorite = async (bookId: string) => {
    if (!user) return;
    try {
      const favoritesRef = collection(db, 'favorites');
      const q = query(favoritesRef, where('userId', '==', user.uid), where('bookId', '==', bookId));
      const querySnapshot = await getDocs(q);
      querySnapshot.docs.forEach(async (doc) => {
        await deleteDoc(doc.ref);
      });
      setFavoriteBooks(prev => prev.filter(book => book.id !== bookId));
      setSuccessMessage('Kitap favorilerinizden kaldırıldı.');
    } catch (err: any) {
      console.error('Error removing favorite:', err);
      setError('Favorilerden kaldırılırken bir hata oluştu.');
    }
  };

  const handleBorrowRequest = async (book: BookType) => {
    try {
      setError(null);
      await borrowBook(book);
      setSuccessMessage('Kitap başarıyla ödünç alındı!');
    } catch (err: any) {
      console.error('Error borrowing book:', err);
      setError(err.message || 'Kitap ödünç alınırken bir hata oluştu.');
    }
  };

  const handleOpenNoteModal = (book: FavoriteBook) => {
    setEditingNoteBook(book);
    setNoteText(book.note || '');
    setIsNoteModalOpen(true);
  };

  const handleSaveNote = async () => {
    if (!editingNoteBook || !user) return;

    try {
      const favoritesRef = collection(db, 'favorites');
      const q = query(favoritesRef, where('userId', '==', user.uid), where('bookId', '==', editingNoteBook.id));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const favoriteDocId = querySnapshot.docs[0].id;
        const favoriteDocRef = doc(db, 'favorites', favoriteDocId);
        await updateDoc(favoriteDocRef, { note: noteText });

        setFavoriteBooks(prev => prev.map(book => 
          book.id === editingNoteBook.id ? { ...book, note: noteText } : book
        ));
        setSuccessMessage('Not başarıyla kaydedildi.');
      }
    } catch (err) {
      console.error('Error saving note:', err);
      setError('Not kaydedilirken bir hata oluştu.');
    } finally {
      setIsNoteModalOpen(false);
      setEditingNoteBook(null);
    }
  };

  const filteredAndSortedBooks = useMemo(() => {
    return favoriteBooks
      .filter(book => 
        book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.author.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => {
        switch (sortOrder) {
          case 'date-asc':
            return a.favoritedAt.getTime() - b.favoritedAt.getTime();
          case 'date-desc':
            return b.favoritedAt.getTime() - a.favoritedAt.getTime();
          case 'title-asc':
            return a.title.localeCompare(b.title, 'tr-TR');
          case 'title-desc':
            return b.title.localeCompare(a.title, 'tr-TR');
          case 'author-asc':
            return a.author.localeCompare(b.author, 'tr-TR');
          case 'author-desc':
            return b.author.localeCompare(a.author, 'tr-TR');
          default:
            return 0;
        }
      });
  }, [favoriteBooks, searchQuery, sortOrder]);

  const totalPages = Math.ceil(filteredAndSortedBooks.length / booksPerPage);
  const paginatedBooks = filteredAndSortedBooks.slice(
    (currentPage - 1) * booksPerPage,
    currentPage * booksPerPage
  );

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
            src="https://lottie.host/c87f7b8a-08d9-4f01-98ea-a807738ae878/eUIfhKL9kZ.json"
            loop
            autoplay
            style={{ width: '300px', height: '300px' }}
          />
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Favorilerim</h1>
          <p className="mt-2 text-gray-600">Favori kitaplarınızı buradan yönetebilirsiniz.</p>
        </div>

        {successMessage && (
          <div className="mb-6 p-4 bg-green-100 text-green-700 rounded-lg flex items-center">
            <CheckCircle className="w-5 h-5 mr-2" />
            {successMessage}
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            {error}
          </div>
        )}

        {favoriteBooks.length > 0 && (
          <div className="mb-6 flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input 
                type="text"
                placeholder="Favorilerimde ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div className="w-full md:w-64">
              <select 
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="date-desc">Eklenme Tarihi (Yeni)</option>
                <option value="date-asc">Eklenme Tarihi (Eski)</option>
                <option value="title-asc">Başlık (A-Z)</option>
                <option value="title-desc">Başlık (Z-A)</option>
                <option value="author-asc">Yazar (A-Z)</option>
                <option value="author-desc">Yazar (Z-A)</option>
              </select>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-600">Favori kitaplar yükleniyor...</p>
          </div>
        ) : filteredAndSortedBooks.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center flex flex-col items-center justify-center">
            <Heart className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-2xl font-bold text-gray-800 mb-2">
              {searchQuery ? 'Aramanıza uygun favori bulunamadı.' : 'Henüz Favori Kitabınız Yok'}
            </h3>
            <p className="text-gray-600 mb-6">Katalogdan beğendiğiniz kitapları favorilerinize ekleyebilirsiniz.</p>
            <Link to="/catalog" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">
              Kataloğa Git
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {paginatedBooks.map(book => {
                const bookStatus = getBookStatus(book.id);
                const userBorrowed = isBorrowed(book.id);
                const isPending = userBorrowed && book.borrowStatus === 'pending';

                return (
                  <div key={book.id} className="bg-white rounded-xl shadow-sm overflow-hidden flex flex-col">
                    <div className="relative">
                      <img src={book.coverImage} alt={book.title} className="w-full h-80 object-cover" />
                      <button
                        onClick={() => handleRemoveFavorite(book.id)}
                        className="absolute top-2 right-2 z-10 p-1.5 bg-white/80 backdrop-blur-sm rounded-full text-red-500 hover:bg-red-100 transition-colors"
                      >
                        <Heart className="w-5 h-5 fill-current" />
                      </button>
                    </div>
                    <div className="p-4 flex flex-col flex-grow">
                      <div>
                        <h3 className="font-semibold text-gray-900 truncate">{book.title}</h3>
                        <p className="text-sm text-gray-600">{book.author}</p>
                      </div>
                      {book.note && (
                        <div className="mt-3 p-2 bg-yellow-50 border-l-4 border-yellow-300">
                          <p className="text-xs text-yellow-800 italic">{book.note}</p>
                        </div>
                      )}
                      <div className="flex-grow mt-3 flex flex-col justify-end">
                        <div className="flex justify-between items-center mb-3">
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
                          <button onClick={() => handleOpenNoteModal(book)} className="p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors">
                            <Edit className="w-4 h-4" />
                          </button>
                        </div>
                        {bookStatus === 'available' && !isPending && (
                          <button
                            onClick={() => handleBorrowRequest(book)}
                            className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                          >
                            Ödünç Al
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {totalPages > 1 && (
              <div className="mt-8 flex justify-center items-center">
                <p className="text-sm text-gray-600 mr-4">
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
          </>
        )}
      </div>

      {/* Note Editing Modal */}
      {isNoteModalOpen && editingNoteBook && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-lg w-full">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <StickyNote className="w-6 h-6 mr-2 text-indigo-600" />
                Notu Düzenle
              </h3>
              <button onClick={() => setIsNoteModalOpen(false)} className="text-gray-400 hover:text-gray-500">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <p className="font-semibold text-gray-800">{editingNoteBook.title}</p>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Bu kitapla ilgili kişisel notunuz..."
                className="w-full mt-4 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                rows={4}
              />
            </div>
            <div className="p-4 bg-gray-50 flex justify-end space-x-2">
              <button onClick={() => setIsNoteModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                İptal
              </button>
              <button onClick={handleSaveNote} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FavoritesPage;
