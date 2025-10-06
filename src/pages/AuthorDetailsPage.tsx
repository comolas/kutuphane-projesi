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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="relative h-[70vh] overflow-hidden">
        <img src={author.image} alt={author.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent"></div>
        <button
          onClick={() => navigate('/yazarlar')}
          className="absolute top-6 left-6 flex items-center text-white hover:text-gray-200 bg-black/30 backdrop-blur-sm px-4 py-2 rounded-lg transition-all"
        >
          <ChevronLeft className="w-5 h-5 mr-1" />
          Tüm Yazarlar
        </button>
        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">{author.name}</h1>
            {author.tags && (
              <div className="flex flex-wrap gap-2">
                {(Array.isArray(author.tags) ? author.tags : author.tags.split(',').map(t => t.trim())).map((tag, index) => (
                  <span key={index} className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white rounded-full text-sm font-medium">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Toplam Kitap</p>
                <p className="text-3xl font-bold text-indigo-600">{books.length}</p>
              </div>
              <BookOpen className="w-12 h-12 text-indigo-600 opacity-20" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Okuduğun Kitap</p>
                <p className="text-3xl font-bold text-green-600">{readBooksByAuthor.length}</p>
              </div>
              <BookCheck className="w-12 h-12 text-green-600 opacity-20" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Okunan Sayfa</p>
                <p className="text-3xl font-bold text-purple-600">{totalPagesRead}</p>
              </div>
              <TrendingUp className="w-12 h-12 text-purple-600 opacity-20" />
            </div>
          </div>
        </div>

        {/* Biography */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Biyografi</h2>
          <p className="text-gray-700 leading-relaxed text-lg">{author.biography}</p>
        </div>

        {/* Books Section */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
            <BookOpen className="w-8 h-8 mr-3 text-indigo-600" />
            Kitapları
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
            {books.map(book => {
              const status = getBookStatus(book.id);
              return (
                <div key={book.id} className="group">
                  <div className="relative overflow-hidden rounded-lg aspect-[2/3] mb-3">
                    <img src={book.coverImage} alt={book.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <button
                          onClick={() => handleBorrow(book)}
                          disabled={status !== 'available'}
                          className="w-full px-3 py-2 rounded-lg text-xs font-medium bg-white text-gray-900 hover:bg-gray-100 disabled:bg-gray-400 disabled:text-white transition-colors"
                        >
                          {status === 'available' ? 'Ödünç Al' : 'Müsait Değil'}
                        </button>
                      </div>
                    </div>
                  </div>
                  <h4 className="font-semibold text-gray-900 text-sm line-clamp-2">{book.title}</h4>
                  <div className="flex items-center mt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-3 h-3 ${(book.averageRating || 0) >= star ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                      />
                    ))}
                    <span className="ml-1 text-xs text-gray-600">{(book.averageRating || 0).toFixed(1)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Read Books Section */}
        {readBooksByAuthor.length > 0 && (
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-lg p-8 mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
              <Award className="w-8 h-8 mr-3 text-green-600" />
              {author.name}'dan Okuduğun Kitaplar
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
              {readBooksByAuthor.map(book => (
                <div key={book.id} className="group">
                  <div className="relative overflow-hidden rounded-lg aspect-[2/3] mb-3">
                    <img src={book.coverImage} alt={book.title} className="w-full h-full object-cover" />
                    <div className="absolute top-2 right-2 bg-green-500 text-white p-1.5 rounded-full">
                      <BookCheck className="w-4 h-4" />
                    </div>
                  </div>
                  <h4 className="font-semibold text-gray-900 text-sm line-clamp-2">{book.title}</h4>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="h-16"></div>
    </div>
  );
};

export default AuthorDetailsPage;
