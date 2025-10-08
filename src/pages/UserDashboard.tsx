import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { Book, Clock, BookOpen, Menu, X, Home, Library, BookOpen as BookIcon, Settings, LogOut, Calendar, Bell, MessageSquare, ScrollText, DollarSign, Quote, ChevronLeft, ChevronRight as ChevronRightIcon, Search, PieChart, MapPin, Calendar as CalendarIcon, ExternalLink, Heart, Target, Star, BookPlus, AlertCircle, Gamepad2 } from 'lucide-react';
import OnboardingTour from '../components/onboarding/OnboardingTour';
import ItemDetailsModal from '../components/common/ItemDetailsModal';
import ReadingGoalsModal from '../components/common/ReadingGoalsModal';
import ItemSlider from '../components/common/ItemSlider';
import Leaderboard from '../components/dashboard/Leaderboard'; // Lider tablosu import edildi
import UpdateButton from '../components/common/UpdateButton'; // Added import

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
  const { user, userData, isAdmin } = useAuth();
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
  const [currentSlide, setCurrentSlide] = useState(0);
  const [currentRecSlide, setCurrentRecSlide] = useState(0);
  const [newBooks, setNewBooks] = useState<Book[][]>([]);
  
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const sliderRef = React.useRef<HTMLDivElement>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showItemDetailsModal, setShowItemDetailsModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Event | Survey | Announcement | null>(null);

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
      const chunkedBooks = [];
      for (let i = 0; i < latestBooks.length; i += 4) {
        chunkedBooks.push(latestBooks.slice(i, i + 4));
      }
      setNewBooks(chunkedBooks);
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

  const handleOnboardingComplete = async () => {
    if (!user) return;
    
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        hasCompletedOnboarding: true
      });
      setShowOnboarding(false);
    } catch (error) {
      console.error('Error updating onboarding status:', error);
      setShowOnboarding(false);
    }
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

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % newBooks.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + newBooks.length) % newBooks.length);
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

  useEffect(() => {
    const timer = setInterval(nextSlide, 5000);
    return () => clearInterval(timer);
  }, [newBooks.length]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.pageX - (sliderRef.current?.offsetLeft || 0));
    setScrollLeft(sliderRef.current?.scrollLeft || 0);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - (sliderRef.current?.offsetLeft || 0);
    const walk = (x - startX) * 2;
    if (sliderRef.current) {
      sliderRef.current.scrollLeft = scrollLeft - walk;
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
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
    'Kütüphane içerisinde sessiz olunmalıdır.',
    'Ödünç alınan kitaplar zamanında iade edilmelidir.',
    'Kitaplara zarar vermekten kaçınılmalıdır.',
    'Yiyecek ve içecekle kütüphaneye girilmemelidir.',
    'Diğer kullanıcıların çalışma ortamına saygı gösterilmelidir.',
    'Çalışma masaları uzun süre terk edilmemelidir. 30 dakikadan fazla terk edilen masalardaki eşyalar görevliler tarafından kaldırılabilir.',
    'Kütüphane materyalleri izinsiz olarak dışarı çıkarılmamalıdır. Ödünç alma işlemleri kütüphane görevlileri tarafından yapılmalıdır.',
    'Grup çalışmaları için ayrılmış özel alanlar dışında grup çalışması yapılmamalıdır.',
    'Kütüphane içerisinde cep telefonları sessiz modda tutulmalı ve görüşmeler kütüphane dışında yapılmalıdır.',
    'Kütüphane çalışma saatleri içerisinde uyulması gereken kurallara uymayan kullanıcılar kütüphane görevlileri tarafından uyarılabilir ve gerekli durumlarda kütüphane kullanım hakları geçici olarak kısıtlanabilir.'
  ];

  return (
    <div className="min-h-screen bg-gray-50 relative">
      {/* Sidebar */}
      <div className={`fixed top-0 left-0 h-full w-64 bg-indigo-900 text-white transform transition-transform duration-300 ease-in-out z-50 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center">
              <Book className="w-8 h-8 mr-2" />
              <span className="text-xl font-bold">Data Koleji</span>
            </div>
            <button onClick={toggleSidebar} className="p-2 hover:bg-indigo-800 rounded-lg">
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <nav className="space-y-1">
            <Link to="/dashboard" className="flex items-center space-x-3 p-2 rounded-lg hover:bg-indigo-800 transition-colors">
              <Home className="w-5 h-5" />
              <span>Ana Sayfa</span>
            </Link>
            <Link to="/catalog" className="flex items-center space-x-3 p-2 rounded-lg hover:bg-indigo-800 transition-colors">
              <Library className="w-5 h-5" />
              <span>Katalog</span>
            </Link>
            <Link to="/borrowed-books" className="flex items-center space-x-3 p-2 rounded-lg hover:bg-indigo-800 transition-colors">
              <BookIcon className="w-5 h-5" />
              <span>Ödünç Aldıklarım</span>
            </Link>
            <Link to="/my-events" className="flex items-center space-x-3 p-2 rounded-lg hover:bg-indigo-800 transition-colors">
              <Calendar className="w-5 h-5" />
              <span>Etkinliklerim</span>
            </Link>
            <Link to="/my-appointments" className="flex items-center space-x-3 p-2 rounded-lg hover:bg-indigo-800 transition-colors">
              <Calendar className="w-5 h-5" />
              <span>Randevularım</span>
            </Link>
            <Link to="/games" className="flex items-center space-x-3 p-2 rounded-lg hover:bg-indigo-800 transition-colors">
              <Gamepad2 className="w-5 h-5" />
              <span>Oyunlar</span>
            </Link>
            <Link to="/my-posts" className="flex items-center space-x-3 p-2 rounded-lg hover:bg-indigo-800 transition-colors">
              <BookIcon className="w-5 h-5" />
              <span>Blog Yazılarım</span>
            </Link>
            
            <Link to="/requests" className="flex items-center space-x-3 p-2 rounded-lg hover:bg-indigo-800 transition-colors">
              <MessageSquare className="w-5 h-5" />
              <span>Taleplerim</span>
            </Link>
            <Link to="/fines" className="flex items-center space-x-3 p-2 rounded-lg hover:bg-indigo-800 transition-colors">
              <DollarSign className="w-5 h-5" />
              <span>Cezalarım</span>
            </Link>
            <Link to="/favorites" className="flex items-center space-x-3 p-2 rounded-lg hover:bg-indigo-800 transition-colors">
              <Heart className="w-5 h-5" />
              <span>Favorilerim</span>
            </Link>
            <Link to="/collection-distribution" className="flex items-center space-x-3 p-2 rounded-lg hover:bg-indigo-800 transition-colors">
              <PieChart className="w-5 h-5" />
              <span>Eser Dağılımı</span>
            </Link>
            <button
              onClick={() => setShowRules(true)}
              className="flex items-center space-x-3 p-2 rounded-lg hover:bg-indigo-800 transition-colors w-full text-left"
            >
              <ScrollText className="w-5 h-5" />
              <span>Kütüphane Kuralları</span>
            </button>
            <Link to="/settings" className="flex items-center space-x-3 p-2 rounded-lg hover:bg-indigo-800 transition-colors">
              <Settings className="w-5 h-5" />
              <span>Ayarlar</span>
            </Link>
          </nav>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <button 
            onClick={handleLogout}
            className="flex items-center space-x-3 p-3 w-full rounded-lg hover:bg-indigo-800 transition-colors text-red-300 hover:text-red-400"
          >
            <LogOut className="w-5 h-5" />
            <span>Çıkış Yap</span>
          </button>
        </div>
      </div>

      {showRules && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <ScrollText className="w-6 h-6 mr-2 text-indigo-600" />
                Kütüphane Kuralları
              </h2>
              <button
                onClick={() => setShowRules(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <ul className="space-y-4">
                {libraryRules.map((rule, index) => (
                  <li key={index} className="flex items-start">
                    <span className="flex-shrink-0 w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mr-3 mt-0.5 text-sm font-medium">
                      {index + 1}
                    </span>
                    <p className="text-gray-700">{rule}</p>
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowRules(false)}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Anladım
              </button>
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

      <div className="min-h-screen bg-gray-50">
        <div className="bg-indigo-900 text-white py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={toggleSidebar}
                className="p-2 hover:bg-indigo-800 rounded-lg transition-colors"
              >
                <Menu className="w-6 h-6" />
              </button>
              <h1 className="text-3xl font-bold">Hoş Geldiniz, {userData?.displayName || user.displayName || user.email?.split('@')[0]}</h1>
              <UpdateButton /> {/* Added UpdateButton here */}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* At a Glance Summary Cards - Premium Minimal Gradient */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Link to="/borrowed-books" className="bg-gradient-to-br from-blue-500 to-cyan-600 p-6 rounded-xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300">
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
            <Link to="/borrowed-books" className={`bg-gradient-to-br ${summaryStats.dueDateStatus === 'overdue' ? 'from-red-500 to-pink-600' : summaryStats.dueDateStatus === 'dueSoon' ? 'from-yellow-500 to-orange-600' : 'from-green-500 to-emerald-600'} p-6 rounded-xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300`}>
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
            <Link to="/fines" className="bg-gradient-to-br from-red-500 to-pink-600 p-6 rounded-xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300">
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
            <Link to="/requests" className="bg-gradient-to-br from-purple-500 to-indigo-600 p-6 rounded-xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300">
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
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Quote - Full Width */}
            <div className="lg:col-span-12 bg-gradient-to-r from-indigo-900 to-blue-800 rounded-xl shadow-lg p-8 text-white relative overflow-hidden">
              <div className="absolute top-4 right-4">
                <Quote className="w-8 h-8 text-indigo-300 opacity-50" />
              </div>
              <h2 className="text-xl font-semibold mb-4">Günün Alıntısı</h2>
              {dailyQuote ? (
                <blockquote className="relative">
                  <p className="text-lg font-medium italic mb-4">
                    "{dailyQuote.text}"
                  </p>
                  <footer className="text-indigo-200">
                    <p className="font-semibold">{dailyQuote.author}</p>
                    <p className="text-sm">{dailyQuote.book}</p>
                  </footer>
                </blockquote>
              ) : (
                <p>Alıntı yükleniyor...</p>
              )}
            </div>

            {/* Reading Goals - Left Column */}
            <section className="lg:col-span-4 flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center">
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
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <Heart className="w-6 h-6 mr-2 text-red-500" />
                Sana Özel Öneriler
              </h2>
              {recommendedBooks.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
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
                <div className="bg-white rounded-xl shadow-sm p-8 text-center flex flex-col items-center justify-center min-h-[280px]">
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
              <Leaderboard />
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
                    <h2 className="text-5xl md:text-6xl font-bold text-white text-center mb-6">
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
                <div className="bg-white rounded-xl shadow-sm p-8 text-center">
                  <Star className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">Bu ay öne çıkan bir yazar bulunamadı.</p>
                </div>
              )}
            </section>

            {/* New Books - Full Width */}
            <section className="lg:col-span-12">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                  <BookPlus className="w-6 h-6 mr-2 text-green-500" />
                  Yeni Eklenen Kitaplar
                </h2>
                {newBooks.length > 0 && (
                  <div className="flex space-x-2">
                    <button
                      onClick={prevSlide}
                      className="p-2 rounded-full bg-white shadow-md hover:bg-gray-50 transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <button
                      onClick={nextSlide}
                      className="p-2 rounded-full bg-white shadow-md hover:bg-gray-50 transition-colors"
                    >
                      <ChevronRightIcon className="w-5 h-5 text-gray-600" />
                    </button>
                  </div>
                )}
              </div>
              <div className="relative">
                {newBooks.length > 0 ? (
                  <>
                    <div
                      ref={sliderRef}
                      className="overflow-hidden"
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseUp}
                      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                    >
                      <div
                        className="flex transition-transform duration-500 ease-in-out"
                        style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                      >
                        {newBooks.map((slide, slideIndex) => (
                          <div key={slideIndex} className="w-full flex-shrink-0 px-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                              {slide.map(book => (
                                <div
                                  key={book.id}
                                  className="bg-white rounded-xl shadow-sm overflow-hidden transform transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-4 border-transparent hover:border-indigo-400"
                                >
                                  <div className="relative">
                                    <img
                                      src={book.coverImage}
                                      alt={book.title}
                                      className="w-full h-80 object-cover"
                                    />
                                    <div className="absolute top-2 right-2">
                                      <div className="px-2 py-1 bg-indigo-600 text-white text-xs rounded-full">
                                        Yeni
                                      </div>
                                    </div>
                                  </div>
                                  <div className="p-4">
                                    <h3 className="font-semibold text-gray-900 mb-1">{book.title}</h3>
                                    <p className="text-sm text-gray-600">{book.author}</p>
                                    <div className="mt-3 flex items-center justify-between">
                                      <div className="flex items-center text-xs text-gray-500">
                                        <CalendarIcon className="w-4 h-4 mr-1" />
                                        {book.addedDate && new Date((book.addedDate as any).seconds * 1000).toLocaleDateString()}
                                      </div>
                                      <button
                                        onClick={() => handleBorrowBook(book as BookType)}
                                        className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium hover:bg-indigo-200 transition-colors"
                                      >
                                        Ödünç Al
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                      {newBooks.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentSlide(index)}
                          className={`w-2 h-2 rounded-full transition-colors ${
                            currentSlide === index
                              ? 'bg-indigo-600'
                              : 'bg-gray-300 hover:bg-indigo-400'
                          }`}
                        />
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="bg-white rounded-xl shadow-sm p-8 text-center flex flex-col items-center justify-center h-full min-h-[280px]">
                    <BookPlus className="w-12 h-12 text-gray-300 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Henüz Yeni Kitap Eklenmemiş</h3>
                    <p className="text-gray-500 mb-4">Bu hafta yeni eklenen bir kitap yok. Katalogdaki diğer harika eserlere göz atabilirsiniz.</p>
                    <Link to="/catalog" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                      Kataloğa Göz At
                    </Link>
                  </div>
                )}
              </div>
            </section>

            {/* Events - Full Width */}
            <section className="lg:col-span-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <Calendar className="w-6 h-6 mr-2 text-purple-500" />
                Etkinlikler, Anketler ve Duyurular
              </h2>
              
              {/* Tabs */}
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="border-b border-gray-200">
                  <nav className="flex space-x-1 p-2" aria-label="Tabs">
                    <button
                      onClick={() => setActiveTab('all')}
                      className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                        activeTab === 'all'
                          ? 'bg-purple-100 text-purple-700'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      Tümü ({allItems.length})
                    </button>
                    <button
                      onClick={() => setActiveTab('events')}
                      className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                        activeTab === 'events'
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      Etkinlikler ({allItems.filter(item => item.type === 'event').length})
                    </button>
                    <button
                      onClick={() => setActiveTab('surveys')}
                      className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                        activeTab === 'surveys'
                          ? 'bg-green-100 text-green-700'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      Anketler ({allItems.filter(item => item.type === 'survey').length})
                    </button>
                    <button
                      onClick={() => setActiveTab('announcements')}
                      className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
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
        onClose={() => setShowOnboarding(false)}
        onComplete={handleOnboardingComplete}
      />
    

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
    </div>
  );
};

export default UserDashboard;
