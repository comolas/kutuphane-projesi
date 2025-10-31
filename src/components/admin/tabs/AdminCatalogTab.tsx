import React, { useState, useEffect } from 'react';
import { Book, Users } from '../../../types';
import { useBooks } from '../../../contexts/BookContext';
import { useAuth } from '../../../contexts/AuthContext';
import { Html5Qrcode, Html5QrcodeScanType } from "html5-qrcode";
import { Search, Plus, BookOpen, FileEdit as Edit, Trash2, Book as BookIcon, UserCheck, UserX, CheckCircle, Clock, AlertTriangle, X, Filter, Lightbulb, Loader2, Zap, Download } from 'lucide-react';
import LendBookModal from '../LendBookModal';
import EditBookModal from '../EditBookModal';
import BulkAddBookModal from '../BulkAddBookModal';
import BulkEditBookModal from '../BulkEditBookModal';
import QuickBorrowModal from '../QuickBorrowModal';
import { collection, addDoc, serverTimestamp, getDocs, doc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { db, functions, storage } from '../../../firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';

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
  const { isSuperAdmin, campusId } = useAuth();
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
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [showAddBookModal, setShowAddBookModal] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [apiMessage, setApiMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [showQuickBorrow, setShowQuickBorrow] = useState(false);
  const [quickBorrowBookId, setQuickBorrowBookId] = useState<string | undefined>();
  const [uploadingCover, setUploadingCover] = useState(false);

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

  useEffect(() => {
    if (catalogBooks.length > 0) {
      setLoading(false);
    }
  }, [catalogBooks]);

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

  const handleCoverImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      Swal.fire('Hata!', 'Sadece JPG ve PNG dosyaları yüklenebilir.', 'error');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      Swal.fire('Hata!', 'Dosya boyutu 2MB\'dan küçük olmalıdır.', 'error');
      return;
    }

    setUploadingCover(true);
    try {
      const timestamp = Date.now();
      const storageRef = ref(storage, `bookCovers/${timestamp}_${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      
      setNewBook(prev => ({ ...prev, coverImage: downloadURL }));
      Swal.fire('Başarılı!', 'Kapak resmi yüklendi.', 'success');
    } catch (error) {
      console.error('Kapak resmi yükleme hatası:', error);
      Swal.fire('Hata!', 'Kapak resmi yüklenirken bir hata oluştu.', 'error');
    } finally {
      setUploadingCover(false);
    }
  };

  const fetchBookDataFromISBN = async (isbn: string) => {
    setApiMessage('Kitap verileri aranıyor...');
    try {
      const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.items && data.items.length > 0) {
        const volumeInfo = data.items[0].volumeInfo;
        
        setNewBook(prev => ({
          ...prev,
          title: volumeInfo.title || prev.title,
          author: volumeInfo.authors ? volumeInfo.authors.join(', ') : prev.author,
          publisher: volumeInfo.publisher || prev.publisher,
          pageCount: volumeInfo.pageCount || prev.pageCount,
          coverImage: volumeInfo.imageLinks?.thumbnail?.replace('http:', 'https:') || volumeInfo.imageLinks?.smallThumbnail?.replace('http:', 'https:') || prev.coverImage,
          backCover: volumeInfo.description || prev.backCover,
          category: volumeInfo.categories ? volumeInfo.categories[0] : prev.category
        }));
        setApiMessage('✓ Kitap bilgileri başarıyla bulundu ve forma eklendi!');
      } else {
        setApiMessage('Bu ISBN ile kitap bulunamadı. Lütfen bilgileri manuel girin.');
      }
    } catch (error) {
      console.error("Error fetching book data:", error);
      setApiMessage('Kitap bilgileri alınamadı. Lütfen bilgileri manuel girin.');
    }
  };

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Zorunlu alanları kontrol et
    if (!newBook.title || !newBook.author || !newBook.category || !newBook.coverImage) {
      Swal.fire({
        icon: 'warning',
        title: 'Eksik Bilgi',
        text: 'Lütfen tüm zorunlu alanları doldurun: Başlık, Yazar, Kategori, Kapak Resmi'
      });
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
      const booksQuery = isSuperAdmin ? booksCollectionRefFresh : query(booksCollectionRefFresh, where('campusId', '==', campusId));
      const querySnapshot = await getDocs(booksQuery);
      const booksData = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Book[];
      setCatalogBooks(booksData);
      refetchAllBooks();
      Swal.fire({
        icon: 'success',
        title: 'Başarılı!',
        text: 'Kitap başarıyla eklendi!',
        timer: 2000
      });
    } catch (error) {
      console.error('Error adding book:', error);
      Swal.fire({
        icon: 'error',
        title: 'Hata!',
        text: 'Kitap eklenirken bir hata oluştu.'
      });
    }
  };

  const handleEditBook = (book: Book) => {
    setSelectedBookToEdit(book);
    setShowEditBookModal(true);
  };

  const handleDeleteBook = async (bookId: string) => {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Emin misiniz?',
      text: 'Bu kitabı silmek istediğinizden emin misiniz?',
      showCancelButton: true,
      confirmButtonText: 'Evet, Sil',
      cancelButtonText: 'İptal',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6'
    });
    
    if (result.isConfirmed) {
      try {
        await deleteDoc(doc(db, 'books', bookId));
        setCatalogBooks(prev => prev.filter(b => b.id !== bookId));
        refetchAllBooks();
        Swal.fire({
          icon: 'success',
          title: 'Silindi!',
          text: 'Kitap başarıyla silindi.',
          timer: 2000
        });
      } catch (error) {
        console.error('Error deleting book: ', error);
        Swal.fire({
          icon: 'error',
          title: 'Hata!',
          text: 'Kitap silinirken bir hata oluştu.'
        });
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
      Swal.fire({
        icon: 'success',
        title: 'Başarılı!',
        text: 'Kitap başarıyla güncellendi.',
        timer: 2000
      });
    } catch (error) {
      console.error('Error saving book: ', error);
      Swal.fire({
        icon: 'error',
        title: 'Hata!',
        text: 'Kitap güncellenirken bir hata oluştu.'
      });
    }
  };

  const handleBulkDelete = async () => {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Emin misiniz?',
      text: `Seçilen ${selectedBookIds.length} kitabı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`,
      showCancelButton: true,
      confirmButtonText: 'Evet, Sil',
      cancelButtonText: 'İptal',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6'
    });
    
    if (result.isConfirmed) {
      try {
        const deletePromises = selectedBookIds.map(bookId => deleteDoc(doc(db, 'books', bookId)));
        await Promise.all(deletePromises);
        setCatalogBooks(prev => prev.filter(b => !selectedBookIds.includes(b.id)));
        setSelectedBookIds([]);
        refetchAllBooks();
        Swal.fire({
          icon: 'success',
          title: 'Silindi!',
          text: `${selectedBookIds.length} kitap başarıyla silindi.`,
          timer: 2000
        });
      } catch (error) {
        console.error('Error bulk deleting books: ', error);
        Swal.fire({
          icon: 'error',
          title: 'Hata!',
          text: 'Kitaplar silinirken bir hata oluştu.'
        });
      }
    }
  };

  const handleBulkMarkAsLost = async () => {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Emin misiniz?',
      text: `Seçilen ${selectedBookIds.length} kitabı kayıp olarak işaretlemek istediğinizden emin misiniz?`,
      showCancelButton: true,
      confirmButtonText: 'Evet, İşaretle',
      cancelButtonText: 'İptal',
      confirmButtonColor: '#f59e0b',
      cancelButtonColor: '#3085d6'
    });
    
    if (result.isConfirmed) {
      try {
        const markAsLostPromises = selectedBookIds.map(bookId => markBookAsLost(bookId));
        await Promise.all(markAsLostPromises);
        setSelectedBookIds([]);
        refetchAllBooks();
        Swal.fire({
          icon: 'success',
          title: 'İşaretlendi!',
          text: `${selectedBookIds.length} kitap başarıyla kayıp olarak işaretlendi.`,
          timer: 2000
        });
      } catch (error) {
        console.error('Error bulk marking books as lost: ', error);
        Swal.fire({
          icon: 'error',
          title: 'Hata!',
          text: 'Kitaplar kayıp olarak işaretlenirken bir hata oluştu.'
        });
      }
    }
  };

  const handleBulkLend = () => {
    Swal.fire({
      icon: 'info',
      title: 'Bilgi',
      text: 'Toplu ödünç verme işlemi henüz uygulanmamıştır.'
    });
  };

  const handleBulkEdit = () => {
    const selectedBooks = catalogBooks.filter(b => selectedBookIds.includes(b.id));
    const firstTitle = selectedBooks[0]?.title;
    const allSameTitle = selectedBooks.every(b => b.title === firstTitle);
    
    if (!allSameTitle) {
      Swal.fire({
        icon: 'warning',
        title: 'Uyarı',
        text: 'Toplu düzenleme için seçilen tüm kitapların başlığı aynı olmalıdır.'
      });
      return;
    }
    
    if (selectedBooks.length < 2) {
      Swal.fire({
        icon: 'warning',
        title: 'Uyarı',
        text: 'Toplu düzenleme için en az 2 kitap seçmelisiniz.'
      });
      return;
    }
    
    if (selectedBooks.length > 3) {
      Swal.fire({
        icon: 'warning',
        title: 'Uyarı',
        text: 'Toplu düzenleme için maksimum 3 kitap seçebilirsiniz.'
      });
      return;
    }
    
    setShowBulkEditModal(true);
  };

  const handleGenerateDescription = async () => {
    if (!newBook.title || !newBook.author) {
      Swal.fire({
        icon: 'warning',
        title: 'Eksik Bilgi',
        text: 'Açıklama oluşturmak için kitap başlığı ve yazar bilgisi gerekli.'
      });
      return;
    }

    setGeneratingDescription(true);
    try {
      const generateBookDescription = httpsCallable(functions, 'generateBookDescription');
      const result: any = await generateBookDescription({
        title: newBook.title,
        author: newBook.author
      });

      setNewBook(prev => ({ ...prev, backCover: result.data.description }));
      Swal.fire({
        icon: 'success',
        title: 'Başarılı!',
        text: `Açıklama AI tarafından oluşturuldu. Kalan hakkınız: ${result.data.remaining}/10`,
        timer: 3000
      });
    } catch (error: any) {
      console.error('Error generating description:', error);
      const errorMessage = error?.message || 'Açıklama oluşturulurken bir hata oluştu.';
      Swal.fire({
        icon: 'error',
        title: 'Hata!',
        text: errorMessage
      });
    } finally {
      setGeneratingDescription(false);
    }
  };

  const handleExportToExcel = () => {
    try {
      const exportData = catalogBooks.map(book => ({
        'Kitap ID': book.id,
        'Başlık': book.title,
        'Yazar': book.author,
        'ISBN': book.isbn || '',
        'Kategori': book.category,
        'Yayıncı': book.publisher || '',
        'Konum': book.location || '',
        'Sayfa Sayısı': book.pageCount || '',
        'Durum': getBookStatus(book.id) === 'available' ? 'Müsait' : getBookStatus(book.id) === 'borrowed' ? 'Ödünç Verildi' : 'Kayıp',
        'Etiketler': Array.isArray(book.tags) ? book.tags.join(', ') : '',
        'Eklenme Tarihi': book.addedDate || ''
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Kitaplar');
      
      const fileName = `kutuphane-katalog-${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);

      Swal.fire({
        icon: 'success',
        title: 'Başarılı!',
        text: `${catalogBooks.length} kitap Excel'e aktarıldı.`,
        timer: 2000
      });
    } catch (error) {
      console.error('Excel dışa aktarma hatası:', error);
      Swal.fire({
        icon: 'error',
        title: 'Hata!',
        text: 'Excel dosyası oluşturulurken bir hata oluştu.'
      });
    }
  };

  const handleBulkEditSave = async (updatedFields: Partial<Book>) => {
    const result = await Swal.fire({
      icon: 'question',
      title: 'Emin misiniz?',
      text: `Seçilen ${selectedBookIds.length} kitabı güncellemek istediğinizden emin misiniz?`,
      showCancelButton: true,
      confirmButtonText: 'Evet, Güncelle',
      cancelButtonText: 'İptal',
      confirmButtonColor: '#6366f1',
      cancelButtonColor: '#3085d6'
    });
    
    if (result.isConfirmed) {
      try {
        const updatePromises = selectedBookIds.map(bookId => {
          const bookRef = doc(db, 'books', bookId);
          return updateDoc(bookRef, { ...updatedFields });
        });
        await Promise.all(updatePromises);
        setCatalogBooks(prev => prev.map(b => 
          selectedBookIds.includes(b.id) ? { ...b, ...updatedFields } : b
        ));
        setSelectedBookIds([]);
        setShowBulkEditModal(false);
        refetchAllBooks();
        Swal.fire({
          icon: 'success',
          title: 'Güncellendi!',
          text: `${selectedBookIds.length} kitap başarıyla güncellendi.`,
          timer: 2000
        });
      } catch (error) {
        console.error('Error bulk editing books: ', error);
        Swal.fire({
          icon: 'error',
          title: 'Hata!',
          text: 'Kitaplar güncellenirken bir hata oluştu.'
        });
      }
    }
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 py-8 px-4">
    <div className="max-w-7xl mx-auto">
    <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg overflow-hidden border border-white/20">
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center">
            <BookIcon className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-indigo-600" />
            Katalog Yönetimi
          </h2>
          <div className="flex flex-wrap gap-2 sm:space-x-3">
            <button
              onClick={() => { setQuickBorrowBookId(undefined); setShowQuickBorrow(true); }}
              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:shadow-lg transition-all flex items-center text-sm min-h-[44px] shadow-md hover:scale-105 justify-center touch-manipulation font-bold"
            >
              <Zap className="w-4 h-4 mr-2" />
              Hızlı Ödünç
            </button>
            <button
              onClick={() => setShowAddBookModal(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all flex items-center text-sm min-h-[44px] shadow-md hover:shadow-lg hover:scale-105 justify-center touch-manipulation"
            >
              <Plus className="w-4 h-4 mr-2" />
              Yeni Kitap Ekle
            </button>
            <button
              onClick={() => setShowBulkAddModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all flex items-center text-sm min-h-[44px] shadow-md hover:shadow-lg hover:scale-105 justify-center touch-manipulation"
            >
              <Plus className="w-4 h-4 mr-2" />
              Toplu Kitap Ekle
            </button>
            <button
              onClick={handleExportToExcel}
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all flex items-center text-sm min-h-[44px] shadow-md hover:shadow-lg hover:scale-105 justify-center touch-manipulation"
            >
              <Download className="w-4 h-4 mr-2" />
              Toplu Dışa Aktar
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">


        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
          <aside className={`fixed lg:sticky top-0 left-0 h-screen lg:h-auto w-full lg:w-64 bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg p-4 sm:p-6 flex-shrink-0 border border-white/20 z-50 transition-transform duration-300 ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}>
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <h2 className="text-base sm:text-lg font-semibold flex items-center">
                <Filter className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-indigo-600" />
                Filtreler
              </h2>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="lg:hidden text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4 sm:mb-6">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Kitap ara..."
                  value={catalogSearchQuery}
                  onChange={(e) => setCatalogSearchQuery(e.target.value)}
                  className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <Search className="absolute left-2.5 sm:left-3 top-2.5 text-gray-400" size={14} />
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Etiket Ara</h3>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Etiket..."
                    value={catalogTagQuery}
                    onChange={(e) => setCatalogTagQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <Search className="absolute left-2.5 top-2.5 text-gray-400" size={16} />
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Kategori</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <input
                      type="radio"
                      name="category"
                      checked={catalogCategoryFilter === 'all'}
                      onChange={() => setCatalogCategoryFilter('all')}
                      className="mr-2"
                    />
                    <span className="text-sm">Tümü</span>
                  </label>
                  {categories.map(category => (
                    <label key={category} className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input
                        type="radio"
                        name="category"
                        checked={catalogCategoryFilter === category}
                        onChange={() => setCatalogCategoryFilter(category)}
                        className="mr-2"
                      />
                      <span className="text-sm">{category}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Durum</h3>
                <div className="space-y-2">
                  <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <input
                      type="radio"
                      name="status"
                      checked={catalogStatusFilter === 'all'}
                      onChange={() => setCatalogStatusFilter('all')}
                      className="mr-2"
                    />
                    <span className="text-sm">Tümü</span>
                  </label>
                  <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <input
                      type="radio"
                      name="status"
                      checked={catalogStatusFilter === 'available'}
                      onChange={() => setCatalogStatusFilter('available')}
                      className="mr-2"
                    />
                    <span className="text-sm text-green-600">● Müsait</span>
                  </label>
                  <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <input
                      type="radio"
                      name="status"
                      checked={catalogStatusFilter === 'borrowed'}
                      onChange={() => setCatalogStatusFilter('borrowed')}
                      className="mr-2"
                    />
                    <span className="text-sm text-orange-600">● Ödünç Verilmiş</span>
                  </label>
                  <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <input
                      type="radio"
                      name="status"
                      checked={catalogStatusFilter === 'lost'}
                      onChange={() => setCatalogStatusFilter('lost')}
                      className="mr-2"
                    />
                    <span className="text-sm text-red-600">● Kayıp</span>
                  </label>
                </div>
              </div>
            </div>
          </aside>

          <div className="flex-1">
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
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <button
              onClick={handleBulkEdit}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all flex items-center text-sm min-h-[44px] shadow-md hover:shadow-lg hover:scale-105 justify-center touch-manipulation"
            >
              <Edit className="w-4 h-4 mr-2" />
              Toplu Düzenle ({selectedBookIds.length})
            </button>
            <button
              onClick={handleBulkDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all flex items-center text-sm min-h-[44px] shadow-md hover:shadow-lg hover:scale-105 justify-center touch-manipulation"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Seçilenleri Sil ({selectedBookIds.length})
            </button>
            <button
              onClick={handleBulkMarkAsLost}
              className="px-4 py-2 bg-yellow-600 text-white rounded-xl hover:bg-yellow-700 transition-all flex items-center text-sm min-h-[44px] shadow-md hover:shadow-lg hover:scale-105 justify-center touch-manipulation"
            >
              <UserX className="w-4 h-4 mr-2" />
              Kayıp Olarak İşaretle ({selectedBookIds.length})
            </button>
            <button
              onClick={handleBulkLend}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all flex items-center text-sm min-h-[44px] shadow-md hover:shadow-lg hover:scale-105 justify-center touch-manipulation"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Ödünç Ver ({selectedBookIds.length})
            </button>
          </div>
        )}

            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg overflow-hidden animate-pulse border border-white/20">
                    <div className="w-full aspect-[2/3] bg-gradient-to-br from-gray-200 to-gray-300"></div>
                    <div className="p-4 space-y-3">
                      <div className="h-5 bg-gray-300 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-300 rounded w-1/2"></div>
                      <div className="h-4 bg-gray-300 rounded w-2/3"></div>
                      <div className="flex justify-between items-center mt-3">
                        <div className="h-6 bg-gray-300 rounded w-20"></div>
                        <div className="h-8 bg-gray-300 rounded w-24"></div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <div className="h-7 bg-gray-300 rounded w-20"></div>
                        <div className="h-7 bg-gray-300 rounded w-20"></div>
                        <div className="h-7 bg-gray-300 rounded w-16"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
          {currentBooks.map(book => {
            const bookStatus = getBookStatus(book.id);

            return (
              <div key={book.id} className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg overflow-hidden relative group transition-all duration-300 hover:scale-105 hover:shadow-2xl border border-white/20 hover:z-10">
                <div className="relative overflow-hidden aspect-[2/3]">
                  <div className="absolute top-2 left-2 z-10">
                    <input
                      type="checkbox"
                      className="form-checkbox h-5 w-5 text-indigo-600 bg-white/90 backdrop-blur-sm rounded shadow-md transition duration-150 ease-in-out"
                      checked={selectedBookIds.includes(book.id)}
                      onChange={(e) => handleSelectBook(book.id, e.target.checked)}
                    />
                  </div>
                  <div className="absolute top-2 right-2 z-10">
                    <span className={`px-2 py-1 rounded-lg text-xs font-bold shadow-md ${
                      bookStatus === 'lost'
                        ? 'bg-gradient-to-r from-red-500 to-pink-600 text-white'
                        : bookStatus === 'borrowed'
                        ? 'bg-gradient-to-r from-orange-400 to-red-500 text-white'
                        : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
                    }`}>
                      {bookStatus === 'lost' ? 'Kayıp' : bookStatus === 'borrowed' ? 'Ödünç Verildi' : 'Müsait'}
                    </span>
                  </div>
                  <img src={`https://us-central1-data-49543.cloudfunctions.net/imageProxy?url=${encodeURIComponent(book.coverImage)}`} alt={book.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-gray-900 text-sm line-clamp-2 mb-1">{book.title}</h3>
                  <p className="text-xs text-gray-600">{book.author}</p>
                  <p className="text-xs text-gray-500 mt-1">Konum: {book.location}</p>
                  {/* Varsayılan Butonlar */}
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handleEditBook(book)}
                      className="flex-1 px-3 py-2 bg-white/90 backdrop-blur-sm text-indigo-600 rounded-xl text-xs font-semibold shadow-md hover:bg-white transition-all flex items-center justify-center"
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Düzenle
                    </button>
                    <button
                      onClick={() => handleDeleteBook(book.id)}
                      className="flex-1 px-3 py-2 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-xl text-xs font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Sil
                    </button>
                  </div>
                  
                  {/* Hover Menü */}
                  <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 space-y-2">
                    {bookStatus === 'available' && (
                      <button
                        onClick={() => { setQuickBorrowBookId(book.id); setShowQuickBorrow(true); }}
                        className="w-full px-3 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl text-xs font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center"
                      >
                        <Zap className="w-3 h-3 mr-1" />
                        Hızlı Ödünç
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setSelectedBookToLend(book);
                        setShowLendBookModal(true);
                      }}
                      disabled={bookStatus !== 'available'}
                      className="w-full px-3 py-2 bg-white/90 backdrop-blur-sm text-blue-600 rounded-xl text-xs font-semibold shadow-md hover:bg-white transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <BookOpen className="w-3 h-3 mr-1" />
                      Ödünç Ver
                    </button>
                    {bookStatus === 'lost' ? (
                      <button
                        onClick={() => handleMarkAsFound(book.id)}
                        className="w-full px-3 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl text-xs font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center"
                      >
                        <UserCheck className="w-3 h-3 mr-1" />
                        Bulundu
                      </button>
                    ) : (
                      <button
                        onClick={() => handleMarkAsLost(book.id)}
                        className="w-full px-3 py-2 bg-gradient-to-r from-yellow-500 to-orange-600 text-white rounded-xl text-xs font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center"
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
            )
            }

            {/* Pagination Controls */}
            <div className="mt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2 font-semibold"
              >
                <Filter className="w-5 h-5" />
                Filtreler
              </button>
              {totalPages > 1 && (
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-6 py-2.5 bg-white/60 backdrop-blur-xl border border-white/20 rounded-xl text-gray-700 hover:bg-white/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg font-medium"
                  >
                    Önceki
                  </button>
                  <span className="px-4 py-2 bg-white/60 backdrop-blur-xl rounded-xl text-gray-700 font-semibold shadow-lg">
                    Sayfa {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-6 py-2.5 bg-white/60 backdrop-blur-xl border border-white/20 rounded-xl text-gray-700 hover:bg-white/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg font-medium"
                  >
                    Sonraki
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showAddBookModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-0">
          <div className="bg-gradient-to-br from-white to-indigo-50 w-full h-full overflow-y-auto flex flex-col">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 sm:p-6 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 backdrop-blur-sm p-2 rounded-full">
                  <BookIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white">Yeni Kitap Ekle</h3>
              </div>
              <button
                onClick={() => {
                  setShowAddBookModal(false);
                  setIsScanning(false);
                  setApiMessage(null);
                }}
                className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-full transition-all"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
            <div className="p-4 sm:p-6 overflow-y-auto">
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
            
            <form onSubmit={handleAddBook} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {apiMessage && (
                <div className="md:col-span-2 text-center p-3 rounded-lg bg-blue-100 text-blue-800 text-sm">
                  {apiMessage}
                </div>
              )}
              
              <div>
                <label htmlFor="id" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Kitap ID</label>
                <input
                  type="text"
                  id="id"
                  name="id"
                  value={newBook.id}
                  onChange={handleNewBookChange}
                  className="block w-full border-2 border-gray-300 rounded-xl shadow-sm py-2 sm:py-2.5 px-3 sm:px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base transition-all"
                  placeholder="Örn: TR-HK-001"
                />
              </div>
              
              <div>
                <label htmlFor="title" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">
                  Kitap Adı <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={newBook.title}
                  onChange={handleNewBookChange}
                  className="block w-full border-2 border-gray-300 rounded-xl shadow-sm py-2 sm:py-2.5 px-3 sm:px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base transition-all"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="author" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">
                  Yazar <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="author"
                  name="author"
                  value={newBook.author}
                  onChange={handleNewBookChange}
                  className="block w-full border-2 border-gray-300 rounded-xl shadow-sm py-2 sm:py-2.5 px-3 sm:px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base transition-all"
                  required
                />
              </div>
              
              <div className="md:col-span-2">
                <label htmlFor="isbn" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">ISBN</label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <input
                    type="text"
                    id="isbn"
                    name="isbn"
                    value={newBook.isbn}
                    onChange={handleNewBookChange}
                    className="flex-1 block w-full min-w-0 rounded-none rounded-l-xl border-2 border-gray-300 py-2 sm:py-2.5 px-3 sm:px-4 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base transition-all"
                    placeholder="Manuel ISBN girişi"
                  />
                  <button
                    type="button"
                    onClick={() => setIsScanning(true)}
                    className="inline-flex items-center px-3 sm:px-4 rounded-r-xl border-2 border-l-0 border-gray-300 bg-gray-50 text-gray-500 hover:bg-gray-100 text-xs sm:text-sm font-semibold transition-all"
                  >
                    ISBN Tara
                  </button>
                </div>
                {newBook.isbn && (
                  <button
                    type="button"
                    onClick={() => fetchBookDataFromISBN(newBook.isbn)}
                    className="mt-2 px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg text-xs sm:text-sm font-semibold hover:bg-indigo-200 transition-colors"
                  >
                    Bu ISBN ile Kitap Bilgilerini Getir
                  </button>
                )}
              </div>
              
              <div>
                <label htmlFor="category" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">
                  Kategori <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="category"
                  name="category"
                  value={newBook.category}
                  onChange={handleNewBookChange}
                  className="block w-full border-2 border-gray-300 rounded-xl shadow-sm py-2 sm:py-2.5 px-3 sm:px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base transition-all"
                  placeholder="Örn: TR-HK, D-RMN"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="publisher" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Yayıncı</label>
                <input
                  type="text"
                  id="publisher"
                  name="publisher"
                  value={newBook.publisher}
                  onChange={handleNewBookChange}
                  className="block w-full border-2 border-gray-300 rounded-xl shadow-sm py-2 sm:py-2.5 px-3 sm:px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base transition-all"
                />
              </div>
              
              <div>
                <label htmlFor="location" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Konum</label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={newBook.location}
                  onChange={handleNewBookChange}
                  className="block w-full border-2 border-gray-300 rounded-xl shadow-sm py-2 sm:py-2.5 px-3 sm:px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base transition-all"
                  placeholder="Örn: A-1-15"
                />
              </div>
              
              <div>
                <label htmlFor="pageCount" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Sayfa Sayısı</label>
                <input
                  type="number"
                  id="pageCount"
                  name="pageCount"
                  value={newBook.pageCount}
                  onChange={handleNewBookChange}
                  className="block w-full border-2 border-gray-300 rounded-xl shadow-sm py-2 sm:py-2.5 px-3 sm:px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base transition-all"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">
                  Kapak Resmi <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handleCoverImageUpload}
                  disabled={uploadingCover}
                  className="block w-full border-2 border-gray-300 rounded-xl shadow-sm py-2 sm:py-2.5 px-3 sm:px-4 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm sm:text-base file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 disabled:opacity-50"
                />
                <p className="text-xs text-gray-500 mt-1">JPG veya PNG, maksimum 2MB</p>
                {newBook.coverImage && (
                  <div className="mt-2">
                    <img src={newBook.coverImage} alt="Önizleme" className="w-24 h-32 object-cover rounded-lg" />
                  </div>
                )}
              </div>
              
              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="backCover" className="block text-xs sm:text-sm font-semibold text-gray-700">Arka Kapak Açıklaması</label>
                  <button
                    type="button"
                    onClick={handleGenerateDescription}
                    disabled={generatingDescription}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {generatingDescription ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Oluşturuluyor...
                      </>
                    ) : (
                      <>
                        <Lightbulb className="w-3 h-3" />
                        AI ile Oluştur
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  id="backCover"
                  name="backCover"
                  value={newBook.backCover}
                  onChange={handleNewBookChange}
                  rows={3}
                  className="block w-full border-2 border-gray-300 rounded-xl shadow-sm py-2 sm:py-2.5 px-3 sm:px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base transition-all"
                />
              </div>
              
              <div>
                <label htmlFor="dimensions" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Boyut</label>
                <input
                  type="text"
                  id="dimensions"
                  name="dimensions"
                  value={newBook.dimensions}
                  onChange={handleNewBookChange}
                  placeholder="örn: 20x13 cm"
                  className="block w-full border-2 border-gray-300 rounded-xl shadow-sm py-2 sm:py-2.5 px-3 sm:px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base transition-all"
                />
              </div>
              
              <div>
                <label htmlFor="weight" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Ağırlık</label>
                <input
                  type="text"
                  id="weight"
                  name="weight"
                  value={newBook.weight}
                  onChange={handleNewBookChange}
                  placeholder="örn: 250g"
                  className="block w-full border-2 border-gray-300 rounded-xl shadow-sm py-2 sm:py-2.5 px-3 sm:px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base transition-all"
                />
              </div>
              
              <div>
                <label htmlFor="binding" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Cilt Türü</label>
                <input
                  type="text"
                  id="binding"
                  name="binding"
                  value={newBook.binding}
                  onChange={handleNewBookChange}
                  placeholder="örn: Karton Kapak"
                  className="block w-full border-2 border-gray-300 rounded-xl shadow-sm py-2 sm:py-2.5 px-3 sm:px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base transition-all"
                />
              </div>
              
              <div className="md:col-span-2">
                <label htmlFor="tags" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Etiketler (virgülle ayırın)</label>
                <input
                  type="text"
                  id="tags"
                  name="tags"
                  value={newBook.tags}
                  onChange={handleNewBookChange}
                  placeholder="örn: macera, gençlik, fantastik"
                  className="block w-full border-2 border-gray-300 rounded-xl shadow-sm py-2 sm:py-2.5 px-3 sm:px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base transition-all"
                />
              </div>
            </form>
            </div>
            <div className="p-4 sm:p-6 border-t border-gray-200 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 bg-gradient-to-t from-white to-transparent">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddBookModal(false);
                    setIsScanning(false);
                    setApiMessage(null);
                  }}
                  className="w-full sm:w-auto px-4 py-2 text-gray-700 bg-white border-2 border-gray-300 hover:bg-gray-50 rounded-xl transition-all font-semibold text-sm min-h-[44px] flex items-center justify-center shadow-md hover:shadow-lg hover:scale-105 touch-manipulation"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  onClick={handleAddBook}
                  className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all font-semibold shadow-md hover:shadow-lg text-sm min-h-[44px] flex items-center justify-center hover:scale-105 touch-manipulation"
                >
                  Kitabı Ekle
                </button>
            </div>
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
              Swal.fire({
                icon: 'success',
                title: 'Başarılı!',
                text: `'${selectedBookToLend.title}' başarıyla ${lentToUser ? lentToUser.displayName : userId} kullanıcısına ödünç verildi.`,
                timer: 2000
              });
              refetchAllBooks();
            } catch (error) {
              console.error('Error lending book:', error);
              Swal.fire({
                icon: 'error',
                title: 'Hata!',
                text: `Kitap ödünç verilirken bir hata oluştu: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`
              });
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

      {showBulkEditModal && (
        <BulkEditBookModal
          isOpen={showBulkEditModal}
          onClose={() => setShowBulkEditModal(false)}
          books={catalogBooks.filter(b => selectedBookIds.includes(b.id))}
          onSave={handleBulkEditSave}
        />
      )}

      {showQuickBorrow && (
        <QuickBorrowModal
          isOpen={showQuickBorrow}
          onClose={() => { setShowQuickBorrow(false); setQuickBorrowBookId(undefined); }}
          preSelectedBookId={quickBorrowBookId}
        />
      )}
    </div>
    </div>
    </div>
  );
};

export default AdminCatalogTab;
