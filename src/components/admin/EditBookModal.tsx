import React, { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { Book } from '../../types';
import { Html5Qrcode, Html5QrcodeScanType } from 'html5-qrcode';

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editableBook) {
      onSave(editableBook);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-8xl w-full max-h-[100vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Kitap Düzenle</h3>
          <button
            onClick={onClose}
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
                onClick={() => setIsScanning(false)} 
                className="flex-1 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Taramayı İptal Et
              </button>
              <button 
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
        <form onSubmit={handleSubmit} className={`p-6 grid grid-cols-1 md:grid-cols-2 gap-4 ${isScanning ? 'hidden' : ''}`}>
          {apiMessage && <div className="md:col-span-2 text-center p-2 rounded-md bg-blue-100 text-blue-800">{apiMessage}</div>}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">Kitap Adı</label>
            <input
              type="text"
              id="title"
              name="title"
              value={editableBook.title || ''}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>
          <div>
            <label htmlFor="author" className="block text-sm font-medium text-gray-700">Yazar</label>
            <input
              type="text"
              id="author"
              name="author"
              value={editableBook.author || ''}
              onChange={handleChange}
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
                value={editableBook.isbn || ''}
                onChange={handleChange}
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
          </div>
          
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700">Kategori</label>
            <input
              type="text"
              id="category"
              name="category"
              value={editableBook.category || ''}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>
          <div>
            <label htmlFor="publisher" className="block text-sm font-medium text-gray-700">Yayıncı</label>
            <input
              type="text"
              id="publisher"
              name="publisher"
              value={editableBook.publisher || ''}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>
          <div>
            <label htmlFor="id" className="block text-sm font-medium text-gray-700">ID</label>
            <input
              type="text"
              id="id"
              name="id"
              value={editableBook.id || ''}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>
          <div>
            <label htmlFor="coverImage" className="block text-sm font-medium text-gray-700">Kapak Resmi URL</label>
            <input
              type="url"
              id="coverImage"
              name="coverImage"
              value={editableBook.coverImage || ''}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700">Konum</label>
            <input
              type="text"
              id="location"
              name="location"
              value={editableBook.location || ''}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>
          <div>
            <label htmlFor="pageCount" className="block text-sm font-medium text-gray-700">Sayfa Sayısı</label>
            <input
              type="number"
              id="pageCount"
              name="pageCount"
              value={editableBook.pageCount || ''}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">Durum</label>
            <select
              id="status"
              name="status"
              value={editableBook.status || ''}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="available">Müsait</option>
              <option value="borrowed">Ödünç Verildi</option>
              <option value="lost">Kayıp</option>
            </select>
          </div>
          <div>
            <label htmlFor="dimensions" className="block text-sm font-medium text-gray-700">Boyut</label>
            <input
              type="text"
              id="dimensions"
              name="dimensions"
              value={editableBook.dimensions || ''}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="binding" className="block text-sm font-medium text-gray-700">Cilt</label>
            <input
              type="text"
              id="binding"
              name="binding"
              value={editableBook.binding || ''}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="weight" className="block text-sm font-medium text-gray-700">Ağırlık</label>
            <input
              type="text"
              id="weight"
              name="weight"
              value={editableBook.weight || ''}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="backCover" className="block text-sm font-medium text-gray-700">Arka Kapak Yazısı</label>
            <textarea
              id="backCover"
              name="backCover"
              value={editableBook.backCover || ''}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="addedDate" className="block text-sm font-medium text-gray-700">Eklendiği Tarih</label>
            <input
              type="text"
              id="addedDate"
              name="addedDate"
              value={editableBook.addedDate ? new Date(editableBook.addedDate.seconds * 1000).toLocaleDateString() : ''}
              readOnly
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-100"
            />
          </div>
          <div>
            <label htmlFor="mood" className="block text-sm font-medium text-gray-700">Mood</label>
            <input
              type="text"
              id="mood"
              name="mood"
              value={editableBook.mood || ''}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="theme" className="block text-sm font-medium text-gray-700">Temalar (virgülle ayırın)</label>
            <input
              type="text"
              id="theme"
              name="theme"
              value={Array.isArray(editableBook.theme) ? editableBook.theme.join(', ') : ''}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="tags" className="block text-sm font-medium text-gray-700">Etiketler (virgülle ayırın)</label>
            <input
              type="text"
              id="tags"
              name="tags"
              value={Array.isArray(editableBook.tags) ? editableBook.tags.join(', ') : ''}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div className="md:col-span-2 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
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