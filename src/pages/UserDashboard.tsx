import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Book, Clock, BookOpen, Menu, X, Home, Library, BookOpen as BookIcon, Settings, LogOut, Calendar, Bell, MessageSquare, ScrollText, DollarSign, Quote, Search, PieChart, MapPin, ExternalLink, Heart, Target, Star, BookPlus, AlertCircle, Gamepad2, Users, BarChart, ShoppingBag, Package } from 'lucide-react';
import { useSpinWheel } from '../contexts/SpinWheelContext';
import UpdateButton from '../components/common/UpdateButton';

const SpinWheelModal = lazy(() => import('../components/user/SpinWheelModal'));
const OnboardingTour = lazy(() => import('../components/onboarding/OnboardingTour'));
const PersonalizationQuestions = lazy(() => import('../components/PersonalizationQuestions'));
const ItemDetailsModal = lazy(() => import('../components/common/ItemDetailsModal'));
const ReadingGoalsModal = lazy(() => import('../components/common/ReadingGoalsModal'));
const ItemSlider = lazy(() => import('../components/common/ItemSlider'));
const Leaderboard = lazy(() => import('../components/dashboard/Leaderboard'));
const ChatBot = lazy(() => import('../components/ChatBot'));
const EnhancedBookCarousel = lazy(() => import('../components/common/EnhancedBookCarousel'));

