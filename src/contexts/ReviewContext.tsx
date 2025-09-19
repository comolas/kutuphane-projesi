
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Review } from '../types';

interface ReviewContextType {
  reviews: Review[];
  fetchReviewsByBookId: (bookId: string) => Promise<void>;
  getAverageRating: (bookId: string) => { average: number; count: number };
  toggleHelpfulVote: (reviewId: string, userId: string) => Promise<void>;
}

const ReviewContext = createContext<ReviewContextType | undefined>(undefined);

export const useReviews = () => {
  const context = useContext(ReviewContext);
  if (!context) {
    throw new Error('useReviews must be used within a ReviewProvider');
  }
  return context;
};

interface ReviewProviderProps {
  children: ReactNode;
}

export const ReviewProvider: React.FC<ReviewProviderProps> = ({ children }) => {
  const [reviews, setReviews] = useState<Review[]>([]);

  const fetchReviewsByBookId = useCallback(async (bookId: string) => {
    try {
      const reviewsRef = collection(db, 'reviews');
      const q = query(reviewsRef, where('bookId', '==', bookId), where('status', '==', 'approved'));
      const querySnapshot = await getDocs(q);
      const bookReviews = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Review[];
      setReviews(bookReviews);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  }, []);

  const getAverageRating = useCallback((bookId: string) => {
    const bookReviews = reviews.filter(review => review.bookId === bookId);
    if (bookReviews.length === 0) {
      return { average: 0, count: 0 };
    }
    const totalRating = bookReviews.reduce((acc, review) => acc + review.rating, 0);
    const average = totalRating / bookReviews.length;
    return { average, count: bookReviews.length };
  }, [reviews]);

  const toggleHelpfulVote = async (reviewId: string, userId: string) => {
    const reviewRef = doc(db, 'reviews', reviewId);
    const reviewSnap = await getDoc(reviewRef);

    if (reviewSnap.exists()) {
      const reviewData = reviewSnap.data() as Review;
      const helpfulVotes = reviewData.helpfulVotes || [];

      if (helpfulVotes.includes(userId)) {
        await updateDoc(reviewRef, {
          helpfulVotes: arrayRemove(userId)
        });
        setReviews(prevReviews => prevReviews.map(r => r.id === reviewId ? { ...r, helpfulVotes: r.helpfulVotes?.filter(uid => uid !== userId) } : r));
      } else {
        await updateDoc(reviewRef, {
          helpfulVotes: arrayUnion(userId)
        });
        setReviews(prevReviews => prevReviews.map(r => r.id === reviewId ? { ...r, helpfulVotes: [...(r.helpfulVotes || []), userId] } : r));
      }
    }
  };

  return (
    <ReviewContext.Provider value={{ reviews, fetchReviewsByBookId, getAverageRating, toggleHelpfulVote }}>
      {children}
    </ReviewContext.Provider>
  );
};
