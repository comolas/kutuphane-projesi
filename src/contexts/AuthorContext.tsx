import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs, limit, doc, getDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Book, Author } from '../types';

interface AuthorContextType {
  authors: Author[];
  featuredAuthor: Author | null;
  featuredAuthorBooks: Book[];
  fetchFeaturedAuthor: () => Promise<void>;
  fetchAllAuthors: () => Promise<void>;
  fetchAuthorById: (id: string) => Promise<Author | null>;
  getAuthorBooks: (authorName: string) => Promise<Book[]>;
  bulkAddAuthors: (authorsData: Omit<Author, 'id'>[]) => Promise<{ successCount: number; errorCount: number; errors: string[] }>;
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
  const [authors, setAuthors] = useState<Author[]>([]);
  const [featuredAuthor, setFeaturedAuthor] = useState<Author | null>(null);
  const [featuredAuthorBooks, setFeaturedAuthorBooks] = useState<Book[]>([]);

  const fetchAllAuthors = useCallback(async () => {
    try {
      const authorsRef = collection(db, 'authors');
      const q = query(authorsRef);
      const querySnapshot = await getDocs(q);
      const allAuthors = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Author[];
      setAuthors(allAuthors);
    } catch (error) {
      console.error('Error fetching all authors:', error);
    }
  }, []);

  const fetchAuthorById = useCallback(async (id: string) => {
    try {
      const authorRef = doc(db, 'authors', id);
      const docSnap = await getDoc(authorRef);
      if (docSnap.exists()) {
        return { ...docSnap.data(), id: docSnap.id } as Author;
      } else {
        console.log("No such author!");
        return null;
      }
    } catch (error) {
      console.error('Error fetching author by id:', error);
      return null;
    }
  }, []);

  const getAuthorBooks = useCallback(async (authorName: string) => {
    try {
      const booksRef = collection(db, 'books');
      const q = query(booksRef, where('author', '==', authorName));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Book[];
    } catch (error) {
      console.error('Error fetching author books:', error);
      return [];
    }
  }, []);

  const fetchFeaturedAuthor = useCallback(async () => {
    try {
      const authorsRef = collection(db, 'authors');
      const q = query(authorsRef, where('featured', '==', true), limit(1));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const featuredAuthorDoc = querySnapshot.docs[0];
        const featuredAuthorData = { ...featuredAuthorDoc.data(), id: featuredAuthorDoc.id } as Author;
        
        setFeaturedAuthor(featuredAuthorData);

        const books = await getAuthorBooks(featuredAuthorData.name);
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
  }, [getAuthorBooks]);

  const bulkAddAuthors = useCallback(async (authorsData: Omit<Author, 'id'>[]) => {
    const batch = writeBatch(db);
    const authorsRef = collection(db, 'authors');
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    const existingAuthorsSnapshot = await getDocs(query(authorsRef));
    const existingAuthorNames = new Set(existingAuthorsSnapshot.docs.map(d => d.data().name.toLowerCase()));

    authorsData.forEach((author, index) => {
      if (!author.name || !author.biography || !author.image) {
        errors.push(`Satır ${index + 2}: Zorunlu alanlar eksik.`);
        errorCount++;
        return;
      }

      if (existingAuthorNames.has(author.name.toLowerCase())) {
        errors.push(`Satır ${index + 2}: '${author.name}' adlı yazar zaten mevcut.`);
        errorCount++;
        return;
      }

      const newAuthorRef = doc(authorsRef);
      batch.set(newAuthorRef, { ...author, featured: false });
      existingAuthorNames.add(author.name.toLowerCase()); // Add to set to prevent duplicates within the same file
      successCount++;
    });

    try {
      await batch.commit();
      await fetchAllAuthors(); // Refresh the authors list
    } catch (e) {
      console.error("Toplu yazar ekleme hatası:", e);
      return { successCount: 0, errorCount: authorsData.length, errors: ["Veritabanına kaydetme sırasında bir hata oluştu."] };
    }

    return { successCount, errorCount, errors };
  }, [fetchAllAuthors]);


  useEffect(() => {
    fetchFeaturedAuthor();
    fetchAllAuthors();
  }, [fetchFeaturedAuthor, fetchAllAuthors]);

  return (
    <AuthorContext.Provider value={{ authors, featuredAuthor, featuredAuthorBooks, fetchFeaturedAuthor, fetchAllAuthors, fetchAuthorById, getAuthorBooks, bulkAddAuthors }}>
      {children}
    </AuthorContext.Provider>
  );
};