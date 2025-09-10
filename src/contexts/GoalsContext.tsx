import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, increment } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from './AuthContext';

interface Goal {
  type: 'monthly' | 'yearly';
  year: number;
  month?: number;
  goal: number;
  progress: number;
}

interface GoalsContextType {
  monthlyGoal: Goal | null;
  yearlyGoal: Goal | null;
  fetchGoals: () => Promise<void>;
  saveGoal: (goal: Omit<Goal, 'progress'>) => Promise<void>;
  updateGoalProgress: (bookCount: number) => Promise<void>;
  showConfetti: boolean;
  resetConfetti: () => void;
}

const GoalsContext = createContext<GoalsContextType | undefined>(undefined);

export const useGoals = () => {
  const context = useContext(GoalsContext);
  if (!context) {
    throw new Error('useGoals must be used within a GoalsProvider');
  }
  return context;
};

export const GoalsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [monthlyGoal, setMonthlyGoal] = useState<Goal | null>(null);
  const [yearlyGoal, setYearlyGoal] = useState<Goal | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const { user } = useAuth();

  const fetchGoals = useCallback(async () => {
    if (!user) return;

    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;

    const monthlyGoalRef = doc(db, 'readingGoals', `${user.uid}_${year}_${month}_monthly`);
    const yearlyGoalRef = doc(db, 'readingGoals', `${user.uid}_${year}_yearly`);

    const monthlyGoalSnap = await getDoc(monthlyGoalRef);
    if (monthlyGoalSnap.exists()) {
      setMonthlyGoal(monthlyGoalSnap.data() as Goal);
    }

    const yearlyGoalSnap = await getDoc(yearlyGoalRef);
    if (yearlyGoalSnap.exists()) {
      setYearlyGoal(yearlyGoalSnap.data() as Goal);
    }
  }, [user]);

  const saveGoal = useCallback(async (newGoal: Omit<Goal, 'progress' | 'userId' | 'createdAt'>) => {
    if (!user) return;

    const goalId = newGoal.type === 'yearly'
      ? `${user.uid}_${newGoal.year}_yearly`
      : `${user.uid}_${newGoal.year}_${newGoal.month}_monthly`;

    const goalRef = doc(db, 'readingGoals', goalId);
    const goalData = { ...newGoal, progress: 0, userId: user.uid, createdAt: serverTimestamp() };

    await setDoc(goalRef, goalData, { merge: true });

    if (newGoal.type === 'monthly') {
      setMonthlyGoal(goalData as Goal);
    } else {
      setYearlyGoal(goalData as Goal);
    }
  }, [user]);

  const updateGoalProgress = useCallback(async (bookCount: number) => {
    if (!user) return;

    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;

    const monthlyGoalRef = doc(db, 'readingGoals', `${user.uid}_${year}_${month}_monthly`);
    const yearlyGoalRef = doc(db, 'readingGoals', `${user.uid}_${year}_yearly`);

    const monthlyGoalSnap = await getDoc(monthlyGoalRef);
    if (monthlyGoalSnap.exists()) {
      const monthlyGoalData = monthlyGoalSnap.data() as Goal;
      await updateDoc(monthlyGoalRef, { progress: increment(bookCount) });
      setMonthlyGoal(prev => prev ? { ...prev, progress: prev.progress + bookCount } : null);
      if (monthlyGoalData.progress + bookCount >= monthlyGoalData.goal) {
        setShowConfetti(true);
      }
    }

    const yearlyGoalSnap = await getDoc(yearlyGoalRef);
    if (yearlyGoalSnap.exists()) {
      const yearlyGoalData = yearlyGoalSnap.data() as Goal;
      await updateDoc(yearlyGoalRef, { progress: increment(bookCount) });
      setYearlyGoal(prev => prev ? { ...prev, progress: prev.progress + bookCount } : null);
      if (yearlyGoalData.progress + bookCount >= yearlyGoalData.goal) {
        setShowConfetti(true);
      }
    }
  }, [user]);

  const resetConfetti = useCallback(() => {
    setShowConfetti(false);
  }, []);

  useEffect(() => {
    if (user) {
      fetchGoals();
    }
  }, [user, fetchGoals]);

  return (
    <GoalsContext.Provider value={{ monthlyGoal, yearlyGoal, fetchGoals, saveGoal, updateGoalProgress, showConfetti, resetConfetti }}>
      {children}
    </GoalsContext.Provider>
  );
};