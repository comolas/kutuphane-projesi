import React, { useState } from 'react';
import { Book } from '../../types';
import { X, BookIcon, Save, Lightbulb, Loader2 } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebase/config';
import Swal from 'sweetalert2';

interface BulkEditBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  books: Book[];
  onSave: (updatedFields: Partial<Book>) => void;
}

const BulkEditBookModal: React.FC<BulkEditBookModalProps> = ({ isOpen, onClose, books, onSave }) => {
  const [editedBook, setEditedBook] = useState<Partial<Book>>({
    title: books[0]?.title || '',
    author: books[0]?.author || '',
    publisher: books[0]?.publisher || '',
    category: books[0]?.category || '',
    coverImage: books[0]?.coverImage || '',
    backCover: books[0]?.backCover || '',
    pageCount: books[0]?.pageCount || 0,
    tags: books[0]?.tags || [],
    theme: books[0]?.theme || [],
    mood: books[0]?.mood || '',
    dimensions: books[0]?.dimensions || '',
    weight: books[0]?.weight || '',
    binding: books[0]?.binding || '',
  });
  const [generatingDescription, setGeneratingDescription] = useState(false);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setEditedBook(prev => ({ ...prev, [name]: type === 'number' ? Number(value) : value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(editedBook);
  };

  const handleGenerateDescription = async () => {
    if (!editedBook.title || !editedBook.author) {
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
        title: editedBook.title,
        author: editedBook.author
      });

      setEditedBook(prev => ({ ...prev, backCover: result.data.description }));
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-50 p-2 sm:p-4 overflow-y-auto">
      <div className="bg-gradient-to-br from-white to-indigo-50 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-hidden flex flex-col my-4 sm:my-8">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 sm:p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 backdrop-blur-sm p-2 rounded-full">
              <BookIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-white">Toplu Düzenleme</h3>
              <p className="text-white/80 text-xs sm:text-sm">{books.length} kitap düzenlenecek</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-full transition-all">
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto">
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>Düzenlenecek Kitaplar:</strong> {books.map(b => `${b.title} (${b.id})`).join(', ')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Başlık</label>
              <input type="text" name="title" value={editedBook.title} onChange={handleChange} className="block w-full border-2 border-gray-300 rounded-xl shadow-sm py-2 px-3 focus:ring-2 focus:ring-indigo-500 text-sm" />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Yazar</label>
              <input type="text" name="author" value={editedBook.author} onChange={handleChange} className="block w-full border-2 border-gray-300 rounded-xl shadow-sm py-2 px-3 focus:ring-2 focus:ring-indigo-500 text-sm" />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Yayınevi</label>
              <input type="text" name="publisher" value={editedBook.publisher} onChange={handleChange} className="block w-full border-2 border-gray-300 rounded-xl shadow-sm py-2 px-3 focus:ring-2 focus:ring-indigo-500 text-sm" />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Kategori</label>
              <input type="text" name="category" value={editedBook.category} onChange={handleChange} className="block w-full border-2 border-gray-300 rounded-xl shadow-sm py-2 px-3 focus:ring-2 focus:ring-indigo-500 text-sm" />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Kapak Resmi URL</label>
              <input type="url" name="coverImage" value={editedBook.coverImage} onChange={handleChange} className="block w-full border-2 border-gray-300 rounded-xl shadow-sm py-2 px-3 focus:ring-2 focus:ring-indigo-500 text-sm" />
            </div>

            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs sm:text-sm font-semibold text-gray-700">Arka Kapak Açıklaması</label>
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
              <textarea name="backCover" value={editedBook.backCover} onChange={handleChange} rows={3} className="block w-full border-2 border-gray-300 rounded-xl shadow-sm py-2 px-3 focus:ring-2 focus:ring-indigo-500 text-sm" />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Sayfa Sayısı</label>
              <input type="number" name="pageCount" value={editedBook.pageCount} onChange={handleChange} className="block w-full border-2 border-gray-300 rounded-xl shadow-sm py-2 px-3 focus:ring-2 focus:ring-indigo-500 text-sm" />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Boyut</label>
              <input type="text" name="dimensions" value={editedBook.dimensions} onChange={handleChange} placeholder="örn: 20x13 cm" className="block w-full border-2 border-gray-300 rounded-xl shadow-sm py-2 px-3 focus:ring-2 focus:ring-indigo-500 text-sm" />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Ağırlık</label>
              <input type="text" name="weight" value={editedBook.weight} onChange={handleChange} placeholder="örn: 250g" className="block w-full border-2 border-gray-300 rounded-xl shadow-sm py-2 px-3 focus:ring-2 focus:ring-indigo-500 text-sm" />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Cilt Türü</label>
              <input type="text" name="binding" value={editedBook.binding} onChange={handleChange} placeholder="örn: Karton Kapak" className="block w-full border-2 border-gray-300 rounded-xl shadow-sm py-2 px-3 focus:ring-2 focus:ring-indigo-500 text-sm" />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Mood</label>
              <input type="text" name="mood" value={editedBook.mood} onChange={handleChange} className="block w-full border-2 border-gray-300 rounded-xl shadow-sm py-2 px-3 focus:ring-2 focus:ring-indigo-500 text-sm" />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Etiketler (virgülle ayırın)</label>
              <input type="text" name="tags" value={Array.isArray(editedBook.tags) ? editedBook.tags.join(', ') : ''} onChange={(e) => setEditedBook(prev => ({ ...prev, tags: e.target.value.split(',').map(t => t.trim()) }))} placeholder="örn: macera, gençlik, fantastik" className="block w-full border-2 border-gray-300 rounded-xl shadow-sm py-2 px-3 focus:ring-2 focus:ring-indigo-500 text-sm" />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Temalar (virgülle ayırın)</label>
              <input type="text" name="theme" value={Array.isArray(editedBook.theme) ? editedBook.theme.join(', ') : ''} onChange={(e) => setEditedBook(prev => ({ ...prev, theme: e.target.value.split(',').map(t => t.trim()) }))} placeholder="örn: dostluk, cesaret" className="block w-full border-2 border-gray-300 rounded-xl shadow-sm py-2 px-3 focus:ring-2 focus:ring-indigo-500 text-sm" />
            </div>
          </form>
        </div>

        <div className="p-4 sm:p-6 border-t border-gray-200 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 bg-gradient-to-t from-white to-transparent">
          <button type="button" onClick={onClose} className="w-full sm:w-auto px-6 py-2.5 text-gray-700 bg-white border-2 border-gray-300 hover:bg-gray-50 rounded-xl transition-all font-semibold text-sm min-h-[44px]">
            İptal
          </button>
          <button type="submit" onClick={handleSubmit} className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all font-semibold shadow-lg text-sm min-h-[44px] flex items-center justify-center gap-2">
            <Save className="w-4 h-4" />
            Kaydet ({books.length} kitap)
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkEditBookModal;
