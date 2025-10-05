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

          const favoritedDetailsMap = new Map(favoritedItems.map(item => [item.bookId, { favoriteId: item.favoriteId, favoritedAt: item.favoritedAt.toDate(), note: item.note, shelves: item.shelves || [] }]));

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
          <h1 className="text-3xl font-bold text-gray-900">Kişisel Kütüphanem</h1>
          <p className="mt-2 text-gray-600">Favori kitaplarınızı raflar halinde düzenleyin ve yönetin.</p>
        </div>

        {/* Shelf Management UI */}
        <div className="mb-8 p-4 bg-white rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Raflarım</h2>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <button
              onClick={() => setSelectedShelf('all')}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${selectedShelf === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            >
              Tüm Favoriler
            </button>
            {shelves.map(shelf => (
              <div key={shelf.id} className="relative group">
                <button
                  onClick={() => setSelectedShelf(shelf.id)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${selectedShelf === shelf.id ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                  {shelf.name}
                </button>
                <button onClick={() => handleDeleteShelf(shelf.id, shelf.name)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newShelfName}
              onChange={(e) => setNewShelfName(e.target.value)}
              placeholder="Yeni raf adı..."
              className="flex-grow px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={handleCreateShelf}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
            >
              <PlusCircle size={18} />
              Oluştur
            </button>
          </div>
        </div>


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
              {searchQuery ? 'Aramanıza uygun favori bulunamadı.' : selectedShelf !== 'all' ? 'Bu rafta henüz kitap yok.' : 'Henüz Favori Kitabınız Yok'}
            </h3>
            <p className="text-gray-600 mb-6">Katalogdan beğendiğiniz kitapları favorilerinize ekleyip raflarınıza yerleştirebilirsiniz.</p>
            <Link to="/catalog" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">
              Kataloğa Git
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {paginatedBooks.map(book => {
                const bookStatus = getBookStatus(book.id);
                const hasPendingRequest = borrowMessages.some(m => 
                  m.bookId === book.id && 
                  m.userId === user?.uid && 
                  m.status === 'pending'
                );
                const bookShelves = book.shelves?.map(shelfId => shelves.find(s => s.id === shelfId)?.name).filter(Boolean) || [];

                return (
                  <div key={book.id} className="bg-white rounded-xl shadow-sm overflow-hidden flex flex-col">
                    <div className="relative">
                      <img src={book.coverImage} alt={book.title} className="w-full h-80 object-cover" />
                      <button
                        onClick={() => handleRemoveFavorite(book.id, book.title)}
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
                      
                      {bookShelves.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {bookShelves.map(shelfName => (
                            <span key={shelfName} className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded-full text-xs">{shelfName}</span>
                          ))}
                        </div>
                      )}

                      {book.note && (
                        <div className="mt-3 p-2 bg-yellow-50 border-l-4 border-yellow-300">
                          <p className="text-xs text-yellow-800 italic">{book.note}</p>
                        </div>
                      )}
                      <div className="flex-grow mt-3 flex flex-col justify-end">
                        <div className="flex justify-between items-center mb-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            hasPendingRequest
                              ? 'bg-yellow-100 text-yellow-800'
                              : bookStatus === 'lost'
                              ? 'bg-red-100 text-red-800'
                              : bookStatus === 'borrowed'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-green-100 text-green-800'
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
                            <button onClick={() => handleOpenNoteModal(book)} className="p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleOpenShelfModal(book)} className="p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors">
                              <BookmarkIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        {bookStatus === 'available' && !hasPendingRequest && (
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
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full">
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
              <label key={shelf.id} className="flex items-center p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
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
        <div className="p-4 bg-gray-50 flex justify-end space-x-2">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
            İptal
          </button>
          <button onClick={() => onSave(selectedShelves)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
}


export default FavoritesPage;