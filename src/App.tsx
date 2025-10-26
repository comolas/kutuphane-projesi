import React, { useState, useEffect, lazy, Suspense } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import ErrorBoundary from './components/common/ErrorBoundary';
import LoadingSpinner from './components/common/LoadingSpinner';
import SplashScreen from './components/SplashScreen';
import Onboarding from './components/Onboarding';
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
import { CollectionProvider } from './contexts/CollectionContext';
import { BudgetProvider } from './contexts/BudgetContext';
import { GameProvider } from './contexts/GameContext';
import { GameReservationProvider } from './contexts/GameReservationContext';
import { AlertProvider } from './contexts/AlertContext';
import { SpinWheelProvider } from './contexts/SpinWheelContext';
import { CouponProvider } from './contexts/CouponContext';
import { LocalNotificationProvider } from './contexts/LocalNotificationContext';
import { ChatProvider } from './contexts/ChatContext';
import { ShopProvider } from './contexts/ShopContext';
import { useContentNotifications } from './hooks/useContentNotifications';
import { useMobileUpdate } from './hooks/useMobileUpdate';
import MobileUpdateModal from './components/common/MobileUpdateModal';
import Header from './components/layout/Header';
import AdminHeader from './components/layout/AdminHeader';
import Footer from './components/layout/Footer';
import LoginPage from './pages/LoginPage';

