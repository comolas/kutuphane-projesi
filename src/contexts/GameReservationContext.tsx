import React, { createContext, useContext, useState, ReactNode } from 'react';
import { db as firestore } from '../firebase/config';
import { collection, addDoc, query, where, getDocs, Timestamp, orderBy, limit, updateDoc, doc } from 'firebase/firestore';
import { useAuth } from './AuthContext';

export interface GameReservation {
  id?: string;
  userId: string;
  gameId: string;
  gameName: string;
  startTime: Timestamp;
  endTime: Timestamp;
  status: 'confirmed' | 'cancelled-by-user' | 'cancelled-by-admin';
  createdAt: Timestamp;
}

interface GameReservationContextType {
  getReservationsForGame: (gameId: string, date: Date) => Promise<GameReservation[]>;
  createReservation: (reservation: Omit<GameReservation, 'id'>) => Promise<void>;
  getUserActiveReservations: (userId: string) => Promise<GameReservation[]>;
  getUserLastReservationForGame: (userId: string, gameId: string) => Promise<GameReservation | null>;
  cancelReservation: (reservationId: string) => Promise<void>;
  getUserReservations: (userId: string) => Promise<GameReservation[]>;
  getAllReservations: () => Promise<GameReservation[]>;
  cancelReservationByAdmin: (reservationId: string) => Promise<void>;
}

const GameReservationContext = createContext<GameReservationContextType | undefined>(undefined);

export const useGameReservations = () => {
  const context = useContext(GameReservationContext);
  if (!context) {
    throw new Error('useGameReservations must be used within a GameReservationProvider');
  }
  return context;
};

interface GameReservationProviderProps {
  children: ReactNode;
}

export const GameReservationProvider: React.FC<GameReservationProviderProps> = ({ children }) => {
  const { user } = useAuth();

  const getReservationsForGame = async (gameId: string, date: Date) => {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const q = query(
      collection(firestore, 'gameReservations'),
      where('gameId', '==', gameId),
      where('status', '==', 'confirmed'),
      where('startTime', '>=', Timestamp.fromDate(startOfDay)),
      where('startTime', '<=', Timestamp.fromDate(endOfDay))
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GameReservation));
  };

  const createReservation = async (reservation: Omit<GameReservation, 'id'>) => {
    await addDoc(collection(firestore, 'gameReservations'), reservation);
  };

  const getUserActiveReservations = async (userId: string) => {
    const now = Timestamp.now();
    const q = query(
      collection(firestore, 'gameReservations'),
      where('status', '==', 'confirmed'),
      where('userId', '==', userId),
      where('endTime', '>', now)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GameReservation));
  };

  const getUserLastReservationForGame = async (userId: string, gameId: string) => {
    const q = query(
      collection(firestore, 'gameReservations'),
      where('userId', '==', userId),
      where('gameId', '==', gameId),
      where('status', 'in', ['confirmed', 'cancelled-by-user']),
      orderBy('endTime', 'desc'),
      limit(1)
    );
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      return null;
    }
    return { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() } as GameReservation;
  };

  const cancelReservation = async (reservationId: string) => {
    const reservationRef = doc(firestore, 'gameReservations', reservationId);
    await updateDoc(reservationRef, {
      status: 'cancelled-by-user'
    });
  };

  const getUserReservations = async (userId: string) => {
    const q = query(
      collection(firestore, 'gameReservations'),
      where('userId', '==', userId),
      orderBy('startTime', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GameReservation));
  };

  const getAllReservations = async () => {
    const q = query(
      collection(firestore, 'gameReservations'),
      orderBy('startTime', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GameReservation));
  };

  const cancelReservationByAdmin = async (reservationId: string) => {
    const reservationRef = doc(firestore, 'gameReservations', reservationId);
    await updateDoc(reservationRef, {
      status: 'cancelled-by-admin'
    });
  };

  const value = {
    getReservationsForGame,
    createReservation,
    getUserActiveReservations,
    getUserLastReservationForGame,
    cancelReservation,
    getUserReservations,
    getAllReservations,
    cancelReservationByAdmin,
  };

  return <GameReservationContext.Provider value={value}>{children}</GameReservationContext.Provider>;
};
