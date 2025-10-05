import { collection, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

interface Quote {
  text: string;
  author: string;
  book: string;
}

export const getDailyQuote = async (): Promise<Quote> => {
  const quotesCollection = collection(db, 'quotes');
  const quoteSnapshot = await getDocs(quotesCollection);
  const quotesList = quoteSnapshot.docs.map(doc => doc.data() as Quote);
  
  if (quotesList.length === 0) {
    return {
      text: "Bugünlük alıntı bulunamadı.",
      author: "Sistem",
      book: "Mesaj"
    };
  }

  const today = new Date();
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
  return quotesList[dayOfYear % quotesList.length];
};

export const addQuote = async (quote: Quote) => {
  try {
    const quotesCollection = collection(db, 'quotes');
    await addDoc(quotesCollection, quote);
    console.log('Quote added successfully');
  } catch (error) {
    console.error('Error adding quote: ', error);
  }
};