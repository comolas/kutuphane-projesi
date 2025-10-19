import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { Book, Clock, BookOpen, Menu, X, Home, Library, BookOpen as BookIcon, Settings, LogOut, Calendar, Bell, MessageSquare, ScrollText, DollarSign, Quote, Search, PieChart, MapPin, ExternalLink, Heart, Target, Star, BookPlus, AlertCircle, Gamepad2, Users, BarChart } from 'lucide-react';
import { useSpinWheel } from '../contexts/SpinWheelContext';
import SpinWheelModal from '../components/user/SpinWheelModal';
import OnboardingTour from '../components/onboarding/OnboardingTour';
import PersonalizationQuestions from '../components/PersonalizationQuestions';
import ItemDetailsModal from '../components/common/ItemDetailsModal';
import ReadingGoalsModal from '../components/common/ReadingGoalsModal';
import ItemSlider from '../components/common/ItemSlider';
import Leaderboard from '../components/dashboard/Leaderboard'; // Lider tablosu import edildi
import UpdateButton from '../components/common/UpdateButton'; // Added import
import ChatBot from '../components/ChatBot'; // Chat bot import edildi
import EnhancedBookCarousel from '../components/common/EnhancedBookCarousel';

import { useBooks } from '../contexts/BookContext';
import { useAuth } from '../contexts/AuthContext';
import { useGoals } from '../contexts/GoalsContext';
import { useAuthors } from '../contexts/AuthorContext';
import { useEvents } from '../contexts/EventContext';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { getDailyQuote } from '../utils/quotes';
import { Event, Survey, Announcement, Request as RequestType, Book as BookType } from '../types';

import { useAlert } from '../contexts/AlertContext';

const UserDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, userData, isAdmin, isTeacher } = useAuth();
  const { showAlert } = useAlert();
  
  const { borrowedBooks, allBooks, borrowBook, recommendedBooks, fetchRecommendedBooks, getBookStatus } = useBooks();
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
  const [newBooks, setNewBooks] = useState<Book[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showPersonalization, setShowPersonalization] = useState(false);
  const [showItemDetailsModal, setShowItemDetailsModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Event | Survey | Announcement | null>(null);
  const [showSpinModal, setShowSpinModal] = useState(false);
  const { canSpin } = useSpinWheel();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '🌅 Günaydın';
    if (hour < 18) return '☀️ İyi Günler';
    return '🌙 İyi Akşamlar';
  };

  // Fetch user-specific requests
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
  }, [user]);

  const summaryStats = useMemo(() => {
    const activeBooks = borrowedBooks.filter(b => b.returnStatus !== 'returned');
    const nextDueBook = activeBooks.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];
    
    let dueDateStatus = 'safe';
    let dueDateText = 'Yaklaşan Teslim';
    if (nextDueBook) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dueDate = new Date(nextDueBook.dueDate);
      dueDate.setHours(0, 0, 0, 0);

      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        dueDateStatus = 'overdue';
        dueDateText = 'Gecikmiş Kitap';
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
  
  useEffect(() => {
    if (allBooks.length > 0) {
      const sortedBooks = [...allBooks].sort((a, b) => {
        const dateA = a.addedDate ? (a.addedDate as any).seconds * 1000 : 0;
        const dateB = b.addedDate ? (b.addedDate as any).seconds * 1000 : 0;
        return dateB - dateA;
      });
      const latestBooks = sortedBooks.slice(0, 12);
      setNewBooks(latestBooks);
    }
  }, [allBooks]);

  useEffect(() => {
    fetchRecommendedBooks();
    fetchGoals();
    fetchAllItems();
  }, [fetchRecommendedBooks, fetchGoals, fetchAllItems]);

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
    const fetchQuote = async () => {
      const quote = await getDailyQuote();
      setDailyQuote(quote);
    };
    fetchQuote();
  }, []);

  const handleOnboardingComplete = async (dontShowAgain: boolean) => {
    if (!user) return;
    
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        hasCompletedOnboarding: true
      });
      setShowOnboarding(false);
      // Show personalization questions after onboarding
      setShowPersonalization(true);
    } catch (error) {
      console.error('Error updating onboarding status:', error);
      setShowOnboarding(false);
    }
  };

  const handlePersonalizationComplete = () => {
    setShowPersonalization(false);
  };

  const handleBorrowBook = async (book: BookType) => {
    try {
      await borrowBook(book);
      await fetchGoals();
      showAlert('Başarılı', `${book.title} için ödünç alma talebiniz gönderildi! Admin onayından sonra kitap size ödünç verilecektir.`, 'success');
    } catch (error: any) {
      showAlert('Hata', `Kitap ödünç alınırken bir hata oluştu: ${error.message}`, 'error');
      console.error(error);
    }
  };



  const nextRecSlide = () => {
    setCurrentRecSlide((prev) => (prev + 1) % Math.ceil(recommendedBooks.length / 4));
  };

  const prevRecSlide = () => {
    setCurrentRecSlide((prev) => (prev - 1 + Math.ceil(recommendedBooks.length / 4)) % Math.ceil(recommendedBooks.length / 4));
  };

  const [currentAuthorBookSlide, setCurrentAuthorBookSlide] = useState(0);
  const [activeTab, setActiveTab] = useState<'all' | 'events' | 'surveys' | 'announcements'>('all');

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
      title: 'Kitap Ödünç Alma',
      description: 'Her kullanıcı aynı anda en fazla 3 kitap ödünç alabilir. Ödünç alma süresi 14 gündür.'
    },
    {
      icon: '⏰',
      title: 'İade Süreleri',
      description: 'Kitaplar belirlenen süre içinde iade edilmelidir. Geç iade edilen her gün için 5 TL ceza uygulanır.'
    },
    {
      icon: '💰',
      title: 'Ceza Sistemi',
      description: 'Gecikme cezaları ödenmeden yeni kitap ödünç alınamaz. Cezalar admin panelinden ödenebilir.'
    },
    {
      icon: '🎯',
      title: 'Okuma Hedefleri',
      description: 'Aylık ve yıllık okuma hedefleri belirleyerek ilerlemenizi takip edebilirsiniz.'
    },
    {
      icon: '⭐',
      title: 'Yorum ve Değerlendirme',
      description: 'Okuduğunuz kitaplar için yorum yapabilir ve 1-5 yıldız arası puan verebilirsiniz.'
    },
    {
      icon: '❤️',
      title: 'Favoriler',
      description: 'Beğendiğiniz kitapları favorilerinize ekleyerek kolayca erişebilirsiniz.'
    },
    {
      icon: '🎡',
      title: 'Şans Çarkı',
      description: 'Her gün bir kez şans çarkını çevirerek kupon, rozet veya özel kategori erişimi kazanabilirsiniz.'
    },
    {
      icon: '🎫',
      title: 'Kuponlar',
      description: 'Kazandığınız kuponları kullanarak ceza indirimi veya ödünç alma süresi uzatma hakkı elde edebilirsiniz.'
    },
    {
      icon: '📝',
      title: 'Talep Sistemi',
      description: 'Kitap önerisi, teknik sorun veya genel geri bildirimlerinizi talep sistemi üzerinden iletebilirsiniz.'
    },
    {
      icon: '🎮',
      title: 'Oyun Rezervasyonu',
      description: 'Kütüphanedeki masa oyunları için randevu alabilir ve arkadaşlarınızla oyun oynayabilirsiniz.'
    },
    {
      icon: '📖',
      title: 'Blog Yazıları',
      description: 'Okuduğunuz kitaplar hakkında blog yazıları yazabilir ve diğer kullanıcıların yazılarını okuyabilirsiniz.'
    },
    {
      icon: '🏆',
      title: 'Lider Tablosu',
      description: 'En çok kitap okuyan kullanıcılar lider tablosunda görüntülenir. Okuyarak sıralamada yükselmeye çalışın!'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 relative">
      {/* Sidebar */}
      <div className={`fixed top-0 left-0 h-full w-64 ${isTeacher ? 'bg-orange-900' : 'bg-indigo-900'} text-white transform transition-transform duration-300 ease-in-out z-50 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center">
              <Book className="w-8 h-8 mr-2" />
              <span className="text-xl font-bold">{isTeacher ? 'Öğretmen Paneli' : 'Data Koleji'}</span>
            </div>
            <button onClick={toggleSidebar} className={`p-2 ${isTeacher ? 'hover:bg-orange-800' : 'hover:bg-indigo-800'} rounded-lg`}>
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <nav className="space-y-1">
            <Link to={isTeacher ? "/teacher-dashboard" : "/dashboard"} className={`flex items-center space-x-3 p-2 rounded-lg ${isTeacher ? 'hover:bg-orange-800' : 'hover:bg-indigo-800'} transition-colors`}>
              <Home className="w-5 h-5" />
              <span>Ana Sayfa</span>
            </Link>
            {isTeacher && (
              <>
                <Link to="/my-class" className="flex items-center space-x-3 p-2 rounded-lg hover:bg-orange-800 transition-colors">
                  <Users className="w-5 h-5" />
                  <span>Sınıfım</span>
                </Link>
              </>
            )}
            <Link to="/catalog" className={`flex items-center space-x-3 p-2 rounded-lg ${isTeacher ? 'hover:bg-orange-800' : 'hover:bg-indigo-800'} transition-colors`}>
              <Library className="w-5 h-5" />
              <span>Katalog</span>
            </Link>
            <Link to="/borrowed-books" className={`flex items-center space-x-3 p-2 rounded-lg ${isTeacher ? 'hover:bg-orange-800' : 'hover:bg-indigo-800'} transition-colors`}>
              <BookIcon className="w-5 h-5" />
              <span>Ödünç Aldıklarım</span>
            </Link>
            <Link to="/my-posts" className={`flex items-center space-x-3 p-2 rounded-lg ${isTeacher ? 'hover:bg-orange-800' : 'hover:bg-indigo-800'} transition-colors`}>
              <BookIcon className="w-5 h-5" />
              <span>Blog Yazılarım</span>
            </Link>
            <Link to="/requests" className={`flex items-center space-x-3 p-2 rounded-lg ${isTeacher ? 'hover:bg-orange-800' : 'hover:bg-indigo-800'} transition-colors`}>
              <MessageSquare className="w-5 h-5" />
              <span>Taleplerim</span>
            </Link>
            <Link to="/fines" className={`flex items-center space-x-3 p-2 rounded-lg ${isTeacher ? 'hover:bg-orange-800' : 'hover:bg-indigo-800'} transition-colors`}>
              <DollarSign className="w-5 h-5" />
              <span>Cezalarım</span>
            </Link>
            <Link to="/my-coupons" className={`flex items-center space-x-3 p-2 rounded-lg ${isTeacher ? 'hover:bg-orange-800' : 'hover:bg-indigo-800'} transition-colors`}>
              <MessageSquare className="w-5 h-5" />
              <span>Kuponlarım</span>
            </Link>
            <Link to="/favorites" className={`flex items-center space-x-3 p-2 rounded-lg ${isTeacher ? 'hover:bg-orange-800' : 'hover:bg-indigo-800'} transition-colors`}>
              <Heart className="w-5 h-5" />
              <span>Favorilerim</span>
            </Link>
            <Link to="/collection-distribution" className={`flex items-center space-x-3 p-2 rounded-lg ${isTeacher ? 'hover:bg-orange-800' : 'hover:bg-indigo-800'} transition-colors`}>
              <PieChart className="w-5 h-5" />
              <span>Eser Dağılımı</span>
            </Link>
            <button
              onClick={() => setShowRules(true)}
              className={`flex items-center space-x-3 p-2 rounded-lg ${isTeacher ? 'hover:bg-orange-800' : 'hover:bg-indigo-800'} transition-colors w-full text-left`}
            >
              <ScrollText className="w-5 h-5" />
              <span>Kütüphane Kuralları</span>
            </button>
            {isTeacher && (
              <Link to="/teacher/reports" className="flex items-center space-x-3 p-2 rounded-lg hover:bg-orange-800 transition-colors">
                <BarChart className="w-5 h-5" />
                <span>Raporlar</span>
              </Link>
            )}
            <Link to="/settings" className={`flex items-center space-x-3 p-2 rounded-lg ${isTeacher ? 'hover:bg-orange-800' : 'hover:bg-indigo-800'} transition-colors`}>
              <Settings className="w-5 h-5" />
              <span>Ayarlar</span>
            </Link>
          </nav>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <button 
            onClick={handleLogout}
            className={`flex items-center space-x-3 p-3 w-full rounded-lg ${isTeacher ? 'hover:bg-orange-800' : 'hover:bg-indigo-800'} transition-colors text-red-300 hover:text-red-400`}
          >
            <LogOut className="w-5 h-5" />
            <span>Çıkış Yap</span>
          </button>
        </div>
      </div>

      {showRules && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-white via-indigo-50/30 to-purple-50/30 backdrop-blur-xl rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden border border-white/20">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-6 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                  <ScrollText className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Kütüphane Rehberi</h2>
                  <p className="text-white/80 text-sm">Sistemin nasıl çalıştığını öğrenin</p>
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
            <div className="p-6 overflow-y-auto max-h-[calc(85vh-180px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div className="p-6 border-t border-white/20 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600 flex items-center gap-2">
                  <span className="text-2xl">💡</span>
                  <span>Sorularınız için <strong>Taleplerim</strong> bölümünden bize ulaşabilirsiniz</span>
                </p>
                <button
                  onClick={() => setShowRules(false)}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-300 hover:scale-105"
                >
                  Anladım
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
              <h3 className="text-lg font-medium text-gray-900">Tebrikler!</h3>
              <button onClick={() => setShowCongratulatoryModal(false)} className="text-gray-400 hover:text-gray-500">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 text-center">
              <p className="text-xl font-semibold text-indigo-600 mb-4">Okuma hedefine ulaştın!</p>
              <p className="text-gray-700">Yeni hedefler belirlemek için Okuma Hedefim bölümünü ziyaret edebilirsin.</p>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowCongratulatoryModal(false)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Tamam
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
                  <h1 className="text-3xl font-bold mb-2">Hoş Geldiniz, {userData?.displayName || user.displayName || user.email?.split('@')[0]}</h1>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 mb-6 sm:mb-8">
            {/* Çark Butonu */}
            <button
              onClick={() => setShowSpinModal(true)}
              className="relative bg-gradient-to-br from-purple-500 to-pink-600 p-4 sm:p-6 rounded-xl shadow-lg hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 group overflow-hidden touch-manipulation min-h-[120px]"
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative flex flex-col items-center justify-center h-full">
                <div className="text-4xl sm:text-6xl mb-1 sm:mb-2 group-hover:rotate-180 transition-transform duration-700">🎡</div>
                <p className="text-white font-bold text-sm sm:text-lg text-center">Günlük Şans Çarkı</p>
                {canSpin && (
                  <div className="mt-1 sm:mt-2 px-2 sm:px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full">
                    <span className="text-white text-xs font-semibold flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                      Hakkın Var!
                    </span>
                  </div>
                )}
              </div>
            </button>
            <Link to="/borrowed-books" className="bg-gradient-to-br from-blue-500 to-cyan-600 p-4 sm:p-6 rounded-xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm font-medium mb-2">Aktif Kitapların</p>
                  <p className="text-4xl font-bold text-white">{summaryStats.activeBooksCount}</p>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-full p-3 hover:bg-white/30 transition-colors">
                  <BookOpen className="w-8 h-8 text-white" />
                </div>
              </div>
            </Link>
            <Link to="/borrowed-books" className={`bg-gradient-to-br ${summaryStats.dueDateStatus === 'overdue' ? 'from-red-500 to-pink-600' : summaryStats.dueDateStatus === 'dueSoon' ? 'from-yellow-500 to-orange-600' : 'from-green-500 to-emerald-600'} p-4 sm:p-6 rounded-xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm font-medium mb-2">{summaryStats.dueDateText}</p>
                  <p className="text-lg font-bold text-white truncate">{summaryStats.nextDueBook && summaryStats.nextDueBook.title ? `${summaryStats.nextDueBook.title.substring(0, 15)}...` : '-'}</p>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-full p-3 hover:bg-white/30 transition-colors">
                  {summaryStats.dueDateStatus === 'overdue' ? <AlertCircle className="w-8 h-8 text-white" /> : <Clock className="w-8 h-8 text-white" />}
                </div>
              </div>
            </Link>
            <Link to="/fines" className="bg-gradient-to-br from-red-500 to-pink-600 p-4 sm:p-6 rounded-xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm font-medium mb-2">Ödenmemiş Ceza</p>
                  <p className="text-4xl font-bold text-white">{summaryStats.totalFine} TL</p>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-full p-3 hover:bg-white/30 transition-colors">
                  <AlertCircle className="w-8 h-8 text-white" />
                </div>
              </div>
            </Link>
            <Link to="/requests" className="bg-gradient-to-br from-purple-500 to-indigo-600 p-4 sm:p-6 rounded-xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm font-medium mb-2">Bekleyen Talepler</p>
                  <p className="text-4xl font-bold text-white">{summaryStats.pendingRequestsCount}</p>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-full p-3 hover:bg-white/30 transition-colors">
                  <MessageSquare className="w-8 h-8 text-white" />
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
                      <p className="text-center text-gray-600">Alıntı yükleniyor...</p>
                    )}
                  </div>
                  
                  {/* Polaroid Bottom - Handwritten Style */}
                  <div className="text-center">
                    <p className="text-gray-700 font-handwriting text-lg" style={{ fontFamily: 'cursive' }}>
                      Günün Alıntısı ✨
                    </p>
                  </div>
                </div>
                
                {/* Shadow effect */}
                <div className="absolute inset-0 bg-black/10 blur-xl -z-10 group-hover:bg-black/20 transition-all duration-500"></div>
              </div>
            </div>

            {/* Reading Goals - Left Column */}
            <section className="lg:col-span-4 flex flex-col">
              <div className="flex justify-between items-center mb-3 sm:mb-4">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center">
                  <Target className="w-6 h-6 mr-2 text-blue-500" />
                  Okuma Hedefim
                </h2>
                <button
                  onClick={() => setShowReadingGoalsModal(true)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
                >
                  Düzenle
                </button>
              </div>
              <div className="bg-indigo-50 rounded-xl shadow-sm p-6 space-y-6 flex-grow border border-indigo-200">
                {monthlyGoal ? (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-lg font-semibold text-gray-800">
                        Bu Ayki Hedef: {monthlyGoal.goal} Kitap
                      </p>
                      <p className="text-lg font-bold text-indigo-600">{`${monthlyGoal.progress} / ${monthlyGoal.goal}`}</p>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4">
                      <div
                        className="bg-indigo-600 h-4 rounded-full"
                        style={{ width: `${Math.min((monthlyGoal.progress / monthlyGoal.goal) * 100, 100)}%` }}
                      ></div>
                    </div>
                    {monthlyGoal.progress >= monthlyGoal.goal && (
                      <div className="mt-2 text-sm text-green-600 font-medium">
                        🎉 Tebrikler! Bu ayın hedefini tamamladınız!
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-gray-500">
                    <p>Bu ay için bir hedef belirlemedin.</p>
                  </div>
                )}
                {yearlyGoal ? (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-lg font-semibold text-gray-800">
                        Bu Yılki Hedef: {yearlyGoal.goal} Kitap
                      </p>
                      <p className="text-lg font-bold text-indigo-600">{`${yearlyGoal.progress} / ${yearlyGoal.goal}`}</p>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4">
                      <div
                        className="bg-indigo-600 h-4 rounded-full"
                        style={{ width: `${Math.min((yearlyGoal.progress / yearlyGoal.goal) * 100, 100)}%` }}
                      ></div>
                    </div>
                    {yearlyGoal.progress >= yearlyGoal.goal && (
                      <div className="mt-2 text-sm text-green-600 font-medium">
                        🎉 Harika! Bu yılın hedefini tamamladınız!
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-gray-500">
                    <p>Bu yıl için bir hedef belirlemedin.</p>
                  </div>
                )}
                {!monthlyGoal && !yearlyGoal && (
                   <div className="text-center">
                      <p className="text-gray-600 mb-4">Henüz bir okuma hedefin yok.</p>
                      <button
                      onClick={() => setShowReadingGoalsModal(true)}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                      >
                      Hemen Oluştur
                      </button>
                  </div>
                )}
              </div>
            </section>

            {/* Recommendations - Right Column */}
            <section className="lg:col-span-8">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center">
                <Heart className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-red-500" />
                Sana Özel Öneriler
              </h2>
              {recommendedBooks.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  {recommendedBooks.slice(0, 4).map(book => (
                    <div key={book.id} className="group">
                      <div className="relative overflow-hidden rounded-lg aspect-[2/3] mb-3">
                        <img
                          src={book.coverImage}
                          alt={book.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="absolute bottom-0 left-0 right-0 p-3">
                            <button
                              onClick={() => handleBorrowBook(book as BookType)}
                              className="w-full px-3 py-2 rounded-lg text-xs font-medium bg-white text-gray-900 hover:bg-gray-100 transition-colors"
                            >
                              Ödünç Al
                            </button>
                          </div>
                        </div>
                      </div>
                      <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 mb-1">{book.title}</h3>
                      <p className="text-xs text-gray-600">{book.author}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white/90 backdrop-blur-xl rounded-xl shadow-lg p-8 text-center flex flex-col items-center justify-center min-h-[280px] border border-white/20">
                  <Heart className="w-12 h-12 text-gray-300 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Henüz Size Özel Öneri Yok</h3>
                  <p className="text-gray-500 mb-4">Daha fazla kitap okuyup etkileşimde bulundukça size özel öneriler burada görünecektir.</p>
                  <Link to="/catalog" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                    Kataloğa Göz At
                  </Link>
                </div>
              )}
            </section>

            {/* Leaderboard - Full Width */}
            <section className="lg:col-span-12">
              <div className="overflow-x-auto">
                <Leaderboard />
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
                      className="w-full h-full object-cover blur-sm scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/80"></div>
                  </div>

                  {/* Content */}
                  <div className="relative z-10 px-8 py-16 md:px-16 md:py-20">
                    {/* Top Label */}
                    <div className="flex items-center justify-center mb-6">
                      <Star className="w-6 h-6 text-yellow-400 fill-yellow-400 mr-2" />
                      <span className="text-yellow-400 font-bold text-sm tracking-widest uppercase">ÖNE ÇIKAN YAZAR</span>
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
                        Yazarın Sayfasına Git
                        <ExternalLink className="w-5 h-5 ml-2" />
                      </Link>
                    </div>

                    {/* Polaroid Books Section */}
                    <div className="mt-8">
                      <h3 className="text-2xl font-bold text-white text-center mb-8">Öne Çıkan Eserleri</h3>
                      <div className="flex flex-wrap justify-center items-center gap-8 max-w-6xl mx-auto">
                        {featuredAuthorBooks.slice(0, 4).map((book, index) => {
                          const status = getBookStatus(book.id);
                          const isAvailable = status === 'available';
                          const rotations = ['-rotate-3', 'rotate-2', '-rotate-2', 'rotate-3'];
                          return (
                            <div 
                              key={book.id} 
                              className={`group ${rotations[index]} hover:rotate-0 transition-all duration-300 hover:scale-105`}
                            >
                              {/* Polaroid Frame */}
                              <div className="bg-white/95 backdrop-blur-sm p-1 shadow-xl hover:shadow-2xl transition-shadow duration-300">
                                {/* Image */}
                                <div className="relative w-48 h-56 overflow-hidden">
                                  <img
                                    src={book.coverImage}
                                    alt={book.title}
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
            <section className="lg:col-span-12">
              <div className="mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center">
                  <BookPlus className="w-6 h-6 mr-2 text-green-500" />
                  Yeni Eklenen Kitaplar
                </h2>
                <p className="text-gray-600 mt-2">Kütüphanemize yeni eklenen kitapları keşfedin</p>
              </div>
              <EnhancedBookCarousel books={newBooks} onBorrowBook={handleBorrowBook} />
            </section>

            {/* Events - Full Width */}
            <section className="lg:col-span-12">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center">
                <Calendar className="w-6 h-6 mr-2 text-purple-500" />
                Etkinlikler, Anketler ve Duyurular
              </h2>
              
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
                      Tümü ({allItems.length})
                    </button>
                    <button
                      onClick={() => setActiveTab('events')}
                      className={`px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                        activeTab === 'events'
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      Etkinlikler ({allItems.filter(item => item.type === 'event').length})
                    </button>
                    <button
                      onClick={() => setActiveTab('surveys')}
                      className={`px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                        activeTab === 'surveys'
                          ? 'bg-green-100 text-green-700'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      Anketler ({allItems.filter(item => item.type === 'survey').length})
                    </button>
                    <button
                      onClick={() => setActiveTab('announcements')}
                      className={`px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                        activeTab === 'announcements'
                          ? 'bg-orange-100 text-orange-700'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      Duyurular ({allItems.filter(item => item.type === 'announcement').length})
                    </button>
                  </nav>
                </div>
                
                {/* Tab Content */}
                <div className="p-6">
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
                </div>
              </div>
            </section>

            
          </div>
        </div>
      </div>

      <OnboardingTour
        isOpen={showOnboarding}
        onClose={(dontShowAgain) => {
          setShowOnboarding(false);
          if (!dontShowAgain) {
            setShowPersonalization(true);
          }
        }}
        onComplete={handleOnboardingComplete}
      />

      {showPersonalization && (
        <PersonalizationQuestions onComplete={handlePersonalizationComplete} />
      )}
    

      <ReadingGoalsModal
        isOpen={showReadingGoalsModal}
        onClose={() => setShowReadingGoalsModal(false)}
        onGoalSaved={fetchGoals}
      />

      <ItemDetailsModal
        isOpen={showItemDetailsModal}
        onClose={handleCloseItemModal}
        item={selectedItem}
      />

      <SpinWheelModal isOpen={showSpinModal} onClose={() => setShowSpinModal(false)} />
      
      {/* Chat Bot */}
      <ChatBot />
    </div>
  );
};

export default UserDashboard;
