import React, { useState, useEffect } from 'react';
import { X, Quote as QuoteIcon, User, BookOpen } from 'lucide-react';
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-gradient-to-br from-white to-indigo-50 rounded-2xl sm:rounded-3xl shadow-2xl max-w-2xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 sm:p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 backdrop-blur-sm p-2 rounded-full">
              <QuoteIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white">
              {quoteToEdit ? 'Alıntıyı Düzenle' : 'Yeni Alıntı Ekle'}
            </h3>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-full transition-all">
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>
        <div className="p-4 sm:p-6 space-y-3 sm:space-y-4 overflow-y-auto">
          <div>
            <label htmlFor="text" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2"><QuoteIcon className="w-4 h-4 text-indigo-600" />Alıntı Metni</label>
            <textarea
              id="text"
              name="text"
              rows={4}
              value={quote.text}
              onChange={handleChange}
              className="block w-full border-2 border-gray-300 rounded-xl shadow-sm py-2 sm:py-2.5 px-3 sm:px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base transition-all resize-none"
            />
          </div>
          <div>
            <label htmlFor="author" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2"><User className="w-4 h-4 text-indigo-600" />Yazar</label>
            <input
              type="text"
              id="author"
              name="author"
              value={quote.author}
              onChange={handleChange}
              className="block w-full border-2 border-gray-300 rounded-xl shadow-sm py-2 sm:py-2.5 px-3 sm:px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base transition-all"
            />
          </div>
          <div>
            <label htmlFor="book" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2"><BookOpen className="w-4 h-4 text-indigo-600" />Kitap</label>
            <input
              type="text"
              id="book"
              name="book"
              value={quote.book}
              onChange={handleChange}
              className="block w-full border-2 border-gray-300 rounded-xl shadow-sm py-2 sm:py-2.5 px-3 sm:px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base transition-all"
            />
          </div>
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

export default QuoteModal;