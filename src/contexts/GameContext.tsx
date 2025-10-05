import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { db as firestore } from '../firebase/config';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

export interface Game {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
}

interface GameContextType {
  games: Game[];
  addGame: (game: Omit<Game, 'id'>) => Promise<void>;
  updateGame: (id: string, game: Partial<Game>) => Promise<void>;
  deleteGame: (id: string) => Promise<void>;
  loading: boolean;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const useGames = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGames must be used within a GameProvider');
  }
  return context;
};

interface GameProviderProps {
  children: ReactNode;
}

export const GameProvider: React.FC<GameProviderProps> = ({ children }) => {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(firestore, 'games'), (snapshot) => {
      const gamesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Game));
      setGames(gamesData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const addGame = async (game: Omit<Game, 'id'>) => {
    await addDoc(collection(firestore, 'games'), game);
  };

  const updateGame = async (id: string, game: Partial<Game>) => {
    await updateDoc(doc(firestore, 'games', id), game);
  };

  const deleteGame = async (id: string) => {
    await deleteDoc(doc(firestore, 'games', id));
  };

  const value = {
    games,
    addGame,
    updateGame,
    deleteGame,
    loading,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};
