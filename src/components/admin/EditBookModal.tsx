import React, { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { Book } from '../../types';
import { Html5Qrcode } from 'html5-qrcode';

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
      const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
      const data = await response.json();
      if (data.items && data.items.length > 0) {
        const volumeInfo = data.items[0].volumeInfo;
        
        setEditableBook(prev => ({
          ...prev!,
          title: volumeInfo.title || prev?.title || '',
          author: volumeInfo.authors ? volumeInfo.authors.join(', ') : prev?.author || '',
          publisher: volumeInfo.publisher || prev?.publisher || '',
          pageCount: volumeInfo.pageCount || prev?.pageCount || undefined,
          dimensions: volumeInfo.dimensions ? `${volumeInfo.dimensions.height} x ${volumeInfo.dimensions.width}` : prev?.dimensions || undefined,
          coverImage: volumeInfo.imageLinks?.thumbnail || prev?.coverImage || ''
        }));
        setApiMessage('Kitap bilgileri başarıyla bulundu ve forma eklendi!');
      } else {
        setApiMessage('Bu ISBN ile eşleşen bir kitap bulunamadı.');
      }
    } catch (error) {
      console.error("Error fetching book data:", error);
      setApiMessage('Kitap bilgileri alınırken bir hata oluştu.');
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

    const onScanFailure = (error: string) => { console.error('Scan failed:', error); };

    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

    let cleanup = () => {};

    Html5Qrcode.getCameras().then(cameras => {
        if (cameras && cameras.length) {
            scanner.start({ facingMode: "environment" }, config, onScanSuccess, onScanFailure)
              .catch(err => console.error("Unable to start scanning", err));
            cleanup = () => {
                scanner.stop().catch(err => console.error("Failed to stop scanner on cleanup", err));
            };
        }
    }).catch(err => console.error("Error getting cameras", err));

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
            <div id="reader" style={{ width: '100%' }}></div>
            <button onClick={() => setIsScanning(false)} className="mt-4 w-full px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              Taramayı İptal Et
            </button>
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