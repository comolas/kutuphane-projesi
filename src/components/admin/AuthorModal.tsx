import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface Author {
  id?: string;
  name: string;
  biography: string;
  image: string;
  tags: string[];
  featured?: boolean;
}

interface AuthorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (author: Author) => void;
  authorToEdit: Author | null;
}

const AuthorModal: React.FC<AuthorModalProps> = ({ isOpen, onClose, onSave, authorToEdit }) => {
  const [author, setAuthor] = useState<Author>({ name: '', biography: '', image: '', tags: [] });
  const [error, setError] = useState('');

  useEffect(() => {
    if (authorToEdit) {
      setAuthor(authorToEdit);
    } else {
      setAuthor({ name: '', biography: '', image: '', tags: [] });
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
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">
            {authorToEdit ? 'Yazarı Düzenle' : 'Yeni Yazar Ekle'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Yazar Adı</label>
            <input
              type="text"
              id="name"
              name="name"
              value={author.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="image" className="block text-sm font-medium text-gray-700 mb-1">Görsel URL</label>
            <input
              type="text"
              id="image"
              name="image"
              value={author.image}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="biography" className="block text-sm font-medium text-gray-700 mb-1">Biyografi</label>
            <textarea
              id="biography"
              name="biography"
              rows={6}
              value={author.biography}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">Etiketler (virgülle ayırın)</label>
            <input
              type="text"
              id="tags"
              name="tags"
              value={Array.isArray(author.tags) ? author.tags.join(', ') : ''}
              onChange={handleTagsChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            İptal
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthorModal;
