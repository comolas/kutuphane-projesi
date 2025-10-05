import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { StoryCollection } from '../../types';
import { useBooks } from '../../contexts/BookContext';
import BookDetailsModal from '../common/BookDetailsModal';

interface StoryViewerProps {
  collection: StoryCollection;
  onClose: () => void;
}

const StoryViewer: React.FC<StoryViewerProps> = ({ collection, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const { allBooks } = useBooks();

  // Find the full book details from the allBooks context
  const hydratedBooks = collection.books.map(storyBook => {
    const bookDetails = allBooks.find(b => b.id === storyBook.bookId);
    return { ...bookDetails, blurb: storyBook.blurb };
  }).filter(b => b.id); // Filter out any books that might not have been found

  const goToNext = useCallback(() => {
    if (currentIndex < hydratedBooks.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onClose(); // Close when the last story is finished
    }
  }, [currentIndex, hydratedBooks.length, onClose]);

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  useEffect(() => {
    if (!isPaused) {
      const timer = setTimeout(goToNext, 5000); // Auto-advance every 5 seconds
      return () => clearTimeout(timer);
    }
  }, [currentIndex, isPaused, goToNext]);

  const currentBook = hydratedBooks[currentIndex];

  if (!currentBook) {
    return null; // Should not happen if hydratedBooks is filtered
  }

  return (
    <>
      <div 
        className="fixed inset-0 bg-black bg-opacity-90 z-[100] flex flex-col items-center justify-center p-4 md:p-8"
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {/* Progress Bars */}
        <div className="absolute top-4 left-4 right-4 flex space-x-1">
          {hydratedBooks.map((_, index) => (
            <div key={index} className="h-1 flex-1 bg-white bg-opacity-30 rounded-full">
              <div 
                className={`h-full bg-white rounded-full ${index === currentIndex ? 'animate-progress' : (index < currentIndex ? 'w-full' : 'w-0')}`}
                style={{ animationDuration: index === currentIndex ? '5s' : undefined }}
              ></div>
            </div>
          ))}
        </div>

        {/* Close Button */}
        <button onClick={onClose} className="absolute top-8 right-4 z-10 p-2 text-white">
          <X size={32} />
        </button>

        {/* Main Content */}
        <div className="relative w-full max-w-md h-[80%] flex flex-col items-center justify-center">
            <img src={currentBook.coverImage} alt={currentBook.title} className="max-h-[60%] object-contain rounded-lg shadow-2xl"/>
            <p className="mt-6 text-lg text-center text-gray-200 italic">{currentBook.blurb}</p>
            <div className="mt-4 text-center">
                <h3 className="text-2xl font-bold text-white">{currentBook.title}</h3>
                <p className="text-md text-gray-300">{currentBook.author}</p>
                <div className="flex items-center justify-center mt-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-5 h-5 ${
                        (currentBook.averageRating || 0) >= star ? 'text-yellow-400' : 'text-gray-400'
                      }`}
                      fill="currentColor"
                    />
                  ))}
                  <span className="ml-2 text-sm text-white">
                    ({currentBook.reviewCount || 0} yorum)
                  </span>
                </div>
            </div>
        </div>

        {/* Navigation */}
        <div onClick={goToPrevious} className="absolute left-0 top-0 h-full w-1/3"></div>
        <div onClick={goToNext} className="absolute right-0 top-0 h-full w-1/3"></div>

        {/* Details Button */}
        <div className="absolute bottom-8">
            <button onClick={() => setIsDetailsModalOpen(true)} className="px-6 py-3 bg-white bg-opacity-20 text-white rounded-full backdrop-blur-sm hover:bg-opacity-30 transition-all">
                Kitap Detayları
            </button>
        </div>
      </div>

      {isDetailsModalOpen && currentBook.id && (
        <BookDetailsModal 
          bookId={currentBook.id} 
          onClose={() => setIsDetailsModalOpen(false)} 
        />
      )}

      <style>{`
        @keyframes progress {
          from { width: 0%; }
          to { width: 100%; }
        }
        .animate-progress {
          animation: progress 5s linear forwards;
        }
      `}</style>
    </>
  );
};

export default StoryViewer;
