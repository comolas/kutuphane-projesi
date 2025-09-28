import React, { useState, useEffect } from 'react';
import { X, Search, PlusCircle, Trash2 } from 'lucide-react';
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
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">{collectionToEdit ? 'Koleksiyonu Düzenle' : 'Yeni Koleksiyon Oluştur'}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 transition-colors">
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto">
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Koleksiyon Başlığı</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2 border rounded-md" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kapak Görseli (URL)</label>
                <input type="url" value={coverImage} onChange={e => setCoverImage(e.target.value)} className="w-full p-2 border rounded-md" />
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sıralama</label>
                  <input type="number" value={order} onChange={e => setOrder(Number(e.target.value))} className="w-full p-2 border rounded-md" />
                </div>
                <div className="flex items-center pt-6">
                  <input type="checkbox" id="isActive" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="h-4 w-4 text-indigo-600 border-gray-300 rounded" />
                  <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">Aktif</label>
                </div>
              </div>
              
              {/* Book Search */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">Koleksiyona Kitap Ekle</label>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Kitap veya yazar adı..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full p-2 pl-10 border rounded-md"
                    />
                </div>
                {searchResults.length > 0 && (
                  <ul className="absolute z-10 w-full bg-white border rounded-md mt-1 max-h-60 overflow-y-auto shadow-lg">
                    {searchResults.map(book => (
                      <li key={book.id} onClick={() => handleAddBook(book)} className="p-3 hover:bg-indigo-50 cursor-pointer flex items-center">
                        <img src={book.coverImage} alt={book.title} className="w-10 h-14 object-cover mr-3"/>
                        <div>
                            <p className="font-semibold">{book.title}</p>
                            <p className="text-sm text-gray-500">{book.author}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Right Column - Selected Books */}
            <div className="bg-gray-50 p-4 rounded-lg border h-full">
              <h3 className="font-semibold text-lg mb-3">Koleksiyondaki Kitaplar ({selectedBooks.length})</h3>
              <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-2">
                {selectedBooks.length > 0 ? selectedBooks.map((book, index) => (
                  <div key={book.id} className="bg-white p-3 rounded-md shadow-sm border flex flex-col">
                    <div className="flex items-start justify-between">
                        <div className="flex items-start">
                            <span className="text-indigo-600 font-bold mr-3">{index + 1}.</span>
                            <img src={book.coverImage} alt={book.title} className="w-12 h-16 object-cover mr-4 rounded-sm"/>
                            <div>
                                <p className="font-semibold text-gray-800">{book.title}</p>
                                <p className="text-xs text-gray-500">{book.author}</p>
                            </div>
                        </div>
                        <button type="button" onClick={() => handleRemoveBook(book.id)} className="p-1 text-gray-400 hover:text-red-600">
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="mt-2">
                        <input 
                            type="text" 
                            placeholder="Hikaye için kısa metin (blurb)..." 
                            value={book.blurb}
                            onChange={(e) => handleBlurbChange(book.id, e.target.value)}
                            className="w-full p-1.5 border rounded-md text-sm"
                        />
                    </div>
                  </div>
                )) : (
                  <p className="text-center text-gray-500 pt-10">Arama yaparak kitap ekleyin.</p>
                )}
              </div>
            </div>
          </div>

          <div className="p-6 border-t bg-gray-50 flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">İptal</button>
            <button type="submit" disabled={isLoading} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-300">
              {isLoading ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CollectionModal;
