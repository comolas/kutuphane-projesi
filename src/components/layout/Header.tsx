import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Book } from 'lucide-react';

interface HeaderProps {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const Header: React.FC<HeaderProps> = ({ isDarkMode, toggleDarkMode }) => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-white dark:bg-gray-900 shadow-md py-2'
          : 'bg-transparent py-4'
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center">
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link
              to="/dashboard"
              className="text-gray-700 dark:text-gray-300 hover:text-indigo-900 dark:hover:text-white transition-colors duration-200"
            >
              Ana Sayfa
            </Link>
            <Link
              to="/catalog"
              className="text-gray-700 dark:text-gray-300 hover:text-indigo-900 dark:hover:text-white transition-colors duration-200"
            >
              Katalog
            </Link>
            <Link
              to="/dergiler"
              className="text-gray-700 dark:text-gray-300 hover:text-indigo-900 dark:hover:text-white transition-colors duration-200"
            >
              Dergiler
            </Link>
            <Link
              to="/yazarlar"
              className="text-gray-700 dark:text-gray-300 hover:text-indigo-900 dark:hover:text-white transition-colors duration-200"
            >
              Yazarlarımız
            </Link>
            <Link
              to="/progress"
              className="text-gray-700 dark:text-gray-300 hover:text-indigo-900 dark:hover:text-white transition-colors duration-200"
            >
              İlerleme
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;