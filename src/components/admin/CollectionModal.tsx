import React, { useState, useEffect } from 'react';
import { X, Search, PlusCircle, Trash2, Layers } from 'lucide-react';
import { db } from '../../firebase/config';
import { collection, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore';
import { Book } from '../../../types'; // Assuming you have a Book type

// This should be moved to types/index.ts later
export interface StoryCollectionBook {
  bookId: string;
  blurb: string;
}

export interface StoryCollection {
  id?: string;
  title: string;
  coverImage: string;
  order: number;
  isActive: boolean;
  books: StoryCollectionBook[];
}

interface CollectionModalProps {
  onClose: () => void;
  onSave: (collection: StoryCollection) => void;
  collectionToEdit?: StoryCollection | null;
}

const CollectionModal: React.FC<CollectionModalProps> = ({ onClose, onSave, collectionToEdit }) => {
  const [title, setTitle] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [order, setOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [selectedBooks, setSelectedBooks] = useState<any[]>([]); // Using any for now to include blurb

  const [allLibraryBooks, setAllLibraryBooks] = useState<Book[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchBooks = async () => {
      const booksSnapshot = await getDocs(collection(db, 'books'));
      const booksList = booksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Book));
      setAllLibraryBooks(booksList);
    };
    fetchBooks();
  }, []);

  useEffect(() => {
    if (collectionToEdit) {
      setTitle(collectionToEdit.title);
      setCoverImage(collectionToEdit.coverImage);
      setOrder(collectionToEdit.order);
      setIsActive(collectionToEdit.isActive);
      // Hydrate selectedBooks with full book info
      const bookDetails = collectionToEdit.books.map(b => {
        const fullBook = allLibraryBooks.find(libBook => libBook.id === b.bookId);
        return { ...fullBook, blurb: b.blurb };
      });
      setSelectedBooks(bookDetails);
    }
  }, [collectionToEdit, allLibraryBooks]);

  useEffect(() => {
    if (searchTerm) {
      const results = allLibraryBooks.filter(book =>
        book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.author.toLowerCase().includes(searchTerm.toLowerCase())
      ).slice(0, 5); // Limit results for performance
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }, [searchTerm, allLibraryBooks]);

  const handleAddBook = (book: Book) => {
    if (!selectedBooks.some(b => b.id === book.id)) {
      setSelectedBooks(prev => [...prev, { ...book, blurb: '' }]);
    }
    setSearchTerm('');
    setSearchResults([]);
  };

  const handleRemoveBook = (bookId: string) => {
    setSelectedBooks(prev => prev.filter(b => b.id !== bookId));
  };

  const handleBlurbChange = (bookId: string, blurb: string) => {
    setSelectedBooks(prev => prev.map(b => b.id === bookId ? { ...b, blurb } : b));
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', index.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('text/html'));
    if (dragIndex === dropIndex) return;

    const newBooks = [...selectedBooks];
    const [draggedBook] = newBooks.splice(dragIndex, 1);
    newBooks.splice(dropIndex, 0, draggedBook);
    setSelectedBooks(newBooks);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const collectionData: Omit<StoryCollection, 'id'> = {
      title,
      coverImage,
      order,
      isActive,
      books: selectedBooks.map(b => ({ bookId: b.id, blurb: b.blurb })),
    };

    try {
      let savedCollection: StoryCollection;
      if (collectionToEdit?.id) {
        const docRef = doc(db, 'collections', collectionToEdit.id);
        await updateDoc(docRef, collectionData);
        savedCollection = { id: collectionToEdit.id, ...collectionData };
      } else {
        const docRef = await addDoc(collection(db, 'collections'), collectionData);
        savedCollection = { id: docRef.id, ...collectionData };
      }
      onSave(savedCollection);
      onClose();
    } catch (error) {
      console.error("Error saving collection: ", error);
      alert("Koleksiyon kaydedilirken bir hata oluştu.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-0">
      <div className="bg-gradient-to-br from-white to-indigo-50 w-full h-full flex flex-col overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 sm:p-6 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 backdrop-blur-sm p-2 rounded-full">
              <Layers className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white">{collectionToEdit ? 'Koleksiyonu Düzenle' : 'Yeni Koleksiyon Oluştur'}</h2>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-full transition-all min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation">
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto">
          <div className="p-4 md:p-6 space-y-4 md:space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Koleksiyon Başlığı</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2.5 sm:p-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base transition-all" required />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Sıralama</label>
                <input type="number" value={order} onChange={e => setOrder(Number(e.target.value))} className="w-full p-2.5 sm:p-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base transition-all" />
              </div>
              <div className="flex items-end">
                <label className="flex items-center cursor-pointer bg-gradient-to-r from-indigo-50 to-purple-50 px-4 py-2.5 rounded-xl border-2 border-indigo-200 hover:border-indigo-300 transition-all">
                  <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="h-5 w-5 text-indigo-600 border-gray-300 rounded" />
                  <span className="ml-2 text-xs sm:text-sm font-semibold text-gray-900">Aktif</span>
                </label>
              </div>
            </div>

            {/* Book Search */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Kitap Ara ve Ekle</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Kitap veya yazar adı..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full p-2.5 sm:p-3 pl-10 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base transition-all"
                />
              </div>
            </div>

            {/* Search Results Grid */}
            {searchResults.length > 0 && (
              <div className="bg-white/80 backdrop-blur-xl border border-white/20 rounded-xl md:rounded-2xl p-3 md:p-4">
                <h3 className="font-semibold text-base md:text-lg mb-3 md:mb-4">Arama Sonuçları</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
                  {searchResults.map(book => (
                    <div 
                      key={book.id} 
                      onClick={() => handleAddBook(book)}
                      className="group cursor-pointer bg-white/90 backdrop-blur-xl border border-white/20 rounded-xl overflow-hidden hover:shadow-xl hover:scale-105 transition-all duration-300"
                    >
                      <div className="relative" style={{ aspectRatio: '2/3' }}>
                        {book.coverImage ? (
                          <img src={book.coverImage} alt={book.title} className="absolute inset-0 w-full h-full object-cover" />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-indigo-200 to-purple-200 flex items-center justify-center text-2xl">?</div>
                        )}
                      </div>
                      <div className="p-2">
                        <p className="text-xs font-semibold line-clamp-1">{book.title}</p>
                        <p className="text-xs text-gray-500 line-clamp-1">{book.author}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Selected Books Grid */}
            <div className="bg-white/80 backdrop-blur-xl border border-white/20 rounded-xl md:rounded-2xl p-3 md:p-4">
              <h3 className="font-semibold text-base md:text-lg mb-3 md:mb-4">Seçili Kitaplar ({selectedBooks.length})</h3>
              {selectedBooks.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
                  {selectedBooks.map((book, index) => (
                    <div 
                      key={`selected-${book.id}-${index}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, index)}
                      className="group bg-white/90 backdrop-blur-xl border-2 border-indigo-500 rounded-xl overflow-hidden hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-move"
                    >
                      <div className="relative" style={{ aspectRatio: '2/3' }}>
                        {book.coverImage ? (
                          <img src={book.coverImage} alt={book.title} className="absolute inset-0 w-full h-full object-cover" />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-indigo-200 to-purple-200 flex items-center justify-center text-2xl">?</div>
                        )}
                        <button 
                          type="button" 
                          onClick={() => handleRemoveBook(book.id)} 
                          className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center shadow-md hover:shadow-lg hover:scale-105 touch-manipulation"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <div className="absolute top-2 left-2 px-2 py-1 bg-indigo-600 text-white text-xs font-bold rounded-full">
                          {index + 1}
                        </div>
                      </div>
                      <div className="p-2">
                        <p className="text-xs font-semibold line-clamp-1">{book.title}</p>
                        <div className="mt-2">
                          <textarea 
                            placeholder="Hikaye metni..." 
                            value={book.blurb || ''}
                            onChange={(e) => handleBlurbChange(book.id, e.target.value)}
                            maxLength={200}
                            className="w-full p-1.5 text-xs border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                            rows={2}
                          />
                          <div className="text-xs text-gray-400 mt-1 text-right">
                            {(book.blurb || '').length}/200
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">Arama yaparak kitap ekleyin</p>
              )}
            </div>
          </div>

          <div className="p-4 sm:p-6 border-t border-gray-200 bg-gradient-to-t from-white to-transparent flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
            <button type="button" onClick={onClose} className="w-full sm:w-auto px-4 py-2 text-gray-700 bg-white border-2 border-gray-300 hover:bg-gray-50 rounded-xl transition-all font-semibold text-sm min-h-[44px] flex items-center justify-center shadow-md hover:shadow-lg hover:scale-105 touch-manipulation">İptal</button>
            <button type="submit" disabled={isLoading} className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all font-semibold shadow-md hover:shadow-lg disabled:opacity-50 text-sm min-h-[44px] flex items-center justify-center hover:scale-105 touch-manipulation">
              {isLoading ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CollectionModal;
