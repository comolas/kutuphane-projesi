import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { collection, doc, setDoc, getDocs, query, where, updateDoc, serverTimestamp, getDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from './AuthContext';

interface Task {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly' | 'progressive';
  xpReward: number;
  completed: boolean;
  completedAt?: Timestamp | Date; // Allow both Timestamp and Date
  userId: string;
  lastReset?: Timestamp | Date; // Allow both Timestamp and Date
  target?: number;
  currentProgress?: number;
  progressType?: 'pages' | 'favorites' | 'borrows';
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  level: number;
  completed: boolean;
  completedAt?: Timestamp | Date; // Allow both Timestamp and Date
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

const getNewTaskTemplate = (
  allTaskTemplates: Omit<Task, 'userId' | 'completed' | 'completedAt' | 'lastReset' | 'currentProgress'>[],
  existingTaskIds: string[],
  type: 'daily' | 'weekly' | 'progressive'
): Omit<Task, 'userId' | 'completed' | 'completedAt' | 'lastReset'> | undefined => {
  const availableTemplates = allTaskTemplates.filter(
    (template) => template.type === type && !existingTaskIds.includes(template.id)
  );
  if (availableTemplates.length > 0) {
    const randomIndex = Math.floor(Math.random() * availableTemplates.length);
    return availableTemplates[randomIndex];
  }
  return undefined;
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

export const TaskProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userProgress, setUserProgress] = useState<UserProgress>({ 
    level: 1, 
    currentXP: 0, 
    nextLevelXP: 100, 
    totalXP: 0 
  });
  const [allTaskTemplatesState, setAllTaskTemplatesState] = useState<Omit<Task, 'userId' | 'completed' | 'completedAt' | 'lastReset' | 'currentProgress'>[]>([]);
  const [achievementTemplatesState, setAchievementTemplatesState] = useState<Omit<Achievement, 'completed' | 'completedAt' | 'userId'>[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    const fetchTemplates = async () => {
      // Fetch task templates
      const taskTemplatesCol = collection(db, 'taskTemplates');
      const taskTemplatesSnapshot = await getDocs(taskTemplatesCol);
      const loadedTaskTemplates = taskTemplatesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Omit<Task, 'userId' | 'completed' | 'completedAt' | 'lastReset' | 'currentProgress'>[];
      setAllTaskTemplatesState(loadedTaskTemplates);

      // Fetch achievement templates
      const achievementTemplatesCol = collection(db, 'achievementTemplates');
      const achievementTemplatesSnapshot = await getDocs(achievementTemplatesCol);
      const loadedAchievementTemplates = achievementTemplatesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Omit<Achievement, 'completed' | 'completedAt' | 'userId'>[];
      setAchievementTemplatesState(loadedAchievementTemplates);
    };

    fetchTemplates();
  }, []); // Run once on mount

  useEffect(() => {
    if (!user) return;

    const loadUserData = async () => {
      // Ensure templates are loaded before initializing tasks
      if (allTaskTemplatesState.length === 0) {
        // This is a simplified approach. A more robust solution might involve a loading state.
        setTimeout(loadUserData, 100); // Retry after a short delay
        return;
      }
      await initializeUserTasks();
      await checkAndResetTasks();
      await loadTasks();
      await loadAchievements();
      await loadUserProgress();
    };

    loadUserData();
  }, [user, allTaskTemplatesState]); // Rerun when templates are loaded

  const initializeUserTasks = async () => {
    if (!user || allTaskTemplatesState.length === 0) return;

    try {
      const tasksRef = collection(db, 'userTasks');
      const q = query(tasksRef, where('userId', '==', user.uid));
      const existingTasks = await getDocs(q);

      if (existingTasks.empty) {
        const batch: Promise<void>[] = [];
        const assignedTaskIds: string[] = [];

        // Assign initial daily tasks (e.g., 2)
        for (let i = 0; i < 2; i++) {
          const newTaskTemplate = getNewTaskTemplate(allTaskTemplatesState, assignedTaskIds, 'daily');
          if (newTaskTemplate) {
            const taskDocRef = doc(collection(db, 'userTasks')); // Let Firestore generate ID
            batch.push(setDoc(taskDocRef, {
              ...newTaskTemplate,
              userId: user.uid,
              completed: false,
              createdAt: serverTimestamp(),
              lastReset: serverTimestamp(),
              currentProgress: newTaskTemplate.currentProgress || 0,
            }));
            assignedTaskIds.push(newTaskTemplate.id);
          }
        }

        // Assign initial weekly tasks (e.g., 1)
        for (let i = 0; i < 1; i++) {
          const newTaskTemplate = getNewTaskTemplate(allTaskTemplatesState, assignedTaskIds, 'weekly');
          if (newTaskTemplate) {
            const taskDocRef = doc(collection(db, 'userTasks')); // Let Firestore generate ID
            batch.push(setDoc(taskDocRef, {
              ...newTaskTemplate,
              userId: user.uid,
              completed: false,
              createdAt: serverTimestamp(),
              lastReset: serverTimestamp(),
              currentProgress: newTaskTemplate.currentProgress || 0,
            }));
            assignedTaskIds.push(newTaskTemplate.id);
          }
        }

        // Assign initial progressive tasks (e.g., 1)
        for (let i = 0; i < 1; i++) {
          const newTaskTemplate = getNewTaskTemplate(allTaskTemplatesState, assignedTaskIds, 'progressive');
          if (newTaskTemplate) {
            const taskDocRef = doc(collection(db, 'userTasks')); // Let Firestore generate ID
            batch.push(setDoc(taskDocRef, {
              ...newTaskTemplate,
              userId: user.uid,
              completed: false,
              createdAt: serverTimestamp(),
              lastReset: serverTimestamp(),
              currentProgress: newTaskTemplate.currentProgress || 0,
            }));
            assignedTaskIds.push(newTaskTemplate.id);
          }
        }

        await Promise.all(batch);
      }
    } catch (error) {
      console.error('Error initializing user tasks:', error);
    }
  };

  const checkAndResetTasks = async () => {
    if (!user || allTaskTemplatesState.length === 0) return;

    try {
      const tasksRef = collection(db, 'userTasks');
      const q = query(tasksRef, where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const currentWeekStart = new Date(today);
      currentWeekStart.setDate(today.getDate() - (today.getDay() || 7)); // Start of current week (Monday)

      const tasksToUpdate: Promise<void>[] = [];
      const tasksToDelete: Promise<void>[] = [];
      const tasksToAdd: Task[] = [];
      const currentTaskTemplates = querySnapshot.docs.map(d => d.data().id);


      querySnapshot.forEach((taskDoc) => {
        const data = taskDoc.data() as Task;
        const lastResetDate = data.lastReset ? (data.lastReset as Timestamp).toDate() : new Date(0);

        let shouldReset = false;
        if (data.type === 'daily') {
          const lastResetDay = new Date(lastResetDate.getFullYear(), lastResetDate.getMonth(), lastResetDate.getDate());
          if (lastResetDay < today) {
            shouldReset = true;
          }
        } else if (data.type === 'weekly') {
          const lastResetWeekStart = new Date(lastResetDate);
          lastResetWeekStart.setDate(lastResetDate.getDate() - (lastResetDate.getDay() || 7));

          if (lastResetWeekStart < currentWeekStart) {
            shouldReset = true;
          }
        }

        if (shouldReset) {
          tasksToDelete.push(deleteDoc(taskDoc.ref)); // Mark old task for deletion

          // Get a new task of the same type
          const newTaskTemplate = getNewTaskTemplate(allTaskTemplatesState, currentTaskTemplates, data.type);
          if (newTaskTemplate) {
            const newTaskDocRef = doc(collection(db, 'userTasks'));
            const newTask: Task = {
              ...newTaskTemplate,
              id: newTaskDocRef.id,
              userId: user.uid,
              completed: false,
              lastReset: new Date(),
              currentProgress: newTaskTemplate.currentProgress || 0,
            };
            tasksToAdd.push(newTask);
            tasksToUpdate.push(setDoc(newTaskDocRef, {
              ...newTask,
              createdAt: serverTimestamp(),
              lastReset: serverTimestamp(),
            }));
          } else {
            console.warn(`No new task template found for type ${data.type} to replace ${data.title} during reset.`);
          }
        } else {
          // Keep existing tasks that don't need reset
          tasksToAdd.push({
            ...data,
            id: taskDoc.id,
            completedAt: data.completedAt ? (data.completedAt as Timestamp).toDate() : undefined,
            lastReset: lastResetDate,
          });
        }
      });

      // Execute all Firestore operations
      await Promise.all([...tasksToUpdate, ...tasksToDelete]);

      // Update local state
      setTasks(tasksToAdd);

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
      
      const loadedTasks: Task[] = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          completedAt: data.completedAt ? (data.completedAt as Timestamp).toDate() : undefined,
          lastReset: data.lastReset ? (data.lastReset as Timestamp).toDate() : undefined,
        } as Task;
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
      
      const loadedAchievements: Achievement[] = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          completedAt: data.completedAt ? (data.completedAt as Timestamp).toDate() : undefined,
        } as Achievement
      });
      
      setAchievements(loadedAchievements);
    } catch (error) {
      console.error('Error loading achievements:', error);
    }
  };

  const loadUserProgress = async () => {
    if (!user) return;
    try {
      const progressRef = doc(db, 'userProgress', user.uid);
      const docSnap = await getDoc(progressRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserProgress(calculateLevel(data.totalXP || 0));
      } else {
        // Initialize if not exists
        await setDoc(progressRef, { totalXP: 0 });
        setUserProgress({ level: 1, currentXP: 0, nextLevelXP: 100, totalXP: 0 });
      }
    } catch (error) {
      console.error('Error loading user progress:', error);
    }
  };

  const completeTask = async (taskId: string) => {
    if (!user) return;

    const taskRef = doc(db, 'userTasks', taskId);
    const taskDoc = await getDoc(taskRef);

    if (taskDoc.exists() && !taskDoc.data().completed) {
      const task = taskDoc.data() as Task;
      await updateDoc(taskRef, {
        completed: true,
        completedAt: serverTimestamp(),
      });

      // Update user's total XP
      const progressRef = doc(db, 'userProgress', user.uid);
      const progressDoc = await getDoc(progressRef);
      const currentTotalXP = progressDoc.exists() ? progressDoc.data().totalXP : 0;
      const newTotalXP = currentTotalXP + task.xpReward;

      await setDoc(progressRef, { totalXP: newTotalXP }, { merge: true });

      // Update local state
      setTasks(prevTasks =>
        prevTasks.map(t =>
          t.id === taskId ? { ...t, completed: true, completedAt: new Date() } : t
        )
      );
      setUserProgress(calculateLevel(newTotalXP));
      
      // Check for new achievements
      await checkAndAwardAchievements(newTotalXP);
    }
  };

  const checkAndAwardAchievements = async (totalXP: number) => {
    if (!user) return;

    const newProgress = calculateLevel(totalXP);
    const userLevel = newProgress.level;

    const unachievedTemplates = achievementTemplatesState.filter(template => {
      const isAchieved = achievements.some(ach => ach.title === template.title); // Assuming title is unique for templates
      return !isAchieved && userLevel >= template.level;
    });

    if (unachievedTemplates.length > 0) {
      const batch: Promise<void>[] = [];
      unachievedTemplates.forEach(template => {
        const achievementDocRef = doc(collection(db, 'userAchievements'));
        batch.push(setDoc(achievementDocRef, {
          ...template,
          userId: user.uid,
          completed: true,
          completedAt: serverTimestamp(),
        }));
      });

      await Promise.all(batch);
      await loadAchievements(); // Reload achievements to update state
    }
  };

  // These functions are not fully implemented based on the provided code,
  // but are kept to satisfy the context type.
  const resetDailyTasks = async () => { console.log("Resetting daily tasks"); };
  const resetWeeklyTasks = async () => { console.log("Resetting weekly tasks"); };


  const value = {
    tasks,
    achievements,
    userProgress,
    completeTask,
    resetDailyTasks,
    resetWeeklyTasks,
    initializeUserTasks,
    checkAndResetTasks,
  };

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
};