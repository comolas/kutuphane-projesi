import React, { useEffect, useState, useMemo } from 'react';
import { X, Star, ThumbsUp } from 'lucide-react';
import { useReviews } from '../../contexts/ReviewContext';
import { useAuth } from '../../contexts/AuthContext';
import { Review } from '../../types';

interface ReviewModalProps {
  bookId: string;
  bookTitle: string;
  onClose: () => void;
}

const ReviewModal: React.FC<ReviewModalProps> = ({ bookId, bookTitle, onClose }) => {
  const { reviews, fetchReviewsByBookId, toggleHelpfulVote } = useReviews();
  const { user } = useAuth();
  const [sortBy, setSortBy] = useState<'recent' | 'helpful'>('recent');

  useEffect(() => {
    fetchReviewsByBookId(bookId);
  }, [bookId, fetchReviewsByBookId]);

  const handleHelpfulClick = (reviewId: string) => {
    if (user) {
      toggleHelpfulVote(reviewId, user.uid);
    }
  };

  const sortedReviews = useMemo(() => {
    let sorted = [...reviews];
    if (sortBy === 'recent') {
      sorted.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
    } else if (sortBy === 'helpful') {
      sorted.sort((a, b) => (b.helpfulVotes?.length || 0) - (a.helpfulVotes?.length || 0));
    }
    return sorted;
  }, [reviews, sortBy]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-[9999] flex items-center justify-center p-0" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-lg w-full h-full flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 sm:p-6 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 pr-2">"{bookTitle}" Yorumları</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 flex-shrink-0"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        <div className="p-4 sm:p-6 flex items-center justify-between border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center">
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} className={`w-4 h-4 sm:w-5 sm:h-5 ${sortedReviews.length > 0 && (sortedReviews.reduce((acc, r) => acc + r.rating, 0) / sortedReviews.length) >= star ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
              ))}
            </div>
            <span className="ml-2 text-xs sm:text-sm text-gray-600">
              {sortedReviews.length > 0 ? (sortedReviews.reduce((acc, r) => acc + r.rating, 0) / sortedReviews.length).toFixed(1) : '0.0'} ({sortedReviews.length} değerlendirme)
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs sm:text-sm font-medium text-gray-700">Sırala:</span>
            <button 
              onClick={() => setSortBy('recent')}
              className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-lg transition-all ${sortBy === 'recent' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'} touch-manipulation`}>
              En Yeni
            </button>
            <button 
              onClick={() => setSortBy('helpful')}
              className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-lg transition-all ${sortBy === 'helpful' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'} touch-manipulation`}>
              En Faydalı
            </button>
          </div>
        </div>
        
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {sortedReviews.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Star className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-sm sm:text-base text-gray-600">Bu kitap için henüz onaylanmış yorum bulunmamaktadır.</p>
              <p className="text-xs sm:text-sm text-gray-500 mt-2">İlk yorumu yapan siz olun!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedReviews.map((review: Review) => (
                <div key={review.id} className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center font-bold text-indigo-600">
                      {review.userDisplayName.charAt(0)}
                    </div>
                    <div className="flex-grow min-w-0">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-800 text-sm sm:text-base truncate">{review.userDisplayName}</p>
                          <p className="text-xs text-gray-500">{new Date(review.createdAt.toDate()).toLocaleDateString('tr-TR')}</p>
                        </div>
                        <div className="flex items-center flex-shrink-0">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star key={star} className={`w-3 h-3 sm:w-4 sm:h-4 ${review.rating >= star ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
                          ))}
                        </div>
                      </div>
                      <p className="text-gray-700 text-sm mb-3">{review.reviewText}</p>
                      <div className="flex items-center">
                        <button 
                          onClick={() => handleHelpfulClick(review.id)}
                          disabled={!user || review.helpfulVotes?.includes(user.uid)}
                          className={`flex items-center text-xs sm:text-sm transition-colors touch-manipulation ${user && review.helpfulVotes?.includes(user.uid) 
                            ? 'text-indigo-600' 
                            : 'text-gray-500 hover:text-indigo-600'} disabled:cursor-not-allowed`}>
                          <ThumbsUp className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                          Faydalı buldum ({review.helpfulVotes?.length || 0})
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReviewModal;
