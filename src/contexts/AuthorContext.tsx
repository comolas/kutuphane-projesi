import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Book } from '../types';

interface Author {
  id: string;
  name: string;
  biography: string;
  image: string;
  featured: boolean;
  monthlyFeaturedDate?: Date;
}

interface AuthorContextType {
  featuredAuthor: Author | null;
  featuredAuthorBooks: Book[];
  fetchFeaturedAuthor: () => Promise<void>;
}

const AuthorContext = createContext<AuthorContextType | undefined>(undefined);

export const useAuthors = () => {
  const context = useContext(AuthorContext);
  if (!context) {
    throw new Error('useAuthors must be used within an AuthorProvider');
  }
  return context;
};

export const AuthorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [featuredAuthor, setFeaturedAuthor] = useState<Author | null>(null);
  const [featuredAuthorBooks, setFeaturedAuthorBooks] = useState<Book[]>([]);

  const fetchFeaturedAuthor = useCallback(async () => {
    try {
      const authorsRef = collection(db, 'authors');
      const querySnapshot = await getDocs(authorsRef);

      if (!querySnapshot.empty) {
        const authors = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Author[];
        
        // Simple logic to pick a "featured" author based on the current month
        const currentMonth = new Date().getMonth();
        const featuredAuthorIndex = currentMonth % authors.length;
        const authorData = authors[featuredAuthorIndex];

        setFeaturedAuthor(authorData);

        // Fetch books by the featured author
        const booksRef = collection(db, 'books');
        const booksQuery = query(booksRef, where('author', '==', authorData.name), limit(3));
        const booksSnapshot = await getDocs(booksQuery);
        const books: Book[] = booksSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Book[];
        setFeaturedAuthorBooks(books);
      } else {
        setFeaturedAuthor(null);
        setFeaturedAuthorBooks([]);
      }
    } catch (error) {
      console.error('Error fetching featured author:', error);
      setFeaturedAuthor(null);
      setFeaturedAuthorBooks([]);
    }
  }, []);

  useEffect(() => {
    fetchFeaturedAuthor();
  }, [fetchFeaturedAuthor]);

  return (
    <AuthorContext.Provider value={{ featuredAuthor, featuredAuthorBooks, fetchFeaturedAuthor }}>
      {children}
    </AuthorContext.Provider>
  );
};
