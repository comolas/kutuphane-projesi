import React, { useState, useEffect } from 'react';
import { X, User, Image, FileText, Calendar, Tag } from 'lucide-react';
import { Author } from '../../types';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../firebase/config';
import Swal from 'sweetalert2';

interface AuthorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (author: Author) => void;
  authorToEdit: Author | null;
}

const AuthorModal: React.FC<AuthorModalProps> = ({ isOpen, onClose, onSave, authorToEdit }) => {
  const [author, setAuthor] = useState<Author>({ id: '', name: '', biography: '', image: '', tags: [], featured: false, birthDate: '', deathDate: '' });
  const [error, setError] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (authorToEdit) {
      setAuthor(authorToEdit);
    } else {
      setAuthor({ id: '', name: '', biography: '', image: '', tags: [], featured: false, birthDate: '', deathDate: '' });
    }
    setError('');
  }, [authorToEdit, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setAuthor(prev => ({ ...prev, [name]: value }));
  };

  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    const tags = value.split(',').map(tag => tag.trim());
    setAuthor(prev => ({ ...prev, tags }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setUploadingImage(true);
    try {
      const timestamp = Date.now();
      const storageRef = ref(storage, `authorImages/${timestamp}_${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      
      setAuthor(prev => ({ ...prev, image: downloadURL }));
      Swal.fire('Başarılı!', 'Görsel yüklendi.', 'success');
    } catch (error) {
      console.error('Görsel yükleme hatası:', error);
      Swal.fire('Hata!', 'Görsel yüklenirken bir hata oluştu.', 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = () => {
    if (!author.name || !author.biography || !author.image) {
      setError('Tüm alanlar zorunludur.');
      return;
    }
    onSave(author);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-0">
      <div className="bg-gradient-to-br from-white to-indigo-50 w-full h-full overflow-y-auto flex flex-col">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 sm:p-6 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 backdrop-blur-sm p-2 rounded-full">
              <User className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white">
              {authorToEdit ? 'Yazarı Düzenle' : 'Yeni Yazar Ekle'}
            </h3>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-full transition-all min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation">
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>
        <div className="p-4 sm:p-6 space-y-3 sm:space-y-4 overflow-y-auto">
          <div>
            <label htmlFor="name" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2"><User className="w-4 h-4 text-indigo-600" />Yazar Adı</label>
            <input
              type="text"
              id="name"
              name="name"
              value={author.name}
              onChange={handleChange}
              className="block w-full border-2 border-gray-300 rounded-xl shadow-sm py-2 sm:py-2.5 px-3 sm:px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base transition-all"
            />
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2"><Image className="w-4 h-4 text-indigo-600" />Yazar Görseli</label>
            <input
              type="file"
              accept="image/jpeg,image/png"
              onChange={handleImageUpload}
              disabled={uploadingImage}
              className="block w-full border-2 border-gray-300 rounded-xl shadow-sm py-2 sm:py-2.5 px-3 sm:px-4 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm sm:text-base file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 disabled:opacity-50"
            />
            <p className="text-xs text-gray-500 mt-1">JPG veya PNG, maksimum 2MB</p>
            {author.image && (
              <div className="mt-2">
                <img src={author.image} alt="Önizleme" className="w-24 h-24 object-cover rounded-lg" />
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label htmlFor="birthDate" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2"><Calendar className="w-4 h-4 text-indigo-600" />Doğum Tarihi</label>
              <input
                type="date"
                id="birthDate"
                name="birthDate"
                value={author.birthDate || ''}
                onChange={handleChange}
                className="block w-full border-2 border-gray-300 rounded-xl shadow-sm py-2 sm:py-2.5 px-3 sm:px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base transition-all"
              />
            </div>
            <div>
              <label htmlFor="deathDate" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2"><Calendar className="w-4 h-4 text-indigo-600" />Ölüm Tarihi</label>
              <input
                type="date"
                id="deathDate"
                name="deathDate"
                value={author.deathDate || ''}
                onChange={handleChange}
                className="block w-full border-2 border-gray-300 rounded-xl shadow-sm py-2 sm:py-2.5 px-3 sm:px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base transition-all"
              />
            </div>
          </div>
          <div>
            <label htmlFor="biography" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2"><FileText className="w-4 h-4 text-indigo-600" />Biyografi</label>
            <textarea
              id="biography"
              name="biography"
              rows={6}
              value={author.biography}
              onChange={handleChange}
              className="block w-full border-2 border-gray-300 rounded-xl shadow-sm py-2 sm:py-2.5 px-3 sm:px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base transition-all resize-none"
            />
          </div>
          <div>
            <label htmlFor="tags" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2"><Tag className="w-4 h-4 text-indigo-600" />Etiketler (virgülle ayırın)</label>
            <input
              type="text"
              id="tags"
              name="tags"
              value={Array.isArray(author.tags) ? author.tags.join(', ') : ''}
              onChange={handleTagsChange}
              className="block w-full border-2 border-gray-300 rounded-xl shadow-sm py-2 sm:py-2.5 px-3 sm:px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base transition-all"
            />
          </div>
          {error && <p className="text-xs sm:text-sm text-red-600 font-semibold bg-red-50 p-2 rounded-lg">{error}</p>}
        </div>
        <div className="p-4 sm:p-6 border-t border-gray-200 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 bg-gradient-to-t from-white to-transparent">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 text-gray-700 bg-white border-2 border-gray-300 hover:bg-gray-50 rounded-xl transition-all font-semibold text-sm min-h-[44px] flex items-center justify-center shadow-md hover:shadow-lg hover:scale-105 touch-manipulation"
          >
            İptal
          </button>
          <button
            onClick={handleSave}
            className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all font-semibold shadow-md hover:shadow-lg text-sm min-h-[44px] flex items-center justify-center hover:scale-105 touch-manipulation"
          >
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthorModal;