// Lazy loaded pages
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const SuperAdminDashboard = lazy(() => import('./pages/admin/SuperAdminDashboard'));
const CampusManagementPage = lazy(() => import('./pages/admin/CampusManagementPage'));
const UserManagementPage = lazy(() => import('./pages/admin/UserManagementPage'));
const GlobalReportsPage = lazy(() => import('./pages/admin/GlobalReportsPage'));
const GlobalSettingsPage = lazy(() => import('./pages/admin/GlobalSettingsPage'));
const PageManagementPage = lazy(() => import('./pages/admin/PageManagementPage'));
const UserDashboard = lazy(() => import('./pages/UserDashboard'));
const TeacherDashboard = lazy(() => import('./pages/TeacherDashboard'));
const MyEventsPage = lazy(() => import('./pages/MyEventsPage'));
const RequestsPage = lazy(() => import('./pages/RequestsPage'));
const CatalogPage = lazy(() => import('./pages/CatalogPage'));
const MagazinesPage = lazy(() => import('./pages/MagazinesPage'));
const BorrowedBooksPage = lazy(() => import('./pages/BorrowedBooksPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const FinesPage = lazy(() => import('./pages/FinesPage'));
const CollectionDistributionPage = lazy(() => import('./pages/CollectionDistributionPage'));
const FavoritesPage = lazy(() => import('./pages/FavoritesPage'));
const AuthorsPage = lazy(() => import('./pages/AuthorsPage'));
const AuthorDetailsPage = lazy(() => import('./pages/AuthorDetailsPage'));
const ProgressPage = lazy(() => import('./pages/ProgressPage'));
const UserBorrowsDetailPage = lazy(() => import('./pages/admin/UserBorrowsDetailPage'));
const GamesPage = lazy(() => import('./pages/GamesPage'));
const GameReservationPage = lazy(() => import('./pages/GameReservationPage'));
const MyGameReservationsPage = lazy(() => import('./pages/MyGameReservationsPage'));
const MyAppointments = lazy(() => import('./pages/MyAppointments'));
const BlogPage = lazy(() => import('./pages/BlogPage'));
const SinglePostPage = lazy(() => import('./pages/SinglePostPage'));
const CreatePostPage = lazy(() => import('./pages/CreatePostPage'));
const MyPostsPage = lazy(() => import('./pages/MyPostsPage'));
const MyCoupons = lazy(() => import('./pages/user/MyCoupons'));
const MyClassPage = lazy(() => import('./pages/MyClassPage'));
const TeacherReportsPage = lazy(() => import('./pages/TeacherReportsPage'));
const StudentComparePage = lazy(() => import('./pages/StudentComparePage'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
const ShopPage = lazy(() => import('./pages/ShopPage'));
const MyOrdersPage = lazy(() => import('./pages/MyOrdersPage'));

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-lg font-semibold text-gray-700">Yükleniyor...</p>
        </div>
      </div>
    );
  }
  
  return user ? <>{children}</> : <Navigate to="/login" replace />;
};

const AppContent = () => {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const isAdminPath = location.pathname === '/admin' || location.pathname.startsWith('/admin/');
  const isSuperAdminPath = location.pathname.startsWith('/super-admin');
  const showHeader = location.pathname !== '/login' && !isAdminPath && !isSuperAdminPath && !location.pathname.startsWith('/teacher');
  const showAdminHeader = isAdminPath && !isSuperAdminPath;
  
  useContentNotifications();
  const { updateInfo, showModal, handleUpdate, handleClose } = useMobileUpdate();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {showHeader && <Header isDarkMode={theme === 'dark'} toggleDarkMode={toggleTheme} />}
      {showAdminHeader && <AdminHeader isDarkMode={theme === 'dark'} toggleDarkMode={toggleTheme} />}
      {updateInfo && (
        <MobileUpdateModal
          isOpen={showModal}
          version={updateInfo.version}
          downloadUrl={updateInfo.downloadUrl}
          forceUpdate={updateInfo.forceUpdate}
          onClose={handleClose}
          onUpdate={handleUpdate}
        />
      )}
      <main className={showHeader ? "pt-16" : ""}>
        <Suspense fallback={<LoadingSpinner fullScreen size="xl" text="Sayfa yükleniyor..." variant="book" />}>
          <Routes>
          <Route path="/login" element={<LoginPage isDarkMode={theme === 'dark'} />} />
          <Route path="/admin" element={<PrivateRoute><AdminDashboard /></PrivateRoute>} />
          <Route path="/super-admin" element={<PrivateRoute><SuperAdminDashboard /></PrivateRoute>} />
          <Route path="/super-admin/campuses" element={<PrivateRoute><CampusManagementPage /></PrivateRoute>} />
          <Route path="/super-admin/users" element={<PrivateRoute><UserManagementPage /></PrivateRoute>} />
          <Route path="/super-admin/reports" element={<PrivateRoute><GlobalReportsPage /></PrivateRoute>} />
          <Route path="/super-admin/page-management" element={<PrivateRoute><PageManagementPage /></PrivateRoute>} />
          <Route path="/super-admin/settings" element={<PrivateRoute><GlobalSettingsPage /></PrivateRoute>} />
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
          <Route path="/games" element={<PrivateRoute><GamesPage /></PrivateRoute>} />
          <Route path="/games/:id" element={<PrivateRoute><GameReservationPage /></PrivateRoute>} />
          <Route path="/my-game-reservations" element={<PrivateRoute><MyGameReservationsPage /></PrivateRoute>} />
          <Route path="/my-appointments" element={<PrivateRoute><MyAppointments /></PrivateRoute>} />
          <Route path="/blog" element={<PrivateRoute><BlogPage /></PrivateRoute>} />
          <Route path="/blog/:postId" element={<PrivateRoute><SinglePostPage /></PrivateRoute>} />
          <Route path="/create-post" element={<PrivateRoute><CreatePostPage /></PrivateRoute>} />
          <Route path="/my-posts" element={<PrivateRoute><MyPostsPage /></PrivateRoute>} />
          <Route path="/my-coupons" element={<PrivateRoute><MyCoupons /></PrivateRoute>} />
          <Route path="/teacher-dashboard" element={<PrivateRoute><TeacherDashboard /></PrivateRoute>} />
          <Route path="/my-class" element={<PrivateRoute><MyClassPage /></PrivateRoute>} />
          <Route path="/teacher/reports" element={<PrivateRoute><TeacherReportsPage /></PrivateRoute>} />
          <Route path="/student-compare" element={<PrivateRoute><StudentComparePage /></PrivateRoute>} />
          <Route path="/chat" element={<PrivateRoute><ChatPage /></PrivateRoute>} />
          <Route path="/chat/:conversationId" element={<PrivateRoute><ChatPage /></PrivateRoute>} />
          <Route path="/shop" element={<PrivateRoute><ShopPage /></PrivateRoute>} />
          <Route path="/my-orders" element={<PrivateRoute><MyOrdersPage /></PrivateRoute>} />
          <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    // Check if this is the first load
    const hasSeenSplash = sessionStorage.getItem('hasSeenSplash');
    if (hasSeenSplash) {
      setShowSplash(false);
    }
  }, []);

  const handleSplashFinish = () => {
    sessionStorage.setItem('hasSeenSplash', 'true');
    setShowSplash(false);
    
    // Check if user has seen onboarding before
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    }
  };

  const handleOnboardingFinish = () => {
    localStorage.setItem('hasSeenOnboarding', 'true');
    setShowOnboarding(false);
  };

  if (showSplash) {
    return <SplashScreen onFinish={handleSplashFinish} />;
  }

  if (showOnboarding) {
    return <Onboarding onFinish={handleOnboardingFinish} />;
  }

  return (
    <ErrorBoundary>
      <Router>
        <AlertProvider>
        <AuthProvider>
          <ShopProvider>
            <ChatProvider>
              <SpinWheelProvider>
                <CouponProvider>
                  <AuthorProvider>
                    <EventProvider>
                      <GoalsProvider>
                        <BookProvider>
                          <LocalNotificationProvider>
                            <TaskProvider>
                              <AssistantProvider>
                                <ThemeProvider>
                                  <SettingsProvider>
                                    <ReviewProvider>
                                      <MagazineProvider>
                                        <CollectionProvider>
                                          <BudgetProvider>
                                            <GameProvider>
                                              <GameReservationProvider>
                                                <AppContent />
                                              </GameReservationProvider>
                                            </GameProvider>
                                          </BudgetProvider>
                                        </CollectionProvider>
                                      </MagazineProvider>
                                    </ReviewProvider>
                                  </SettingsProvider>
                                </ThemeProvider>
                              </AssistantProvider>
                            </TaskProvider>
                          </LocalNotificationProvider>
                        </BookProvider>
                      </GoalsProvider>
                    </EventProvider>
                  </AuthorProvider>
                </CouponProvider>
              </SpinWheelProvider>
            </ChatProvider>
          </ShopProvider>
        </AuthProvider>
        </AlertProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;