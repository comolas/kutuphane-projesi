import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { db } from '../firebase/config';
import { collection, addDoc, getDocs, Timestamp, query, orderBy, doc, updateDoc, deleteDoc, where } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { Transaction, BudgetSummary } from '../types';

interface BudgetContextType {
  transactions: Transaction[];
  summary: BudgetSummary;
  loading: boolean;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'date'> & { date: Date }) => Promise<void>;
  updateTransaction: (id: string, transaction: Omit<Transaction, 'id' | 'date'> & { date: Date }) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
}

const BudgetContext = createContext<BudgetContextType | undefined>(undefined);

export const BudgetProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isSuperAdmin, campusId } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [kumbaraValue, setKumbaraValue] = useState(0);
  const [summary, setSummary] = useState<BudgetSummary>({
    totalIncome: 0,
    totalExpense: 0,
    netBalance: 0,
    totalBudget: 0,
    remainingBudget: 0,
  });
  const [loading, setLoading] = useState(true);

  const calculateSummary = useCallback((currentTransactions: Transaction[], currentKumbaraValue: number) => {
    const totalIncome = currentTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = currentTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalBudget = currentKumbaraValue + totalIncome;
    const remainingBudget = totalBudget - totalExpense;
    const netBalance = totalIncome - totalExpense;

    setSummary({
      totalIncome,
      totalExpense,
      netBalance,
      totalBudget,
      remainingBudget,
    });
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const borrowedBooksCollection = collection(db, 'borrowedBooks');
        const borrowedBooksQuery = isSuperAdmin ? borrowedBooksCollection : query(borrowedBooksCollection, where('campusId', '==', campusId));
        const borrowedBooksSnapshot = await getDocs(borrowedBooksQuery);
        const allBorrowedData = borrowedBooksSnapshot.docs.map(doc => doc.data());
        const currentKumbaraValue = allBorrowedData
          .filter(book => book.fineStatus === 'paid' && book.fineAmount)
          .reduce((sum, book) => sum + (book.fineAmount || 0), 0);
        setKumbaraValue(currentKumbaraValue);

        const transactionsCollection = collection(db, 'transactions');
        const q = isSuperAdmin 
          ? query(transactionsCollection, orderBy('date', 'desc'))
          : query(transactionsCollection, where('campusId', '==', campusId), orderBy('date', 'desc'));
        const querySnapshot = await getDocs(q);
        const transactionsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Transaction[];
        
        setTransactions(transactionsData);
        calculateSummary(transactionsData, currentKumbaraValue);
      } catch (error) {
        console.error("Error fetching budget data: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [calculateSummary, isSuperAdmin, campusId]);

  const addTransaction = async (transaction: Omit<Transaction, 'id' | 'date'> & { date: Date }) => {
    try {
      const transactionWithTimestamp = {
        ...transaction,
        campusId: campusId,
        date: Timestamp.fromDate(transaction.date),
      };
      const docRef = await addDoc(collection(db, 'transactions'), transactionWithTimestamp);
      
      const newTransaction = { ...transaction, id: docRef.id, date: transactionWithTimestamp.date } as Transaction;
      const updatedTransactions = [newTransaction, ...transactions];
      setTransactions(updatedTransactions);
      calculateSummary(updatedTransactions, kumbaraValue);
    } catch (error) {
      console.error("Error adding transaction: ", error);
      throw error;
    }
  };

  const updateTransaction = async (id: string, transaction: Omit<Transaction, 'id' | 'date'> & { date: Date }) => {
    try {
      const transactionWithTimestamp = {
        ...transaction,
        campusId: campusId,
        date: Timestamp.fromDate(transaction.date),
      };
      const transactionRef = doc(db, 'transactions', id);
      await updateDoc(transactionRef, transactionWithTimestamp);

      const updatedTransactions = transactions.map(t => 
        t.id === id ? { ...t, ...transaction, date: transactionWithTimestamp.date } : t
      );
      setTransactions(updatedTransactions);
      calculateSummary(updatedTransactions, kumbaraValue);
    } catch (error) {
      console.error("Error updating transaction: ", error);
      throw error;
    }
  };

  const deleteTransaction = async (id: string) => {
    try {
      const transactionRef = doc(db, 'transactions', id);
      await deleteDoc(transactionRef);

      const updatedTransactions = transactions.filter(t => t.id !== id);
      setTransactions(updatedTransactions);
      calculateSummary(updatedTransactions, kumbaraValue);
    } catch (error) {
      console.error("Error deleting transaction: ", error);
      throw error;
    }
  };

  const value = {
    transactions,
    summary,
    loading,
    addTransaction,
    updateTransaction,
    deleteTransaction,
  };

  return <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>;
};

export const useBudget = () => {
  const context = useContext(BudgetContext);
  if (context === undefined) {
    throw new Error('useBudget must be used within a BudgetProvider');
  }
  return context;
};