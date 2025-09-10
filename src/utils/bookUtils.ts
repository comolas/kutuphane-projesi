import { Book } from '../types';
import { comıcBooks } from '../components/data/books/comıcBooks';
import { earthstoryBooks } from '../components/data/books/earthstoryBooks';
import { englıshBooks } from '../components/data/books/englıshBooks';
import { magazıneBooks } from '../components/data/books/magazıneBooks';
import { mangaBooks } from '../components/data/books/mangaBooks';
import { poetryBooks } from '../components/data/books/poetryBooks';
import { storyBooks } from '../components/data/books/storyBooks';
import { theartreearthBooks } from '../components/data/books/theartreearthBooks';
import { theatreBooks } from '../components/data/books/theatreBooks';
import { turkBooks } from '../components/data/books/turkBooks';
import { earthBooks } from '../components/data/books/earthBooks';
import { otherBooks } from '../components/data/books/otherBooks';

const NEW_BOOKS_DAYS = 30; // Consider books added within last 30 days as new

export const getNewBooks = (): Book[][] => {
  const allBooks = [
    ...comıcBooks,
    ...earthstoryBooks,
    ...englıshBooks,
    ...magazıneBooks,
    ...mangaBooks,
    ...poetryBooks,
    ...storyBooks,
    ...theartreearthBooks,
    ...theatreBooks,
    ...turkBooks,
    ...earthBooks,
    ...otherBooks
  ];

  // Get current date and date 30 days ago
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - (NEW_BOOKS_DAYS * 24 * 60 * 60 * 1000));

  // Filter and sort new books
  const newBooks = allBooks
    .filter(book => {
      const addedDate = new Date(book.addedDate);
      return addedDate > thirtyDaysAgo;
    })
    .sort((a, b) => new Date(b.addedDate).getTime() - new Date(a.addedDate).getTime());

  // Split into pages of 3 books each
  const pages: Book[][] = [];
  for (let i = 0; i < newBooks.length; i += 3) {
    pages.push(newBooks.slice(i, i + 3));
  }

  return pages;
};