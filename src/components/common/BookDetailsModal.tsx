import React, { useState, useEffect, useMemo } from 'react';
import { X, Star, ThumbsUp } from 'lucide-react';
import { Book, Review } from '../../types'; // Assuming Review type will be added to types
import { db } from '../../firebase/config';
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';

interface BookDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: Book | null;
  onSubmitReview: (review: { rating: number; text: string }) => void;
  isReviewMode: boolean; // To distinguish between viewing and submitting a review
}

const BookDetailsModal: React.FC<BookDetailsModalProps> = ({
  isOpen,
  onClose,
  book,
  onSubmitReview,
  isReviewMode,
}) => {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [sortBy, setSortBy] = useState<'createdAt' | 'helpfulCount'>('createdAt');

  useEffect(() => {
    if (isOpen && book) {
      // Reset state on open
      setRating(0);
      setReviewText('');
      setReviews([]);
      setSortBy('createdAt');

      const fetchReviews = async () => {
        setLoadingReviews(true);
        try {
          const q = query(
            collection(db, 'reviews'), 
            where('bookId', '==', book.id),
            where('status', '==', 'approved')
          );
          const querySnapshot = await getDocs(q);
          const fetchedReviews = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));
          setReviews(fetchedReviews);
        } catch (error) {
          console.error("Error fetching reviews: ", error);
        }
        setLoadingReviews(false);
      };

      fetchReviews();
    }
  }, [isOpen, book]);

  const sortedReviews = useMemo(() => {
    return [...reviews].sort((a, b) => {
      if (sortBy === 'helpfulCount') {
        return (b.helpfulVotes?.length || 0) - (a.helpfulVotes?.length || 0);
      }
      // Default to sorting by createdAt
      return b.createdAt.toMillis() - a.createdAt.toMillis();
    });
  }, [reviews, sortBy]);

  const handleHelpfulVote = async (reviewId: string) => {
    if (!user) return; // Must be logged in to vote
    const reviewRef = doc(db, 'reviews', reviewId);
    try {
      await updateDoc(reviewRef, {
        helpfulVotes: arrayUnion(user.uid)
      });
      // Optimistically update the UI
      setReviews(prevReviews => prevReviews.map(r => 
        r.id === reviewId ? { ...r, helpfulVotes: [...(r.helpfulVotes || []), user.uid] } : r
      ));
    } catch (error) {
      console.error("Error voting: ", error);
    }
  };

  if (!isOpen || !book) return null;

  const averageRating = reviews.length > 0
    ? reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length
    : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-lg max-w-3xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
          <h3 className="text-xl font-semibold text-gray-900">{book.title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <img src={book.coverImage} alt={book.title} className="w-full h-auto object-cover rounded-lg shadow-md" />
            </div>
            <div className="md:col-span-2 space-y-4">
              <div>
                <h4 className="font-bold text-gray-800">{book.author}</h4>
                <p className="text-sm text-gray-500">{book.publisher}</p>
              </div>
              <div className="flex items-center">
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className={`w-5 h-5 ${averageRating >= star ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
                  ))}
                </div>
                <span className="ml-3 text-sm text-gray-600">
                  {averageRating.toFixed(1)} ({reviews.length} değerlendirme)
                </span>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <p><span className="font-medium">Kategori:</span> {book.category}</p>
                <p><span className="font-medium">Konum:</span> {book.location}</p>
                <p><span className="font-medium">Sayfa Sayısı:</span> {book.pageCount || '-'}</p>
              </div>
            </div>
          </div>

          {isReviewMode && (
            <div className="mt-6 pt-6 border-t">
              <h4 className="text-lg font-semibold text-gray-900 mb-3">Değerlendirmeni Yaz</h4>
              <div className="flex items-center mb-4">
                <span className="text-sm font-medium mr-4">Puanınız:</span>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} onClick={() => setRating(star)}>
                    <Star className={`w-7 h-7 transition-colors ${rating >= star ? 'text-yellow-400 fill-current' : 'text-gray-300'} hover:text-yellow-300`} />
                  </button>
                ))}
              </div>
              <div className="relative">
                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  maxLength={1000}
                  placeholder="Kitap hakkındaki düşüncelerinizi paylaşın..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  rows={4}
                />
                <span className="absolute bottom-2 right-2 text-xs text-gray-400">
                  {reviewText.length} / 1000
                </span>
              </div>
              <button
                onClick={() => onSubmitReview({ rating, text: reviewText })}
                disabled={rating === 0 || reviewText.trim() === ''}
                className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold"
              >
                Yorumu Gönder
              </button>
            </div>
          )}

          <div className="mt-6 pt-6 border-t">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-semibold text-gray-900">Değerlendirmeler ({reviews.length})</h4>
              <div className="flex items-center text-sm">
                <label htmlFor="sort" className="mr-2 font-medium">Sırala:</label>
                <select 
                  id="sort" 
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value as 'createdAt' | 'helpfulCount')}
                  className="border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                >
                  <option value="createdAt">En Yeni</option>
                  <option value="helpfulCount">En Faydalı</option>
                </select>
              </div>
            </div>
            <div className="space-y-6">
              {loadingReviews ? (
                <p>Yorumlar yükleniyor...</p>
              ) : sortedReviews.length > 0 ? (
                sortedReviews.map(review => (
                  <div key={review.id} className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-600">
                      {review.userDisplayName.charAt(0)}
                    </div>
                    <div className="flex-grow">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-gray-800">{review.userDisplayName}</p>
                          <p className="text-xs text-gray-500">{review.createdAt.toDate().toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`w-4 h-4 ${review.rating > i ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
                          ))}
                        </div>
                      </div>
                      <p className="mt-2 text-gray-700 text-sm">{review.reviewText}</p>
                      <div className="mt-2 flex items-center">
                        <button 
                          onClick={() => handleHelpfulVote(review.id)}
                          disabled={!user || review.helpfulVotes?.includes(user.uid)}
                          className="flex items-center text-sm text-gray-500 hover:text-indigo-600 disabled:text-indigo-400 disabled:cursor-not-allowed transition-colors"
                        >
                          <ThumbsUp className="w-4 h-4 mr-1" />
                          Faydalı buldum ({review.helpfulVotes?.length || 0})
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">Bu kitap için henüz bir değerlendirme yazılmamış. İlk yazan sen ol!</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookDetailsModal;
