import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuthors } from '../contexts/AuthorContext';
import { useBooks } from '../contexts/BookContext';
import { useAlert } from '../contexts/AlertContext';
import { Author, Book } from '../types';
import { ChevronLeft, Tag, BookOpen, Star, BookCheck, TrendingUp, Calendar, Award } from 'lucide-react';

const AuthorDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { fetchAuthorById, getAuthorBooks } = useAuthors();
  const { borrowBook, getBookStatus, borrowedBooks } = useBooks();
  const { showAlert } = useAlert();
  const [author, setAuthor] = useState<Author | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getAuthorDetails = async () => {
      if (!id) return;
      setLoading(true);
      const authorData = await fetchAuthorById(id);
      setAuthor(authorData);
      if (authorData) {
        const authorBooks = await getAuthorBooks(authorData.name);
        setBooks(authorBooks);
      }
      setLoading(false);
    };
    getAuthorDetails();
  }, [id, fetchAuthorById, getAuthorBooks]);

  const readBooksByAuthor = useMemo(() => {
    if (!author) return [];
    return borrowedBooks.filter(book => book.author === author.name && book.returnStatus === 'returned');
  }, [borrowedBooks, author]);

  const handleBorrow = async (book: Book) => {
    try {
      await borrowBook(book);
      showAlert('Başarılı', `${book.title} için ödünç alma isteğiniz alındı.`, 'success');
    } catch (error) {
      showAlert('Hata', `Hata: ${error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu.'}`, 'error');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Yükleniyor...</div>;
  }

  if (!author) {
    return <div className="flex justify-center items-center min-h-screen">Yazar bulunamadı.</div>;
  }

  const totalPagesRead = readBooksByAuthor.reduce((sum, book) => sum + (book.pageCount || 0), 0);
  const availableBooks = books.filter(book => getBookStatus(book.id) === 'available').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* Hero Section */}
      <div className="relative h-[60vh] overflow-hidden">
        <img src={author.image} alt={author.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
        <button
          onClick={() => navigate('/yazarlar')}
          className="absolute top-6 left-6 flex items-center text-white hover:text-gray-200 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl transition-all shadow-lg"
        >
          <ChevronLeft className="w-5 h-5 mr-1" />
          Tüm Yazarlar
        </button>
        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">{author.name}</h1>
            {author.tags && (
              <div className="flex flex-wrap gap-2">
                {(Array.isArray(author.tags) ? author.tags : author.tags.split(',').map(t => t.trim())).map((tag, index) => (
                  <span key={index} className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-xl text-sm font-medium shadow-lg">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <div className="relative">
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-3 w-fit mb-4">
                <BookOpen className="w-8 h-8 text-white" />
              </div>
              <p className="text-white/80 text-sm font-medium mb-2">Toplam Kitap</p>
              <p className="text-4xl font-bold text-white">{books.length}</p>
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <div className="relative">
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-3 w-fit mb-4">
                <BookCheck className="w-8 h-8 text-white" />
              </div>
              <p className="text-white/80 text-sm font-medium mb-2">Okuduğun Kitap</p>
              <p className="text-4xl font-bold text-white">{readBooksByAuthor.length}</p>
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <div className="relative">
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-3 w-fit mb-4">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <p className="text-white/80 text-sm font-medium mb-2">Müsait Kitap</p>
              <p className="text-4xl font-bold text-white">{availableBooks}</p>
            </div>
          </div>
        </div>

        {/* Biography */}
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg p-8 mb-8 border border-white/20">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-6">Biyografi</h2>
          <p className="text-gray-700 leading-relaxed text-lg">{author.biography}</p>
        </div>

        {/* Books Section */}
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg p-8 mb-8 border border-white/20">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-6 flex items-center">
            <BookOpen className="w-8 h-8 mr-3 text-indigo-600" />
            Kitapları
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
            {books.map((book, index) => {
              const status = getBookStatus(book.id);
              return (
                <div 
                  key={book.id} 
                  className="group bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg overflow-hidden hover:scale-105 hover:shadow-2xl transition-all duration-300 border border-white/20"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="relative overflow-hidden aspect-[3/4]">
                    <img src={book.coverImage} alt={book.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    <div className="absolute top-2 right-2">
                      <span className={`px-2 py-1 rounded-lg text-xs font-bold shadow-md ${
                        status === 'available'
                          ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
                          : 'bg-gradient-to-r from-gray-400 to-gray-500 text-white'
                      }`}>
                        {status === 'available' ? 'Müsait' : 'Dolu'}
                      </span>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <button
                          onClick={() => handleBorrow(book)}
                          disabled={status !== 'available'}
                          className={`w-full px-3 py-2 rounded-xl text-xs font-semibold shadow-md transition-all ${
                            status === 'available'
                              ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:shadow-lg'
                              : 'bg-gray-400 text-white cursor-not-allowed'
                          }`}
                        >
                          {status === 'available' ? 'Ödünç Al' : 'Müsait Değil'}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="p-3">
                    <h4 className="font-bold text-gray-900 text-sm line-clamp-2 mb-1">{book.title}</h4>
                    <div className="flex items-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-3 h-3 ${(book.averageRating || 0) >= star ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                        />
                      ))}
                      <span className="ml-1 text-xs text-gray-600 font-medium">{(book.averageRating || 0).toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Read Books Section */}
        {readBooksByAuthor.length > 0 ? (
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg p-8 mb-8 border border-white/20">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-6 flex items-center">
              <Award className="w-8 h-8 mr-3 text-green-600" />
              {author.name}'dan Okuduğun Kitaplar
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
              {readBooksByAuthor.map((book, index) => (
                <div 
                  key={book.id} 
                  className="group bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg overflow-hidden hover:scale-105 hover:shadow-2xl transition-all duration-300 border border-white/20"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="relative overflow-hidden aspect-[3/4]">
                    <img src={book.coverImage} alt={book.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    <div className="absolute top-2 right-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white p-2 rounded-full shadow-lg">
                      <BookCheck className="w-4 h-4" />
                    </div>
                    <div className="absolute top-2 left-2">
                      <span className="px-2 py-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg text-xs font-bold shadow-md">
                        Okundu
                      </span>
                    </div>
                  </div>
                  <div className="p-3">
                    <h4 className="font-bold text-gray-900 text-sm line-clamp-2">{book.title}</h4>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg p-16 text-center mb-8 border border-white/20">
            <div className="w-24 h-24 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookCheck className="w-12 h-12 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Henüz Okumadın</h3>
            <p className="text-gray-600 mb-6">{author.name}'dan henüz bir kitap okumadın.</p>
            <button 
              onClick={() => navigate('/catalog')}
              className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold shadow-md hover:shadow-lg hover:scale-105 transition-all"
            >
              Kitapları Keşfet
            </button>
          </div>
        )}
      </div>

      <div className="h-16"></div>
    </div>
  );
};

export default AuthorDetailsPage;
