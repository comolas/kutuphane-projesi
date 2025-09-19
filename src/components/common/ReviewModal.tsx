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
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">"{bookTitle}" Kitabı Yorumları</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 flex items-center justify-end space-x-4 border-b border-gray-200">
          <span className="text-sm font-medium text-gray-700">Sırala:</span>
          <button 
            onClick={() => setSortBy('recent')}
            className={`px-3 py-1 text-sm rounded-full ${sortBy === 'recent' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}>
            En Yeni
          </button>
          <button 
            onClick={() => setSortBy('helpful')}
            className={`px-3 py-1 text-sm rounded-full ${sortBy === 'helpful' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}>
            En Faydalı
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
          {sortedReviews.length === 0 ? (
            <p className="text-gray-600 text-center">Bu kitap için henüz onaylanmış yorum bulunmamaktadır.</p>
          ) : (
            <div className="space-y-6">
              {sortedReviews.map((review: Review) => (
                <div key={review.id} className="bg-gray-50 p-4 rounded-lg shadow-sm">
                  <div className="flex items-center mb-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          review.rating >= star ? 'text-yellow-400' : 'text-gray-300'
                        }`}
                      />
                    ))}
                    <span className="ml-2 text-sm font-medium text-gray-800">{review.rating.toFixed(1)}</span>
                  </div>
                  <p className="text-gray-700 mb-3">{review.reviewText}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <p>
                      Yazan: <span className="font-medium">{review.userDisplayName}</span> - {' '}
                      {new Date(review.createdAt.toDate()).toLocaleDateString('tr-TR')}
                    </p>
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => handleHelpfulClick(review.id)}
                        className={`flex items-center space-x-1 p-1 rounded-md transition-colors ${user && review.helpfulVotes?.includes(user.uid) 
                          ? 'text-blue-600 bg-blue-100' 
                          : 'text-gray-500 hover:bg-gray-200'}`}>
                        <ThumbsUp className="w-4 h-4" />
                        <span className="text-xs font-medium">Faydalı Buldum</span>
                      </button>
                      <span className="text-xs text-gray-500 font-medium">
                        {review.helpfulVotes?.length || 0}
                      </span>
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
