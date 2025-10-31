import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Library, BarChart3, DollarSign, Menu, X, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import NotificationBell from '../common/NotificationBell';

interface AdminHeaderProps {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const AdminHeader: React.FC<AdminHeaderProps> = ({ isDarkMode, toggleDarkMode }) => {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleNavigation = (tab: string) => {
    navigate('/admin', { state: { activeTab: tab } });
    setIsMobileMenuOpen(false);
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-[60] transition-all duration-500 border-b ${
        isScrolled
          ? 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl shadow-lg py-3 border-white/20'
          : 'bg-white/60 dark:bg-gray-900/60 backdrop-blur-md py-5 border-white/20'
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-12">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-gray-700 dark:text-gray-300"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          
          {/* Desktop Navigation - Centered */}
          <div className="hidden md:flex flex-1 justify-center">
            <nav className="flex items-center space-x-2">
            <button
              onClick={() => handleNavigation('borrowed-books')}
              className="relative px-4 py-2 text-gray-700 dark:text-gray-300 font-medium transition-all duration-300 group"
            >
              <span className="relative z-10 flex items-center gap-2">
                <Home className="w-4 h-4" />
                Ana Sayfa
              </span>
              <span className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-orange-500/10 rounded-lg scale-0 group-hover:scale-100 transition-transform duration-300"></span>
              <span className="absolute bottom-0 left-1/2 w-0 h-0.5 bg-gradient-to-r from-red-500 to-orange-600 group-hover:w-full group-hover:left-0 transition-all duration-300"></span>
            </button>
            <button
              onClick={() => handleNavigation('messages')}
              className="relative px-4 py-2 text-gray-700 dark:text-gray-300 font-medium transition-all duration-300 group"
            >
              <span className="relative z-10 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Mesajlar
              </span>
              <span className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-orange-500/10 rounded-lg scale-0 group-hover:scale-100 transition-transform duration-300"></span>
              <span className="absolute bottom-0 left-1/2 w-0 h-0.5 bg-gradient-to-r from-red-500 to-orange-600 group-hover:w-full group-hover:left-0 transition-all duration-300"></span>
            </button>
            <button
              onClick={() => handleNavigation('catalog')}
              className="relative px-4 py-2 text-gray-700 dark:text-gray-300 font-medium transition-all duration-300 group"
            >
              <span className="relative z-10 flex items-center gap-2">
                <Library className="w-4 h-4" />
                Katalog
              </span>
              <span className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-orange-500/10 rounded-lg scale-0 group-hover:scale-100 transition-transform duration-300"></span>
              <span className="absolute bottom-0 left-1/2 w-0 h-0.5 bg-gradient-to-r from-red-500 to-orange-600 group-hover:w-full group-hover:left-0 transition-all duration-300"></span>
            </button>
            <button
              onClick={() => handleNavigation('reports')}
              className="relative px-4 py-2 text-gray-700 dark:text-gray-300 font-medium transition-all duration-300 group"
            >
              <span className="relative z-10 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Raporlar
              </span>
              <span className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-orange-500/10 rounded-lg scale-0 group-hover:scale-100 transition-transform duration-300"></span>
              <span className="absolute bottom-0 left-1/2 w-0 h-0.5 bg-gradient-to-r from-red-500 to-orange-600 group-hover:w-full group-hover:left-0 transition-all duration-300"></span>
            </button>
            <button
              onClick={() => handleNavigation('budget')}
              className="relative px-4 py-2 text-gray-700 dark:text-gray-300 font-medium transition-all duration-300 group"
            >
              <span className="relative z-10 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Bütçe
              </span>
              <span className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-orange-500/10 rounded-lg scale-0 group-hover:scale-100 transition-transform duration-300"></span>
              <span className="absolute bottom-0 left-1/2 w-0 h-0.5 bg-gradient-to-r from-red-500 to-orange-600 group-hover:w-full group-hover:left-0 transition-all duration-300"></span>
            </button>
            </nav>
          </div>

          {/* Notification Bell */}
          <div className="flex items-center">
            <NotificationBell />
          </div>

          {isMobileMenuOpen && (
            <div className="md:hidden fixed top-16 left-0 right-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-lg z-50">
              <nav className="flex flex-col p-4 space-y-2">
                <button
                  onClick={() => handleNavigation('borrowed-books')}
                  className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gradient-to-r hover:from-red-500/10 hover:to-orange-500/10 transition-all w-full text-left flex items-center gap-2"
                >
                  <Home className="w-4 h-4" />
                  Ana Sayfa
                </button>
                <button
                  onClick={() => handleNavigation('messages')}
                  className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gradient-to-r hover:from-red-500/10 hover:to-orange-500/10 transition-all flex items-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  Mesajlar
                </button>
                <button
                  onClick={() => handleNavigation('catalog')}
                  className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gradient-to-r hover:from-red-500/10 hover:to-orange-500/10 transition-all flex items-center gap-2"
                >
                  <Library className="w-4 h-4" />
                  Katalog
                </button>
                <button
                  onClick={() => handleNavigation('reports')}
                  className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gradient-to-r hover:from-red-500/10 hover:to-orange-500/10 transition-all flex items-center gap-2"
                >
                  <BarChart3 className="w-4 h-4" />
                  Raporlar
                </button>
                <button
                  onClick={() => handleNavigation('budget')}
                  className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gradient-to-r hover:from-red-500/10 hover:to-orange-500/10 transition-all flex items-center gap-2"
                >
                  <DollarSign className="w-4 h-4" />
                  Bütçe
                </button>
              </nav>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
