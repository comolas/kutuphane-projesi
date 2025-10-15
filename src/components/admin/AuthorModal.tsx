import React, { useState, useEffect } from 'react';
import { X, User, Image, FileText, Calendar, Tag } from 'lucide-react';
import { Author } from '../../types';

interface AuthorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (author: Author) => void;
  authorToEdit: Author | null;
}

const AuthorModal: React.FC<AuthorModalProps> = ({ isOpen, onClose, onSave, authorToEdit }) => {
  const [author, setAuthor] = useState<Author>({ id: '', name: '', biography: '', image: '', tags: [], featured: false, birthDate: '', deathDate: '' });
  const [error, setError] = useState('');

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

  const handleSave = () => {
    if (!author.name || !author.biography || !author.image) {
      setError('Tüm alanlar zorunludur.');
      return;
    }
    onSave(author);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-gradient-to-br from-white to-indigo-50 rounded-2xl sm:rounded-3xl shadow-2xl max-w-2xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 sm:p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 backdrop-blur-sm p-2 rounded-full">
              <User className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white">
              {authorToEdit ? 'Yazarı Düzenle' : 'Yeni Yazar Ekle'}
            </h3>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-full transition-all">
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
            <label htmlFor="image" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2"><Image className="w-4 h-4 text-indigo-600" />Görsel URL</label>
            <input
              type="text"
              id="image"
              name="image"
              value={author.image}
              onChange={handleChange}
              className="block w-full border-2 border-gray-300 rounded-xl shadow-sm py-2 sm:py-2.5 px-3 sm:px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base transition-all"
            />
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
            className="w-full sm:w-auto px-6 py-2.5 text-gray-700 bg-white border-2 border-gray-300 hover:bg-gray-50 rounded-xl transition-all font-semibold text-sm sm:text-base min-h-[44px]"
          >
            İptal
          </button>
          <button
            onClick={handleSave}
            className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all font-semibold shadow-lg text-sm sm:text-base min-h-[44px]"
          >
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthorModal;
