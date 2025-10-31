import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Book, Menu, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import NotificationBell from '../common/NotificationBell';

interface HeaderProps {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const Header: React.FC<HeaderProps> = ({ isDarkMode, toggleDarkMode }) => {
  const { isTeacher } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 border-b ${
        isScrolled
          ? 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl shadow-lg py-3 border-white/20'
          : 'bg-white/60 dark:bg-gray-900/60 backdrop-blur-md py-5 border-white/20'
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-12">
        <div className="flex items-center justify-between">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-gray-700 dark:text-gray-300"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          
          {/* Desktop Navigation - Centered */}
          <div className="hidden md:flex flex-1 justify-center">
            <nav className="flex items-center space-x-2">
            <Link
              to={isTeacher ? "/teacher-dashboard" : "/dashboard"}
              className="relative px-4 py-2 text-gray-700 dark:text-gray-300 font-medium transition-all duration-300 group"
            >
              <span className="relative z-10">Ana Sayfa</span>
              <span className={`absolute inset-0 bg-gradient-to-r ${isTeacher ? 'from-orange-500/10 to-amber-500/10' : 'from-indigo-500/10 to-purple-500/10'} rounded-lg scale-0 group-hover:scale-100 transition-transform duration-300`}></span>
              <span className={`absolute bottom-0 left-1/2 w-0 h-0.5 bg-gradient-to-r ${isTeacher ? 'from-orange-500 to-amber-600' : 'from-indigo-500 to-purple-600'} group-hover:w-full group-hover:left-0 transition-all duration-300`}></span>
            </Link>
            <Link
              to="/catalog"
              className="relative px-4 py-2 text-gray-700 dark:text-gray-300 font-medium transition-all duration-300 group"
            >
              <span className="relative z-10">Katalog</span>
              <span className={`absolute inset-0 bg-gradient-to-r ${isTeacher ? 'from-orange-500/10 to-amber-500/10' : 'from-indigo-500/10 to-purple-500/10'} rounded-lg scale-0 group-hover:scale-100 transition-transform duration-300`}></span>
              <span className={`absolute bottom-0 left-1/2 w-0 h-0.5 bg-gradient-to-r ${isTeacher ? 'from-orange-500 to-amber-600' : 'from-indigo-500 to-purple-600'} group-hover:w-full group-hover:left-0 transition-all duration-300`}></span>
            </Link>
            <Link
              to="/yazarlar"
              className="relative px-4 py-2 text-gray-700 dark:text-gray-300 font-medium transition-all duration-300 group"
            >
              <span className="relative z-10">Yazarlarımız</span>
              <span className={`absolute inset-0 bg-gradient-to-r ${isTeacher ? 'from-orange-500/10 to-amber-500/10' : 'from-indigo-500/10 to-purple-500/10'} rounded-lg scale-0 group-hover:scale-100 transition-transform duration-300`}></span>
              <span className={`absolute bottom-0 left-1/2 w-0 h-0.5 bg-gradient-to-r ${isTeacher ? 'from-orange-500 to-amber-600' : 'from-indigo-500 to-purple-600'} group-hover:w-full group-hover:left-0 transition-all duration-300`}></span>
            </Link>
            <Link
              to="/dergiler"
              className="relative px-4 py-2 text-gray-700 dark:text-gray-300 font-medium transition-all duration-300 group"
            >
              <span className="relative z-10">Dergiler</span>
              <span className={`absolute inset-0 bg-gradient-to-r ${isTeacher ? 'from-orange-500/10 to-amber-500/10' : 'from-indigo-500/10 to-purple-500/10'} rounded-lg scale-0 group-hover:scale-100 transition-transform duration-300`}></span>
              <span className={`absolute bottom-0 left-1/2 w-0 h-0.5 bg-gradient-to-r ${isTeacher ? 'from-orange-500 to-amber-600' : 'from-indigo-500 to-purple-600'} group-hover:w-full group-hover:left-0 transition-all duration-300`}></span>
            </Link>
            <Link
              to="/blog"
              className="relative px-4 py-2 text-gray-700 dark:text-gray-300 font-medium transition-all duration-300 group"
            >
              <span className="relative z-10">Blog</span>
              <span className={`absolute inset-0 bg-gradient-to-r ${isTeacher ? 'from-orange-500/10 to-amber-500/10' : 'from-indigo-500/10 to-purple-500/10'} rounded-lg scale-0 group-hover:scale-100 transition-transform duration-300`}></span>
              <span className={`absolute bottom-0 left-1/2 w-0 h-0.5 bg-gradient-to-r ${isTeacher ? 'from-orange-500 to-amber-600' : 'from-indigo-500 to-purple-600'} group-hover:w-full group-hover:left-0 transition-all duration-300`}></span>
            </Link>

            </nav>
          </div>

          {/* Notification Bell */}
          <div className="flex items-center">
            <NotificationBell />
          </div>

          {/* Mobile Navigation */}
          {isMobileMenuOpen && (
            <div className="md:hidden absolute top-full left-0 right-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-lg">
              <nav className="flex flex-col p-4 space-y-2">
                <Link
                  to={isTeacher ? "/teacher-dashboard" : "/dashboard"}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`px-4 py-3 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gradient-to-r ${isTeacher ? 'hover:from-orange-500/10 hover:to-amber-500/10' : 'hover:from-indigo-500/10 hover:to-purple-500/10'} transition-all`}
                >
                  Ana Sayfa
                </Link>
                <Link
                  to="/catalog"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`px-4 py-3 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gradient-to-r ${isTeacher ? 'hover:from-orange-500/10 hover:to-amber-500/10' : 'hover:from-indigo-500/10 hover:to-purple-500/10'} transition-all`}
                >
                  Katalog
                </Link>
                <Link
                  to="/yazarlar"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`px-4 py-3 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gradient-to-r ${isTeacher ? 'hover:from-orange-500/10 hover:to-amber-500/10' : 'hover:from-indigo-500/10 hover:to-purple-500/10'} transition-all`}
                >
                  Yazarlarımız
                </Link>
                <Link
                  to="/dergiler"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`px-4 py-3 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gradient-to-r ${isTeacher ? 'hover:from-orange-500/10 hover:to-amber-500/10' : 'hover:from-indigo-500/10 hover:to-purple-500/10'} transition-all`}
                >
                  Dergiler
                </Link>
                <Link
                  to="/blog"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`px-4 py-3 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gradient-to-r ${isTeacher ? 'hover:from-orange-500/10 hover:to-amber-500/10' : 'hover:from-indigo-500/10 hover:to-purple-500/10'} transition-all`}
                >
                  Blog
                </Link>

              </nav>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;