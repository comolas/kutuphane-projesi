import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import Swal from 'sweetalert2';

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

  useEffect(() => {
    if (quoteToEdit) {
      setQuote(quoteToEdit);
    } else {
      setQuote({ text: '', author: '', book: '' });
    }
  }, [quoteToEdit, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setQuote(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    if (!quote.text || !quote.author || !quote.book) {
      Swal.fire('Hata!', 'Tüm alanlar zorunludur.', 'error');
      return;
    }
    onSave(quote);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-3 md:p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[95vh] overflow-y-auto">
        <div className="p-4 md:p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
          <h3 className="text-base md:text-lg font-medium text-gray-900">
            {quoteToEdit ? 'Alıntıyı Düzenle' : 'Yeni Alıntı Ekle'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        </div>
        <div className="p-4 md:p-6 space-y-3 md:space-y-4">
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
        </div>
        <div className="p-4 md:p-6 border-t border-gray-200 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 sticky bottom-0 bg-white">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm md:text-base"
          >
            İptal
          </button>
          <button
            onClick={handleSave}
            className="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm md:text-base"
          >
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuoteModal;