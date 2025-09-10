import React, { useState } from 'react';
import { X, Star } from 'lucide-react';
import { Book } from '../../types';

interface BookDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: Book | null;
  onRate: (rating: number) => void;
}

const BookDetailsModal: React.FC<BookDetailsModalProps> = ({
  isOpen,
  onClose,
  book,
  onRate,
}) => {
  const [rating, setRating] = useState(0);
  if (!isOpen || !book) return null;

  const averageRating = book.ratings
    ? book.ratings.reduce((acc, rating) => acc + rating.rating, 0) / book.ratings.length
    : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">{book.title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-4">
          <div className="flex items-center mb-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-6 h-6 ${
                  averageRating >= star ? 'text-yellow-400' : 'text-gray-300'
                }`}
              />
            ))}
            <span className="ml-2 text-gray-600">
              {averageRating.toFixed(1)} ({book.ratings?.length || 0} ratings)
            </span>
          </div>
          <img
            src={book.coverImage}
            alt={book.title}
            className="w-full h-48 object-cover rounded-lg mb-4"
          />
          <p className="text-sm text-gray-700 whitespace-pre-line">{book.author}</p>
          <p className="text-sm text-gray-700 whitespace-pre-line">{book.publisher}</p>
          <p className="text-sm text-gray-700 whitespace-pre-line">{book.category}</p>
          <p className="text-sm text-gray-700 whitespace-pre-line">{book.location}</p>
          <div className="mt-4">
            <h4 className="text-md font-medium text-gray-900">Bu kitabı oyla</h4>
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} onClick={() => setRating(star)}>
                  <Star
                    className={`w-6 h-6 ${
                      rating >= star ? 'text-yellow-400' : 'text-gray-300'
                    } hover:text-yellow-400`}
                  />
                </button>
              ))}
            </div>
            <button
              onClick={() => onRate(rating)}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Gönder
            </button>
          </div>
        </div>
        <div className="p-6 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookDetailsModal;