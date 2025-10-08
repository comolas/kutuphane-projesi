import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Star, Heart } from 'lucide-react';
import { StoryCollection } from '../../types';
import { useBooks } from '../../contexts/BookContext';
import BookDetailsModal from '../common/BookDetailsModal';
import { useAuth } from '../../contexts/AuthContext';
import { collection as firestoreCollection, addDoc, deleteDoc, query, where, getDocs, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import Swal from 'sweetalert2';

interface StoryViewerProps {
  collection: StoryCollection;
  onClose: () => void;
}

const StoryViewer: React.FC<StoryViewerProps> = ({ collection, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteId, setFavoriteId] = useState<string | null>(null);

  const { user } = useAuth();

  const { allBooks } = useBooks();

  // Find the full book details from the allBooks context
  const hydratedBooks = collection.books.map(storyBook => {
    const bookDetails = allBooks.find(b => b.id === storyBook.bookId);
    return { ...bookDetails, blurb: storyBook.blurb };
  }).filter(b => b.id); // Filter out any books that might not have been found

  const goToNext = () => {
    if (currentIndex < hydratedBooks.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const currentBook = hydratedBooks[currentIndex];

  useEffect(() => {
    const checkFavorite = async () => {
      if (!user || !currentBook?.id) return;
      const q = query(
        firestoreCollection(db, 'favorites'),
        where('userId', '==', user.uid),
        where('bookId', '==', currentBook.id)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        setIsFavorite(true);
        setFavoriteId(snapshot.docs[0].id);
      } else {
        setIsFavorite(false);
        setFavoriteId(null);
      }
    };
    checkFavorite();
  }, [user, currentBook?.id]);

  const toggleFavorite = async () => {
    if (!user) {
      Swal.fire({
        icon: 'warning',
        title: 'Giriş Yapmalısınız',
        text: 'Favorilere eklemek için lütfen giriş yapın.',
      });
      return;
    }

    try {
      if (isFavorite && favoriteId) {
        await deleteDoc(doc(db, 'favorites', favoriteId));
        setIsFavorite(false);
        setFavoriteId(null);
        Swal.fire({
          icon: 'success',
          title: 'Favorilerden Çıkarıldı',
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        const docRef = await addDoc(firestoreCollection(db, 'favorites'), {
          userId: user.uid,
          bookId: currentBook.id,
          addedAt: new Date(),
        });
        setIsFavorite(true);
        setFavoriteId(docRef.id);
        Swal.fire({
          icon: 'success',
          title: 'Favorilere Eklendi',
          timer: 1500,
          showConfirmButton: false,
        });
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Hata',
        text: 'Bir hata oluştu. Lütfen tekrar deneyin.',
      });
    }
  };

  if (!currentBook) {
    return null;
  }

  return (
    <>
      <div className="fixed inset-0 bg-gradient-to-br from-gray-50 to-gray-100 z-[100] flex items-center justify-center p-4">
        {/* Magazine Page */}
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] overflow-hidden" style={{ perspective: '1500px' }}>
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent p-6 z-10">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">{collection.title}</h2>
              <div className="flex items-center gap-4">
                <span className="text-white font-medium">{currentIndex + 1}/{hydratedBooks.length}</span>
                <button onClick={onClose} className="p-2 text-white hover:bg-white/20 rounded-full transition-all">
                  <X size={24} />
                </button>
              </div>
            </div>
          </div>

          {/* Split Layout */}
          <div className="flex flex-col md:flex-row h-full">
            {/* Left Side - Image */}
            <div className="relative md:w-1/2 h-1/2 md:h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center p-8 group">
              <div className="relative w-full max-w-md" style={{ aspectRatio: '2/3' }}>
                <img 
                  src={currentBook.coverImage} 
                  alt={currentBook.title} 
                  className="absolute inset-0 w-full h-full object-cover rounded-lg shadow-2xl transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg"></div>
                {/* Favorite Button */}
                <button
                  onClick={toggleFavorite}
                  className="absolute top-4 right-4 p-3 bg-white/90 backdrop-blur-xl rounded-full shadow-lg hover:scale-110 transition-all duration-300 z-10"
                >
                  <Heart
                    size={24}
                    className={isFavorite ? 'text-red-500' : 'text-gray-400'}
                    fill={isFavorite ? 'currentColor' : 'none'}
                  />
                </button>
              </div>
            </div>

            {/* Right Side - Details */}
            <div className="md:w-1/2 h-1/2 md:h-full overflow-y-auto p-8 md:p-12 flex flex-col justify-center pt-20 md:pt-12">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">{currentBook.title}</h1>
              <p className="text-xl text-gray-600 mb-2">{currentBook.author}</p>
              <p className="text-lg text-gray-500 mb-6">{currentBook.publisher}</p>
              
              {/* Rating */}
              <div className="flex items-center gap-2 mb-8">
                {[1, 2, 3, 4, 5, 6].map((star) => (
                  <Star
                    key={star}
                    className={`w-6 h-6 ${(currentBook.averageRating || 0) >= star ? 'text-yellow-400' : 'text-gray-300'}`}
                    fill="currentColor"
                  />
                ))}
                <span className="ml-2 text-gray-600">({currentBook.reviewCount || 0} yorum)</span>
              </div>

              {/* Blurb */}
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6">
                <p className="text-gray-700 italic leading-relaxed">{currentBook.blurb}</p>
              </div>
            </div>
          </div>

          {/* Navigation Arrows */}
          <button 
            onClick={goToPrevious}
            disabled={currentIndex === 0}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/90 backdrop-blur-xl rounded-full shadow-lg hover:bg-white hover:scale-110 transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            <ChevronLeft size={24} className="text-gray-900" />
          </button>
          <button 
            onClick={goToNext}
            disabled={currentIndex === hydratedBooks.length - 1}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/90 backdrop-blur-xl rounded-full shadow-lg hover:bg-white hover:scale-110 transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            <ChevronRight size={24} className="text-gray-900" />
          </button>

          {/* Page Indicators */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
            {hydratedBooks.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`transition-all duration-300 rounded-full ${
                  index === currentIndex 
                    ? 'w-8 h-2 bg-gradient-to-r from-indigo-500 to-purple-600' 
                    : 'w-2 h-2 bg-gray-300 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

    </>
  );
};

export default StoryViewer;
