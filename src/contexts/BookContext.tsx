import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { collection, doc, setDoc, getDocs, query, where, serverTimestamp, updateDoc, addDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from './AuthContext';
import { useGoals } from './GoalsContext';
import { Book } from '../types';

interface BorrowedBook extends Book {
  borrowedAt: Date;
  dueDate: Date;
  returnedAt?: Date;
  extended: boolean;
  extensionCount?: number; // Number of times extended (0, 1, or 2)
  maxExtensions?: number; // Maximum allowed extensions (1 or 2 from spin reward)
  borrowedBy: string;
  userData?: {
    displayName: string;
    studentClass: string;
    studentNumber: string;
    photoURL?: string;
  };
  fineStatus?: 'pending' | 'paid';
  fineAmount?: number; // This will be deprecated by snapshot
  paymentDate?: Date;
  returnStatus?: 'borrowed' | 'returned' | 'pending';
  borrowStatus?: 'pending' | 'approved' | 'rejected';
  // Snapshot fields
  fineAmountSnapshot?: number;
  fineRateSnapshot?: number;
  daysOverdueSnapshot?: number;
  discountApplied?: number;
  originalFineAmount?: number;
}

interface BorrowMessage {
  id: string;
  bookId: string;
  userId: string;
  createdAt: Date;
  status: 'pending' | 'approved' | 'rejected';
  userData: {
    displayName: string;
    studentClass: string;
    studentNumber: string;
    photoURL?: string;
  };
  bookData: Book;
}

interface BookContextType {
  borrowedBooks: BorrowedBook[];
  allBorrowedBooks: BorrowedBook[];
  borrowMessages: BorrowMessage[];
  allBooks: Book[];
  recommendedBooks: Book[];
  bookStatuses: Record<string, 'available' | 'borrowed' | 'lost'>;
  borrowBook: (book: Book) => Promise<void>;
  returnBook: (bookId: string) => Promise<void>;
  extendBook: (bookId: string) => Promise<void>;
  isBorrowed: (bookId: string) => boolean;
  isBookBorrowed: (bookId: string) => boolean;
  canExtend: (bookId: string) => boolean;
  markFineAsPaid: (bookId: string, userId: string, currentFineRate: number, discountPercent?: number) => Promise<number>;
  hasPendingFine: (bookId: string) => boolean;
  requestReturn: (bookId: string) => Promise<void>;
  approveReturn: (bookId: string, userId: string) => Promise<void>;
  approveBorrow: (bookId: string, userId: string) => Promise<void>;
  rejectBorrow: (bookId: string, userId: string) => Promise<void>;
  markBookAsLost: (bookId: string) => Promise<void>;
  markBookAsFound: (bookId: string) => Promise<void>;
  getBookStatus: (bookId: string) => 'available' | 'borrowed' | 'lost';
  lendBookToUser: (bookId: string, userId: string) => Promise<void>;
  fetchRecommendedBooks: () => Promise<void>;
  refetchAllBooks: () => Promise<void>;
  saveBook: (book: Book) => Promise<void>;
  adminReturnBook: (bookId: string, userId: string) => Promise<void>;
  adminBatchReturnBooks: (books: { bookId: string, userId: string }[]) => Promise<void>;
}

const BookContext = createContext<BookContextType | undefined>(undefined);

export const useBooks = () => {
  const context = useContext(BookContext);
  if (!context) {
    throw new Error('useBooks must be used within a BookProvider');
  }
  return context;
};

export const BookProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [borrowedBooks, setBorrowedBooks] = useState<BorrowedBook[]>([]);
  const [allBorrowedBooks, setAllBorrowedBooks] = useState<BorrowedBook[]>([]);
  const [borrowMessages, setBorrowMessages] = useState<BorrowMessage[]>([]);
  const [allBooks, setAllBooks] = useState<Book[]>([]);
  const [recommendedBooks, setRecommendedBooks] = useState<Book[]>([]);
  const [bookStatuses, setBookStatuses] = useState<Record<string, 'available' | 'borrowed' | 'lost'>>({});
  const { user, userData } = useAuth();
  const { updateGoalProgress } = useGoals();

  useEffect(() => {
    if (!user) {
      setBorrowedBooks([]);
      setAllBorrowedBooks([]);
      setBorrowMessages([]);
      setAllBooks([]);
      setBookStatuses({});
      return;
    }

    const fetchAllBooks = async () => {
      try {
        const booksCollectionRef = collection(db, "books");
        const reviewsCollectionRef = collection(db, "reviews");
        const approvedReviewsQuery = query(reviewsCollectionRef, where("status", "==", "approved"));

        const [booksSnapshot, reviewsSnapshot] = await Promise.all([
          getDocs(booksCollectionRef),
          user ? getDocs(approvedReviewsQuery) : Promise.resolve({ docs: [] }),
        ]);

        const reviewsData = reviewsSnapshot.docs.map((doc) => doc.data());

        const booksData = booksSnapshot.docs.map((doc) => {
          const book = { ...doc.data(), id: doc.id } as Book;
          const bookReviews = reviewsData.filter(
            (review) => review.bookId === book.id && review.status === "approved"
          );
          const reviewCount = bookReviews.length;
          const averageRating =
            reviewCount > 0
              ? bookReviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount
              : 0;

          return {
            ...book,
            averageRating: parseFloat(averageRating.toFixed(1)),
            reviewCount,
          };
        }) as Book[];
        setAllBooks(booksData);
        return booksData;
      } catch (error) {
        console.error("Error fetching all books:", error);
        return [];
      }
    };

    const fetchBookStatuses = async () => {
      try {
        const statusesRef = collection(db, "bookStatuses");
        const querySnapshot = await getDocs(statusesRef);

        const statuses: Record<string, "available" | "borrowed" | "lost"> = {};
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          statuses[doc.id] = data.status;
        });

        setBookStatuses(statuses);
      } catch (error) {
        console.error("Error fetching book statuses:", error);
      }
    };

    const fetchBorrowedBooks = async (allBooksData: Book[]) => {
      if (!user) return;
      try {
        const borrowedBooksRef = collection(db, "borrowedBooks");
        const q = query(borrowedBooksRef, where("userId", "==", user.uid));
        const querySnapshot = await getDocs(q);

        const books: BorrowedBook[] = querySnapshot.docs.map((doc) => {
            const data = doc.data();
            const bookDetails = allBooksData.find(book => book.id === (data.bookId || data.book?.id));

            const borrowData = {
                borrowedAt: data.borrowedAt?.toDate() || new Date(),
                dueDate: data.dueDate?.toDate() || new Date(),
                returnedAt: data.returnDate?.toDate(),
                extended: data.extended || false,
                borrowedBy: data.userId,
                returnStatus: data.returnStatus || 'borrowed',
                borrowStatus: data.borrowStatus || 'approved',
                fineStatus: data.fineStatus || 'pending',
                paymentDate: data.paymentDate?.toDate(),
                fineAmountSnapshot: data.fineAmountSnapshot,
                fineRateSnapshot: data.fineRateSnapshot,
                daysOverdueSnapshot: data.daysOverdueSnapshot,
            };

            const bookSource = bookDetails || data.book || {};

            return { ...bookSource, ...borrowData } as BorrowedBook;
        });

        setBorrowedBooks(books);
      } catch (error) {
        console.error("Error fetching borrowed books:", error);
      }
    };

    const fetchAllBorrowedBooks = async (allBooksData: Book[]) => {
        if (!userData || userData.role !== 'admin') return;
        try {
          const borrowedBooksRef = collection(db, "borrowedBooks");
          const querySnapshot = await getDocs(borrowedBooksRef);
    
          const userPromises = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return getDocs(query(collection(db, 'users'), where('uid', '==', data.userId)));
          });
    
          const userSnapshots = await Promise.all(userPromises);
          const usersData = userSnapshots.map(snap => snap.docs[0]?.data());
    
          const books: BorrowedBook[] = querySnapshot.docs.map((doc, index) => {
            const data = doc.data();
            const bookDetails = allBooksData.find(book => book.id === (data.bookId || data.book?.id));
            const bookUserData = usersData[index];

            const borrowData = {
                borrowedAt: data.borrowedAt?.toDate() || new Date(),
                dueDate: data.dueDate?.toDate() || new Date(),
                returnedAt: data.returnDate?.toDate(),
                extended: data.extended || false,
                borrowedBy: data.userId,
                returnStatus: data.returnStatus || 'borrowed',
                borrowStatus: data.borrowStatus || 'approved',
                fineStatus: data.fineStatus || 'pending',
                paymentDate: data.paymentDate?.toDate(),
                userData: bookUserData ? {
                    displayName: bookUserData.displayName,
                    studentClass: bookUserData.studentClass,
                    studentNumber: bookUserData.studentNumber,
                    photoURL: bookUserData.photoURL
                } : undefined,
                fineAmountSnapshot: data.fineAmountSnapshot,
                fineRateSnapshot: data.fineRateSnapshot,
                daysOverdueSnapshot: data.daysOverdueSnapshot,
            };

            const bookSource = bookDetails || data.book || {};

            return { ...bookSource, ...borrowData } as BorrowedBook;
          });
    
          setAllBorrowedBooks(books);
        } catch (error) {
          console.error("Error fetching all borrowed books:", error);
        }
      };

    const fetchBorrowMessages = async () => {
      try {
        const messagesRef = collection(db, "borrowMessages");
        const q = query(messagesRef, where("status", "==", "pending"));
        const querySnapshot = await getDocs(q);

        const messages: BorrowMessage[] = [];
        querySnapshot.docs.forEach((doc) => {
          const data = doc.data();
          messages.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt.toDate(),
          } as BorrowMessage);
        });

        setBorrowMessages(messages);
      } catch (error) {
        console.error("Error fetching borrow messages:", error);
      }
    };

    const executeFetches = async () => {
      const allBooksData = await fetchAllBooks();
      fetchBookStatuses();
      fetchBorrowMessages();
      fetchBorrowedBooks(allBooksData);
      if (userData?.role === "admin") {
        fetchAllBorrowedBooks(allBooksData);
      }
    };

    executeFetches();
  }, [user, userData]);

  const refetchAllBooks = useCallback(async () => {
    try {
      const booksCollectionRef = collection(db, "books");
      const querySnapshot = await getDocs(booksCollectionRef);
      const booksData = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Book[];
      setAllBooks(booksData);
    } catch (error) {
      console.error("Error refetching all books:", error);
    }
  }, []);

  const getBookStatus = useCallback((bookId: string): 'available' | 'borrowed' | 'lost' => {
    // Check if book is marked as lost in bookStatuses
    if (bookStatuses[bookId] === 'lost') {
      return 'lost';
    }

    // Check if book is marked as borrowed in bookStatuses
    if (bookStatuses[bookId] === 'borrowed') {
      return 'borrowed';
    }

    // Fallback: check in allBorrowedBooks and borrowedBooks
    const activeBorrow = [...allBorrowedBooks, ...borrowedBooks].find(book => 
      book.id === bookId && 
      book.returnStatus === 'borrowed' &&
      book.borrowStatus === 'approved'
    );

    if (activeBorrow) {
      return 'borrowed';
    }

    // If not borrowed and not lost, it's available
    return 'available';
  }, [allBorrowedBooks, borrowedBooks, bookStatuses]);

  const fetchRecommendedBooks = useCallback(async () => {
    if (!user) return;

    const borrowedCategories = borrowedBooks.map(book => book.category);
    const borrowedAuthors = borrowedBooks.map(book => book.author);

    const unreadBooks = allBooks.filter(book => !borrowedBooks.some(borrowed => borrowed.id === book.id));

    let recommendations = unreadBooks.filter(book => 
      borrowedCategories.includes(book.category) || borrowedAuthors.includes(book.author)
    );

    if (recommendations.length === 0) {
        const popularBooks = allBorrowedBooks
            .map(b => b.id)
            .reduce((acc, id) => {
                acc[id] = (acc[id] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);
        
        const sortedPopularBooks = Object.keys(popularBooks).sort((a, b) => popularBooks[b] - popularBooks[a]);
        const top5 = sortedPopularBooks.slice(0, 5);
        recommendations = allBooks.filter(b => top5.includes(b.id));
    }

    setRecommendedBooks(recommendations.slice(0, 5));
  }, [user, borrowedBooks, allBooks]);

  const lendBookToUser = useCallback(async (bookId: string, userId: string) => {
    try {
      if (getBookStatus(bookId) === 'lost') {
        throw new Error('Bu kitap kayıp durumda ve ödünç verilemez.');
      }

      const bookToLend = allBooks.find(b => b.id === bookId);
      if (!bookToLend) {
        throw new Error('Book not found');
      }

      const borrowedAt = new Date();
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 14);

      const borrowedBookRef = doc(db, 'borrowedBooks', `${userId}_${bookId}`);
      await setDoc(borrowedBookRef, {
        userId,
        bookId,
        book: bookToLend,
        borrowedAt: serverTimestamp(),
        dueDate,
        extended: false,
        returnStatus: 'borrowed',
        borrowStatus: 'approved',
        fineStatus: 'pending'
      });

      const statusRef = doc(db, 'bookStatuses', bookId);
      await setDoc(statusRef, {
        status: 'borrowed',
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid
      });

      setBookStatuses(prev => ({
        ...prev,
        [bookId]: 'borrowed'
      }));

    } catch (error) {
      console.error('Error lending book:', error);
      throw error;
    }
  }, [user, allBooks, getBookStatus]);

  const markBookAsLost = useCallback(async (bookId: string) => {
    try {
      const statusRef = doc(db, 'bookStatuses', bookId);
      await setDoc(statusRef, {
        status: 'lost',
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid
      });

      const bookRef = doc(db, 'books', bookId);
      await updateDoc(bookRef, {
        status: 'lost'
      });

      setBookStatuses(prev => ({
        ...prev,
        [bookId]: 'lost'
      }));

      setAllBooks(prev => prev.map(b => b.id === bookId ? { ...b, status: 'lost' } : b));
    } catch (error) {
      console.error('Error marking book as lost:', error);
      throw error;
    }
  }, [user]);

  const markBookAsFound = useCallback(async (bookId: string) => {
    try {
      const statusRef = doc(db, 'bookStatuses', bookId);
      await setDoc(statusRef, {
        status: 'available',
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid
      });

      const bookRef = doc(db, 'books', bookId);
      await updateDoc(bookRef, {
        status: 'available'
      });

      setBookStatuses(prev => ({
        ...prev,
        [bookId]: 'available'
      }));

      setAllBooks(prev => prev.map(b => b.id === bookId ? { ...b, status: 'available' } : b));
    } catch (error) {
      console.error('Error marking book as found:', error);
      throw error;
    }
  }, [user]);

  const isBookBorrowed = useCallback((bookId: string) => {
    return allBorrowedBooks.some(book => 
      book.id === bookId && 
      book.returnStatus === 'borrowed' &&
      book.borrowStatus === 'approved'
    );
  }, [allBorrowedBooks]);

  const isBorrowed = useCallback((bookId: string) => {
    // Check if user has a pending request for this book
    const hasPendingRequest = borrowMessages.some(m => 
      m.bookId === bookId && 
      m.userId === user?.uid && 
      m.status === 'pending'
    );
    
    if (hasPendingRequest) return true;
    
    // Check if user has an approved borrow for this book
    return borrowedBooks.some(book => 
      book.id === bookId && 
      book.returnStatus === 'borrowed' &&
      book.borrowStatus === 'approved'
    );
  }, [borrowedBooks, borrowMessages, user]);

  const borrowBook = useCallback(async (book: Book) => {
    if (!user || !userData) return;

    if (getBookStatus(book.id) === 'lost') {
      throw new Error('Bu kitap şu anda kayıp durumda ve ödünç alınamaz.');
    }
    
    if (isBookBorrowed(book.id)) {
      throw new Error('Bu kitap zaten başka bir kullanıcı tarafından ödünç alınmış.');
    }

    // Check if user already has a pending request for this book
    const existingRequest = borrowMessages.find(m => 
      m.bookId === book.id && 
      m.userId === user.uid && 
      m.status === 'pending'
    );
    
    if (existingRequest) {
      throw new Error('Bu kitap için zaten bekleyen bir talebiniz var.');
    }

    try {
      // Create a borrow request instead of directly borrowing
      await addDoc(collection(db, 'borrowMessages'), {
        userId: user.uid,
        bookId: book.id,
        createdAt: serverTimestamp(),
        status: 'pending',
        userData: {
          displayName: userData.displayName,
          studentClass: userData.studentClass,
          studentNumber: userData.studentNumber,
          photoURL: userData.photoURL
        },
        bookData: book
      });

      // Refresh borrow messages to show the new request
      const messagesRef = collection(db, 'borrowMessages');
      const q = query(messagesRef, where('status', '==', 'pending'));
      const querySnapshot = await getDocs(q);
      
      const messages: BorrowMessage[] = [];
      querySnapshot.docs.forEach(doc => {
        const data = doc.data();
        messages.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt.toDate()
        } as BorrowMessage);
      });
      
      setBorrowMessages(messages);

    } catch (error) {
      console.error('Error borrowing book:', error);
      throw error;
    }
  }, [user, userData, getBookStatus, isBookBorrowed]);

  const approveBorrow = useCallback(async (bookId: string, userId: string) => {
    try {
      if (getBookStatus(bookId) === 'lost') {
        throw new Error('Bu kitap kayıp durumda ve ödünç verilemez.');
      }

      const borrowMessage = borrowMessages.find(m => m.bookId === bookId && m.userId === userId);
      if (!borrowMessage) {
        throw new Error('Borrow request not found');
      }

      const borrowedAt = new Date();
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 14);

      const borrowedBookRef = doc(db, 'borrowedBooks', `${userId}_${bookId}`);
      await setDoc(borrowedBookRef, {
        userId,
        bookId,
        book: borrowMessage.bookData,
        borrowedAt: serverTimestamp(),
        dueDate,
        extended: false,
        returnStatus: 'borrowed',
        borrowStatus: 'approved',
        fineStatus: 'pending'
      });

      await updateDoc(doc(db, 'borrowMessages', borrowMessage.id), {
        status: 'approved'
      });

      setBorrowMessages(prev => prev.filter(m => m.id !== borrowMessage.id));
      
      const newBorrowedBook: BorrowedBook = {
        ...borrowMessage.bookData,
        borrowedAt,
        dueDate,
        extended: false,
        borrowedBy: userId,
        returnStatus: 'borrowed',
        borrowStatus: 'approved'
      };

      setAllBorrowedBooks(prev => [...prev, newBorrowedBook]);
      if (userId === user?.uid) {
        setBorrowedBooks(prev => [...prev, newBorrowedBook]);
      }

    } catch (error) {
      console.error('Error approving borrow:', error);
      throw error;
    }
  }, [user, borrowMessages, getBookStatus]);

  const rejectBorrow = useCallback(async (bookId: string, userId: string) => {
    try {
      const messageDoc = borrowMessages.find(m => m.bookId === bookId && m.userId === userId);
      if (messageDoc) {
        await updateDoc(doc(db, 'borrowMessages', messageDoc.id), {
          status: 'rejected'
        });
      }

      setBorrowMessages(prev => prev.filter(m => !(m.bookId === bookId && m.userId === userId)));
      setBorrowedBooks(prev => prev.filter(b => !(b.id === bookId && b.borrowStatus === 'pending')));
      setAllBorrowedBooks(prev => prev.filter(b => !(b.id === bookId && b.borrowStatus === 'pending')));
    } catch (error) {
      console.error('Error rejecting borrow:', error);
      throw error;
    }
  }, [borrowMessages]);

  const hasPendingFine = useCallback((bookId: string) => {
    const book = borrowedBooks.find(b => b.id === bookId);
    if (!book) return false;

    const daysOverdue = Math.ceil(
      (new Date().getTime() - book.dueDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    return daysOverdue > 0 && book.fineStatus !== 'paid';
  }, [borrowedBooks]);

  const returnBook = useCallback(async (bookId: string) => {
    if (!user) return;

    try {
      const book = borrowedBooks.find(b => b.id === bookId);
      if (book && hasPendingFine(bookId)) {
        throw new Error('Kitabı iade etmeden önce cezayı ödemeniz gerekmektedir.');
      }

      const borrowedBookRef = doc(db, 'borrowedBooks', `${user.uid}_${bookId}`);
      await updateDoc(borrowedBookRef, {
        returnStatus: 'returned',
        returnDate: serverTimestamp()
      });

      setBorrowedBooks(prev => prev.map(book => 
        book.id === bookId ? { ...book, returnStatus: 'returned' } : book
      ));
      setAllBorrowedBooks(prev => prev.map(book => 
        book.id === bookId && book.borrowedBy === user.uid 
          ? { ...book, returnStatus: 'returned' } 
          : book
      ));
    } catch (error) {
      console.error('Error returning book:', error);
      throw error;
    }
  }, [user, borrowedBooks, hasPendingFine]);

  const extendBook = useCallback(async (bookId: string) => {
    if (!user) return;

    try {
      const book = borrowedBooks.find(b => b.id === bookId);
      if (!book || book.returnStatus !== 'borrowed') {
        throw new Error('Book cannot be extended');
      }

      const currentExtensionCount = book.extensionCount || 0;
      const maxExtensions = book.maxExtensions || 1;

      if (currentExtensionCount >= maxExtensions) {
        throw new Error(`Bu kitap maksimum ${maxExtensions} kez uzatılabilir`);
      }

      const newDueDate = new Date(book.dueDate);
      newDueDate.setDate(newDueDate.getDate() + 7);
      const newExtensionCount = currentExtensionCount + 1;

      const borrowedBookRef = doc(db, 'borrowedBooks', `${user.uid}_${bookId}`);
      await updateDoc(borrowedBookRef, {
        dueDate: newDueDate,
        extended: newExtensionCount >= maxExtensions,
        extensionCount: newExtensionCount
      });

      const updatedBook = { 
        ...book, 
        dueDate: newDueDate, 
        extended: newExtensionCount >= maxExtensions,
        extensionCount: newExtensionCount
      };

      setBorrowedBooks(prev => prev.map(b => 
        b.id === bookId ? updatedBook : b
      ));
      setAllBorrowedBooks(prev => prev.map(b => 
        b.id === bookId && b.borrowedBy === user.uid ? updatedBook : b
      ));
    } catch (error) {
      console.error('Error extending book:', error);
      throw error;
    }
  }, [user, borrowedBooks]);

  const markFineAsPaid = useCallback(async (bookId: string, userId: string, currentFineRate: number, discountPercent?: number) => {
    try {
      const bookToUpdate = allBorrowedBooks.find(b => b.id === bookId && b.borrowedBy === userId);
      if (!bookToUpdate) {
        throw new Error("Ödünç alınmış kitap kaydı bulunamadı.");
      }

      const today = new Date();
      const diffTime = today.getTime() - bookToUpdate.dueDate.getTime();
      const daysOverdue = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      const originalFineAmount = daysOverdue * currentFineRate;
      const finalFineAmount = discountPercent ? originalFineAmount - (originalFineAmount * discountPercent / 100) : originalFineAmount;

      const borrowedBookRef = doc(db, 'borrowedBooks', `${userId}_${bookId}`);
      await updateDoc(borrowedBookRef, {
        fineStatus: 'paid',
        paymentDate: serverTimestamp(),
        fineAmountSnapshot: finalFineAmount,
        fineRateSnapshot: currentFineRate,
        daysOverdueSnapshot: daysOverdue,
        ...(discountPercent && { discountApplied: discountPercent, originalFineAmount })
      });

      const snapshotData = {
        fineStatus: 'paid' as const,
        paymentDate: new Date(),
        fineAmountSnapshot: finalFineAmount,
        fineRateSnapshot: currentFineRate,
        daysOverdueSnapshot: daysOverdue,
        ...(discountPercent && { discountApplied: discountPercent, originalFineAmount })
      };

      const updateBooks = (books: BorrowedBook[]) =>
        books.map(book =>
          book.id === bookId && book.borrowedBy === userId
            ? { ...book, ...snapshotData }
            : book
        );

      setBorrowedBooks(prev => updateBooks(prev));
      setAllBorrowedBooks(prev => updateBooks(prev));
      
      return finalFineAmount;
    } catch (error) {
      console.error('Ceza ödemesi işlenirken hata oluştu:', error);
      throw error;
    }
  }, [allBorrowedBooks]);

  const canExtend = useCallback((bookId: string) => {
    const book = borrowedBooks.find(b => b.id === bookId);
    if (!book || book.returnStatus !== 'borrowed' || book.borrowStatus !== 'approved') return false;
    
    const currentExtensionCount = book.extensionCount || 0;
    const maxExtensions = book.maxExtensions || 1;
    
    return currentExtensionCount < maxExtensions;
  }, [borrowedBooks]);

  const requestReturn = useCallback(async (bookId: string) => {
    if (!user || !userData) return;

    try {
      if (hasPendingFine(bookId)) {
        throw new Error('Kitabı iade etmeden önce cezayı ödemeniz gerekmektedir.');
      }

      const book = borrowedBooks.find(b => b.id === bookId);
      if (!book) throw new Error('Kitap bulunamadı.');

      await addDoc(collection(db, 'returnMessages'), {
        bookId,
        userId: user.uid,
        createdAt: serverTimestamp(),
        status: 'pending',
        userData: {
          displayName: userData.displayName,
          studentClass: userData.studentClass,
          studentNumber: userData.studentNumber,
          photoURL: userData.photoURL
        },
        bookData: {
          title: book.title,
          borrowedAt: book.borrowedAt,
          dueDate: book.dueDate
        }
      });

      const borrowedBookRef = doc(db, 'borrowedBooks', `${user.uid}_${bookId}`);
      await updateDoc(borrowedBookRef, {
        returnStatus: 'pending'
      });

      setBorrowedBooks(prev => prev.map(b => 
        b.id === bookId ? { ...b, returnStatus: 'pending' } : b
      ));
      setAllBorrowedBooks(prev => prev.map(b => 
        b.id === bookId && b.borrowedBy === user.uid ? { ...b, returnStatus: 'pending' } : b
      ));
    } catch (error) {
      console.error('Error requesting return:', error);
      throw error;
    }
  }, [user, userData, borrowedBooks, hasPendingFine]);

  const approveReturn = useCallback(async (bookId: string, userId: string) => {
    try {
      // Update the borrowed book record
      const borrowedBookRef = doc(db, 'borrowedBooks', `${userId}_${bookId}`);
      await updateDoc(borrowedBookRef, {
        returnStatus: 'returned',
        returnDate: serverTimestamp()
      });

      // Update book status to available in bookStatuses collection
      const statusRef = doc(db, 'bookStatuses', bookId);
      await setDoc(statusRef, {
        status: 'available',
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid
      });

      // Update local book statuses immediately
      setBookStatuses(prev => ({
        ...prev,
        [bookId]: 'available'
      }));

      // Update goal progress
      await updateGoalProgress(1);

      // Remove the return message
      const returnMessagesRef = collection(db, 'returnMessages');
      const q = query(
        returnMessagesRef,
        where('bookId', '==', bookId),
        where('userId', '==', userId),
        where('status', '==', 'pending')
      );
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const messageDoc = querySnapshot.docs[0];
        await updateDoc(doc(returnMessagesRef, messageDoc.id), {
          status: 'approved'
        });
      }

      // Update local borrowed books state
      setBorrowedBooks(prev => prev.map(book => 
        book.id === bookId && book.borrowedBy === userId
          ? { ...book, returnStatus: 'returned', returnedAt: new Date() }
          : book
      ));
      
      setAllBorrowedBooks(prev => prev.map(book => 
        book.id === bookId && book.borrowedBy === userId
          ? { ...book, returnStatus: 'returned', returnedAt: new Date() }
          : book
      ));

      console.log(`Book ${bookId} returned by user ${userId} - status updated to available`);
    } catch (error) {
      console.error('Error approving return:', error);
      throw error;
    }
  }, [updateGoalProgress]);

  const saveBook = useCallback(async (book: Book) => {
    try {
      const { id, ...bookData } = book;
      if (id) {
        const bookRef = doc(db, 'books', id);
        await updateDoc(bookRef, bookData);
      } else {
        const booksCollectionRef = collection(db, 'books');
        const docRef = await addDoc(booksCollectionRef, {
          ...bookData,
          addedDate: serverTimestamp()
        });
        // Update local state with the new book including the new ID
        setAllBooks(prev => [...prev, { ...book, id: docRef.id }]);
      }
      await refetchAllBooks();
    } catch (error) {
      console.error('Error saving book:', error);
      throw error;
    }
  }, [refetchAllBooks]);

  const adminReturnBook = useCallback(async (bookId: string, userId: string) => {
    try {
      // Update the borrowed book record
      const borrowedBookRef = doc(db, 'borrowedBooks', `${userId}_${bookId}`);
      await updateDoc(borrowedBookRef, {
        returnStatus: 'returned',
        returnDate: serverTimestamp(),
      });

      // Update book status to available in bookStatuses collection
      const statusRef = doc(db, 'bookStatuses', bookId);
      await setDoc(statusRef, {
        status: 'available',
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid
      });

      // Update goal progress
      await updateGoalProgress(1, userId);

      // Update local book statuses immediately
      setBookStatuses(prev => ({
        ...prev,
        [bookId]: 'available'
      }));

      // Update local state
      setAllBorrowedBooks(prev => prev.map(book =>
        (book.id === bookId && book.borrowedBy === userId)
          ? { ...book, returnStatus: 'returned', returnedAt: new Date() }
          : book
      ));

      console.log(`Book ${bookId} returned by admin for user ${userId} - status updated to available`);
    } catch (error) {
      console.error('Error returning book (admin):', error);
      throw error;
    }
  }, [user, updateGoalProgress]);

  const adminBatchReturnBooks = useCallback(async (books: { bookId: string, userId: string }[]) => {
    try {
      const batch = writeBatch(db);

      for (const book of books) {
        // Update borrowed book record
        const borrowedBookRef = doc(db, 'borrowedBooks', `${book.userId}_${book.bookId}`);
        batch.update(borrowedBookRef, {
          returnStatus: 'returned',
          returnDate: serverTimestamp(),
        });

        // Update book status to available in bookStatuses collection
        const statusRef = doc(db, 'bookStatuses', book.bookId);
        batch.set(statusRef, {
          status: 'available',
          updatedAt: serverTimestamp(),
          updatedBy: user?.uid
        });
      }

      await batch.commit();

      // Update local book statuses immediately
      const statusUpdates: Record<string, 'available'> = {};
      books.forEach(book => {
        statusUpdates[book.bookId] = 'available';
      });
      
      setBookStatuses(prev => ({
        ...prev,
        ...statusUpdates
      }));

      // Update local borrowed books state
      const returnedBookKeys = new Set(books.map(b => `${b.userId}_${b.bookId}`));
      setAllBorrowedBooks(prev => prev.map(book =>
        returnedBookKeys.has(`${book.borrowedBy}_${book.id}`)
          ? { ...book, returnStatus: 'returned', returnedAt: new Date() }
          : book
      ));

      console.log(`Batch returned ${books.length} books - all statuses updated to available`);
    } catch (error) {
      console.error('Error batch returning books (admin):', error);
      throw error;
    }
  }, [user]);

  return (
    <BookContext.Provider value={{
      borrowedBooks,
      allBorrowedBooks,
      borrowMessages,
      allBooks,
      bookStatuses,
      recommendedBooks,
      borrowBook,
      returnBook,
      extendBook,
      isBorrowed,
      isBookBorrowed,
      canExtend,
      markFineAsPaid,
      hasPendingFine,
      requestReturn,
      approveReturn,
      approveBorrow,
      rejectBorrow,
      markBookAsLost,
      markBookAsFound,
      getBookStatus,
      lendBookToUser,
      fetchRecommendedBooks,
      refetchAllBooks,
      saveBook,
      adminReturnBook,
      adminBatchReturnBooks
    }}>
      {children}
    </BookContext.Provider>
  );
};