import React, { useState, useEffect } from 'react';
import { Book, Users } from '../../../types';
import { useBooks } from '../../../contexts/BookContext';
import { Search, Plus, BookOpen, Edit, Trash2, Book as BookIcon, UserCheck, UserX, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import LendBookModal from '../LendBookModal';
import EditBookModal from '../EditBookModal';
import BulkAddBookModal from '../BulkAddBookModal';
import { collection, addDoc, serverTimestamp, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../firebase/config';

interface AdminCatalogTabProps {
  catalogBooks: Book[];
  setCatalogBooks: React.Dispatch<React.SetStateAction<Book[]>>;
  refetchAllBooks: () => void;
  getBookStatus: (bookId: string) => 'available' | 'borrowed' | 'lost';
  users: Users[];
}

const AdminCatalogTab: React.FC<AdminCatalogTabProps> = ({
  catalogBooks,
  setCatalogBooks,
  refetchAllBooks,
  getBookStatus,
  users,
}) => {
  const { markBookAsLost, markBookAsFound, lendBookToUser } = useBooks();
  const [catalogSearchQuery, setCatalogSearchQuery] = useState('');
  const [catalogStatusFilter, setCatalogStatusFilter] = useState<'all' | 'available' | 'borrowed' | 'lost'>('all');
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState('all');
  const [showManualAddModal, setShowManualAddModal] = useState(false);
  const [showBulkAddModal, setShowBulkAddModal] = useState(false);
  const [showLendBookModal, setShowLendBookModal] = useState(false);
  const [selectedBookToLend, setSelectedBookToLend] = useState<Book | null>(null);
  const [showEditBookModal, setShowEditBookModal] = useState(false);
  const [selectedBookToEdit, setSelectedBookToEdit] = useState<Book | null>(null);
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [showAddBookModal, setShowAddBookModal] = useState(false);

  useEffect(() => {
    setCurrentPage(1);
  }, [catalogSearchQuery, catalogStatusFilter, catalogCategoryFilter]);

  const handleSelectBook = (bookId: string, isSelected: boolean) => {
    setSelectedBookIds(prev =>
      isSelected ? [...prev, bookId] : prev.filter(id => id !== bookId)
    );
  };

  const handleSelectAllBooks = (isSelected: boolean) => {
    if (isSelected) {
      setSelectedBookIds(filteredCatalogBooks.map(book => book.id));
    } else {
      setSelectedBookIds([]);
    }
  };
  const [newBook, setNewBook] = useState({
    author: '',
    category: '',
    coverImage: '',
    location: '',
    publisher: '',
    status: 'available',
    tags: '',
    title: '',
    backCover: '',
    pageCount: 0,
    dimensions: '',
    weight: '',
    binding: '',
  });

  const categories = Array.from(new Set(catalogBooks.map(book => book.category)));

  const handleMarkAsLost = async (bookId: string) => {
    try {
      await markBookAsLost(bookId);
      refetchAllBooks();
    } catch (error) {
      console.error('Error marking book as lost:', error);
    }
  };

  const handleMarkAsFound = async (bookId: string) => {
    try {
      await markBookAsFound(bookId);
      refetchAllBooks();
    } catch (error) {
      console.error('Error marking book as found:', error);
    }
  };

  const handleNewBookChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const isNumber = type === 'number';
    setNewBook(prev => ({ ...prev, [name]: isNumber ? Number(value) : value }));
  };

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const booksCollectionRef = collection(db, "books");
      await addDoc(booksCollectionRef, {
        ...newBook,
        tags: newBook.tags.split(',').map(tag => tag.trim()).filter(tag => tag !== ''),
        addedDate: serverTimestamp(),
      });
      setShowAddBookModal(false);
      setNewBook({
        author: '',
        category: '',
        coverImage: '',
        location: '',
        publisher: '',
        status: 'available',
        tags: '',
        title: '',
        backCover: '',
        pageCount: 0,
        dimensions: '',
        weight: '',
        binding: '',
      });
      const booksCollectionRefFresh = collection(db, "books");
      const querySnapshot = await getDocs(booksCollectionRefFresh);
      const booksData = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Book[];
      setCatalogBooks(booksData);
      refetchAllBooks();
      alert('Kitap başarıyla eklendi!');
    } catch (error) {
      console.error('Error adding book:', error);
      alert('Kitap eklenirken bir hata oluştu.');
    }
  };

  const handleEditBook = (book: Book) => {
    setSelectedBookToEdit(book);
    setShowEditBookModal(true);
  };

  const handleDeleteBook = async (bookId: string) => {
    if (window.confirm('Bu kitabı silmek istediğinizden emin misiniz?')) {
      try {
        await deleteDoc(doc(db, 'books', bookId));
        setCatalogBooks(prev => prev.filter(b => b.id !== bookId));
        refetchAllBooks();
        alert('Kitap başarıyla silindi.');
      } catch (error) {
        console.error('Error deleting book: ', error);
        alert('Kitap silinirken bir hata oluştu.');
      }
    }
  };

  const handleSaveBook = async (book: Book) => {
    try {
      const bookRef = doc(db, 'books', book.id);
      await updateDoc(bookRef, { ...book });
      setCatalogBooks(prev => prev.map(b => b.id === book.id ? book : b));
      refetchAllBooks();
      setShowEditBookModal(false);
      alert('Kitap başarıyla güncellendi.');
    } catch (error) {
      console.error('Error saving book: ', error);
      alert('Kitap güncellenirken bir hata oluştu.');
    }
  };

  const handleBulkDelete = async () => {
    if (window.confirm(`Seçilen ${selectedBookIds.length} kitabı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`)) {
      try {
        const deletePromises = selectedBookIds.map(bookId => deleteDoc(doc(db, 'books', bookId)));
        await Promise.all(deletePromises);
        setCatalogBooks(prev => prev.filter(b => !selectedBookIds.includes(b.id)));
        setSelectedBookIds([]);
        refetchAllBooks();
        alert(`${selectedBookIds.length} kitap başarıyla silindi.`);
      } catch (error) {
        console.error('Error bulk deleting books: ', error);
        alert('Kitaplar silinirken bir hata oluştu.');
      }
    }
  };

  const handleBulkMarkAsLost = async () => {
    if (window.confirm(`Seçilen ${selectedBookIds.length} kitabı kayıp olarak işaretlemek istediğinizden emin misiniz?`)) {
      try {
        const markAsLostPromises = selectedBookIds.map(bookId => markBookAsLost(bookId));
        await Promise.all(markAsLostPromises);
        setSelectedBookIds([]);
        refetchAllBooks();
        alert(`${selectedBookIds.length} kitap başarıyla kayıp olarak işaretlendi.`);
      } catch (error) {
        console.error('Error bulk marking books as lost: ', error);
        alert('Kitaplar kayıp olarak işaretlenirken bir hata oluştu.');
      }
    }
  };

  const handleBulkLend = () => {
    alert('Toplu ödünç verme işlemi henüz uygulanmamıştır.');
  };

  const filteredCatalogBooks = catalogBooks.filter(book => {
    const matchesSearch =
      (book.title || '').toLowerCase().includes(catalogSearchQuery.toLowerCase()) ||
      (book.author || '').toLowerCase().includes(catalogSearchQuery.toLowerCase()) ||
      (book.id || '').toLowerCase().includes(catalogSearchQuery.toLowerCase());

    const bookStatus = getBookStatus(book.id);
    const matchesStatus =
      catalogStatusFilter === 'all' || bookStatus === catalogStatusFilter;

    const matchesCategory =
      catalogCategoryFilter === 'all' || book.category === catalogCategoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentBooks = filteredCatalogBooks.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredCatalogBooks.length / itemsPerPage);

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <BookIcon className="w-6 h-6 mr-2 text-indigo-600" />
            Katalog Yönetimi
          </h2>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowManualAddModal(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center"
            >
              <Plus className="w-5 h-5 mr-2" />
              Yeni Kitap Ekle
            </button>
            <button
              onClick={() => setShowBulkAddModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
            >
              <Plus className="w-5 h-5 mr-2" />
              Toplu Kitap Ekle
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative md:col-span-1">
            <input
              type="text"
              placeholder="Kitap adı, yazar veya ID..."
              value={catalogSearchQuery}
              onChange={(e) => setCatalogSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
          </div>
          <select
            value={catalogStatusFilter}
            onChange={(e) => setCatalogStatusFilter(e.target.value as 'all' | 'available' | 'borrowed' | 'lost')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="all">Tüm Durumlar</option>
            <option value="available">Müsait</option>
            <option value="borrowed">Ödünç Verildi</option>
            <option value="lost">Kayıp</option>
          </select>
          <select
            value={catalogCategoryFilter}
            onChange={(e) => setCatalogCategoryFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="all">Tüm Kategoriler</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>

        <div className="mb-4 flex items-center">
          <input
            type="checkbox"
            id="selectAllBooks"
            className="form-checkbox h-4 w-4 text-indigo-600 transition duration-150 ease-in-out rounded"
            checked={selectedBookIds.length === filteredCatalogBooks.length && filteredCatalogBooks.length > 0}
            onChange={(e) => handleSelectAllBooks(e.target.checked)}
          />
          <label htmlFor="selectAllBooks" className="ml-2 text-sm text-gray-700">Tümünü Seç</label>
        </div>

        {selectedBookIds.length > 0 && (
          <div className="mb-4 flex items-center space-x-2">
            <button
              onClick={handleBulkDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center"
            >
              <Trash2 className="w-5 h-5 mr-2" />
              Seçilenleri Sil ({selectedBookIds.length})
            </button>
            <button
              onClick={handleBulkMarkAsLost}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors flex items-center"
            >
              <UserX className="w-5 h-5 mr-2" />
              Kayıp Olarak İşaretle ({selectedBookIds.length})
            </button>
            <button
              onClick={handleBulkLend}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            >
              <BookOpen className="w-5 h-5 mr-2" />
              Ödünç Ver ({selectedBookIds.length})
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {currentBooks.map(book => {
            const bookStatus = getBookStatus(book.id);

            return (
              <div key={book.id} className="bg-white rounded-xl shadow-sm overflow-hidden relative">
                <input
                  type="checkbox"
                  className="absolute top-3 left-3 form-checkbox h-4 w-4 text-indigo-600 transition duration-150 ease-in-out rounded"
                  checked={selectedBookIds.includes(book.id)}
                  onChange={(e) => handleSelectBook(book.id, e.target.checked)}
                />
                <img src={book.coverImage} alt={book.title} className="w-full h-85 object-cover" />
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900">{book.title}</h3>
                  <p className="text-sm text-gray-600">{book.author}</p>
                  <p className="text-xs text-gray-500 mt-1">{book.publisher}</p>

                  <div className="mt-3 flex justify-between items-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center ${
                      bookStatus === 'lost'
                        ? 'bg-red-100 text-red-800'
                        : bookStatus === 'borrowed'
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {bookStatus === 'lost' && <AlertTriangle className="w-3 h-3 mr-1" />}
                      {bookStatus === 'borrowed' && <Clock className="w-3 h-3 mr-1" />}
                      {bookStatus === 'available' && <CheckCircle className="w-3 h-3 mr-1" />}
                      {
                        bookStatus === 'lost'
                        ? 'Kayıp'
                        : bookStatus === 'borrowed'
                        ? 'Ödünç Verildi'
                        : 'Müsait'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    Konum: {book.location}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        setSelectedBookToLend(book);
                        setShowLendBookModal(true);
                      }}
                      disabled={bookStatus !== 'available'}
                      className="px-2 py-1 rounded-lg text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <BookOpen className="w-3 h-3 mr-1" />
                      Ödünç Ver
                    </button>
                    <button
                      onClick={() => handleEditBook(book)}
                      className="px-2 py-1 rounded-lg text-xs font-medium bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors flex items-center"
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Düzenle
                    </button>
                    <button
                      onClick={() => handleDeleteBook(book.id)}
                      className="px-2 py-1 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors flex items-center"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Sil
                    </button>
                    {bookStatus === 'lost' ? (
                      <button
                        onClick={() => handleMarkAsFound(book.id)}
                        className="px-2 py-1 rounded-lg text-xs font-medium bg-green-50 text-green-600 hover:bg-green-100 transition-colors flex items-center"
                      >
                        <UserCheck className="w-3 h-3 mr-1" />
                        Bulundu
                      </button>
                    ) : (
                      <button
                        onClick={() => handleMarkAsLost(book.id)}
                        className="px-2 py-1 rounded-lg text-xs font-medium bg-yellow-50 text-yellow-600 hover:bg-yellow-100 transition-colors flex items-center"
                      >
                        <UserX className="w-3 h-3 mr-1" />
                        Kayıp
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination Controls */}
        <div className="mt-8 flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-700">
              Sayfa <span className="font-medium">{currentPage}</span> / <span className="font-medium">{totalPages}</span> ({filteredCatalogBooks.length} kitap)
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Önceki
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sonraki
            </button>
          </div>
        </div>
      </div>

      {showAddBookModal && (
        <BulkAddBookModal
          isOpen={showAddBookModal}
          onClose={() => setShowAddBookModal(false)}
          onBookAdded={() => {
            refetchAllBooks();
          }}
        />
      )}

      {showLendBookModal && selectedBookToLend && (
        <LendBookModal
          isOpen={showLendBookModal}
          onClose={() => {
            setShowLendBookModal(false);
            setSelectedBookToLend(null);
          }}
          book={selectedBookToLend}
          users={users}
          onLend={async (userId) => {
            try {
              await lendBookToUser(selectedBookToLend.id, userId);
              const lentToUser = users.find(u => u.uid === userId);
              alert(`'${selectedBookToLend.title}' başarıyla ${lentToUser ? lentToUser.displayName : userId} kullanıcısına ödünç verildi.`);
              refetchAllBooks();
            } catch (error) {
              console.error('Error lending book:', error);
              alert(`Kitap ödünç verilirken bir hata oluştu: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
            } finally {
              setShowLendBookModal(false);
              setSelectedBookToLend(null);
            }
          }}
        />
      )}

      {showEditBookModal && selectedBookToEdit && (
        <EditBookModal
          isOpen={showEditBookModal}
          onClose={() => {
            setShowEditBookModal(false);
            setSelectedBookToEdit(null);
          }}
          book={selectedBookToEdit}
          onSave={handleSaveBook}
        />
      )}
    </div>
  );
};

export default AdminCatalogTab;
