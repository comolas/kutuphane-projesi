import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, doc, setDoc, getDocs, query, where, updateDoc, serverTimestamp, getDoc, addDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from './AuthContext';

interface Task {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly';
  xpReward: number;
  completed: boolean;
  completedAt?: Date;
  userId: string;
  lastReset?: Date;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  level: number;
  completed: boolean;
  completedAt?: Date;
  icon: string;
  userId: string;
}

interface UserProgress {
  level: number;
  currentXP: number;
  nextLevelXP: number;
  totalXP: number;
}

interface TaskContextType {
  tasks: Task[];
  achievements: Achievement[];
  userProgress: UserProgress;
  completeTask: (taskId: string) => Promise<void>;
  resetDailyTasks: () => Promise<void>;
  resetWeeklyTasks: () => Promise<void>;
  initializeUserTasks: () => Promise<void>;
  checkAndResetTasks: () => Promise<void>;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export const useTasks = () => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTasks must be used within a TaskProvider');
  }
  return context;
};

const calculateLevel = (totalXP: number): UserProgress => {
  const baseXP = 100;
  const multiplier = 1.5;
  let level = 1;
  let remainingXP = totalXP;
  let nextLevelXP = baseXP;

  while (remainingXP >= nextLevelXP) {
    remainingXP -= nextLevelXP;
    level++;
    nextLevelXP = Math.floor(baseXP * Math.pow(multiplier, level - 1));
  }

  return {
    level,
    currentXP: remainingXP,
    nextLevelXP,
    totalXP
  };
};

const defaultTasks = [
  {
    id: 'daily-reading',
    title: 'Günlük Okuma',
    description: 'En az 30 dakika kitap okuyun',
    type: 'daily' as const,
    xpReward: 50
  },
  {
    id: 'daily-catalog-browse',
    title: 'Katalog İncelemesi',
    description: 'Kütüphane kataloğunu inceleyin ve yeni kitaplar keşfedin',
    type: 'daily' as const,
    xpReward: 25
  },
  {
    id: 'daily-library-visit',
    title: 'Kütüphane Ziyareti',
    description: 'Kütüphaneyi ziyaret edin ve çalışma alanlarını kullanın',
    type: 'daily' as const,
    xpReward: 40
  },
  {
    id: 'weekly-book-finish',
    title: 'Kitap Bitirme',
    description: 'Bir kitabı tamamlayın',
    type: 'weekly' as const,
    xpReward: 200
  },
  
  {
    id: 'weekly-book-review',
    title: 'Kitap İncelemesi',
    description: 'Okuduğunuz bir kitap hakkında detaylı inceleme yazın',
    type: 'weekly' as const,
    xpReward: 100
  },
  {
    id: 'weekly-research',
    title: 'Araştırma Projesi',
    description: 'Kütüphane kaynaklarını kullanarak bir araştırma projesi yapın',
    type: 'weekly' as const,
    xpReward: 180
  }
];

const achievementTemplates = [
  {
    level: 5,
    title: 'Yeni Başlayan',
    description: '5. seviyeye ulaştığınız için bu başarımı almaya hak kazandınız.',
    icon: '🌱',
    xpReward: 100
  },
  {
    level: 10,
    title: 'Orta Okuyucu',
    description: '10. seviyeye ulaştığınız için bu başarımı almaya hak kazandınız.',
    icon: '📚',
    xpReward: 200
  },
  {
    level: 15,
    title: 'Deneyimli Okuyucu',
    description: '15. seviyeye ulaştığınız için bu başarımı almaya hak kazandınız.',
    icon: '🎓',
    xpReward: 300
  },
  {
    level: 20,
    title: 'Kitap Kurdu',
    description: '20. seviyeye ulaştığınız için bu başarımı almaya hak kazandınız.',
    icon: '🐛',
    xpReward: 400
  },
  {
    level: 25,
    title: 'Bilge Okuyucu',
    description: '25. seviyeye ulaştığınız için bu başarımı almaya hak kazandınız.',
    icon: '🦉',
    xpReward: 500
  },
  {
    level: 30,
    title: 'Kütüphane Ustası',
    description: '30. seviyeye ulaştığınız için bu başarımı almaya hak kazandınız.',
    icon: '👑',
    xpReward: 600
  }
];

