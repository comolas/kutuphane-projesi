import React, { createContext, useState, useEffect, useContext, useMemo } from 'react';
import { useAuth } from './AuthContext';

interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userData } = useAuth();
  const [theme, setThemeState] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // Always set theme to light, effectively removing dark mode
    setThemeState('light');
  }, [userData]);

  useEffect(() => {
    const root = window.document.documentElement;
    // Ensure only 'light' class is ever applied
    root.classList.remove('dark');
    root.classList.add('light');
  }, [theme]);

  const toggleTheme = () => {
    // No-op: Dark mode is removed, so toggling does nothing
    setThemeState('light');
  };

  const setTheme = (newTheme: 'light' | 'dark') => {
    // Always set theme to light, effectively removing dark mode
    setThemeState('light');
  };

  const value = useMemo(() => ({ theme, toggleTheme, setTheme }), [theme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