import { useBooks } from '../contexts/BookContext';
import { useAuth } from '../contexts/AuthContext';
import { useGoals } from '../contexts/GoalsContext';
import { useAuthors } from '../contexts/AuthorContext';
import { useEvents } from '../contexts/EventContext';
import { doc, updateDoc, collection, query, where, getDocs, addDoc, Timestamp, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { getDailyQuote } from '../utils/quotes';
import { Event, Survey, Announcement, Request as RequestType, Book as BookType } from '../types';

import { useAlert } from '../contexts/AlertContext';

const UserDashboard: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, userData, isAdmin, isTeacher } = useAuth();
  const { showAlert } = useAlert();
  
  const { borrowedBooks, allBooks, borrowBook, recommendedBooks, fetchRecommendedBooks, getBookStatus } = useBooks();
  const [favoriteBookIds, setFavoriteBookIds] = useState<string[]>([]);
  const { monthlyGoal, yearlyGoal, fetchGoals, showConfetti, resetConfetti } = useGoals();
  const { featuredAuthor, featuredAuthorBooks } = useAuthors();
  const { allItems, fetchAllItems, joinedEvents, joinEvent } = useEvents();
  const [userRequests, setUserRequests] = useState<RequestType[]>([]);

  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showReadingGoalsModal, setShowReadingGoalsModal] = useState(false);
  const [showCongratulatoryModal, setShowCongratulatoryModal] = useState(false);
  const [dailyQuote, setDailyQuote] = useState<{text: string, author: string, book: string} | null>(null);
  const [currentRecSlide, setCurrentRecSlide] = useState(0);

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showPersonalization, setShowPersonalization] = useState(false);
  const [showItemDetailsModal, setShowItemDetailsModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Event | Survey | Announcement | null>(null);
  const [showSpinModal, setShowSpinModal] = useState(false);
  const { canSpin } = useSpinWheel();
  const [campusName, setCampusName] = useState<string>('');

  useEffect(() => {
    if (!userData?.campusId) return;
    const fetchCampusName = async () => {
      try {
        const campusDoc = await getDoc(doc(db, 'campuses', userData.campusId));
        if (campusDoc.exists()) {
          setCampusName(campusDoc.data().name || '');
        }
      } catch (error) {
        console.error('Kampüs bilgisi alınırken hata:', error);
      }
    };
    fetchCampusName();
  }, [userData?.campusId]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('userDashboard.greeting.morning');
    if (hour < 18) return t('userDashboard.greeting.afternoon');
    return t('userDashboard.greeting.evening');
  };

  useEffect(() => {
    if (!user) return;
    const fetchUserRequests = async () => {
      const requestsRef = collection(db, 'requests');
      const q = query(requestsRef, where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      const requestsData = querySnapshot.docs.map(doc => doc.data() as RequestType);
      setUserRequests(requestsData);
    };
    fetchUserRequests();
  }, [user?.uid]);

  const summaryStats = useMemo(() => {
    const activeBooks = borrowedBooks.filter(b => b.returnStatus !== 'returned');
    const nextDueBook = activeBooks.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];
    
    let dueDateStatus = 'safe';
    let dueDateText = t('userDashboard.upcomingDue');
    if (nextDueBook) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dueDate = new Date(nextDueBook.dueDate);
      dueDate.setHours(0, 0, 0, 0);

      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        dueDateStatus = 'overdue';
        dueDateText = t('userDashboard.overdue');
      } else if (diffDays <= 3) {
        dueDateStatus = 'dueSoon';
      }
    }

    const totalFine = borrowedBooks.reduce((sum, book) => {
        if (book.fineStatus === 'paid') return sum;
        const today = new Date();
        const diffTime = today.getTime() - new Date(book.dueDate).getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const fine = diffDays > 0 ? diffDays * 5 : 0;
        return sum + fine;
    }, 0);
    const pendingRequestsCount = userRequests.filter(r => r.status === 'pending' || r.status === 'in-progress').length;

    return {
      activeBooksCount: activeBooks.length,
      nextDueBook,
      totalFine,
      pendingRequestsCount,
      dueDateStatus,
      dueDateText
    }
  }, [borrowedBooks, userRequests]);

  const handleOpenItemModal = (item: Event | Survey | Announcement) => {
    setSelectedItem(item);
    setShowItemDetailsModal(true);
  };

  const handleCloseItemModal = () => {
    setSelectedItem(null);
    setShowItemDetailsModal(false);
  };
  
  const newBooks = useMemo(() => {
    if (allBooks.length === 0) return [];
    const sortedBooks = [...allBooks].sort((a, b) => {
      const dateA = a.addedDate ? (a.addedDate as any).seconds * 1000 : 0;
      const dateB = b.addedDate ? (b.addedDate as any).seconds * 1000 : 0;
      return dateB - dateA;
    });
    return sortedBooks.slice(0, 12);
  }, [allBooks]);

  useEffect(() => {
    fetchRecommendedBooks();
    fetchGoals();
    fetchAllItems();
  }, []);

  useEffect(() => {
    if (!user) return;
    const fetchFavorites = async () => {
      const favoritesRef = collection(db, 'favorites');
      const q = query(favoritesRef, where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      const bookIds = querySnapshot.docs.map(doc => doc.data().bookId);
      setFavoriteBookIds(bookIds);
    };
    fetchFavorites();
  }, [user?.uid]);

  useEffect(() => {
    if (showConfetti) {
      setShowCongratulatoryModal(true);
      const timer = setTimeout(() => {
        resetConfetti();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showConfetti, resetConfetti]);

  useEffect(() => {
    if (userData && !userData.hasCompletedOnboarding) {
      setShowOnboarding(true);
    }
  }, [userData]);

  useEffect(() => {
    getDailyQuote().then(setDailyQuote);
  }, []);

  const handleOnboardingComplete = async (dontShowAgain: boolean) => {
    if (!user) return;
    
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        hasCompletedOnboarding: true,
        hasCompletedPersonalization: false
      });
      setShowOnboarding(false);
      // Show personalization questions after onboarding
      setShowPersonalization(true);
    } catch (error) {
      console.error('Error updating onboarding status:', error);
      setShowOnboarding(false);
    }
  };

  const handlePersonalizationComplete = async () => {
    if (!user) return;
    
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        hasCompletedPersonalization: true
      });
      setShowPersonalization(false);
    } catch (error) {
      console.error('Error updating personalization status:', error);
      setShowPersonalization(false);
    }
  };

  const handleBorrowBook = useCallback(async (book: BookType) => {
    try {
      await borrowBook(book);
      await fetchGoals();
      showAlert('Başarılı', `${book.title} için ödünç alma talebiniz gönderildi! Admin onayından sonra kitap size ödünç verilecektir.`, 'success');
    } catch (error: any) {
      showAlert('Hata', `Kitap ödünç alınırken bir hata oluştu: ${error.message}`, 'error');
      console.error(error);
    }
  }, [borrowBook, fetchGoals, showAlert]);

  const handleToggleFavorite = useCallback(async (bookId: string) => {
    if (!user) return;
    try {
      const isFavorite = favoriteBookIds.includes(bookId);
      if (isFavorite) {
        const favoritesRef = collection(db, 'favorites');
        const q = query(favoritesRef, where('userId', '==', user.uid), where('bookId', '==', bookId));
        const querySnapshot = await getDocs(q);
        const batch = db.batch ? db.batch() : null;
        querySnapshot.docs.forEach(doc => {
          if (batch) batch.delete(doc.ref);
        });
        if (batch) await batch.commit();
        setFavoriteBookIds(prev => prev.filter(id => id !== bookId));
      } else {
        await addDoc(collection(db, 'favorites'), {
          userId: user.uid,
          bookId,
          favoritedAt: Timestamp.now()
        });
        setFavoriteBookIds(prev => [...prev, bookId]);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  }, [user, favoriteBookIds]);



  const nextRecSlide = () => {
    setCurrentRecSlide((prev) => (prev + 1) % Math.ceil(recommendedBooks.length / 4));
  };

  const prevRecSlide = () => {
    setCurrentRecSlide((prev) => (prev - 1 + Math.ceil(recommendedBooks.length / 4)) % Math.ceil(recommendedBooks.length / 4));
  };

  const [currentAuthorBookSlide, setCurrentAuthorBookSlide] = useState(0);
  const [activeTab, setActiveTab] = useState<'all' | 'events' | 'surveys' | 'announcements'>('all');
  const [expandedCategories, setExpandedCategories] = useState({ library: true, communication: true, activities: true, shopping: true });

  const nextAuthorBookSlide = () => {
    const slideCount = Math.ceil(featuredAuthorBooks.length / 3); // 3 books per slide
    setCurrentAuthorBookSlide((prev) => (prev + 1) % slideCount);
  };

  const prevAuthorBookSlide = () => {
    const slideCount = Math.ceil(featuredAuthorBooks.length / 3);
    setCurrentAuthorBookSlide((prev) => (prev - 1 + slideCount) % slideCount);
  };





  if (!user || isAdmin) {
    return <Navigate to="/login" replace />;
  }

  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Çıkış yapılırken hata oluştu:', error);
    }
  };

  const dueDateStyles = {
    overdue: { bg: 'bg-red-100', icon: <AlertCircle className="w-6 h-6 text-red-600" /> },
    dueSoon: { bg: 'bg-yellow-100', icon: <Clock className="w-6 h-6 text-yellow-600" /> },
    safe: { bg: 'bg-blue-100', icon: <Clock className="w-6 h-6 text-blue-600" /> },
  };
  const currentDueDateStyle = dueDateStyles[summaryStats.dueDateStatus] || dueDateStyles.safe;

  const libraryRules = [
    {
      icon: '📚',
      title: t('libraryRules.borrowing.title'),
      description: t('libraryRules.borrowing.desc')
    },
    {
      icon: '⏰',
      title: t('libraryRules.returnPeriods.title'),
      description: t('libraryRules.returnPeriods.desc')
    },
    {
      icon: '💰',
      title: t('libraryRules.fineSystem.title'),
      description: t('libraryRules.fineSystem.desc')
    },
    {
      icon: '🎯',
      title: t('libraryRules.readingGoals.title'),
      description: t('libraryRules.readingGoals.desc')
    },
    {
      icon: '⭐',
      title: t('libraryRules.reviewsRatings.title'),
      description: t('libraryRules.reviewsRatings.desc')
    },
    {
      icon: '❤️',
      title: t('libraryRules.favorites.title'),
      description: t('libraryRules.favorites.desc')
    },
    {
      icon: '🎡',
      title: t('libraryRules.spinWheel.title'),
      description: t('libraryRules.spinWheel.desc')
    },
    {
      icon: '🎫',
      title: t('libraryRules.coupons.title'),
      description: t('libraryRules.coupons.desc')
    },
    {
      icon: '📝',
      title: t('libraryRules.requestSystem.title'),
      description: t('libraryRules.requestSystem.desc')
    },
    {
      icon: '🎮',
      title: t('libraryRules.gameReservation.title'),
      description: t('libraryRules.gameReservation.desc')
    },
    {
      icon: '📖',
      title: t('libraryRules.blogPosts.title'),
      description: t('libraryRules.blogPosts.desc')
    },
    {
      icon: '🏆',
      title: t('libraryRules.leaderboard.title'),
      description: t('libraryRules.leaderboard.desc')
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 relative">
      {/* Sidebar */}
      <div className={`fixed top-0 left-0 h-full w-64 ${isTeacher ? 'bg-orange-900' : 'bg-indigo-900'} text-white transform transition-transform duration-300 ease-in-out z-50 overflow-y-auto ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center">
              <Book className="w-8 h-8 mr-2" />
              <span className="text-xl font-bold">{isTeacher ? t('sidebar.teacherPanel') : 'Data Koleji'}</span>
            </div>
            <button onClick={toggleSidebar} className={`p-2 ${isTeacher ? 'hover:bg-orange-800' : 'hover:bg-indigo-800'} rounded-lg`}>
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <nav className="space-y-1" style={{ maxHeight: 'calc(100vh - 180px)', overflowY: 'auto' }}>
            <Link to={isTeacher ? "/teacher-dashboard" : "/dashboard"} className={`flex items-center space-x-3 p-2 rounded-lg ${isTeacher ? 'hover:bg-orange-800' : 'hover:bg-indigo-800'} transition-colors`}>
              <Home className="w-5 h-5" />
              <span>{t('sidebar.home')}</span>
            </Link>
            {isTeacher && (
              <Link to="/my-class" className="flex items-center space-x-3 p-2 rounded-lg hover:bg-orange-800 transition-colors">
                <Users className="w-5 h-5" />
                <span>{t('sidebar.myClass')}</span>
              </Link>
            )}
            
            {/* Kütüphane Kategorisi */}
            <div className="pt-2">
              <button
                onClick={() => setExpandedCategories(prev => ({ ...prev, library: !prev.library }))}
                className={`flex items-center justify-between w-full px-2 py-2 text-xs font-semibold ${isTeacher ? 'text-orange-300' : 'text-indigo-300'} uppercase tracking-wider ${isTeacher ? 'hover:text-orange-100' : 'hover:text-indigo-100'} transition-colors`}
              >
                <span>📚 {t('sidebar.library')}</span>
                <span>{expandedCategories.library ? '▼' : '▶'}</span>
              </button>
              {expandedCategories.library && (
                <div className="mt-1 space-y-1 ml-2">
                  <Link to="/catalog" className={`flex items-center space-x-3 p-2 rounded-lg ${isTeacher ? 'hover:bg-orange-800' : 'hover:bg-indigo-800'} transition-colors`}>
                    <Library className="w-5 h-5" />
                    <span>{t('sidebar.catalog')}</span>
                  </Link>
                  <Link to="/borrowed-books" className={`flex items-center justify-between space-x-3 p-2 rounded-lg ${isTeacher ? 'hover:bg-orange-800' : 'hover:bg-indigo-800'} transition-colors`}>
                    <div className="flex items-center space-x-3">
                      <BookIcon className="w-5 h-5" />
                      <span>{t('sidebar.borrowedBooks')}</span>
                    </div>
                    {summaryStats.activeBooksCount > 0 && (
                      <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        {summaryStats.activeBooksCount}
                      </span>
                    )}
                  </Link>
                  <Link to="/favorites" className={`flex items-center space-x-3 p-2 rounded-lg ${isTeacher ? 'hover:bg-orange-800' : 'hover:bg-indigo-800'} transition-colors`}>
                    <Heart className="w-5 h-5" />
                    <span>{t('sidebar.favorites')}</span>
                  </Link>
                  <Link to="/collection-distribution" className={`flex items-center space-x-3 p-2 rounded-lg ${isTeacher ? 'hover:bg-orange-800' : 'hover:bg-indigo-800'} transition-colors`}>
                    <PieChart className="w-5 h-5" />
                    <span>{t('sidebar.collectionDistribution')}</span>
                  </Link>
                </div>
              )}
            </div>

            {/* İletişim Kategorisi */}
            <div className="pt-2">
              <button
                onClick={() => setExpandedCategories(prev => ({ ...prev, communication: !prev.communication }))}
                className={`flex items-center justify-between w-full px-2 py-2 text-xs font-semibold ${isTeacher ? 'text-orange-300' : 'text-indigo-300'} uppercase tracking-wider ${isTeacher ? 'hover:text-orange-100' : 'hover:text-indigo-100'} transition-colors`}
              >
                <span>💬 {t('sidebar.communication')}</span>
                <span>{expandedCategories.communication ? '▼' : '▶'}</span>
              </button>
              {expandedCategories.communication && (
                <div className="mt-1 space-y-1 ml-2">
                  <Link to="/chat" className={`flex items-center space-x-3 p-2 rounded-lg ${isTeacher ? 'hover:bg-orange-800' : 'hover:bg-indigo-800'} transition-colors`}>
                    <MessageSquare className="w-5 h-5" />
                    <span>{t('sidebar.chat')}</span>
                  </Link>
                  <Link to="/requests" className={`flex items-center justify-between space-x-3 p-2 rounded-lg ${isTeacher ? 'hover:bg-orange-800' : 'hover:bg-indigo-800'} transition-colors`}>
                    <div className="flex items-center space-x-3">
                      <MessageSquare className="w-5 h-5" />
                      <span>{t('sidebar.myRequests')}</span>
                    </div>
                    {summaryStats.pendingRequestsCount > 0 && (
                      <span className="bg-yellow-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        {summaryStats.pendingRequestsCount}
                      </span>
                    )}
                  </Link>
                  <Link to="/fines" className={`flex items-center justify-between space-x-3 p-2 rounded-lg ${isTeacher ? 'hover:bg-orange-800' : 'hover:bg-indigo-800'} transition-colors`}>
                    <div className="flex items-center space-x-3">
                      <DollarSign className="w-5 h-5" />
                      <span>{t('sidebar.myFines')}</span>
                    </div>
                    {summaryStats.totalFine > 0 && (
                      <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        {summaryStats.totalFine}₺
                      </span>
                    )}
                  </Link>
                </div>
              )}
            </div>

            {/* Aktiviteler Kategorisi */}
            <div className="pt-2">
              <button
                onClick={() => setExpandedCategories(prev => ({ ...prev, activities: !prev.activities }))}
                className={`flex items-center justify-between w-full px-2 py-2 text-xs font-semibold ${isTeacher ? 'text-orange-300' : 'text-indigo-300'} uppercase tracking-wider ${isTeacher ? 'hover:text-orange-100' : 'hover:text-indigo-100'} transition-colors`}
              >
                <span>🎮 {t('sidebar.activities')}</span>
                <span>{expandedCategories.activities ? '▼' : '▶'}</span>
              </button>
              {expandedCategories.activities && (
                <div className="mt-1 space-y-1 ml-2">
                  {!isTeacher && (
                    <>
                      <Link to="/challenges" className="flex items-center space-x-3 p-2 rounded-lg hover:bg-indigo-800 transition-colors">
                        <span className="text-lg">🏆</span>
                        <span>{t('sidebar.challenges')}</span>
                      </Link>
                      <Link to="/reward-store" className="flex items-center space-x-3 p-2 rounded-lg hover:bg-indigo-800 transition-colors">
                        <span className="text-lg">🎁</span>
                        <span>{t('sidebar.rewardStore')}</span>
                      </Link>
                    </>
                  )}
                  <Link to="/my-posts" className={`flex items-center space-x-3 p-2 rounded-lg ${isTeacher ? 'hover:bg-orange-800' : 'hover:bg-indigo-800'} transition-colors`}>
                    <BookIcon className="w-5 h-5" />
                    <span>{t('sidebar.myPosts')}</span>
                  </Link>
                  <Link to="/games" className={`flex items-center space-x-3 p-2 rounded-lg ${isTeacher ? 'hover:bg-orange-800' : 'hover:bg-indigo-800'} transition-colors`}>
                    <Gamepad2 className="w-5 h-5" />
                    <span>{t('sidebar.gameReservations')}</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Alışveriş Kategorisi */}
            <div className="pt-2">
              <button
                onClick={() => setExpandedCategories(prev => ({ ...prev, shopping: !prev.shopping }))}
                className={`flex items-center justify-between w-full px-2 py-2 text-xs font-semibold ${isTeacher ? 'text-orange-300' : 'text-indigo-300'} uppercase tracking-wider ${isTeacher ? 'hover:text-orange-100' : 'hover:text-indigo-100'} transition-colors`}
              >
                <span>🛍️ {t('sidebar.shopping')}</span>
                <span>{expandedCategories.shopping ? '▼' : '▶'}</span>
              </button>
              {expandedCategories.shopping && (
                <div className="mt-1 space-y-1 ml-2">
                  <Link to="/shop" className={`flex items-center space-x-3 p-2 rounded-lg ${isTeacher ? 'hover:bg-orange-800' : 'hover:bg-indigo-800'} transition-colors`}>
                    <ShoppingBag className="w-5 h-5" />
                    <span>{t('sidebar.store')}</span>
                  </Link>
                  <Link to="/my-orders" className={`flex items-center space-x-3 p-2 rounded-lg ${isTeacher ? 'hover:bg-orange-800' : 'hover:bg-indigo-800'} transition-colors`}>
                    <Package className="w-5 h-5" />
                    <span>{t('sidebar.myOrders')}</span>
                  </Link>
                  <Link to="/my-coupons" className={`flex items-center space-x-3 p-2 rounded-lg ${isTeacher ? 'hover:bg-orange-800' : 'hover:bg-indigo-800'} transition-colors`}>
                    <MessageSquare className="w-5 h-5" />
                    <span>{t('sidebar.myCoupons')}</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Diğer */}
            <div className="pt-2">
              <button
                onClick={() => setShowRules(true)}
                className={`flex items-center space-x-3 p-2 rounded-lg ${isTeacher ? 'hover:bg-orange-800' : 'hover:bg-indigo-800'} transition-colors w-full text-left`}
              >
                <ScrollText className="w-5 h-5" />
                <span>{t('sidebar.libraryRules')}</span>
              </button>
              {isTeacher && (
                <Link to="/teacher/reports" className="flex items-center space-x-3 p-2 rounded-lg hover:bg-orange-800 transition-colors">
                  <BarChart className="w-5 h-5" />
                  <span>{t('sidebar.reports')}</span>
                </Link>
              )}
              <Link to="/settings" className={`flex items-center space-x-3 p-2 rounded-lg ${isTeacher ? 'hover:bg-orange-800' : 'hover:bg-indigo-800'} transition-colors`}>
                <Settings className="w-5 h-5" />
                <span>{t('sidebar.settings')}</span>
              </Link>
            </div>
          </nav>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <button 
            onClick={handleLogout}
            className={`flex items-center space-x-3 p-3 w-full rounded-lg ${isTeacher ? 'hover:bg-orange-800' : 'hover:bg-indigo-800'} transition-colors text-red-300 hover:text-red-400`}
          >
            <LogOut className="w-5 h-5" />
            <span>{t('sidebar.logout')}</span>
          </button>
        </div>
      </div>

      {showRules && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-0">
          <div className="bg-gradient-to-br from-white via-indigo-50/30 to-purple-50/30 backdrop-blur-xl rounded-2xl shadow-2xl w-full h-full overflow-hidden border border-white/20 flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-6 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                  <ScrollText className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">{t('libraryRules.title')}</h2>
                  <p className="text-white/80 text-sm">{t('libraryRules.subtitle')}</p>
                </div>
              </div>
              <button
                onClick={() => setShowRules(false)}
                className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-lg transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {libraryRules.map((rule, index) => (
                  <div
                    key={index}
                    className="bg-white/80 backdrop-blur-sm rounded-xl p-5 shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105 border border-white/40"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-2xl shadow-lg">
                        {rule.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 mb-2 text-lg">{rule.title}</h3>
                        <p className="text-gray-600 text-sm leading-relaxed">{rule.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 sm:p-6 border-t border-white/20 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 backdrop-blur-sm flex-shrink-0">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600 flex items-center gap-2">
                  <span className="text-2xl">💡</span>
                  <span>{t('libraryRules.contactUs')}</span>
                </p>
                <button
                  onClick={() => setShowRules(false)}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-300 hover:scale-105 min-h-[44px]"
                >
                  {t('userDashboard.understood')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCongratulatoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">{t('userDashboard.congratulations')}</h3>
              <button onClick={() => setShowCongratulatoryModal(false)} className="text-gray-400 hover:text-gray-500">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 text-center">
              <p className="text-xl font-semibold text-indigo-600 mb-4">{t('userDashboard.goalReached')}</p>
              <p className="text-gray-700">{t('userDashboard.setNewGoals')}</p>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowCongratulatoryModal(false)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                {t('userDashboard.ok')}
              </button>
            </div>
          </div>
        </div>
      )}

      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={toggleSidebar}
        ></div>
      )}

      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        <div className={`${isTeacher ? 'bg-orange-900' : 'bg-indigo-900'} text-white py-8 relative overflow-hidden`}>
          {/* Animated Gradient Background */}
          <div className="absolute inset-0 overflow-hidden">
            <div className={`absolute w-96 h-96 ${isTeacher ? 'bg-orange-500/20' : 'bg-purple-500/20'} rounded-full blur-3xl animate-blob -top-20 -left-20`}></div>
            <div className={`absolute w-96 h-96 ${isTeacher ? 'bg-amber-500/20' : 'bg-pink-500/20'} rounded-full blur-3xl animate-blob animation-delay-2000 top-10 right-0`}></div>
            <div className={`absolute w-96 h-96 ${isTeacher ? 'bg-yellow-500/20' : 'bg-blue-500/20'} rounded-full blur-3xl animate-blob animation-delay-4000 -bottom-20 left-40`}></div>
          </div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={toggleSidebar}
                className={`p-2 ${isTeacher ? 'hover:bg-orange-800' : 'hover:bg-indigo-800'} rounded-lg transition-colors`}
              >
                <Menu className="w-6 h-6" />
              </button>
              <div className="flex-1 flex items-center justify-center gap-6">
                <div className="relative">
                  {userData?.photoURL ? (
                    <img
                      src={userData.photoURL}
                      alt="Profil"
                      loading="lazy"
                      className="w-20 h-20 rounded-full border-4 border-white/30 shadow-lg object-cover"
                    />
                  ) : (
                    <div className={`w-20 h-20 rounded-full border-4 border-white/30 shadow-lg ${isTeacher ? 'bg-orange-700' : 'bg-indigo-700'} flex items-center justify-center`}>
                      <span className="text-3xl font-bold text-white">
                        {(userData?.displayName || user.displayName || user.email?.split('@')[0] || 'U')[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className={`absolute -bottom-1 -right-1 bg-yellow-400 ${isTeacher ? 'text-orange-900 border-orange-900' : 'text-indigo-900 border-indigo-900'} rounded-full w-10 h-10 flex items-center justify-center font-bold text-base border-2 shadow-lg`}>
                    {userData?.level || 1}
                  </div>
                </div>
                <div className="flex flex-col items-center">
                  <p className={`text-lg ${isTeacher ? 'text-orange-200' : 'text-indigo-200'} mb-1`}>{getGreeting()}</p>
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <h1 className="text-3xl font-bold">{t('userDashboard.welcome')}, {userData?.displayName || user.displayName || user.email?.split('@')[0]}</h1>
                    {campusName && (
                      <span className="px-3 py-1 bg-blue-500 text-white text-sm font-semibold rounded-full">
                        {campusName}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`${isTeacher ? 'bg-orange-800' : 'bg-indigo-800'} rounded-full h-2 w-48`}>
                      <div
                        className="bg-yellow-400 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${((userData?.totalXP || 0) % 100)}%` }}
                      ></div>
                    </div>
                    <span className={`text-xs ${isTeacher ? 'text-orange-200' : 'text-indigo-200'} font-medium`}>{userData?.totalXP || 0} XP</span>
                  </div>
                </div>
              </div>
              <UpdateButton />
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* At a Glance Summary Cards - Premium Minimal Gradient */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
            {/* Çark Butonu */}
            <button
              onClick={() => setShowSpinModal(true)}
              className="relative bg-gradient-to-br from-purple-500 to-pink-600 p-3 sm:p-4 md:p-6 rounded-xl shadow-lg hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 group overflow-hidden touch-manipulation min-h-[100px] sm:min-h-[120px] col-span-2 lg:col-span-1"
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative flex flex-col items-center justify-center h-full">
                <div className="text-3xl sm:text-4xl md:text-6xl mb-1 sm:mb-2 group-hover:rotate-180 transition-transform duration-700">🎡</div>
                <p className="text-white font-bold text-xs sm:text-sm md:text-lg text-center">{t('userDashboard.dailySpinWheel')}</p>
                {canSpin && (
                  <div className="mt-1 sm:mt-2 px-2 sm:px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full">
                    <span className="text-white text-xs font-semibold flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                      {t('userDashboard.youHaveChance')}
                    </span>
                  </div>
                )}
              </div>
            </button>
            <Link to="/borrowed-books" className="bg-gradient-to-br from-blue-500 to-cyan-600 p-3 sm:p-4 md:p-6 rounded-xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 min-h-[100px] sm:min-h-[120px]">
              <div className="flex items-center justify-between h-full">
                <div>
                  <p className="text-white/80 text-xs sm:text-sm font-medium mb-1 sm:mb-2">{t('userDashboard.activeBooks')}</p>
                  <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">{summaryStats.activeBooksCount}</p>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 sm:p-3 hover:bg-white/30 transition-colors">
                  <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
              </div>
            </Link>
            <Link to="/borrowed-books" className={`bg-gradient-to-br ${summaryStats.dueDateStatus === 'overdue' ? 'from-red-500 to-pink-600' : summaryStats.dueDateStatus === 'dueSoon' ? 'from-yellow-500 to-orange-600' : 'from-green-500 to-emerald-600'} p-3 sm:p-4 md:p-6 rounded-xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 min-h-[100px] sm:min-h-[120px]`}>
              <div className="flex items-center justify-between h-full">
                <div className="flex-1 min-w-0">
                  <p className="text-white/80 text-xs sm:text-sm font-medium mb-1 sm:mb-2">{summaryStats.dueDateText}</p>
                  <p className="text-sm sm:text-base md:text-lg font-bold text-white truncate">{summaryStats.nextDueBook && summaryStats.nextDueBook.title ? `${summaryStats.nextDueBook.title.substring(0, 12)}...` : '-'}</p>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 sm:p-3 hover:bg-white/30 transition-colors flex-shrink-0">
                  {summaryStats.dueDateStatus === 'overdue' ? <AlertCircle className="w-6 h-6 sm:w-8 sm:h-8 text-white" /> : <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-white" />}
                </div>
              </div>
            </Link>
            <Link to="/fines" className="bg-gradient-to-br from-red-500 to-pink-600 p-3 sm:p-4 md:p-6 rounded-xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 min-h-[100px] sm:min-h-[120px]">
              <div className="flex items-center justify-between h-full">
                <div>
                  <p className="text-white/80 text-xs sm:text-sm font-medium mb-1 sm:mb-2">{t('userDashboard.unpaidFines')}</p>
                  <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">{summaryStats.totalFine} TL</p>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 sm:p-3 hover:bg-white/30 transition-colors">
                  <AlertCircle className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
              </div>
            </Link>
            <Link to="/requests" className="bg-gradient-to-br from-purple-500 to-indigo-600 p-3 sm:p-4 md:p-6 rounded-xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 min-h-[100px] sm:min-h-[120px]">
              <div className="flex items-center justify-between h-full">
                <div>
                  <p className="text-white/80 text-xs sm:text-sm font-medium mb-1 sm:mb-2">{t('userDashboard.pendingRequests')}</p>
                  <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">{summaryStats.pendingRequestsCount}</p>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 sm:p-3 hover:bg-white/30 transition-colors">
                  <MessageSquare className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
              </div>
            </Link>
          </div>

          {/* Bento Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
            {/* Quote - Polaroid Style */}
            <div className="lg:col-span-12 flex justify-center items-center py-8">
              <div className="group relative rotate-[-2deg] hover:rotate-0 transition-all duration-500 hover:scale-105">
                {/* Polaroid Frame */}
                <div className="bg-white p-6 shadow-2xl hover:shadow-3xl transition-shadow duration-500">
                  {/* Quote Content */}
                  <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-8 mb-4 relative">
                    {/* Decorative Quote Marks */}
                    <div className="absolute top-2 left-2 text-6xl text-indigo-300 opacity-30 font-serif">“</div>
                    <div className="absolute bottom-2 right-2 text-6xl text-indigo-300 opacity-30 font-serif">”</div>
                    
                    {dailyQuote ? (
                      <blockquote className="relative z-10">
                        <p className="text-lg sm:text-xl font-medium text-gray-800 italic mb-6 leading-relaxed text-center">
                          {dailyQuote.text}
                        </p>
                        <footer className="text-center">
                          <p className="font-bold text-indigo-600 text-lg">{dailyQuote.author}</p>
                          <p className="text-sm text-gray-600 mt-1">{dailyQuote.book}</p>
                        </footer>
                      </blockquote>
                    ) : (
                      <p className="text-center text-gray-600">{t('userDashboard.loadingQuote')}</p>
                    )}
                  </div>
                  
                  {/* Polaroid Bottom - Handwritten Style */}
                  <div className="text-center">
                    <p className="text-gray-700 font-handwriting text-lg" style={{ fontFamily: 'cursive' }}>
                      {t('userDashboard.quoteOfDay')}
                    </p>
                  </div>
                </div>
                
                {/* Shadow effect */}
                <div className="absolute inset-0 bg-black/10 blur-xl -z-10 group-hover:bg-black/20 transition-all duration-500"></div>
              </div>
            </div>

            {/* Recommendations - Full Width */}
            <section className="lg:col-span-12 mt-20">
              <div className="mb-6 flex justify-center">
                <div className="inline-flex flex-col items-center gap-3 px-8 py-6 bg-gradient-to-r from-red-500 via-pink-500 to-purple-600 rounded-2xl shadow-xl">
                  <Heart className="w-10 h-10 text-white fill-white animate-pulse" />
                  <h2 className="text-3xl sm:text-4xl font-extrabold text-white text-center">
                    {t('userDashboard.specialRecommendations')}
                  </h2>
                </div>
              </div>
              <div className="mb-6">
                <Suspense fallback={<div className="h-8"></div>}>
                {recommendedBooks.length > 0 && (() => {
                  const completedBooks = borrowedBooks.filter(b => b.returnStatus === 'returned');
                  const categoryCount = completedBooks.reduce((acc, book) => {
                    acc[book.category] = (acc[book.category] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>);
                  const favoriteCategory = Object.keys(categoryCount).sort((a, b) => categoryCount[b] - categoryCount[a])[0];
                  const totalRead = completedBooks.length;
                  
                  const messages = [
                    `${userData?.displayName}, senin için ${favoriteCategory || 'sevdiğin kategorilerden'} özel kitaplar seçtik! 📚`,
                    `Okuma zevkine göre ${totalRead > 5 ? 'deneyimli bir okuyucu olarak' : ''} sana en uygun kitapları bulduk ✨`,
                    `${favoriteCategory ? favoriteCategory + ' kategorisini seviyorsun,' : 'Okuma geçmişine göre'} bu kitaplar tam sana göre! 🎯`,
                    `Seni tanıyoruz ${userData?.displayName}! Bu kitaplar senin tarzına çok uygun 💫`
                  ];
                  const randomMessage = messages[Math.floor(Math.random() * messages.length)];
                  
                  return <p className="text-gray-600 text-center">{randomMessage}</p>;
                })()}
                </Suspense>
              </div>
              {recommendedBooks.length > 0 ? (
                <Suspense fallback={
                  <div className="flex items-center justify-center min-h-[280px]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                  </div>
                }>
                  <EnhancedBookCarousel 
                  books={recommendedBooks} 
                  onBorrowBook={handleBorrowBook}
                  favoriteBookIds={favoriteBookIds}
                  onToggleFavorite={handleToggleFavorite}
                />
                </Suspense>
              ) : (
                <div className="bg-white/90 backdrop-blur-xl rounded-xl shadow-lg p-8 text-center flex flex-col items-center justify-center min-h-[280px] border border-white/20">
                  <Heart className="w-12 h-12 text-gray-300 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">{t('userDashboard.noRecommendations')}</h3>
                  <p className="text-gray-500 mb-4">{t('userDashboard.noRecommendationsDesc')}</p>
                  <Link to="/catalog" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                    {t('userDashboard.browseCatalog')}
                  </Link>
                </div>
              )}
            </section>

            {/* Leaderboard - Full Width */}
            <section className="lg:col-span-12 mt-20">
              <div className="mb-6 flex justify-center">
                <div className="inline-flex flex-col items-center gap-3 px-8 py-6 bg-gradient-to-r from-yellow-500 via-orange-500 to-red-600 rounded-2xl shadow-xl">
                  <BarChart className="w-10 h-10 text-white animate-pulse" />
                  <h2 className="text-3xl sm:text-4xl font-extrabold text-white text-center">
                    {t('userDashboard.topReaders')}
                  </h2>
                </div>
              </div>
              <div className="overflow-x-auto">
                <Suspense fallback={
                  <div className="flex items-center justify-center min-h-[200px]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600"></div>
                  </div>
                }>
                  <Leaderboard />
                </Suspense>
              </div>
            </section>

            {/* Featured Author - Hero Banner Style */}
            <section className="lg:col-span-12">
              {featuredAuthor ? (
                <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                  {/* Background Image with Blur/Overlay */}
                  <div className="absolute inset-0">
                    <img
                      src={featuredAuthor.image}
                      alt={featuredAuthor.name}
                      loading="lazy"
                      className="w-full h-full object-cover blur-sm scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/80"></div>
                  </div>

                  {/* Content */}
                  <div className="relative z-10 px-8 py-16 md:px-16 md:py-20">
                    {/* Top Label */}
                    <div className="flex items-center justify-center mb-6">
                      <Star className="w-6 h-6 text-yellow-400 fill-yellow-400 mr-2" />
                      <span className="text-yellow-400 font-bold text-sm tracking-widest uppercase">{t('userDashboard.featuredAuthor')}</span>
                    </div>

                    {/* Author Name */}
                    <h2 className="text-5xl md:text-6xl font-bold text-white text-center mb-6 break-words px-4">
                      {featuredAuthor.name}
                    </h2>

                    {/* Biography */}
                    <p className="text-gray-300 text-lg text-center max-w-3xl mx-auto mb-8 leading-relaxed">
                      {featuredAuthor.biography}
                    </p>

                    {/* Button */}
                    <div className="flex justify-center mb-12">
                      <Link 
                        to={`/author/${featuredAuthor.id}`}
                        className="inline-flex items-center px-8 py-4 bg-white text-gray-900 rounded-lg hover:bg-gray-100 transition-all duration-300 shadow-lg hover:shadow-xl font-semibold text-lg"
                      >
                        {t('userDashboard.authorPage')}
                        <ExternalLink className="w-5 h-5 ml-2" />
                      </Link>
                    </div>

                    {/* Polaroid Books Section */}
                    <div className="mt-8">
                      <h3 className="text-2xl font-bold text-white text-center mb-8">{t('userDashboard.featuredWorks')}</h3>
                      <div className="flex flex-wrap justify-center items-center gap-8 max-w-6xl mx-auto">
                        {featuredAuthorBooks.slice(0, 3).map((book, index) => {
                          const status = getBookStatus(book.id);
                          const isAvailable = status === 'available';
                          const rotations = ['-rotate-3', 'rotate-2', '-rotate-2'];
                          return (
                            <div 
                              key={book.id} 
                              className={`group ${rotations[index]} hover:rotate-0 transition-all duration-300 hover:scale-105`}
                            >
                              {/* Polaroid Frame */}
                              <div className="bg-white/95 backdrop-blur-sm p-1 shadow-xl hover:shadow-2xl transition-shadow duration-300">
                                {/* Image */}
                                <div className="relative w-32 h-40 sm:w-48 sm:h-56 overflow-hidden">
                                  <img
                                    src={book.coverImage}
                                    alt={book.title}
                                    loading="lazy"
                                    className="w-full h-full object-cover"
                                  />
                                  {/* Hover Button */}
                                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                    <button
                                      onClick={() => handleBorrowBook(book)}
                                      disabled={!isAvailable}
                                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                        isAvailable
                                          ? 'bg-white text-gray-900 hover:bg-gray-100'
                                          : 'bg-gray-400 text-white cursor-not-allowed'
                                      }`}
                                    >
                                      {isAvailable ? 'Ödünç Al' : (status === 'borrowed' ? 'Ödünç Alındı' : 'Kayıp')}
                                    </button>
                                  </div>
                                </div>
                                {/* Polaroid Bottom - Handwritten Style Title */}
                                <div className="bg-white/95 p-4 text-center">
                                  <p className="text-gray-800 text-sm font-handwriting line-clamp-2" style={{ fontFamily: 'cursive' }}>
                                    {book.title}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white/90 backdrop-blur-xl rounded-xl shadow-lg p-8 text-center border border-white/20">
                  <Star className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">Bu ay öne çıkan bir yazar bulunamadı.</p>
                </div>
              )}
            </section>

            {/* New Books - Full Width */}
            <section className="lg:col-span-12 mt-20">
              <div className="mb-6 flex justify-center">
                <div className="inline-flex flex-col items-center gap-3 px-8 py-6 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-600 rounded-2xl shadow-xl">
                  <BookPlus className="w-10 h-10 text-white animate-pulse" />
                  <h2 className="text-3xl sm:text-4xl font-extrabold text-white text-center">
                    {t('userDashboard.newBooks')}
                  </h2>
                </div>
              </div>
              <Suspense fallback={
                <div className="flex items-center justify-center min-h-[280px]">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
                </div>
              }>
                <EnhancedBookCarousel books={newBooks} onBorrowBook={handleBorrowBook} />
              </Suspense>
            </section>

            {/* Events - Full Width */}
            <section className="lg:col-span-12 mt-20">
              <div className="mb-6 flex justify-center">
                <div className="inline-flex flex-col items-center gap-3 px-8 py-6 bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-600 rounded-2xl shadow-xl">
                  <Calendar className="w-10 h-10 text-white animate-pulse" />
                  <h2 className="text-3xl sm:text-4xl font-extrabold text-white text-center">
                    {t('userDashboard.eventsAndAnnouncements')}
                  </h2>
                </div>
              </div>
              
              {/* Tabs */}
              <div className="bg-white/90 backdrop-blur-xl rounded-xl shadow-lg overflow-hidden border border-white/20">
                <div className="border-b border-gray-200 overflow-x-auto">
                  <nav className="flex space-x-1 p-2 min-w-max" aria-label="Tabs">
                    <button
                      onClick={() => setActiveTab('all')}
                      className={`px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                        activeTab === 'all'
                          ? 'bg-purple-100 text-purple-700'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      {t('userDashboard.all')} ({allItems.length})
                    </button>
                    <button
                      onClick={() => setActiveTab('events')}
                      className={`px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                        activeTab === 'events'
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      {t('userDashboard.events')} ({allItems.filter(item => item.type === 'event').length})
                    </button>
                    <button
                      onClick={() => setActiveTab('surveys')}
                      className={`px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                        activeTab === 'surveys'
                          ? 'bg-green-100 text-green-700'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      {t('userDashboard.surveys')} ({allItems.filter(item => item.type === 'survey').length})
                    </button>
                    <button
                      onClick={() => setActiveTab('announcements')}
                      className={`px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                        activeTab === 'announcements'
                          ? 'bg-orange-100 text-orange-700'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      {t('userDashboard.announcements')} ({allItems.filter(item => item.type === 'announcement').length})
                    </button>
                  </nav>
                </div>
                
                {/* Tab Content */}
                <div className="p-6">
                  <Suspense fallback={
                    <div className="flex items-center justify-center min-h-[200px]">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                    </div>
                  }>
                    <ItemSlider 
                      items={activeTab === 'all' ? allItems : allItems.filter(item => {
                        if (activeTab === 'events') return item.type === 'event';
                        if (activeTab === 'surveys') return item.type === 'survey';
                        if (activeTab === 'announcements') return item.type === 'announcement';
                        return true;
                      })}
                      onOpenItemModal={handleOpenItemModal} 
                      joinedEvents={joinedEvents} 
                      onJoinEvent={joinEvent} 
                    />
                  </Suspense>
                </div>
              </div>
            </section>

            
          </div>
        </div>
      </div>

      <Suspense fallback={null}>
      <OnboardingTour
        isOpen={showOnboarding}
        onClose={async (dontShowAgain) => {
          if (!user) return;
          
          try {
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
              hasCompletedOnboarding: true,
              hasCompletedPersonalization: false
            });
            setShowOnboarding(false);
            setShowPersonalization(true);
          } catch (error) {
            console.error('Error updating onboarding status:', error);
            setShowOnboarding(false);
          }
        }}
        onComplete={handleOnboardingComplete}
      />
      </Suspense>

      {showPersonalization && (
        <Suspense fallback={null}>
          <PersonalizationQuestions onComplete={handlePersonalizationComplete} />
        </Suspense>
      )}
    

      <Suspense fallback={null}>
        <ReadingGoalsModal
          isOpen={showReadingGoalsModal}
          onClose={() => setShowReadingGoalsModal(false)}
          onGoalSaved={fetchGoals}
        />
      </Suspense>

      <Suspense fallback={null}>
        <ItemDetailsModal
          isOpen={showItemDetailsModal}
          onClose={handleCloseItemModal}
          item={selectedItem}
        />
      </Suspense>

      <Suspense fallback={null}>
        <SpinWheelModal isOpen={showSpinModal} onClose={() => setShowSpinModal(false)} />
      </Suspense>
      
      {/* Chat Bot */}
      <Suspense fallback={null}>
        <ChatBot />
      </Suspense>
    </div>
  );
};

export default UserDashboard;