export const TaskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userProgress, setUserProgress] = useState<UserProgress>({ 
    level: 1, 
    currentXP: 0, 
    nextLevelXP: 100, 
    totalXP: 0 
  });
  const { user, userData } = useAuth();

  useEffect(() => {
    if (!user) return;

    const loadUserData = async () => {
      await initializeUserTasks();
      await checkAndResetTasks();
      await loadTasks();
      await loadAchievements();
      await loadUserProgress();
    };

    loadUserData();
  }, [user]);

  const initializeUserTasks = async () => {
    if (!user) return;

    try {
      // Check if user already has tasks
      const tasksRef = collection(db, 'userTasks');
      const q = query(tasksRef, where('userId', '==', user.uid));
      const existingTasks = await getDocs(q);

      if (existingTasks.empty) {
        // Create default tasks for new user
        const batch = [];
        for (const task of defaultTasks) {
          const taskRef = doc(db, 'userTasks', `${user.uid}_${task.id}`);
          batch.push(setDoc(taskRef, {
            ...task,
            userId: user.uid,
            completed: false,
            createdAt: serverTimestamp(),
            lastReset: serverTimestamp()
          }));
        }
        await Promise.all(batch);
      }
    } catch (error) {
      console.error('Error initializing user tasks:', error);
    }
  };

  const checkAndResetTasks = async () => {
    if (!user) return;

    try {
      const tasksRef = collection(db, 'userTasks');
      const q = query(tasksRef, where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const currentWeekStart = new Date(today);
      currentWeekStart.setDate(today.getDate() - today.getDay()); // Start of current week (Sunday)

      querySnapshot.forEach(async (taskDoc) => {
        const data = taskDoc.data();
        const lastReset = data.lastReset?.toDate() || new Date(0);
        
        if (data.type === 'daily') {
          const lastResetDate = new Date(lastReset.getFullYear(), lastReset.getMonth(), lastReset.getDate());
          if (lastResetDate < today) {
            // Reset daily task
            await updateDoc(taskDoc.ref, {
              completed: false,
              completedAt: null,
              lastReset: serverTimestamp()
            });
          }
        } else if (data.type === 'weekly') {
          const lastResetWeekStart = new Date(lastReset);
          lastResetWeekStart.setDate(lastReset.getDate() - lastReset.getDay());
          
          if (lastResetWeekStart < currentWeekStart) {
            // Reset weekly task
            await updateDoc(taskDoc.ref, {
              completed: false,
              completedAt: null,
              lastReset: serverTimestamp()
            });
          }
        }
      });
    } catch (error) {
      console.error('Error checking and resetting tasks:', error);
    }
  };

  const loadTasks = async () => {
    if (!user) return;

    try {
      const tasksRef = collection(db, 'userTasks');
      const q = query(tasksRef, where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      
      const loadedTasks: Task[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        loadedTasks.push({
          ...data,
          id: doc.id, // Ensure the Firestore document ID is used
          completedAt: data.completedAt?.toDate(),
          lastReset: data.lastReset?.toDate(),
        } as Task);
      });
      
      setTasks(loadedTasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  const loadAchievements = async () => {
    if (!user) return;

    try {
      const achievementsRef = collection(db, 'userAchievements');
      const q = query(achievementsRef, where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      
      const loadedAchievements: Achievement[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        loadedAchievements.push({
          id: doc.id,
          ...data,
          completedAt: data.completedAt?.toDate(),
        } as Achievement);
      });
      
      setAchievements(loadedAchievements);
    } catch (error) {
      console.error('Error loading achievements:', error);
    }
  };

  const loadUserProgress = async () => {
    if (!user) return;

    try {
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        const totalXP = data.totalXP || 0;
        const progress = calculateLevel(totalXP);
        setUserProgress(progress);
      }
    } catch (error) {
      console.error('Error loading user progress:', error);
    }
  };

  const checkForNewAchievements = async (newLevel: number) => {
    if (!user) return;

    // Check if user reached a milestone level (every 5 levels)
    if (newLevel % 5 === 0) {
      const achievementTemplate = achievementTemplates.find(a => a.level === newLevel);
      if (achievementTemplate) {
        // Check if achievement already exists
        const existingAchievement = achievements.find(a => a.level === newLevel);
        if (!existingAchievement) {
          try {
            // Create new achievement
            const achievementRef = await addDoc(collection(db, 'userAchievements'), {
              title: achievementTemplate.title,
              description: achievementTemplate.description,
              icon: achievementTemplate.icon,
              xpReward: achievementTemplate.xpReward,
              level: achievementTemplate.level,
              completed: true,
              completedAt: serverTimestamp(),
              userId: user.uid
            });

            // Add to local state
            const newAchievement: Achievement = {
              id: achievementRef.id,
              title: achievementTemplate.title,
              description: achievementTemplate.description,
              icon: achievementTemplate.icon,
              xpReward: achievementTemplate.xpReward,
              level: achievementTemplate.level,
              completed: true,
              completedAt: new Date(),
              userId: user.uid
            };

            setAchievements(prev => [...prev, newAchievement]);

            // Show achievement notification
            alert(`🏆 Yeni Başarım Kazandınız!\n\n${achievementTemplate.title}\n${achievementTemplate.description}\n\n+${achievementTemplate.xpReward} XP`);
          } catch (error) {
            console.error('Error creating achievement:', error);
          }
        }
      }
    }
  };

  const completeTask = async (taskId: string) => {
    if (!user) return;

    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task || task.completed) return;

      // Mark task as completed
      const taskRef = doc(db, 'userTasks', taskId);
      await updateDoc(taskRef, {
        completed: true,
        completedAt: serverTimestamp(),
      });

      // Update user XP
      const userRef = doc(db, 'users', user.uid);
      const newTotalXP = userProgress.totalXP + task.xpReward;
      const newProgress = calculateLevel(newTotalXP);
      
      await updateDoc(userRef, {
        totalXP: newTotalXP,
        level: newProgress.level,
      });

      // Update local state
      setTasks(prev => prev.map(t => 
        t.id === taskId 
          ? { ...t, completed: true, completedAt: new Date() }
          : t
      ));

      setUserProgress(newProgress);

      // Show level up notification if applicable
      if (newProgress.level > userProgress.level) {
        alert(`🎉 Tebrikler! Seviye ${newProgress.level}'e yükseldiniz!`);
        
        // Check for new achievements
        await checkForNewAchievements(newProgress.level);
      }
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  const resetDailyTasks = async () => {
    if (!user) return;

    try {
      const dailyTasks = tasks.filter(t => t.type === 'daily');
      
      for (const task of dailyTasks) {
        const taskRef = doc(db, 'userTasks', task.id);
        await updateDoc(taskRef, {
          completed: false,
          completedAt: null,
          lastReset: serverTimestamp()
        });
      }

      setTasks(prev => prev.map(t => 
        t.type === 'daily'
          ? { ...t, completed: false, completedAt: undefined, lastReset: new Date() }
          : t
      ));
    } catch (error) {
      console.error('Error resetting daily tasks:', error);
    }
  };

  const resetWeeklyTasks = async () => {
    if (!user) return;

    try {
      const weeklyTasks = tasks.filter(t => t.type === 'weekly');
      
      for (const task of weeklyTasks) {
        const taskRef = doc(db, 'userTasks', task.id);
        await updateDoc(taskRef, {
          completed: false,
          completedAt: null,
          lastReset: serverTimestamp()
        });
      }

      setTasks(prev => prev.map(t => 
        t.type === 'weekly'
          ? { ...t, completed: false, completedAt: undefined, lastReset: new Date() }
          : t
      ));
    } catch (error) {
      console.error('Error resetting weekly tasks:', error);
    }
  };

  return (
    <TaskContext.Provider value={{
      tasks,
      achievements,
      userProgress,
      completeTask,
      resetDailyTasks,
      resetWeeklyTasks,
      initializeUserTasks,
      checkAndResetTasks,
    }}>
      {children}
    </TaskContext.Provider>
  );
};