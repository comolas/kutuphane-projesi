import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface Quote {
  id?: string;
  text: string;
  author: string;
  book: string;
}

interface QuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (quote: Quote) => void;
  quoteToEdit: Quote | null;
}

const QuoteModal: React.FC<QuoteModalProps> = ({ isOpen, onClose, onSave, quoteToEdit }) => {
  const [quote, setQuote] = useState<Quote>({ text: '', author: '', book: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    if (quoteToEdit) {
      setQuote(quoteToEdit);
    } else {
      setQuote({ text: '', author: '', book: '' });
    }
    setError(''); // Reset error on open
  }, [quoteToEdit, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setQuote(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    if (!quote.text || !quote.author || !quote.book) {
      setError('Tüm alanlar zorunludur.');
      return;
    }
    onSave(quote);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">
            {quoteToEdit ? 'Alıntıyı Düzenle' : 'Yeni Alıntı Ekle'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label htmlFor="text" className="block text-sm font-medium text-gray-700 mb-1">Alıntı Metni</label>
            <textarea
              id="text"
              name="text"
              rows={4}
              value={quote.text}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="author" className="block text-sm font-medium text-gray-700 mb-1">Yazar</label>
            <input
              type="text"
              id="author"
              name="author"
              value={quote.author}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="book" className="block text-sm font-medium text-gray-700 mb-1">Kitap</label>
            <input
              type="text"
              id="book"
              name="book"
              value={quote.book}
              onChange={handleChange}
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

export default QuoteModal;
