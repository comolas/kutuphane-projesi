import React, { useEffect, useState, useMemo } from 'react';
import { useEvents } from '../contexts/EventContext';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Search, ChevronLeft, ChevronRight, Menu, X, Home, Library, BookOpen as BookIcon, Settings, LogOut, MessageSquare, DollarSign, PieChart, ScrollText, Bot, Heart, FileText, Megaphone } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../firebase/config';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

const ITEMS_PER_PAGE = 6;

const MyEventsPage: React.FC = () => {
  const { joinedEvents, allItems, fetchJoinedEvents, fetchAllItems, leaveEvent } = useEvents();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    fetchJoinedEvents();
    fetchAllItems();
  }, [fetchJoinedEvents, fetchAllItems]);

  const handleLeaveEvent = async (eventId: string) => {
    await leaveEvent(eventId);
    alert('Etkinlikten ayrıldınız.');
  };

  const sortedItems = useMemo(() => {
    return allItems
      .filter(item => joinedEvents.includes(item.id) && item.type === 'event')
      .filter(item => 
        (item.name && item.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      .sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      });
  }, [allItems, joinedEvents, searchTerm, sortOrder]);

  const totalPages = Math.ceil(sortedItems.length / ITEMS_PER_PAGE);
  const paginatedItems = sortedItems.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

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

  const renderItemCard = (item: any) => {
    console.log(item);
    switch (item.type) {
      case 'event':
        return (
          <div key={item.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 flex flex-col">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">{item.name}</h2>
              <div className="space-y-3 text-gray-600">
                <div className="flex items-center">
                  <Calendar className="w-5 h-5 mr-3 text-blue-500" />
                  <span>{new Date(item.date).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
                {item.location && (
                  <div className="flex items-center">
                    <MapPin className="w-5 h-5 mr-3 text-blue-500" />
                    <span>{item.location}</span>
                  </div>
                )}
              </div>
              <p className="text-gray-700 mt-4">{item.description}</p>
            </div>
            <div className="mt-auto p-6 bg-gray-50 rounded-b-lg">
              <button
                onClick={() => handleLeaveEvent(item.id)}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-semibold"
              >
                Ayrıl
              </button>
            </div>
          </div>
        );
      case 'survey':
        return (
          <div key={item.id} className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden flex flex-col">
            <div className="p-6 flex-grow">
              <div className="flex justify-between items-start mb-3">
                <h2 className="text-xl font-bold text-gray-900">{item.name}</h2>
                <span className="bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full">Anket</span>
              </div>
              <p className="text-gray-600 text-sm mb-4 line-clamp-3">{item.description}</p>
            </div>
            <div className="p-6 bg-gray-50 border-t border-gray-100">
              <button 
                onClick={() => navigate(`/surveys/${item.id}`)}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold">
                Ankete Git
              </button>
            </div>
          </div>
        );
      case 'announcement':
        return (
          <div key={item.id} className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden flex flex-col">
            <div className="p-6 flex-grow">
              <div className="flex justify-between items-start mb-3">
                <h2 className="text-xl font-bold text-gray-900">{item.name}</h2>
                <span className="bg-purple-100 text-purple-700 text-xs font-semibold px-3 py-1 rounded-full">Duyuru</span>
              </div>
              <p className="text-gray-600 text-sm mb-4 line-clamp-3">{item.description}</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 relative">
       <div className={`fixed top-0 left-0 h-full w-64 bg-indigo-900 text-white transform transition-transform duration-300 ease-in-out z-50 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center">
              <BookIcon className="w-8 h-8 mr-2" />
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
            
            <Link to="/requests" className="flex items-center space-x-3 p-2 rounded-lg hover:bg-indigo-800 transition-colors">
              <MessageSquare className="w-5 h-5" />
              <span>Taleplerim</span>
            </Link>
            <Link to="/fines" className="flex items-center space-x-3 p-2 rounded-lg hover:bg-indigo-800 transition-colors">
              <DollarSign className="w-5 h-5" />
              <span>Cezalarım</span>
            </Link>
            <Link to="/collection-distribution" className="flex items-center space-x-3 p-2 rounded-lg hover:bg-indigo-800 transition-colors">
              <PieChart className="w-5 h-5" />
              <span>Eser Dağılımı</span>
            </Link>
            <Link to="/settings" className="flex items-center space-x-3 p-2 rounded-lg hover:bg-indigo-800 transition-colors">
              <Settings className="w-5 h-5" />
              <span>Ayarlar</span>
            </Link>
            <Link to="/favorites" className="flex items-center space-x-3 p-2 rounded-lg hover:bg-indigo-800 transition-colors">
              <Heart className="w-5 h-5" />
              <span>Favorilerim</span>
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

      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={toggleSidebar}
        ></div>
      )}

      <div className="min-h-screen bg-gray-50">
        <div className="bg-indigo-900 text-white py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center">
            <button
              onClick={toggleSidebar}
              className="p-2 hover:bg-indigo-800 rounded-lg transition-colors mr-4"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-3xl font-bold">Etkinliklerim</h1>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-center mb-6">
            <DotLottieReact
              src="https://lottie.host/8126fdd4-e335-4c02-a231-e46aa807c3ee/4mVfQQNpn3.json"
              loop
              autoplay
              style={{ width: '200px', height: '200px' }}
            />
          </div>
          <div className="flex justify-between items-center mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input 
                type="text"
                placeholder="Etkinlik, anket veya duyuru ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-96"
              />
            </div>
            <div>
              <select 
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="desc">Yeniye Göre Sırala</option>
                <option value="asc">Eskiye Göre Sırala</option>
              </select>
            </div>
          </div>

          {paginatedItems.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {paginatedItems.map(item => renderItemCard(item))}
              </div>
              <div className="mt-8 flex justify-center items-center space-x-2">
                <button 
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2 rounded-full bg-white shadow-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button 
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`px-4 py-2 rounded-lg ${currentPage === page ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>
                    {page}
                  </button>
                ))}
                <button 
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-full bg-white shadow-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-16">
              <h2 className="text-2xl font-bold text-gray-800">Arama kriterlerinize uygun bir şey bulunamadı.</h2>
              <p className="text-gray-600 mt-2">Farklı bir arama veya filtreleme deneyin.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyEventsPage;