import React, { useState, useEffect } from 'react';
import { Book, Menu, X, Moon, Sun } from 'lucide-react';

interface HeaderProps {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const Header: React.FC<HeaderProps> = ({ isDarkMode, toggleDarkMode }) => {
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
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-white dark:bg-gray-900 shadow-md py-2'
          : 'bg-transparent py-4'
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Book
              size={28}
              className="text-indigo-900 dark:text-indigo-400 transition-colors duration-200"
            />
            <h1 className="ml-2 text-xl font-bold text-indigo-900 dark:text-white transition-colors duration-200">
              
            </h1>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <a
              href="#"
              className="text-gray-700 dark:text-gray-300 hover:text-indigo-900 dark:hover:text-white transition-colors duration-200"
            >
              
            </a>
            <a
              href="#"
              className="text-gray-700 dark:text-gray-300 hover:text-indigo-900 dark:hover:text-white transition-colors duration-200"
            >
              
            </a>
            <a
              href="#"
              className="text-gray-700 dark:text-gray-300 hover:text-indigo-900 dark:hover:text-white transition-colors duration-200"
            >
              
            </a>
            <a
              href="#"
              className="text-gray-700 dark:text-gray-300 hover:text-indigo-900 dark:hover:text-white transition-colors duration-200"
            >
              
            </a>
          </nav>

          <div className="flex items-center">
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-full text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none transition-colors duration-200"
              aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDarkMode ? (
                <Sun size={20} className="transition-all duration-200" />
              ) : (
                <Moon size={20} className="transition-all duration-200" />
              )}
            </button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 ml-4 rounded-md md:hidden text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none transition-colors duration-200"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <X size={24} className="transition-all duration-200" />
              ) : (
                <Menu size={24} className="transition-all duration-200" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white dark:bg-gray-900 shadow-lg mt-2 py-4 px-4">
          <nav className="flex flex-col space-y-4">
            <a
              href="#"
              className="text-gray-700 dark:text-gray-300 hover:text-indigo-900 dark:hover:text-white transition-colors duration-200 py-2"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Home
            </a>
            <a
              href="#"
              className="text-gray-700 dark:text-gray-300 hover:text-indigo-900 dark:hover:text-white transition-colors duration-200 py-2"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Books
            </a>
            <a
              href="#"
              className="text-gray-700 dark:text-gray-300 hover:text-indigo-900 dark:hover:text-white transition-colors duration-200 py-2"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              About
            </a>
            <a
              href="#"
              className="text-gray-700 dark:text-gray-300 hover:text-indigo-900 dark:hover:text-white transition-colors duration-200 py-2"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Contact
            </a>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;