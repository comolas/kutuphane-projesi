import React, { useState, useEffect } from 'react';
import { Book, Users } from '../../../types';
import { useBooks } from '../../../contexts/BookContext';
import { Html5Qrcode, Html5QrcodeScanType } from "html5-qrcode";
import { Search, Plus, BookOpen, Edit, Trash2, Book as BookIcon, UserCheck, UserX, CheckCircle, Clock, AlertTriangle, X } from 'lucide-react';
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
  const [catalogTagQuery, setCatalogTagQuery] = useState('');
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
  const [isScanning, setIsScanning] = useState(false);
  const [apiMessage, setApiMessage] = useState<string | null>(null);

  useEffect(() => {
    setCurrentPage(1);
  }, [catalogSearchQuery, catalogStatusFilter, catalogCategoryFilter, catalogTagQuery]);
  
  useEffect(() => {
    if (!isScanning) return;

    const scanner = new Html5Qrcode('reader');

    const onScanSuccess = (decodedText: string) => {
      setIsScanning(false);
      setNewBook(prev => ({ ...prev, isbn: decodedText }));
      fetchBookDataFromISBN(decodedText);
      scanner.stop().catch(err => console.error("Failed to stop scanner", err));
    };

    const onScanFailure = (error: string) => {
      // QR kod bulunamadığında sürekli hata mesajı vermemesi için sessiz geç
      if (!error.includes('NotFoundException') && !error.includes('No MultiFormat Readers')) {
        console.error('Scan failed:', error);
      }
    };

    const config = { 
      fps: 10, 
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0,
      disableFlip: false,
      supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA]
    };

    let cleanup = () => {};

    Html5Qrcode.getCameras().then(cameras => {
        if (cameras && cameras.length) {
            const cameraId = cameras.find(camera => 
              camera.label.toLowerCase().includes('back') || 
              camera.label.toLowerCase().includes('rear')
            )?.id || cameras[0].id;
            
            scanner.start(cameraId, config, onScanSuccess, onScanFailure)
              .catch(err => {
                console.error("Unable to start scanning", err);
                setApiMessage('Kamera erişimi sağlanamadı. Lütfen kamera izinlerini kontrol edin.');
                setIsScanning(false);
              });
            cleanup = () => {
                scanner.stop().catch(err => console.error("Failed to stop scanner on cleanup", err));
            };
        }
    }).catch(err => {
      console.error("Error getting cameras", err);
      setApiMessage('Kamera bulunamadı. Lütfen cihazınızda kamera olduğundan emin olun.');
      setIsScanning(false);
    });

    return cleanup;
  }, [isScanning]);

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
    id: '',
    title: '',
    author: '',
    isbn: '',
    category: '',
    publisher: '',
    location: '',
    coverImage: '',
    tags: '',
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

  const fetchBookDataFromISBN = async (isbn: string) => {
    setApiMessage('Kitap verileri aranıyor...');
    try {
      const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
      const data = await response.json();
      if (data.items && data.items.length > 0) {
        const volumeInfo = data.items[0].volumeInfo;
        
        setNewBook(prev => ({
          ...prev,
          title: volumeInfo.title || prev.title,
          author: volumeInfo.authors ? volumeInfo.authors.join(', ') : prev.author,
          publisher: volumeInfo.publisher || prev.publisher,
          pageCount: volumeInfo.pageCount || prev.pageCount,
          dimensions: volumeInfo.dimensions ? `${volumeInfo.dimensions.height} x ${volumeInfo.dimensions.width}` : prev.dimensions,
          coverImage: volumeInfo.imageLinks?.thumbnail || prev.coverImage,
          backCover: volumeInfo.description || prev.backCover
        }));
        setApiMessage('Kitap bilgileri başarıyla bulundu ve forma eklendi!');
      } else {
        setApiMessage('Bu ISBN ile eşleşen bir kitap bulunamadı.');
      }
    } catch (error) {
      console.error("Error fetching book data:", error);
      setApiMessage('Kitap bilgileri alınırken bir hata oluştu.');
    }
  };

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Zorunlu alanları kontrol et
    if (!newBook.title || !newBook.author || !newBook.category || !newBook.coverImage) {
      alert('Lütfen tüm zorunlu alanları doldurun: Başlık, Yazar, Kategori, Kapak Resmi');
      return;
    }
    
    try {
      const booksCollectionRef = collection(db, "books");
      await addDoc(booksCollectionRef, {
        ...newBook,
        tags: newBook.tags.split(',').map(tag => tag.trim()).filter(tag => tag !== ''),
        status: 'available',
        addedDate: serverTimestamp(),
      });
      setShowAddBookModal(false);
      setNewBook({
        id: '',
        title: '',
        author: '',
        isbn: '',
        category: '',
        publisher: '',
        location: '',
        coverImage: '',
        tags: '',
        backCover: '',
        pageCount: 0,
        dimensions: '',
        weight: '',
        binding: '',
      });
      setApiMessage(null);
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

    const matchesTags = 
      catalogTagQuery === '' || 
      (Array.isArray(book.tags) && book.tags.some(tag => 
        tag.toLowerCase().includes(catalogTagQuery.toLowerCase())
      ));

    const bookStatus = getBookStatus(book.id);
    const matchesStatus =
      catalogStatusFilter === 'all' || bookStatus === catalogStatusFilter;

    const matchesCategory =
      catalogCategoryFilter === 'all' || book.category === catalogCategoryFilter;

    return matchesSearch && matchesTags && matchesStatus && matchesCategory;
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
              onClick={() => setShowAddBookModal(true)}
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
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
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
          <div className="relative md:col-span-1">
            <input
              type="text"
              placeholder="Etiket ara..."
              value={catalogTagQuery}
              onChange={(e) => setCatalogTagQuery(e.target.value)}
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
                <img src={`https://us-central1-data-49543.cloudfunctions.net/imageProxy?url=${encodeURIComponent(book.coverImage)}`} alt={book.title} className="w-full h-85 object-cover" />
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
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Yeni Kitap Ekle</h3>
              <button
                onClick={() => {
                  setShowAddBookModal(false);
                  setIsScanning(false);
                  setApiMessage(null);
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {isScanning && (
              <div className="p-6">
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">QR Kod Tarama İpuçları:</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• QR kodu kamera görüş alanının ortasına yerleştirin</li>
                    <li>• Yeterli ışık olduğundan emin olun</li>
                    <li>• Kamerayı QR koddan 10-30 cm uzakta tutun</li>
                    <li>• QR kod net ve buruşuk olmadığından emin olun</li>
                  </ul>
                </div>
                <div id="reader" style={{ width: '100%' }}></div>
                <div className="mt-4 flex space-x-2">
                  <button 
                    type="button"
                    onClick={() => setIsScanning(false)} 
                    className="flex-1 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Taramayı İptal Et
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setIsScanning(false);
                      setTimeout(() => setIsScanning(true), 100);
                    }} 
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Yeniden Başlat
                  </button>
                </div>
              </div>
            )}
            
            <form onSubmit={handleAddBook} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {apiMessage && (
                <div className="md:col-span-2 text-center p-3 rounded-lg bg-blue-100 text-blue-800 text-sm">
                  {apiMessage}
                </div>
              )}
              
              <div>
                <label htmlFor="id" className="block text-sm font-medium text-gray-700">Kitap ID</label>
                <input
                  type="text"
                  id="id"
                  name="id"
                  value={newBook.id}
                  onChange={handleNewBookChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Örn: TR-HK-001"
                />
              </div>
              
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                  Kitap Adı <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={newBook.title}
                  onChange={handleNewBookChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="author" className="block text-sm font-medium text-gray-700">
                  Yazar <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="author"
                  name="author"
                  value={newBook.author}
                  onChange={handleNewBookChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              
              <div className="md:col-span-2">
                <label htmlFor="isbn" className="block text-sm font-medium text-gray-700">ISBN</label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <input
                    type="text"
                    id="isbn"
                    name="isbn"
                    value={newBook.isbn}
                    onChange={handleNewBookChange}
                    className="flex-1 block w-full min-w-0 rounded-none rounded-l-md border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Manuel ISBN girişi"
                  />
                  <button
                    type="button"
                    onClick={() => setIsScanning(true)}
                    className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 hover:bg-gray-100"
                  >
                    ISBN Tara
                  </button>
                </div>
                {newBook.isbn && (
                  <button
                    type="button"
                    onClick={() => fetchBookDataFromISBN(newBook.isbn)}
                    className="mt-2 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-md text-sm hover:bg-indigo-200 transition-colors"
                  >
                    Bu ISBN ile Kitap Bilgilerini Getir
                  </button>
                )}
              </div>
              
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                  Kategori <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="category"
                  name="category"
                  value={newBook.category}
                  onChange={handleNewBookChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Örn: TR-HK, D-RMN"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="publisher" className="block text-sm font-medium text-gray-700">Yayıncı</label>
                <input
                  type="text"
                  id="publisher"
                  name="publisher"
                  value={newBook.publisher}
                  onChange={handleNewBookChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              
              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700">Konum</label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={newBook.location}
                  onChange={handleNewBookChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Örn: A-1-15"
                />
              </div>
              
              <div>
                <label htmlFor="pageCount" className="block text-sm font-medium text-gray-700">Sayfa Sayısı</label>
                <input
                  type="number"
                  id="pageCount"
                  name="pageCount"
                  value={newBook.pageCount}
                  onChange={handleNewBookChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              
              <div className="md:col-span-2">
                <label htmlFor="coverImage" className="block text-sm font-medium text-gray-700">
                  Kapak Resmi URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  id="coverImage"
                  name="coverImage"
                  value={newBook.coverImage}
                  onChange={handleNewBookChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              
              <div className="md:col-span-2">
                <label htmlFor="backCover" className="block text-sm font-medium text-gray-700">Arka Kapak Açıklaması</label>
                <textarea
                  id="backCover"
                  name="backCover"
                  value={newBook.backCover}
                  onChange={handleNewBookChange}
                  rows={3}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              
              <div>
                <label htmlFor="dimensions" className="block text-sm font-medium text-gray-700">Boyut</label>
                <input
                  type="text"
                  id="dimensions"
                  name="dimensions"
                  value={newBook.dimensions}
                  onChange={handleNewBookChange}
                  placeholder="örn: 20x13 cm"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              
              <div>
                <label htmlFor="weight" className="block text-sm font-medium text-gray-700">Ağırlık</label>
                <input
                  type="text"
                  id="weight"
                  name="weight"
                  value={newBook.weight}
                  onChange={handleNewBookChange}
                  placeholder="örn: 250g"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              
              <div>
                <label htmlFor="binding" className="block text-sm font-medium text-gray-700">Cilt Türü</label>
                <input
                  type="text"
                  id="binding"
                  name="binding"
                  value={newBook.binding}
                  onChange={handleNewBookChange}
                  placeholder="örn: Karton Kapak"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              
              <div className="md:col-span-2">
                <label htmlFor="tags" className="block text-sm font-medium text-gray-700">Etiketler (virgülle ayırın)</label>
                <input
                  type="text"
                  id="tags"
                  name="tags"
                  value={newBook.tags}
                  onChange={handleNewBookChange}
                  placeholder="örn: macera, gençlik, fantastik"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              
              <div className="md:col-span-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddBookModal(false);
                    setIsScanning(false);
                    setApiMessage(null);
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Kitabı Ekle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBulkAddModal && (
        <BulkAddBookModal
          isOpen={showBulkAddModal}
          onClose={() => setShowBulkAddModal(false)}
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
