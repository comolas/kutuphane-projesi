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
import UpdateButton from '../components/common/UpdateButton'; // Added import
import { RequestProvider } from '../contexts/RequestContext';
import { useAuth } from '../contexts/AuthContext';
import { useBooks } from '../contexts/BookContext';
import { Navigate } from 'react-router-dom';
import { Book, Users, Library, LogOut, Menu, X, MessageSquare, DollarSign, Mail, Calendar, PieChart, BarChart, BookText, UserCog, ClipboardList, BookOpen } from 'lucide-react';
import { auth, db } from '../firebase/config';
import { collection, getDocs } from 'firebase/firestore';

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
  const { isAdmin } = useAuth();
  const { refetchAllBooks, getBookStatus } = useBooks();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'borrowed-books' | 'requests' | 'fines' | 'messages' | 'users' | 'catalog' | 'collection-distribution' | 'reports' | 'user-events' | 'announcements' | 'quote-management' | 'author-management' | 'review-management' | 'magazine-management'>('borrowed-books');
  const [users, setUsers] = useState<UserData[]>([]);
  const [catalogBooks, setCatalogBooks] = useState<Book[]>([]);

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
      <div className={`fixed top-0 left-0 h-full w-64 bg-indigo-900 text-white transform transition-transform duration-300 ease-in-out z-50 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center">
              <Book className="w-8 h-8 mr-2" />
              <span className="text-xl font-bold">Admin Panel</span>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="p-2 hover:bg-indigo-800 rounded-lg">
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <nav className="space-y-1">
            <div>
              <h3 className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Ana Panel</h3>
              <div className="mt-1 space-y-1">
                <button
                  onClick={() => { setActiveTab('borrowed-books'); setSidebarOpen(false); }}
                  className={`flex items-center w-full space-x-3 p-2 rounded-lg hover:bg-indigo-800 transition-colors ${
                    activeTab === 'borrowed-books' ? 'bg-indigo-800' : ''
                  }`}
                >
                  <Library className="w-5 h-5" />
                  <span>Ödünç Verilen Kitaplar</span>
                </button>
                
                <button
                  onClick={() => { setActiveTab('messages'); setSidebarOpen(false); }}
                  className={`flex items-center w-full space-x-3 p-2 rounded-lg hover:bg-indigo-800 transition-colors ${
                    activeTab === 'messages' ? 'bg-indigo-800' : ''
                  }`}
                >
                  <Mail className="w-5 h-5" />
                  <span>Mesajlar</span>
                </button>

                <button
                  onClick={() => { setActiveTab('requests'); setSidebarOpen(false); }}
                  className={`flex items-center w-full space-x-3 p-2 rounded-lg hover:bg-indigo-800 transition-colors ${
                    activeTab === 'requests' ? 'bg-indigo-800' : ''
                  }`}
                >
                  <MessageSquare className="w-5 h-5" />
                  <span>Gönderilen Talepler</span>
                </button>

                <button
                  onClick={() => { setActiveTab('fines'); setSidebarOpen(false); }}
                  className={`flex items-center w-full space-x-3 p-2 rounded-lg hover:bg-indigo-800 transition-colors ${
                    activeTab === 'fines' ? 'bg-indigo-800' : ''
                  }`}
                >
                  <DollarSign className="w-5 h-5" />
                  <span>Kullanıcı Cezaları</span>
                </button>
              </div>
            </div>

            <div className="pt-2">
              <h3 className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Yönetim</h3>
              <div className="mt-1 space-y-1">
                <button
                  onClick={() => { setActiveTab('users'); setSidebarOpen(false); }}
                  className={`flex items-center w-full space-x-3 p-2 rounded-lg hover:bg-indigo-800 transition-colors ${
                    activeTab === 'users' ? 'bg-indigo-800' : ''
                  }`}
                >
                  <Users className="w-5 h-5" />
                  <span>Kullanıcılar</span>
                </button>

                <button
                  onClick={() => { setActiveTab('user-events'); setSidebarOpen(false); }}
                  className={`flex items-center w-full space-x-3 p-2 rounded-lg hover:bg-indigo-800 transition-colors ${
                    activeTab === 'user-events' ? 'bg-indigo-800' : ''
                  }`}
                >
                  <Calendar className="w-5 h-5" />
                  <span>Etkinlik Yönetimi</span>
                </button>

                <button
                  onClick={() => { setActiveTab('catalog'); setSidebarOpen(false); }}
                  className={`flex items-center w-full space-x-3 p-2 rounded-lg hover:bg-indigo-800 transition-colors ${
                    activeTab === 'catalog' ? 'bg-indigo-800' : ''
                  }`}
                >
                  <Book className="w-5 h-5" />
                  <span>Katalog</span>
                </button>

                <button
                  onClick={() => { setActiveTab('magazine-management'); setSidebarOpen(false); }}
                  className={`flex items-center w-full space-x-3 p-2 rounded-lg hover:bg-indigo-800 transition-colors ${
                    activeTab === 'magazine-management' ? 'bg-indigo-800' : ''
                  }`}
                >
                  <BookOpen className="w-5 h-5" />
                  <span>Dergi Yönetimi</span>
                </button>

                <button
                  onClick={() => { setActiveTab('review-management'); setSidebarOpen(false); }}
                  className={`flex items-center w-full space-x-3 p-2 rounded-lg hover:bg-indigo-800 transition-colors ${
                    activeTab === 'review-management' ? 'bg-indigo-800' : ''
                  }`}
                >
                  <ClipboardList className="w-5 h-5" />
                  <span>Yorum Yönetimi</span>
                </button>

                <button
                  onClick={() => { setActiveTab('quote-management'); setSidebarOpen(false); }}
                  className={`flex items-center w-full space-x-3 p-2 rounded-lg hover:bg-indigo-800 transition-colors ${
                    activeTab === 'quote-management' ? 'bg-indigo-800' : ''
                  }`}
                >
                  <BookText className="w-5 h-5" />
                  <span>Alıntı Yönetimi</span>
                </button>

                <button
                  onClick={() => { setActiveTab('author-management'); setSidebarOpen(false); }}
                  className={`flex items-center w-full space-x-3 p-2 rounded-lg hover:bg-indigo-800 transition-colors ${
                    activeTab === 'author-management' ? 'bg-indigo-800' : ''
                  }`}
                >
                  <UserCog className="w-5 h-5" />
                  <span>Ayın Yazarı Yönetimi</span>
                </button>
              </div>
            </div>

            <div className="pt-2">
              <h3 className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Raporlama</h3>
              <div className="mt-1 space-y-1">
                <button
                  onClick={() => { setActiveTab('reports'); setSidebarOpen(false); }}
                  className={`flex items-center w-full space-x-3 p-2 rounded-lg hover:bg-indigo-800 transition-colors ${
                    activeTab === 'reports' ? 'bg-indigo-800' : ''
                  }`}
                >
                  <BarChart className="w-5 h-5" />
                  <span>Raporlar</span>
                </button>

                <button
                  onClick={() => { setActiveTab('collection-distribution'); setSidebarOpen(false); }}
                  className={`flex items-center w-full space-x-3 p-2 rounded-lg hover:bg-indigo-800 transition-colors ${
                    activeTab === 'collection-distribution' ? 'bg-indigo-800' : ''
                  }`}
                >
                  <PieChart className="w-5 h-5" />
                  <span>Eser Dağılımı</span>
                </button>
              </div>
            </div>
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

      {/* Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Header */}
      <div className="bg-indigo-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 hover:bg-indigo-800 rounded-lg transition-colors"
              >
                <Menu className="w-6 h-6" />
              </button>
              <h1 className="text-2xl font-bold ml-4">Admin Paneli</h1>
            </div>
            <div className="flex items-center space-x-4"> {/* Added a div to group buttons */}
              <UpdateButton /> {/* Added UpdateButton here */}
              <button
                onClick={handleLogout}
                className="flex items-center px-4 py-2 bg-indigo-800 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <LogOut className="w-5 h-5 mr-2" />
                Çıkış Yap
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
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

      </div>
    </div>
  );
};

export default AdminDashboard;