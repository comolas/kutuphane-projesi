import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, doc, setDoc, getDocs, query, where, updateDoc, serverTimestamp, getDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from './AuthContext';

interface Task {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly' | 'progressive';
  xpReward: number;
  completed: boolean;
  completedAt?: Date;
  userId: string;
  lastReset?: Date;
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

const getNewTaskTemplate = (existingTaskIds: string[], type: 'daily' | 'weekly' | 'progressive'): Omit<Task, 'userId' | 'completed' | 'completedAt' | 'lastReset'> | undefined => {
  const availableTemplates = allTaskTemplatesState.filter(
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





export const TaskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
  const { user, userData } = useAuth();

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
      const tasksRef = collection(db, 'userTasks');
      const q = query(tasksRef, where('userId', '==', user.uid));
      const existingTasks = await getDocs(q);

      if (existingTasks.empty) {
        const batch = [];
        const assignedTaskIds: string[] = [];

        // Assign initial daily tasks (e.g., 2)
        for (let i = 0; i < 2; i++) {
          const newTaskTemplate = getNewTaskTemplate(assignedTaskIds, 'daily');
          if (newTaskTemplate) {
            const taskRef = doc(db, 'userTasks', `${user.uid}_${newTaskTemplate.id}`);
            batch.push(setDoc(taskRef, {
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
          const newTaskTemplate = getNewTaskTemplate(assignedTaskIds, 'weekly');
          if (newTaskTemplate) {
            const taskRef = doc(db, 'userTasks', `${user.uid}_${newTaskTemplate.id}`);
            batch.push(setDoc(taskRef, {
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
          const newTaskTemplate = getNewTaskTemplate(assignedTaskIds, 'progressive');
          if (newTaskTemplate) {
            const taskRef = doc(db, 'userTasks', `${user.uid}_${newTaskTemplate.id}`);
            batch.push(setDoc(taskRef, {
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
    if (!user) return;

    try {
      const tasksRef = collection(db, 'userTasks');
      const q = query(tasksRef, where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const currentWeekStart = new Date(today);
      currentWeekStart.setDate(today.getDate() - today.getDay()); // Start of current week (Sunday)

      const tasksToUpdate: Promise<void>[] = [];
      const tasksToDelete: string[] = [];
      const tasksToAdd: Task[] = [];
      const currentActiveTaskIds = tasks.map(t => t.id);

      querySnapshot.forEach((taskDoc) => {
        const data = taskDoc.data() as Task; // Cast to Task for type safety
        const lastReset = data.lastReset?.toDate() || new Date(0);

        let shouldReset = false;
        if (data.type === 'daily') {
          const lastResetDate = new Date(lastReset.getFullYear(), lastReset.getMonth(), lastReset.getDate());
          if (lastResetDate < today) {
            shouldReset = true;
          }
        } else if (data.type === 'weekly') {
          const lastResetWeekStart = new Date(lastReset);
          lastResetWeekStart.setDate(lastReset.getDate() - lastReset.getDay());

          if (lastResetWeekStart < currentWeekStart) {
            shouldReset = true;
          }
        }

        if (shouldReset) {
          tasksToDelete.push(taskDoc.id); // Mark old task for deletion

          // Get a new task of the same type
          const newTaskTemplate = getNewTaskTemplate(currentActiveTaskIds.concat(tasksToAdd.map(t => t.id)), data.type);
          if (newTaskTemplate) {
            const newTaskId = `${user.uid}_${newTaskTemplate.id}_${Date.now()}`; // Unique ID for the new task
            const newTask: Task = {
              ...newTaskTemplate,
              id: newTaskId,
              userId: user.uid,
              completed: false,
              createdAt: new Date(),
              lastReset: new Date(),
              currentProgress: newTaskTemplate.currentProgress || 0,
            } as Task;
            tasksToAdd.push(newTask);
            tasksToUpdate.push(setDoc(doc(db, 'userTasks', newTaskId), {
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
            id: taskDoc.id,
            ...data,
            completedAt: data.completedAt?.toDate(),
            lastReset: data.lastReset?.toDate(),
          } as Task);
        }
      });

      // Execute all Firestore operations
      await Promise.all(tasksToUpdate);
      for (const taskId of tasksToDelete) {
        await deleteDoc(doc(db, 'userTasks', taskId));
      }

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
      const achievementTemplate = achievementTemplatesState.find(a => a.level === newLevel);
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

      // --- Dynamic Task Replacement Logic ---
      let updatedTasks = tasks.map(t =>
        t.id === taskId
          ? { ...t, completed: true, completedAt: new Date() }
          : t
      );

      if (task.type === 'daily' || task.type === 'weekly') {
        // Find a new task of the same type
        const existingTaskIds = updatedTasks.map(t => t.id);
        const newTaskTemplate = getNewTaskTemplate(existingTaskIds, task.type);

        if (newTaskTemplate) {
          // Remove the completed task and add the new one
          updatedTasks = updatedTasks.filter(t => t.id !== taskId);

          const newTaskId = `${user.uid}_${newTaskTemplate.id}_${Date.now()}`; // Unique ID for the new task
          const newTask: Task = {
            ...newTaskTemplate,
            id: newTaskId,
            userId: user.uid,
            completed: false,
            createdAt: new Date(),
            lastReset: new Date(),
            currentProgress: newTaskTemplate.currentProgress || 0,
          } as Task;

          const newTaskRef = doc(db, 'userTasks', newTaskId);
          await setDoc(newTaskRef, {
            ...newTask,
            createdAt: serverTimestamp(),
            lastReset: serverTimestamp(),
          });

          updatedTasks.push(newTask);
        } else {
          console.warn(`No new task template found for type ${task.type} to replace ${task.title}.`);
        }
      }
      // Progressive tasks are not replaced immediately upon completion,
      // they just stay completed. New progressive tasks are assigned during initialization or specific events.

      setTasks(updatedTasks);
      setUserProgress(newProgress);

      // Show level up notification if applicable
      if (newProgress.level > userProgress.level) {
        alert(`🎉 Tebrikler! Seviye ${newProgress.level}'e yükseldiniz!`);
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