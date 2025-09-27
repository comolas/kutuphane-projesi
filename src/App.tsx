import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { EventProvider } from './contexts/EventContext';
import { BookProvider } from './contexts/BookContext';
import { TaskProvider } from './contexts/TaskContext';
import { AssistantProvider } from './contexts/AssistantContext';
import { GoalsProvider } from './contexts/GoalsContext';
import { AuthorProvider } from './contexts/AuthorContext';
import { MagazineProvider } from './contexts/MagazineContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { ReviewProvider } from './contexts/ReviewContext';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import UserDashboard from './pages/UserDashboard';
import MyEventsPage from './pages/MyEventsPage';
import RequestsPage from './pages/RequestsPage';
import CatalogPage from './pages/CatalogPage';
import MagazinesPage from './pages/MagazinesPage';
import BorrowedBooksPage from './pages/BorrowedBooksPage';
import SettingsPage from './pages/SettingsPage';
import FinesPage from './pages/FinesPage';
import CollectionDistributionPage from './pages/CollectionDistributionPage';
import FavoritesPage from './pages/FavoritesPage';
import AuthorsPage from './pages/AuthorsPage';
import AuthorDetailsPage from './pages/AuthorDetailsPage';
import ProgressPage from './pages/ProgressPage';
import UserBorrowsDetailPage from './pages/admin/UserBorrowsDetailPage';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div>Yükleniyor...</div>;
  }
  
  return user ? <>{children}</> : <Navigate to="/login" replace />;
};

const AppContent = () => {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const showHeader = location.pathname !== '/login' && location.pathname !== '/admin';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {showHeader && <Header isDarkMode={theme === 'dark'} toggleDarkMode={toggleTheme} />}
      <main className={showHeader ? "pt-16" : ""}>
        <Routes>
          <Route path="/login" element={<LoginPage isDarkMode={theme === 'dark'} />} />
          <Route path="/admin" element={<PrivateRoute><AdminDashboard /></PrivateRoute>} />
          <Route path="/dashboard" element={<PrivateRoute><UserDashboard /></PrivateRoute>} />
          <Route path="/my-events" element={<PrivateRoute><MyEventsPage /></PrivateRoute>} />
          <Route path="/requests" element={<PrivateRoute><RequestsPage /></PrivateRoute>} />
          <Route path="/catalog" element={<PrivateRoute><CatalogPage /></PrivateRoute>} />
          <Route path="/dergiler" element={<PrivateRoute><MagazinesPage /></PrivateRoute>} />
          <Route path="/borrowed-books" element={<PrivateRoute><BorrowedBooksPage /></PrivateRoute>} />
          <Route path="/settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
          <Route path="/fines" element={<PrivateRoute><FinesPage /></PrivateRoute>} />
          <Route path="/favorites" element={<PrivateRoute><FavoritesPage /></PrivateRoute>} />
          <Route path="/collection-distribution" element={<PrivateRoute><CollectionDistributionPage /></PrivateRoute>} />
          <Route path="/yazarlar" element={<PrivateRoute><AuthorsPage /></PrivateRoute>} />
          <Route path="/author/:id" element={<PrivateRoute><AuthorDetailsPage /></PrivateRoute>} />
          <Route path="/progress" element={<PrivateRoute><ProgressPage /></PrivateRoute>} />
          <Route path="/admin/borrowed-by/:userId" element={<PrivateRoute><UserBorrowsDetailPage /></PrivateRoute>} />
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AuthorProvider>
          <EventProvider>
            <GoalsProvider>
              <BookProvider>
                <TaskProvider>
                  <AssistantProvider>
                    <ThemeProvider>
                      <SettingsProvider>
                        <ReviewProvider>
                          <MagazineProvider>
                            <AppContent />
                          </MagazineProvider>
                        </ReviewProvider>
                      </SettingsProvider>
                    </ThemeProvider>
                  </AssistantProvider>
                </TaskProvider>
              </BookProvider>
            </GoalsProvider>
          </EventProvider>
        </AuthorProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;