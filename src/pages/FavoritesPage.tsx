import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, Heart, Search, Edit, StickyNote, X, PlusCircle, Bookmark as BookmarkIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase/config';
import { collection, query, where, getDocs, deleteDoc, updateDoc, doc, addDoc, Timestamp, writeBatch } from 'firebase/firestore';
import { Book as BookType } from '../types';
import { useBooks } from '../contexts/BookContext';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import Swal from 'sweetalert2';

// Extend the BookType to include favoritedAt and note for sorting and display purposes
interface FavoriteBook extends BookType {
  favoriteId: string;
  favoritedAt: Date;
  note?: string;
  shelves?: string[];
}

interface Shelf {
  id: string;
  name: string;
}

const FavoritesPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getBookStatus, borrowBook, borrowMessages } = useBooks();
  const [favoriteBooks, setFavoriteBooks] = useState<FavoriteBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('date-desc');
  const booksPerPage = 8;

  // State for shelves
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [selectedShelf, setSelectedShelf] = useState<string>('all');
  const [newShelfName, setNewShelfName] = useState('');

  // State for the notes modal
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [editingNoteBook, setEditingNoteBook] = useState<FavoriteBook | null>(null);
  const [noteText, setNoteText] = useState('');

  // State for the shelves modal
  const [isShelfModalOpen, setIsShelfModalOpen] = useState(false);
  const [editingShelvesBook, setEditingShelvesBook] = useState<FavoriteBook | null>(null);

  useEffect(() => {
    const fetchFavoritesAndShelves = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        // Fetch Shelves
        const shelvesRef = collection(db, 'shelves');
        const qShelves = query(shelvesRef, where('userId', '==', user.uid));
        const shelvesSnapshot = await getDocs(qShelves);
        const userShelves = shelvesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Shelf));
        setShelves(userShelves);

        // Fetch Favorites
        const favoritesRef = collection(db, 'favorites');
        const q = query(favoritesRef, where('userId', '==', user.uid));
        const querySnapshot = await getDocs(q);
        
        const favoritedItems = querySnapshot.docs.map(doc => ({
          ...(doc.data() as { bookId: string; favoritedAt: Timestamp; note?: string; shelves?: string[] }),
          favoriteId: doc.id
        }));
        const favoritedBookIds = favoritedItems.map(item => item.bookId);

        if (favoritedBookIds.length > 0) {
          const booksRef = collection(db, 'books');
          const booksQuery = query(booksRef, where('id', 'in', favoritedBookIds));
          const booksSnapshot = await getDocs(booksQuery);
          const booksData = booksSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as BookType[];

          const favoritedDetailsMap = new Map(favoritedItems.map(item => [item.bookId, { favoriteId: item.favoriteId, favoritedAt: item.favoritedAt?.toDate() || new Date(), note: item.note, shelves: item.shelves || [] }]));

          const combinedBookData = booksData.map(book => ({
            ...book,
            favoriteId: favoritedDetailsMap.get(book.id)?.favoriteId || '',
            favoritedAt: favoritedDetailsMap.get(book.id)?.favoritedAt || new Date(),
            note: favoritedDetailsMap.get(book.id)?.note,
            shelves: favoritedDetailsMap.get(book.id)?.shelves
          }));

          setFavoriteBooks(combinedBookData);
        } else {
          setFavoriteBooks([]);
        }
      } catch (err: any) {
        console.error('Error fetching favorite books:', err);
        Swal.fire('Hata!', 'Favori kitaplar yüklenirken bir hata oluştu.', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchFavoritesAndShelves();
  }, [user]);

  const handleRemoveFavorite = async (bookId: string, bookTitle: string) => {
    if (!user) return;

    Swal.fire({
      title: 'Emin misiniz?',
      text: `"${bookTitle}" kitabını favorilerinizden kaldırmak istediğinizden emin misiniz?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Evet, kaldır!',
      cancelButtonText: 'Vazgeç'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const favoritesRef = collection(db, 'favorites');
          const q = query(favoritesRef, where('userId', '==', user.uid), where('bookId', '==', bookId));
          const querySnapshot = await getDocs(q);
          querySnapshot.docs.forEach(async (doc) => {
            await deleteDoc(doc.ref);
          });
          setFavoriteBooks(prev => prev.filter(book => book.id !== bookId));
          Swal.fire('Başarılı!', 'Kitap favorilerinizden kaldırıldı.', 'success');
        } catch (err: any) {
          console.error('Error removing favorite:', err);
          Swal.fire('Hata!', 'Favorilerden kaldırılırken bir hata oluştu.', 'error');
        }
      }
    });
  };

  const handleBorrowRequest = async (book: BookType) => {
    try {
      await borrowBook(book);
      Swal.fire('Başarılı!', 'Ödünç alma talebiniz gönderildi! Admin onayından sonra kitap size ödünç verilecektir.', 'success');
    } catch (err: any) {
      console.error('Error borrowing book:', err);
      Swal.fire('Hata!', err.message || 'Kitap ödünç alınırken bir hata oluştu.', 'error');
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
      const favoriteDocRef = doc(db, 'favorites', editingNoteBook.favoriteId);
      await updateDoc(favoriteDocRef, { note: noteText });

      setFavoriteBooks(prev => prev.map(book => 
        book.id === editingNoteBook.id ? { ...book, note: noteText } : book
      ));
      Swal.fire('Başarılı!', 'Not başarıyla kaydedildi.', 'success');
    } catch (err) {
      console.error('Error saving note:', err);
      Swal.fire('Hata!', 'Not kaydedilirken bir hata oluştu.', 'error');
    } finally {
      setIsNoteModalOpen(false);
      setEditingNoteBook(null);
    }
  };

  const handleCreateShelf = async () => {
    if (!newShelfName.trim() || !user) return;
    try {
      const shelfRef = await addDoc(collection(db, 'shelves'), {
        userId: user.uid,
        name: newShelfName.trim(),
        createdAt: Timestamp.now(),
      });
      setShelves(prev => [...prev, { id: shelfRef.id, name: newShelfName.trim() }]);
      setNewShelfName('');
      Swal.fire('Başarılı!', 'Yeni rafınız oluşturuldu.', 'success');
    } catch (error) {
      console.error('Error creating shelf:', error);
      Swal.fire('Hata!', 'Raf oluşturulurken bir hata oluştu.', 'error');
    }
  };

  const handleDeleteShelf = async (shelfId: string, shelfName: string) => {
    Swal.fire({
      title: 'Rafı Sil',
      text: `"${shelfName}" rafını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Evet, Sil',
      cancelButtonText: 'İptal',
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const batch = writeBatch(db);
          // Delete the shelf document
          const shelfDocRef = doc(db, 'shelves', shelfId);
          batch.delete(shelfDocRef);

          // Remove the shelfId from all favorite books
          const updatedBooks = favoriteBooks.map(book => {
            if (book.shelves?.includes(shelfId)) {
              const favoriteDocRef = doc(db, 'favorites', book.favoriteId);
              const updatedShelves = book.shelves.filter(id => id !== shelfId);
              batch.update(favoriteDocRef, { shelves: updatedShelves });
              return { ...book, shelves: updatedShelves };
            }
            return book;
          });

          await batch.commit();

          setFavoriteBooks(updatedBooks);
          setShelves(prev => prev.filter(shelf => shelf.id !== shelfId));
          if (selectedShelf === shelfId) {
            setSelectedShelf('all');
          }
          Swal.fire('Silindi!', 'Raf başarıyla silindi.', 'success');
        } catch (error) {
          console.error('Error deleting shelf:', error);
          Swal.fire('Hata!', 'Raf silinirken bir hata oluştu.', 'error');
        }
      }
    });
  };

  const handleOpenShelfModal = (book: FavoriteBook) => {
    setEditingShelvesBook(book);
    setIsShelfModalOpen(true);
  };

  const handleUpdateBookShelves = async (newShelfIds: string[]) => {
    if (!editingShelvesBook) return;
    try {
      const favoriteDocRef = doc(db, 'favorites', editingShelvesBook.favoriteId);
      await updateDoc(favoriteDocRef, { shelves: newShelfIds });

      setFavoriteBooks(prev => prev.map(book =>
        book.id === editingShelvesBook.id ? { ...book, shelves: newShelfIds } : book
      ));
      setIsShelfModalOpen(false);
      setEditingShelvesBook(null);
      Swal.fire('Başarılı', 'Kitabın rafları güncellendi.', 'success');
    } catch (error) {
      console.error('Error updating book shelves:', error);
      Swal.fire('Hata!', 'Kitap rafları güncellenirken bir hata oluştu.', 'error');
    }
  };

  const filteredAndSortedBooks = useMemo(() => {
    const shelfFiltered = selectedShelf === 'all'
      ? favoriteBooks
      : favoriteBooks.filter(book => book.shelves?.includes(selectedShelf));

    return shelfFiltered
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
  }, [favoriteBooks, searchQuery, sortOrder, selectedShelf]);

  const totalPages = Math.ceil(filteredAndSortedBooks.length / booksPerPage);
  const paginatedBooks = filteredAndSortedBooks.slice(
    (currentPage - 1) * booksPerPage,
    currentPage * booksPerPage
  );

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
            src="https://lottie.host/c87f7b8a-08d9-4f01-98ea-a807738ae878/eUIfhKL9kZ.json"
            loop
            autoplay
            style={{ width: '300px', height: '300px' }}
          />
        </div>

        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Kişisel Kütüphanem</h1>
          <p className="mt-2 text-gray-600">Favori kitaplarınızı raflar halinde düzenleyin ve yönetin.</p>
        </div>

        {/* Shelf Management UI */}
        <div className="mb-6 sm:mb-8 p-4 sm:p-6 bg-white/60 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20">
          <h2 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3 sm:mb-4">Raflarım</h2>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <button
              onClick={() => setSelectedShelf('all')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${selectedShelf === 'all' ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg scale-105' : 'bg-white/50 text-gray-700 hover:bg-white/80'}`}
            >
              Tüm Favoriler
            </button>
            {shelves.map(shelf => (
              <div key={shelf.id} className="relative group">
                <button
                  onClick={() => setSelectedShelf(shelf.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${selectedShelf === shelf.id ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg scale-105' : 'bg-white/50 text-gray-700 hover:bg-white/80'}`}
                >
                  {shelf.name}
                </button>
                <button onClick={() => handleDeleteShelf(shelf.id, shelf.name)} className="absolute -top-2 -right-2 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:scale-110">
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              type="text"
              value={newShelfName}
              onChange={(e) => setNewShelfName(e.target.value)}
              placeholder="Yeni raf adı..."
              className="flex-grow px-4 py-3 bg-white/50 border border-white/20 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white/80 transition-all"
            />
            <button
              onClick={handleCreateShelf}
              className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all flex items-center justify-center gap-2 font-medium whitespace-nowrap"
            >
              <PlusCircle size={18} />
              Oluştur
            </button>
          </div>
        </div>


        {favoriteBooks.length > 0 && (
          <div className="mb-6 flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input 
                type="text"
                placeholder="Favorilerimde ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white/60 backdrop-blur-xl border border-white/20 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white/80 transition-all shadow-lg"
              />
            </div>
            <div className="w-full md:w-64">
              <select 
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="w-full px-4 py-3 bg-white/60 backdrop-blur-xl border border-white/20 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white/80 transition-all shadow-lg"
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
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-8 text-center flex flex-col items-center justify-center border border-white/20">
            <div className="w-20 h-20 bg-gradient-to-br from-pink-400 to-red-500 rounded-full flex items-center justify-center mb-4">
              <Heart className="w-10 h-10 text-white fill-current" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">
              {searchQuery ? 'Aramanıza uygun favori bulunamadı.' : selectedShelf !== 'all' ? 'Bu rafta henüz kitap yok.' : 'Henüz Favori Kitabınız Yok'}
            </h3>
            <p className="text-gray-600 mb-6">Katalogdan beğendiğiniz kitapları favorilerinize ekleyip raflarınıza yerleştirebilirsiniz.</p>
            <Link to="/catalog" className="inline-flex items-center px-6 py-3 text-sm font-medium rounded-xl shadow-lg text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:shadow-xl hover:scale-105 transition-all">
              Kataloğa Git
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {paginatedBooks.map(book => {
                const bookStatus = getBookStatus(book.id);
                const hasPendingRequest = borrowMessages.some(m => 
                  m.bookId === book.id && 
                  m.userId === user?.uid && 
                  m.status === 'pending'
                );
                const bookShelves = book.shelves?.map(shelfId => shelves.find(s => s.id === shelfId)?.name).filter(Boolean) || [];

                return (
                  <div key={book.id} className="group bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden flex flex-col border border-white/20">
                    <div className="relative overflow-hidden">
                      <img src={book.coverImage} alt={book.title} className="w-full h-80 object-cover group-hover:scale-110 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <button
                        onClick={() => handleRemoveFavorite(book.id, book.title)}
                        className="absolute top-3 right-3 z-10 p-2 bg-white/90 backdrop-blur-xl rounded-full text-red-500 hover:bg-gradient-to-r hover:from-red-500 hover:to-pink-600 hover:text-white transition-all shadow-lg hover:scale-110"
                      >
                        <Heart className="w-5 h-5 fill-current" />
                      </button>
                    </div>
                    <div className="p-5 flex flex-col flex-grow">
                      <div>
                        <h3 className="font-semibold text-gray-900 truncate">{book.title}</h3>
                        <p className="text-sm text-gray-600">{book.author}</p>
                      </div>
                      
                      {bookShelves.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {bookShelves.map(shelfName => (
                            <span key={shelfName} className="px-3 py-1 bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 rounded-lg text-xs font-medium">{shelfName}</span>
                          ))}
                        </div>
                      )}

                      {book.note && (
                        <div className="mt-3 p-3 bg-gradient-to-r from-yellow-50 to-amber-50 border-l-4 border-yellow-400 rounded-r-lg">
                          <p className="text-xs text-yellow-800 italic font-medium">{book.note}</p>
                        </div>
                      )}
                      <div className="flex-grow mt-3 flex flex-col justify-end">
                        <div className="flex justify-between items-center mb-3">
                          <span className={`px-3 py-1.5 rounded-xl text-xs font-semibold shadow-md ${
                            hasPendingRequest
                              ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-white'
                              : bookStatus === 'lost'
                              ? 'bg-gradient-to-r from-red-500 to-pink-600 text-white'
                              : bookStatus === 'borrowed'
                              ? 'bg-gradient-to-r from-orange-400 to-red-500 text-white'
                              : 'bg-gradient-to-r from-green-400 to-emerald-500 text-white'
                          }`}>
                            {hasPendingRequest 
                              ? 'Onay Bekliyor' 
                              : bookStatus === 'lost' 
                              ? 'Kayıp' 
                              : bookStatus === 'borrowed' 
                              ? 'Ödünç Verildi' 
                              : 'Müsait'}
                          </span>
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleOpenNoteModal(book)} className="p-2 rounded-xl text-gray-500 hover:bg-gradient-to-r hover:from-indigo-500 hover:to-purple-600 hover:text-white transition-all shadow-sm hover:shadow-md">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleOpenShelfModal(book)} className="p-2 rounded-xl text-gray-500 hover:bg-gradient-to-r hover:from-indigo-500 hover:to-purple-600 hover:text-white transition-all shadow-sm hover:shadow-md">
                              <BookmarkIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        {bookStatus === 'available' && !hasPendingRequest && (
                          <button
                            onClick={() => handleBorrowRequest(book)}
                            className="w-full px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:scale-105 transition-all"
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
                    className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white/60 backdrop-blur-xl border border-white/20 rounded-xl hover:bg-white/80 disabled:opacity-50 transition-all shadow-lg"
                  >
                    Önceki
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white/60 backdrop-blur-xl border border-white/20 rounded-xl hover:bg-white/80 disabled:opacity-50 transition-all shadow-lg"
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl max-w-lg w-full border border-white/20">
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
                className="w-full mt-4 p-3 bg-white/50 border border-white/20 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white/80 transition-all"
                rows={4}
              />
            </div>
            <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 flex justify-end space-x-2">
              <button onClick={() => setIsNoteModalOpen(false)} className="px-5 py-2.5 bg-white/50 border border-white/20 rounded-xl text-gray-700 hover:bg-white/80 transition-all">
                İptal
              </button>
              <button onClick={handleSaveNote} className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all font-medium">
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shelf Management Modal */}
      {isShelfModalOpen && editingShelvesBook && (
        <ShelfManagementModal
          book={editingShelvesBook}
          allShelves={shelves}
          onClose={() => setIsShelfModalOpen(false)}
          onSave={handleUpdateBookShelves}
        />
      )}
    </div>
  );
};

// New Component for Shelf Management Modal
interface ShelfManagementModalProps {
  book: FavoriteBook;
  allShelves: Shelf[];
  onClose: () => void;
  onSave: (selectedShelfIds: string[]) => void;
}

const ShelfManagementModal: React.FC<ShelfManagementModalProps> = ({ book, allShelves, onClose, onSave }) => {
  const [selectedShelves, setSelectedShelves] = useState<string[]>(book.shelves || []);

  const handleToggleShelf = (shelfId: string) => {
    setSelectedShelves(prev =>
      prev.includes(shelfId) ? prev.filter(id => id !== shelfId) : [...prev, shelfId]
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl max-w-md w-full border border-white/20">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <BookmarkIcon className="w-6 h-6 mr-2 text-indigo-600" />
            Rafları Yönet
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6">
          <p className="font-semibold text-gray-800 mb-4">{book.title}</p>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {allShelves.length > 0 ? allShelves.map(shelf => (
              <label key={shelf.id} className="flex items-center p-3 rounded-xl hover:bg-white/50 cursor-pointer transition-all">
                <input
                  type="checkbox"
                  checked={selectedShelves.includes(shelf.id)}
                  onChange={() => handleToggleShelf(shelf.id)}
                  className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="ml-3 text-gray-700">{shelf.name}</span>
              </label>
            )) : (
              <p className="text-gray-500 text-center">Henüz hiç raf oluşturmadınız.</p>
            )}
          </div>
        </div>
        <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 flex justify-end space-x-2">
          <button onClick={onClose} className="px-5 py-2.5 bg-white/50 border border-white/20 rounded-xl text-gray-700 hover:bg-white/80 transition-all">
            İptal
          </button>
          <button onClick={() => onSave(selectedShelves)} className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all font-medium">
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
}


export default FavoritesPage;