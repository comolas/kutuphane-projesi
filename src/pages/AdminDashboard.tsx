import React, { useState, useEffect } from 'react';
import RequestsTab from '../components/admin/RequestsTab';
import UsersTab from '../components/admin/tabs/UsersTab';
import AdminCollectionDistribution from '../components/admin/tabs/AdminCollectionDistribution';
import AdminCatalogTab from '../components/admin/tabs/AdminCatalogTab';
import FinesTab from '../components/admin/tabs/FinesTab';
import BorrowedBooksTab from '../components/admin/tabs/BorrowedBooksTab';
import MessagesTab from '../components/admin/tabs/MessagesTab';
import EventManagementTab from '../components/admin/tabs/EventManagementTab';
import ReportsTab from '../components/admin/tabs/ReportsTab';
import QuoteManagementTab from '../components/admin/tabs/QuoteManagementTab';
import AuthorManagementTab from '../components/admin/tabs/AuthorManagementTab'; // Import edildi
import ReviewManagementTab from '../components/admin/tabs/ReviewManagementTab';
import AdminMagazinesTab from '../components/admin/tabs/AdminMagazinesTab';
import CollectionManagementTab from '../components/admin/tabs/CollectionManagementTab'; // Yeni eklendi
import BudgetTab from '../components/admin/tabs/BudgetTab';
import GameManagementTab from '../components/admin/tabs/GameManagementTab';
import AdminGameReservationsTab from '../components/admin/tabs/AdminGameReservationsTab';
import BlogManagementTab from '../components/admin/tabs/BlogManagementTab';
import SpinWheelManagementTab from '../components/admin/SpinWheelManagementTab'; // Yeni eklendi
import UpdateButton from '../components/common/UpdateButton'; // Added import
import AdminChatBot from '../components/admin/AdminChatBot';
import { RequestProvider } from '../contexts/RequestContext';
import { useAuth } from '../contexts/AuthContext';
import { useBooks } from '../contexts/BookContext';
import { Navigate, useLocation } from 'react-router-dom';
import { Book as BookIcon, Users, Library, LogOut, Menu, X, MessageSquare, DollarSign, Mail, Calendar, PieChart, BarChart, BookText, UserCog, ClipboardList, BookOpen, Layers, TrendingUp, Gamepad2, Gift, Search, ChevronDown, ChevronRight } from 'lucide-react'; // Layers ve Gift eklendi
import { auth, db } from '../firebase/config';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Book } from '../types'; // Import Book type

interface UserData {
  uid: string;
  email: string;
  displayName: string;
  studentClass: string;
  studentNumber: string;
  role: 'user' | 'admin';
  createdAt: Date;
  lastLogin: Date;
}

