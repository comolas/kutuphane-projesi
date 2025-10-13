import React, { createContext, useContext, useEffect } from 'react';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { useAuth } from './AuthContext';

interface LocalNotificationContextType {
  scheduleNotifications: () => Promise<void>;
}

const LocalNotificationContext = createContext<LocalNotificationContextType>({
  scheduleNotifications: async () => {},
});

export const useLocalNotifications = () => useContext(LocalNotificationContext);

export const LocalNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  const scheduleNotifications = async () => {
    if (!Capacitor.isNativePlatform() || !user) return;

    try {
      // Basit test bildirimi
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(18, 0, 0, 0);

      await LocalNotifications.schedule({
        notifications: [{
          id: 1,
          title: '📚 Kütüphane Bildirimi',
          body: 'Bildirimler aktif!',
          schedule: { at: tomorrow },
        }]
      });
    } catch (error) {
      console.error('Schedule error:', error);
    }
  };

  useEffect(() => {
    const initNotifications = async () => {
      if (!Capacitor.isNativePlatform() || !user) return;

      try {
        const permission = await LocalNotifications.requestPermissions();
        if (permission.display === 'granted') {
          await scheduleNotifications();
        }
      } catch (error) {
        console.error('Notification error:', error);
      }
    };

    if (user) {
      setTimeout(() => {
        initNotifications();
      }, 3000);
    }
  }, [user]);

  return (
    <LocalNotificationContext.Provider value={{ scheduleNotifications }}>
      {children}
    </LocalNotificationContext.Provider>
  );
};
