import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuthors } from '../contexts/AuthorContext';
import { useBooks } from '../contexts/BookContext';
import { useAlert } from '../contexts/AlertContext';
import { Author, Book } from '../types';
import { ChevronLeft, Tag, BookOpen, User, Info, Star, BookCheck } from 'lucide-react';

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

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate('/yazarlar')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
        >
          <ChevronLeft className="w-5 h-5 mr-1" />
          Tüm Yazarlar
        </button>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-8">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
              <img src={author.image} alt={author.name} className="w-48 h-48 rounded-full object-cover shadow-md" />
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-4xl font-bold text-gray-900">{author.name}</h1>
                <div className="mt-4">
                  <h2 className="text-xl font-semibold text-gray-800 flex items-center justify-center md:justify-start"><Info className="w-5 h-5 mr-2 text-indigo-600" />Biyografi</h2>
                  <p className="text-gray-600 mt-2 text-left">{author.biography}</p>
                </div>
              </div>
            </div>

            {author.tags && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center"><Tag className="w-5 h-5 mr-2 text-indigo-600" />Etiketler</h3>
                <div className="flex flex-wrap gap-2 mt-2">
                  {(Array.isArray(author.tags) ? author.tags : author.tags.split(',').map(t => t.trim())).map((tag, index) => (
                    <span key={index} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="px-8 py-6 bg-gray-50">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center"><BookOpen className="w-6 h-6 mr-2 text-indigo-600" />Kitapları</h2>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {books.map(book => {
                const status = getBookStatus(book.id);
                const averageRating = 'N/A'; // Placeholder

                return (
                  <div key={book.id} className="bg-white rounded-lg shadow-sm p-4 flex flex-col justify-between">
                    <div>
                      <img src={book.coverImage} alt={book.title} className="w-full h-56 object-cover rounded-md mb-4" />
                      <h4 className="font-semibold text-gray-800 text-lg">{book.title}</h4>
                      <p className="text-sm text-gray-500 mt-1">{book.publisher}</p>
                      <p className="text-sm text-gray-500 mt-1">Kategori: {book.category}</p>
                      <div className="flex items-center mt-2">
                        <Star className="w-5 h-5 text-yellow-400 mr-1" />
                        <span className="text-gray-700 font-semibold">{averageRating}</span>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-col items-center">
                      <span className={`px-2 py-1 mb-3 rounded-full text-xs font-medium ${
                        status === 'available' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                      }`}>
                        {status === 'available' ? 'Müsait' : 'Ödünç Verildi'}
                      </span>
                      <button
                        onClick={() => handleBorrow(book)}
                        disabled={status !== 'available'}
                        className="w-full px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-gray-400 transition-colors"
                      >
                        Ödünç Al
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="px-8 py-6 bg-gray-100 mt-8">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <BookCheck className="w-6 h-6 mr-2 text-green-600" />
                {author.name}'dan Okuduğun Kitaplar
            </h2>
            {readBooksByAuthor.length > 0 ? (
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {readBooksByAuthor.map(book => (
                        <div key={book.id} className="bg-white rounded-lg shadow-sm p-4">
                            <img src={book.coverImage} alt={book.title} className="w-full h-56 object-cover rounded-md mb-4" />
                            <h4 className="font-semibold text-gray-800 text-lg">{book.title}</h4>
                            <p className="text-sm text-gray-500 mt-1">{book.publisher}</p>
                            <p className="text-sm text-gray-500 mt-1">Kategori: {book.category}</p>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="mt-6 text-center p-6 bg-white rounded-lg shadow-sm">
                    <p className="text-gray-600">Bu yazardan henüz bir kitap okumadınız.</p>
                    <Link to="/catalog" className="mt-4 inline-block px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                        Kataloğa Göz At
                    </Link>
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthorDetailsPage;
