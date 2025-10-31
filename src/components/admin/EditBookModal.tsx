import React, { useState, useEffect, useCallback } from 'react';
import { X, BookOpen, Lightbulb, Loader2 } from 'lucide-react';
import { Book } from '../../types';
import { Html5Qrcode, Html5QrcodeScanType } from 'html5-qrcode';
import { httpsCallable } from 'firebase/functions';
import { functions, storage } from '../../firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Swal from 'sweetalert2';

interface EditBookModalProps {
  isOpen: boolean;
  book: Book | null;
  onClose: () => void;
  onSave: (book: Book) => void;
}

const EditBookModal: React.FC<EditBookModalProps> = ({ isOpen, book, onClose, onSave }) => {
  const [editableBook, setEditableBook] = useState<Book | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [apiMessage, setApiMessage] = useState<string | null>(null);
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  useEffect(() => {
    if (book) {
      setEditableBook({ ...book });
    }
  }, [book]);

  const fetchBookData = useCallback(async (isbn: string) => {
    setApiMessage('Kitap verileri aranıyor...');
    try {
      // Try multiple API endpoints for better reliability
      const apiUrls = [
        `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`,
        `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`,
        `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&maxResults=1`
      ];
      
      let bookData = null;
      let lastError = null;
      
      // Try Google Books API first
      try {
        const response = await fetch(apiUrls[0], {
          headers: {
            'Accept': 'application/json',
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
      const data = await response.json();
        
      if (data.items && data.items.length > 0) {
        const volumeInfo = data.items[0].volumeInfo;
        
        bookData = {
          title: volumeInfo.title || '',
          author: volumeInfo.authors ? volumeInfo.authors.join(', ') : '',
          publisher: volumeInfo.publisher || '',
          pageCount: volumeInfo.pageCount || undefined,
          dimensions: volumeInfo.dimensions ? `${volumeInfo.dimensions.height} x ${volumeInfo.dimensions.width}` : undefined,
          coverImage: volumeInfo.imageLinks?.thumbnail || volumeInfo.imageLinks?.smallThumbnail || '',
          backCover: volumeInfo.description || ''
        };
      }
      } catch (error) {
        lastError = error;
        console.warn('Google Books API failed, trying OpenLibrary...', error);
        
        // Try OpenLibrary API as fallback
        try {
          const response = await fetch(apiUrls[1]);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          const data = await response.json();
          const bookKey = `ISBN:${isbn}`;
          
          if (data[bookKey]) {
            const bookInfo = data[bookKey];
            bookData = {
              title: bookInfo.title || '',
              author: bookInfo.authors ? bookInfo.authors.map((a: any) => a.name).join(', ') : '',
              publisher: bookInfo.publishers ? bookInfo.publishers[0].name : '',
              pageCount: bookInfo.number_of_pages || undefined,
              coverImage: bookInfo.cover ? bookInfo.cover.medium || bookInfo.cover.small : '',
              backCover: bookInfo.notes || ''
            };
          }
        } catch (openLibError) {
          console.warn('OpenLibrary API also failed:', openLibError);
          lastError = openLibError;
        }
      }
      
      if (bookData) {
        setEditableBook(prev => ({
          ...prev!,
          title: bookData.title || prev?.title || '',
          author: bookData.author || prev?.author || '',
          publisher: bookData.publisher || prev?.publisher || '',
          pageCount: bookData.pageCount || prev?.pageCount || undefined,
          dimensions: bookData.dimensions || prev?.dimensions || undefined,
          coverImage: bookData.coverImage || prev?.coverImage || '',
          backCover: bookData.backCover || prev?.backCover || ''
        }));
        setApiMessage('Kitap bilgileri başarıyla bulundu ve forma eklendi!');
      } else {
        setApiMessage('Bu ISBN ile eşleşen bir kitap bulunamadı. Lütfen bilgileri manuel olarak girin.');
      }
    } catch (error) {
      console.error("Error fetching book data:", error);
      let errorMessage = 'Kitap bilgileri alınırken bir hata oluştu.';
      
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          errorMessage = 'İnternet bağlantısı sorunu. Lütfen bağlantınızı kontrol edin.';
        } else if (error.message.includes('403') || error.message.includes('429')) {
          errorMessage = 'API limiti aşıldı. Lütfen birkaç dakika sonra tekrar deneyin.';
        } else if (error.message.includes('404')) {
          errorMessage = 'Bu ISBN ile kitap bulunamadı. Manuel olarak bilgileri girebilirsiniz.';
        }
      }
      
      setApiMessage(errorMessage);
    }
  }, []);

  useEffect(() => {
    if (!isScanning) return;

    const scanner = new Html5Qrcode('reader');

    const onScanSuccess = (decodedText: string) => {
      setIsScanning(false);
      setEditableBook(prev => prev ? { ...prev, isbn: decodedText } : null);
      fetchBookData(decodedText);
      scanner.stop().catch(err => console.error("Failed to stop scanner", err));
    };

    const onScanFailure = (error: string) => {
      // QR kod bulunamadığında sürekli hata mesajı vermemesi için sessiz geç
      // Sadece kritik hataları logla
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
            // Önce arka kamerayı dene, yoksa ön kamerayı kullan
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
  }, [isScanning, fetchBookData]);

  if (!isOpen || !editableBook) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditableBook(prev => {
      if (!prev) return null;
      if (name === 'tags' || name === 'theme') {
        return { ...prev, [name]: value.split(',').map(item => item.trim()) };
      }
      return { ...prev, [name]: value };
    });
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
      
      setEditableBook(prev => prev ? { ...prev, coverImage: downloadURL } : null);
      Swal.fire('Başarılı!', 'Kapak resmi yüklendi.', 'success');
    } catch (error) {
      console.error('Kapak resmi yükleme hatası:', error);
      Swal.fire('Hata!', 'Kapak resmi yüklenirken bir hata oluştu.', 'error');
    } finally {
      setUploadingCover(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editableBook) {
      onSave(editableBook);
    }
  };

  const handleGenerateDescription = async () => {
    if (!editableBook?.title || !editableBook?.author) {
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
        title: editableBook.title,
        author: editableBook.author
      });

      setEditableBook(prev => prev ? { ...prev, backCover: result.data.description } : null);
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

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-0">
      <div className="bg-gradient-to-br from-white to-indigo-50 w-full h-full overflow-y-auto flex flex-col">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 sm:p-6 flex items-center justify-between sticky top-0 z-10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 backdrop-blur-sm p-2 rounded-full">
              <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white">Kitap Düzenle</h3>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-full transition-all min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>
        {isScanning && (
          <div className="p-4 sm:p-6 overflow-y-auto">
            <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 rounded-xl">
              <h4 className="font-bold text-blue-900 mb-2 text-sm sm:text-base">QR Kod Tarama İpuçları:</h4>
              <ul className="text-xs sm:text-sm text-blue-800 space-y-1">
                <li>• QR kodu kamera görüş alanının ortasına yerleştirin</li>
                <li>• Yeterli ışık olduğundan emin olun</li>
                <li>• Kamerayı QR koddan 10-30 cm uzakta tutun</li>
                <li>• QR kod net ve buruşuk olmadığından emin olun</li>
              </ul>
            </div>
            <div id="reader" className="rounded-xl overflow-hidden" style={{ width: '100%' }}></div>
            <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button 
                onClick={() => setIsScanning(false)} 
                className="flex-1 px-4 py-2 text-gray-700 bg-white border-2 border-gray-300 hover:bg-gray-50 rounded-xl transition-all font-semibold text-sm min-h-[44px] flex items-center justify-center shadow-md hover:shadow-lg hover:scale-105 touch-manipulation"
              >
                Taramayı İptal Et
              </button>
              <button 
                onClick={() => {
                  setIsScanning(false);
                  setTimeout(() => setIsScanning(true), 100);
                }} 
                className="flex-1 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all font-semibold text-sm shadow-md hover:shadow-lg min-h-[44px] flex items-center justify-center hover:scale-105 touch-manipulation"
              >
                Yeniden Başlat
              </button>
            </div>
          </div>
        )}
        <form onSubmit={handleSubmit} className={`p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 overflow-y-auto ${isScanning ? 'hidden' : ''}`}>
          {apiMessage && <div className="md:col-span-2 text-center p-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 text-blue-800 text-xs sm:text-sm font-medium">{apiMessage}</div>}
          <div>
            <label htmlFor="title" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Kitap Adı</label>
            <input
              type="text"
              id="title"
              name="title"
              value={editableBook.title || ''}
              onChange={handleChange}
              className="block w-full border-2 border-gray-300 rounded-xl shadow-sm py-2 sm:py-2.5 px-3 sm:px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base transition-all"
              required
            />
          </div>
          <div>
            <label htmlFor="author" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Yazar</label>
            <input
              type="text"
              id="author"
              name="author"
              value={editableBook.author || ''}
              onChange={handleChange}
              className="block w-full border-2 border-gray-300 rounded-xl shadow-sm py-2 sm:py-2.5 px-3 sm:px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base transition-all"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="isbn" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">ISBN</label>
            <div className="flex rounded-xl shadow-sm overflow-hidden border-2 border-gray-300 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500 transition-all">
              <input
                type="text"
                id="isbn"
                name="isbn"
                value={editableBook.isbn || ''}
                onChange={handleChange}
                className="flex-1 block w-full min-w-0 border-0 py-2 sm:py-2.5 px-3 sm:px-4 focus:outline-none focus:ring-0 text-sm sm:text-base"
                placeholder="Manuel ISBN girişi"
              />
              <button
                type="button"
                onClick={() => setIsScanning(true)}
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all min-h-[44px] justify-center shadow-md hover:shadow-lg hover:scale-105 touch-manipulation"
              >
                ISBN Tara
              </button>
            </div>
          </div>
          
          <div>
            <label htmlFor="category" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Kategori</label>
            <input
              type="text"
              id="category"
              name="category"
              value={editableBook.category || ''}
              onChange={handleChange}
              className="block w-full border-2 border-gray-300 rounded-xl shadow-sm py-2 sm:py-2.5 px-3 sm:px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base transition-all"
              required
            />
          </div>
          <div>
            <label htmlFor="publisher" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Yayıncı</label>
            <input
              type="text"
              id="publisher"
              name="publisher"
              value={editableBook.publisher || ''}
              onChange={handleChange}
              className="block w-full border-2 border-gray-300 rounded-xl shadow-sm py-2 sm:py-2.5 px-3 sm:px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base transition-all"
              required
            />
          </div>
          <div>
            <label htmlFor="id" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">ID</label>
            <input
              type="text"
              id="id"
              name="id"
              value={editableBook.id || ''}
              onChange={handleChange}
              className="block w-full border-2 border-gray-300 rounded-xl shadow-sm py-2 sm:py-2.5 px-3 sm:px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base transition-all"
              required
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Kapak Resmi</label>
            <input
              type="file"
              accept="image/jpeg,image/png"
              onChange={handleCoverImageUpload}
              disabled={uploadingCover}
              className="block w-full border-2 border-gray-300 rounded-xl shadow-sm py-2 sm:py-2.5 px-3 sm:px-4 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm sm:text-base file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 disabled:opacity-50"
            />
            <p className="text-xs text-gray-500 mt-1">JPG veya PNG, maksimum 2MB</p>
            {editableBook.coverImage && (
              <div className="mt-2">
                <img src={editableBook.coverImage} alt="Önizleme" className="w-24 h-32 object-cover rounded-lg" />
              </div>
            )}
          </div>
          <div>
            <label htmlFor="location" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Konum</label>
            <input
              type="text"
              id="location"
              name="location"
              value={editableBook.location || ''}
              onChange={handleChange}
              className="block w-full border-2 border-gray-300 rounded-xl shadow-sm py-2 sm:py-2.5 px-3 sm:px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base transition-all"
              required
            />
          </div>
          <div>
            <label htmlFor="pageCount" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Sayfa Sayısı</label>
            <input
              type="number"
              id="pageCount"
              name="pageCount"
              value={editableBook.pageCount || ''}
              onChange={handleChange}
              className="block w-full border-2 border-gray-300 rounded-xl shadow-sm py-2 sm:py-2.5 px-3 sm:px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base transition-all"
            />
          </div>
          <div>
            <label htmlFor="status" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Durum</label>
            <select
              id="status"
              name="status"
              value={editableBook.status || ''}
              onChange={handleChange}
              className="block w-full border-2 border-gray-300 rounded-xl shadow-sm py-2 sm:py-2.5 px-3 sm:px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base transition-all"
            >
              <option value="available">Müsait</option>
              <option value="borrowed">Ödünç Verildi</option>
              <option value="lost">Kayıp</option>
            </select>
          </div>
          <div>
            <label htmlFor="dimensions" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Boyut</label>
            <input
              type="text"
              id="dimensions"
              name="dimensions"
              value={editableBook.dimensions || ''}
              onChange={handleChange}
              className="block w-full border-2 border-gray-300 rounded-xl shadow-sm py-2 sm:py-2.5 px-3 sm:px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base transition-all"
            />
          </div>
          <div>
            <label htmlFor="binding" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Cilt</label>
            <input
              type="text"
              id="binding"
              name="binding"
              value={editableBook.binding || ''}
              onChange={handleChange}
              className="block w-full border-2 border-gray-300 rounded-xl shadow-sm py-2 sm:py-2.5 px-3 sm:px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base transition-all"
            />
          </div>
          <div>
            <label htmlFor="weight" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Ağırlık</label>
            <input
              type="text"
              id="weight"
              name="weight"
              value={editableBook.weight || ''}
              onChange={handleChange}
              className="block w-full border-2 border-gray-300 rounded-xl shadow-sm py-2 sm:py-2.5 px-3 sm:px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base transition-all"
            />
          </div>
          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="backCover" className="block text-xs sm:text-sm font-semibold text-gray-700">Arka Kapak Yazısı</label>
              <button
                type="button"
                onClick={handleGenerateDescription}
                disabled={generatingDescription}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] shadow-md hover:shadow-lg hover:scale-105 touch-manipulation"
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
              rows={3}
              value={editableBook.backCover || ''}
              onChange={handleChange}
              className="block w-full border-2 border-gray-300 rounded-xl shadow-sm py-2 sm:py-2.5 px-3 sm:px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base transition-all resize-none"
            />
          </div>
          <div>
            <label htmlFor="addedDate" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Eklendiği Tarih</label>
            <input
              type="text"
              id="addedDate"
              name="addedDate"
              value={editableBook.addedDate ? new Date(editableBook.addedDate.seconds * 1000).toLocaleDateString() : ''}
              readOnly
              className="block w-full border-2 border-gray-200 rounded-xl shadow-sm py-2 sm:py-2.5 px-3 sm:px-4 bg-gray-50 text-gray-500 text-sm sm:text-base cursor-not-allowed"
            />
          </div>
          <div>
            <label htmlFor="mood" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Mood</label>
            <input
              type="text"
              id="mood"
              name="mood"
              value={editableBook.mood || ''}
              onChange={handleChange}
              className="block w-full border-2 border-gray-300 rounded-xl shadow-sm py-2 sm:py-2.5 px-3 sm:px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base transition-all"
            />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="theme" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Temalar (virgülle ayırın)</label>
            <input
              type="text"
              id="theme"
              name="theme"
              value={Array.isArray(editableBook.theme) ? editableBook.theme.join(', ') : ''}
              onChange={handleChange}
              className="block w-full border-2 border-gray-300 rounded-xl shadow-sm py-2 sm:py-2.5 px-3 sm:px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base transition-all"
            />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="tags" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Etiketler (virgülle ayırın)</label>
            <input
              type="text"
              id="tags"
              name="tags"
              value={Array.isArray(editableBook.tags) ? editableBook.tags.join(', ') : ''}
              onChange={handleChange}
              className="block w-full border-2 border-gray-300 rounded-xl shadow-sm py-2 sm:py-2.5 px-3 sm:px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base transition-all"
            />
          </div>
          <div className="md:col-span-2 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 sticky bottom-0 bg-gradient-to-t from-white via-white to-transparent pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 text-gray-700 bg-white border-2 border-gray-300 hover:bg-gray-50 rounded-xl transition-all text-sm font-semibold min-h-[44px] flex items-center justify-center shadow-md hover:shadow-lg hover:scale-105 touch-manipulation"
            >
              İptal
            </button>
            <button
              type="submit"
              className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all text-sm font-semibold shadow-md hover:shadow-lg min-h-[44px] flex items-center justify-center hover:scale-105 touch-manipulation"
            >
              Kaydet
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditBookModal;