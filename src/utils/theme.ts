export type Theme = 'light' | 'dark';

export const getInitialTheme = (): Theme => {
  // Check for saved theme preference in localStorage
  const savedTheme = localStorage.getItem('theme') as Theme | null;
  
  if (savedTheme && ['light', 'dark'].includes(savedTheme)) {
    return savedTheme as Theme;
  }
  
  // Check for user system preference
  const userPrefersDark = window.matchMedia && 
    window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  return userPrefersDark ? 'dark' : 'light';
};

export const setTheme = (theme: Theme) => {
  const root = window.document.documentElement;
  
  // Remove the previous theme class
  root.classList.remove('light', 'dark');
  
  // Add the new theme class
  root.classList.add(theme);
  
  // Update localStorage
  localStorage.setItem('theme', theme);
};

export const toggleTheme = (currentTheme: Theme): Theme => {
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  setTheme(newTheme);
  return newTheme;
};