const AdminDashboard: React.FC = () => {
  const location = useLocation();
  const { isAdmin } = useAuth();
  const { refetchAllBooks, getBookStatus } = useBooks();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'borrowed-books' | 'requests' | 'fines' | 'messages' | 'users' | 'catalog' | 'collection-distribution' | 'reports' | 'user-events' | 'announcements' | 'quote-management' | 'author-management' | 'review-management' | 'magazine-management' | 'collection-management' | 'budget' | 'game-management' | 'game-reservations' | 'blog-management' | 'spin-wheel-management'>(location.state?.activeTab || 'borrowed-books');
  const [users, setUsers] = useState<UserData[]>([]);
  const [catalogBooks, setCatalogBooks] = useState<Book[]>([]);
  const [badges, setBadges] = useState({ messages: 0, requests: 0, fines: 0, reviews: 0, posts: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState({ main: true, management: true, reports: true });

  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
    }
  }, [location.state]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const usersRef = collection(db, 'users');
        const usersSnapshot = await getDocs(usersRef);
        const usersData: UserData[] = [];
        usersSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.role !== 'admin') {
            usersData.push({
              uid: doc.id,
              ...data,
              createdAt: data.createdAt?.toDate() || new Date(),
              lastLogin: data.lastLogin?.toDate() || new Date(),
            } as UserData);
          }
        });
        setUsers(usersData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));

        const booksCollectionRef = collection(db, "books");
        const booksSnapshot = await getDocs(booksCollectionRef);
        const booksData = booksSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Book[];
        setCatalogBooks(booksData);

        // Fetch badge counts
        const [messagesSnap, requestsSnap, borrowedSnap, reviewsSnap, postsSnap] = await Promise.all([
          getDocs(query(collection(db, 'messages'), where('read', '==', false))),
          getDocs(query(collection(db, 'requests'), where('status', '==', 'pending'))),
          getDocs(collection(db, 'borrowedBooks')),
          getDocs(query(collection(db, 'reviews'), where('status', '==', 'pending'))),
          getDocs(query(collection(db, 'posts'), where('status', '==', 'pending')))
        ]);

        const unpaidFines = borrowedSnap.docs.filter(doc => {
          const data = doc.data();
          const daysOverdue = Math.ceil((new Date().getTime() - data.dueDate?.toDate().getTime()) / (1000 * 60 * 60 * 24));
          return daysOverdue > 0 && data.fineStatus !== 'paid';
        }).length;

        setBadges({
          messages: messagesSnap.size,
          requests: requestsSnap.size,
          fines: unpaidFines,
          reviews: reviewsSnap.size,
          posts: postsSnap.size
        });

      } catch (error) {
        console.error("Error fetching initial data:", error);
      }
    };

    fetchInitialData();
  }, []);

  if (!isAdmin) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error('Çıkış yapılırken hata oluştu:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`fixed top-0 left-0 h-full w-80 sm:w-96 bg-indigo-900 text-white transform transition-transform duration-300 ease-in-out z-50 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-3 sm:p-4">
          <div className="flex justify-between items-center mb-3 sm:mb-4">
            <div className="flex items-center">
              <BookIcon className="w-6 h-6 sm:w-8 sm:h-8 mr-2" />
              <span className="text-lg sm:text-xl font-bold">Admin Panel</span>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="p-1.5 sm:p-2 hover:bg-indigo-800 rounded-lg touch-manipulation">
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
          
          <div className="mb-3 sm:mb-4">
            <div className="relative">
              <Search className="absolute left-2.5 sm:left-3 top-2.5 w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Menüde ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 sm:pl-9 pr-2 sm:pr-3 py-1.5 sm:py-2 bg-indigo-800 text-white placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm"
              />
            </div>
          </div>
          
          <nav className="space-y-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 180px)' }}>
            {(!searchQuery || 'ödünç verilen kitaplar'.includes(searchQuery.toLowerCase()) || 'mesajlar gönderilen talepler ceza'.includes(searchQuery.toLowerCase())) && (
            <div>
              <button
                onClick={() => setExpandedCategories(prev => ({ ...prev, main: !prev.main }))}
                className="flex items-center justify-between w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-white transition-colors touch-manipulation"
              >
                <span>Ana Panel</span>
                {expandedCategories.main ? <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              </button>
              {expandedCategories.main && (
              <div className="mt-1 space-y-1">
                {(!searchQuery || 'ödünç verilen kitaplar kitap'.includes(searchQuery.toLowerCase())) && (
                <button
                  onClick={() => { setActiveTab('borrowed-books'); setSidebarOpen(false); }}
                  className={`flex items-center w-full space-x-2 sm:space-x-3 p-1.5 sm:p-2 rounded-lg hover:bg-indigo-800 transition-all duration-200 touch-manipulation text-sm ${
                    activeTab === 'borrowed-books' ? 'bg-indigo-800' : ''
                  }`}
                >
                  <Library className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>Ödünç Verilen Kitaplar</span>
                </button>
                )}
                
                {(!searchQuery || 'mesajlar'.includes(searchQuery.toLowerCase())) && (
                <button
                  onClick={() => { setActiveTab('messages'); setSidebarOpen(false); }}
                  className={`flex items-center justify-between w-full space-x-3 p-2 rounded-lg hover:bg-indigo-800 hover:scale-105 hover:shadow-lg transition-all duration-200 ${
                    activeTab === 'messages' ? 'bg-indigo-800 scale-105 shadow-lg' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Mail className="w-5 h-5" />
                    <span>Mesajlar</span>
                  </div>
                  {badges.messages > 0 && (
                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      {badges.messages}
                    </span>
                  )}
                </button>
                )}

                {(!searchQuery || 'gönderilen talepler talep'.includes(searchQuery.toLowerCase())) && (
                <button
                  onClick={() => { setActiveTab('requests'); setSidebarOpen(false); }}
                  className={`flex items-center justify-between w-full space-x-3 p-2 rounded-lg hover:bg-indigo-800 hover:scale-105 hover:shadow-lg transition-all duration-200 ${
                    activeTab === 'requests' ? 'bg-indigo-800 scale-105 shadow-lg' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <MessageSquare className="w-5 h-5" />
                    <span>Gönderilen Talepler</span>
                  </div>
                  {badges.requests > 0 && (
                    <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      {badges.requests}
                    </span>
                  )}
                </button>
                )}

                {(!searchQuery || 'kullanıcı cezaları ceza'.includes(searchQuery.toLowerCase())) && (
                <button
                  onClick={() => { setActiveTab('fines'); setSidebarOpen(false); }}
                  className={`flex items-center justify-between w-full space-x-3 p-2 rounded-lg hover:bg-indigo-800 hover:scale-105 hover:shadow-lg transition-all duration-200 ${
                    activeTab === 'fines' ? 'bg-indigo-800 scale-105 shadow-lg' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <DollarSign className="w-5 h-5" />
                    <span>Kullanıcı Cezaları</span>
                  </div>
                  {badges.fines > 0 && (
                    <span className="bg-yellow-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      {badges.fines}
                    </span>
                  )}
                </button>
                )}
              </div>
              )}
            </div>
            )}

            {(!searchQuery || 'kullanıcılar etkinlik katalog dergi yorum alıntı yazar koleksiyon oyun blog çarkıfelek'.includes(searchQuery.toLowerCase())) && (
            <div className="pt-2">
              <button
                onClick={() => setExpandedCategories(prev => ({ ...prev, management: !prev.management }))}
                className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-white transition-colors"
              >
                <span>Yönetim</span>
                {expandedCategories.management ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              {expandedCategories.management && (
              <div className="mt-1 space-y-1">
                {(!searchQuery || 'kullanıcılar'.includes(searchQuery.toLowerCase())) && (
                <button
                  onClick={() => { setActiveTab('users'); setSidebarOpen(false); }}
                  className={`flex items-center w-full space-x-3 p-2 rounded-lg hover:bg-indigo-800 hover:scale-105 hover:shadow-lg transition-all duration-200 ${
                    activeTab === 'users' ? 'bg-indigo-800 scale-105 shadow-lg' : ''
                  }`}
                >
                  <Users className="w-5 h-5" />
                  <span>Kullanıcılar</span>
                </button>
                )}

                {(!searchQuery || 'etkinlik yönetimi'.includes(searchQuery.toLowerCase())) && (
                <button
                  onClick={() => { setActiveTab('user-events'); setSidebarOpen(false); }}
                  className={`flex items-center w-full space-x-3 p-2 rounded-lg hover:bg-indigo-800 hover:scale-105 hover:shadow-lg transition-all duration-200 ${
                    activeTab === 'user-events' ? 'bg-indigo-800 scale-105 shadow-lg' : ''
                  }`}
                >
                  <Calendar className="w-5 h-5" />
                  <span>Etkinlik Yönetimi</span>
                </button>
                )}

                {(!searchQuery || 'katalog'.includes(searchQuery.toLowerCase())) && (
                <button
                  onClick={() => { setActiveTab('catalog'); setSidebarOpen(false); }}
                  className={`flex items-center w-full space-x-3 p-2 rounded-lg hover:bg-indigo-800 hover:scale-105 hover:shadow-lg transition-all duration-200 ${
                    activeTab === 'catalog' ? 'bg-indigo-800 scale-105 shadow-lg' : ''
                  }`}
                >
                  <BookIcon className="w-5 h-5" />
                  <span>Katalog</span>
                </button>
                )}

                {(!searchQuery || 'dergi yönetimi'.includes(searchQuery.toLowerCase())) && (
                <button
                  onClick={() => { setActiveTab('magazine-management'); setSidebarOpen(false); }}
                  className={`flex items-center w-full space-x-3 p-2 rounded-lg hover:bg-indigo-800 hover:scale-105 hover:shadow-lg transition-all duration-200 ${
                    activeTab === 'magazine-management' ? 'bg-indigo-800 scale-105 shadow-lg' : ''
                  }`}
                >
                  <BookOpen className="w-5 h-5" />
                  <span>Dergi Yönetimi</span>
                </button>
                )}

                {(!searchQuery || 'yorum yönetimi'.includes(searchQuery.toLowerCase())) && (
                <button
                  onClick={() => { setActiveTab('review-management'); setSidebarOpen(false); }}
                  className={`flex items-center justify-between w-full space-x-3 p-2 rounded-lg hover:bg-indigo-800 hover:scale-105 hover:shadow-lg transition-all duration-200 ${
                    activeTab === 'review-management' ? 'bg-indigo-800 scale-105 shadow-lg' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <ClipboardList className="w-5 h-5" />
                    <span>Yorum Yönetimi</span>
                  </div>
                  {badges.reviews > 0 && (
                    <span className="bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      {badges.reviews}
                    </span>
                  )}
                </button>
                )}

                {(!searchQuery || 'alıntı yönetimi'.includes(searchQuery.toLowerCase())) && (
                <button
                  onClick={() => { setActiveTab('quote-management'); setSidebarOpen(false); }}
                  className={`flex items-center w-full space-x-3 p-2 rounded-lg hover:bg-indigo-800 hover:scale-105 hover:shadow-lg transition-all duration-200 ${
                    activeTab === 'quote-management' ? 'bg-indigo-800 scale-105 shadow-lg' : ''
                  }`}
                >
                  <BookText className="w-5 h-5" />
                  <span>Alıntı Yönetimi</span>
                </button>
                )}

                {(!searchQuery || 'ayın yazarı yönetimi yazar'.includes(searchQuery.toLowerCase())) && (
                <button
                  onClick={() => { setActiveTab('author-management'); setSidebarOpen(false); }}
                  className={`flex items-center w-full space-x-3 p-2 rounded-lg hover:bg-indigo-800 hover:scale-105 hover:shadow-lg transition-all duration-200 ${
                    activeTab === 'author-management' ? 'bg-indigo-800 scale-105 shadow-lg' : ''
                  }`}
                >
                  <UserCog className="w-5 h-5" />
                  <span>Ayın Yazarı Yönetimi</span>
                </button>
                )}

                {(!searchQuery || 'koleksiyon yönetimi'.includes(searchQuery.toLowerCase())) && (
                <button
                  onClick={() => { setActiveTab('collection-management'); setSidebarOpen(false); }}
                  className={`flex items-center w-full space-x-3 p-2 rounded-lg hover:bg-indigo-800 hover:scale-105 hover:shadow-lg transition-all duration-200 ${
                    activeTab === 'collection-management' ? 'bg-indigo-800 scale-105 shadow-lg' : ''
                  }`}
                >
                  <Layers className="w-5 h-5" />
                  <span>Koleksiyon Yönetimi</span>
                </button>
                )}
                {(!searchQuery || 'oyun yönetimi'.includes(searchQuery.toLowerCase())) && (
                <button
                  onClick={() => { setActiveTab('game-management'); setSidebarOpen(false); }}
                  className={`flex items-center w-full space-x-3 p-2 rounded-lg hover:bg-indigo-800 hover:scale-105 hover:shadow-lg transition-all duration-200 ${
                    activeTab === 'game-management' ? 'bg-indigo-800 scale-105 shadow-lg' : ''
                  }`}
                >
                  <Gamepad2 className="w-5 h-5" />
                  <span>Oyun Yönetimi</span>
                </button>
                )}
                 {(!searchQuery || 'oyun randevu yönetimi randevu'.includes(searchQuery.toLowerCase())) && (
                 <button
                  onClick={() => { setActiveTab('game-reservations'); setSidebarOpen(false); }}
                  className={`flex items-center w-full space-x-3 p-2 rounded-lg hover:bg-indigo-800 hover:scale-105 hover:shadow-lg transition-all duration-200 ${
                    activeTab === 'game-reservations' ? 'bg-indigo-800 scale-105 shadow-lg' : ''
                  }`}
                >
                  <Gamepad2 className="w-5 h-5" />
                  <span>Oyun Randevu Yönetimi</span>
                </button>
                 )}
                {(!searchQuery || 'blog yönetimi'.includes(searchQuery.toLowerCase())) && (
                <button
                  onClick={() => { setActiveTab('blog-management'); setSidebarOpen(false); }}
                  className={`flex items-center justify-between w-full space-x-3 p-2 rounded-lg hover:bg-indigo-800 hover:scale-105 hover:shadow-lg transition-all duration-200 ${
                    activeTab === 'blog-management' ? 'bg-indigo-800 scale-105 shadow-lg' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <BookText className="w-5 h-5" />
                    <span>Blog Yönetimi</span>
                  </div>
                  {badges.posts > 0 && (
                    <span className="bg-purple-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      {badges.posts}
                    </span>
                  )}
                </button>
                )}

                {(!searchQuery || 'çarkıfelek yönetimi'.includes(searchQuery.toLowerCase())) && (
                <button
                  onClick={() => { setActiveTab('spin-wheel-management'); setSidebarOpen(false); }}
                  className={`flex items-center w-full space-x-3 p-2 rounded-lg hover:bg-indigo-800 hover:scale-105 hover:shadow-lg transition-all duration-200 ${
                    activeTab === 'spin-wheel-management' ? 'bg-indigo-800 scale-105 shadow-lg' : ''
                  }`}
                >
                  <Gift className="w-5 h-5" />
                  <span>Çarkıfelek Yönetimi</span>
                </button>
                )}
              </div>
              )}
            </div>
            )}

            {(!searchQuery || 'raporlar eser dağılımı bütçe'.includes(searchQuery.toLowerCase())) && (
            <div className="pt-2">
              <button
                onClick={() => setExpandedCategories(prev => ({ ...prev, reports: !prev.reports }))}
                className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-white transition-colors"
              >
                <span>Raporlama</span>
                {expandedCategories.reports ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              {expandedCategories.reports && (
              <div className="mt-1 space-y-1">
                {(!searchQuery || 'raporlar'.includes(searchQuery.toLowerCase())) && (
                <button
                  onClick={() => { setActiveTab('reports'); setSidebarOpen(false); }}
                  className={`flex items-center w-full space-x-3 p-2 rounded-lg hover:bg-indigo-800 hover:scale-105 hover:shadow-lg transition-all duration-200 ${
                    activeTab === 'reports' ? 'bg-indigo-800 scale-105 shadow-lg' : ''
                  }`}
                >
                  <BarChart className="w-5 h-5" />
                  <span>Raporlar</span>
                </button>
                )}

                {(!searchQuery || 'eser dağılımı'.includes(searchQuery.toLowerCase())) && (
                <button
                  onClick={() => { setActiveTab('collection-distribution'); setSidebarOpen(false); }}
                  className={`flex items-center w-full space-x-3 p-2 rounded-lg hover:bg-indigo-800 hover:scale-105 hover:shadow-lg transition-all duration-200 ${
                    activeTab === 'collection-distribution' ? 'bg-indigo-800 scale-105 shadow-lg' : ''
                  }`}
                >
                  <PieChart className="w-5 h-5" />
                  <span>Eser Dağılımı</span>
                </button>
                )}
                {(!searchQuery || 'bütçe'.includes(searchQuery.toLowerCase())) && (
                <button
                  onClick={() => { setActiveTab('budget'); setSidebarOpen(false); }}
                  className={`flex items-center w-full space-x-3 p-2 rounded-lg hover:bg-indigo-800 hover:scale-105 hover:shadow-lg transition-all duration-200 ${
                    activeTab === 'budget' ? 'bg-indigo-800 scale-105 shadow-lg' : ''
                  }`}
                >
                  <TrendingUp className="w-5 h-5" />
                  <span>Bütçe</span>
                </button>
                )}
              </div>
              )}
            </div>
            )}
          </nav>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
          <button 
            onClick={handleLogout}
            className="flex items-center space-x-2 sm:space-x-3 p-2 sm:p-3 w-full rounded-lg hover:bg-indigo-800 transition-colors text-red-300 hover:text-red-400 touch-manipulation text-sm"
          >
            <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Çıkış Yap</span>
          </button>
        </div>
      </div>

      {/* Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Header */}
      <div className="bg-indigo-900 text-white">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-1.5 sm:p-2 hover:bg-indigo-800 rounded-lg transition-colors touch-manipulation"
              >
                <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
              <h1 className="text-lg sm:text-2xl font-bold ml-2 sm:ml-4">Admin Paneli</h1>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <UpdateButton />
              <button
                onClick={handleLogout}
                className="flex items-center px-2 sm:px-4 py-1.5 sm:py-2 bg-indigo-800 rounded-lg hover:bg-indigo-700 transition-colors touch-manipulation text-sm sm:text-base"
              >
                <LogOut className="w-4 h-4 sm:w-5 sm:h-5 sm:mr-2" />
                <span className="hidden sm:inline">Çıkış Yap</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        
        {activeTab === 'borrowed-books' && <BorrowedBooksTab />}

        {activeTab === 'messages' && <MessagesTab />}

        {activeTab === 'requests' && (
          <RequestProvider>
            <RequestsTab />
          </RequestProvider>
        )}

        {activeTab === 'reports' && <ReportsTab />}

        {activeTab === 'fines' && <FinesTab />}

        {activeTab === 'users' && <UsersTab />}

        {activeTab === 'catalog' && (
          <AdminCatalogTab
            catalogBooks={catalogBooks}
            setCatalogBooks={setCatalogBooks}
            refetchAllBooks={refetchAllBooks}
            getBookStatus={getBookStatus}
            users={users}
          />
        )}

        {activeTab === 'collection-distribution' && <AdminCollectionDistribution catalogBooks={catalogBooks} getBookStatus={getBookStatus} />}

        {activeTab === 'user-events' && <EventManagementTab />}

        {activeTab === 'quote-management' && <QuoteManagementTab />}

        {activeTab === 'author-management' && <AuthorManagementTab />}

        {activeTab === 'review-management' && <ReviewManagementTab />}

        {activeTab === 'magazine-management' && <AdminMagazinesTab />}

        {activeTab === 'collection-management' && <CollectionManagementTab />}

        {activeTab === 'budget' && <BudgetTab />}

        {activeTab === 'game-management' && <GameManagementTab />}

        {activeTab === 'game-reservations' && <AdminGameReservationsTab />}

        {activeTab === 'blog-management' && <BlogManagementTab />}

        {activeTab === 'spin-wheel-management' && <SpinWheelManagementTab />}

      </div>
      <AdminChatBot />
    </div>
  );
};

export default AdminDashboard;