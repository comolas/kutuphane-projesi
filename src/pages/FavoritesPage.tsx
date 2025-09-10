import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, Heart, AlertCircle, BookOpen, ExternalLink, Tag, Ruler, Star, Eye, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase/config';
import { collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { Book } from '../types';
import { useBooks } from '../contexts/BookContext';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

const FavoritesPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getBookStatus, borrowBook, isBorrowed } = useBooks();
  const [favoriteBooks, setFavoriteBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const booksPerPage = 8;

  useEffect(() => {
    const fetchFavorites = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const favoritesRef = collection(db, 'favorites');
        const q = query(favoritesRef, where('userId', '==', user.uid));
        const querySnapshot = await getDocs(q);
        
        const favoritedBookIds = querySnapshot.docs.map(doc => doc.data().bookId as string);

        if (favoritedBookIds.length > 0) {
          const booksRef = collection(db, 'books');
          const booksQuery = query(booksRef, where('id', 'in', favoritedBookIds));
          const booksSnapshot = await getDocs(booksQuery);
          const booksData = booksSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Book[];
          setFavoriteBooks(booksData);
        } else {
          setFavoriteBooks([]);
        }
      } catch (err: any) {
        console.error('Error fetching favorite books:', err);
        setError('Favori kitaplar yüklenirken bir hata oluştu.');
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, [user]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handleRemoveFavorite = async (bookId: string) => {
    if (!user) return;
    try {
      const favoritesRef = collection(db, 'favorites');
      const q = query(favoritesRef, where('userId', '==', user.uid), where('bookId', '==', bookId));
      const querySnapshot = await getDocs(q);
      querySnapshot.docs.forEach(async (doc) => {
        await deleteDoc(doc.ref);
      });
      setFavoriteBooks(prev => prev.filter(book => book.id !== bookId));
      setSuccessMessage('Kitap favorilerinizden kaldırıldı.');
    } catch (err: any) {
      console.error('Error removing favorite:', err);
      setError('Favorilerden kaldırılırken bir hata oluştu.');
    }
  };

  const handleBorrowRequest = async (book: Book) => {
    try {
      setError(null);
      await borrowBook(book);
      setSuccessMessage('Kitap başarıyla ödünç alındı!');
    } catch (err: any) {
      console.error('Error borrowing book:', err);
      setError(err.message || 'Kitap ödünç alınırken bir hata oluştu.');
    }
  };

  const generateBookDetailsUrl = (bookId: string) => {
    const baseUrl = 'https://drive.google.com/file/d/';
    const viewSuffix = '/view?usp=sharing';
    const fileIds = {
      'TR-HK-1': '1KbrvPNIZTeuUrbm-FRzpNF0AqVf2R7QY',
      'TR-HK-2': '1AbcdefGhijklmnopQrstuvwxyz123456',
      'TR-HK-3': '1BcdefGhijklmnopQrstuvwxyz1234567',
    };
    const fileId = fileIds[bookId as keyof typeof fileIds] || '1KbrvPNIZTeuUrbm-FRzpNF0AqVf2R7QY';
    return `${baseUrl}${fileId}${viewSuffix}`;
  };

  const generateBackCoverText = (book: Book) => {
    const backCoverTexts = {
      'TR-HK': `"${book.title}" adlı bu etkileyici eser, Türk edebiyatının en değerli örneklerinden biridir. ${book.author}'ın kalemiyle hayat bulan bu hikaye, okuyucuları derin bir düşünce yolculuğuna çıkarır. İnsan doğasının karmaşıklığını ve toplumsal değerleri sorgulayan bu yapıt, her yaştan okuyucuya hitap eder.`,
      'D-HK': `Dünya edebiyatının bu klasik eseri, evrensel temaları işleyerek okuyucuları farklı kültürlerle buluşturur. ${book.author}'ın ustaca kalemiyle yazılan bu hikaye, insanlığın ortak değerlerini ve duygularını keşfetmenizi sağlar.`,
      'TR-ŞR': `Türk şiirinin bu nadide örneği, dilin gücünü ve şiirin büyüsünü gözler önüne serer. ${book.author}'ın duygu dolu dizeleri, okuyucuların kalbinde derin izler bırakır.`,
      'İNG': `Bu İngilizce eser, dil öğrenimini keyifli hale getirirken, aynı zamanda evrensel hikayelerin tadını çıkarmanızı sağlar. Hem eğitici hem de eğlenceli bir okuma deneyimi sunar.`,
      'TR-TY': `Türk tiyatrosunun bu önemli eseri, sahne sanatlarının gücünü ve toplumsal mesajların etkisini gösterir. ${book.author}'ın yaratığı karakterler, okuyucuları düşündürür ve etkiler.`,
      'D-TY': `Dünya tiyatro edebiyatının bu klasik yapıtı, sahne sanatlarının evrensel dilini konuşur. Zamanı aşan temaları ve güçlü karakterleriyle okuyucuları büyüler.`,
      'Ç-RMN': `Bu çizgi roman, görsel sanatın ve hikayeciliğin mükemmel birleşimini sunar. Renkli sayfalarında macera, aksiyon ve derin karakterler sizi bekliyor.`,
      'MNG': `Manga kültürünün bu örneği, Japon hikayeciliğinin benzersiz tarzını ve görsel anlatım gücünü keşfetmenizi sağlar.`,
      'DRG': `Bu dergi, güncel konuları ve bilimsel gelişmeleri takip etmek isteyenler için vazgeçilmez bir kaynak. Uzman yazarların makaleleriyle bilginizi genişletin.`
    };
    
    return backCoverTexts[book.category as keyof typeof backCoverTexts] || 
           `"${book.title}" adlı bu değerli eser, ${book.author}'ın kalemiyle hayat bulmuş önemli bir yapıttır. Okuyucularına zengin bir okuma deneyimi sunar.`;
  };

  const generatePhysicalProperties = (book: Book) => {
    const properties = {
      'TR-HK': { pages: '180-250', size: '13.5 x 21 cm', weight: '280-350g', binding: 'Karton Kapak' },
      'D-HK': { pages: '200-280', size: '13.5 x 21 cm', weight: '300-380g', binding: 'Karton Kapak' },
      'TR-ŞR': { pages: '120-180', size: '13.5 x 21 cm', weight: '200-280g', binding: 'Karton Kapak' },
      'İNG': { pages: '150-220', size: '13.5 x 19.5 cm', weight: '250-320g', binding: 'Karton Kapak' },
      'TR-TY': { pages: '100-150', size: '13.5 x 21 cm', weight: '180-250g', binding: 'Karton Kapak' },
      'D-TY': { pages: '120-180', size: '13.5 x 21 cm', weight: '200-280g', binding: 'Karton Kapak' },
      'Ç-RMN': { pages: '80-120', size: '17 x 26 cm', weight: '200-300g', binding: 'Karton Kapak' },
      'MNG': { pages: '180-200', size: '11.5 x 17.5 cm', weight: '150-200g', binding: 'Karton Kapak' },
      'DRG': { pages: '60-100', size: '21 x 29.7 cm', weight: '150-250g', binding: 'Dergi' }
    };
    
    return properties[book.category as keyof typeof properties] || 
           { pages: '200', size: '13.5 x 21 cm', weight: '300g', binding: 'Karton Kapak' };
  };

  const handleInspectBook = (book: Book) => {
    // This function is not used in FavoritesPage, but kept for consistency if needed
    // setSelectedBook(book);
    // setShowBookDetails(true);
  };

  const totalPages = Math.ceil(favoriteBooks.length / booksPerPage);
  const paginatedBooks = favoriteBooks.slice(
    (currentPage - 1) * booksPerPage,
    currentPage * booksPerPage
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            Geri Dön
          </button>
        </div>

        <div className="flex justify-center">
          <DotLottieReact
            src="https://lottie.host/c87f7b8a-08d9-4f01-98ea-a807738ae878/eUIfhKL9kZ.json"
            loop
            autoplay
            style={{ width: '300px', height: '300px' }}
          />
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Favorilerim</h1>
          <p className="mt-2 text-gray-600">Favori kitaplarınızı buradan yönetebilirsiniz.</p>
        </div>

        {successMessage && (
          <div className="mb-6 p-4 bg-green-100 text-green-700 rounded-lg flex items-center">
            <CheckCircle className="w-5 h-5 mr-2" />
            {successMessage}
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-600">Favori kitaplar yükleniyor...</p>
          </div>
        ) : favoriteBooks.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center flex flex-col items-center justify-center">
            <Heart className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Henüz Favori Kitabınız Yok</h3>
            <p className="text-gray-600 mb-6">Katalogdan beğendiğiniz kitapları favorilerinize ekleyebilirsiniz.</p>
            <Link to="/catalog" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">
              Kataloğa Git
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {paginatedBooks.map(book => {
                const bookStatus = getBookStatus(book.id);
                const userBorrowed = isBorrowed(book.id);
                const isPending = userBorrowed && book.borrowStatus === 'pending';
                const averageRating = book.ratings
                  ? book.ratings.reduce((acc, rating) => acc + rating.rating, 0) / book.ratings.length
                  : 0;

                return (
                  <div key={book.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <img src={book.coverImage} alt={book.title} className="w-full h-120 object-cover" />
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900">{book.title}</h3>
                      <p className="text-sm text-gray-600">{book.author}</p>
                      <p className="text-xs text-gray-500 mt-1">{book.publisher}</p>
                      <div className="flex items-center mt-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${
                              averageRating >= star ? 'text-yellow-400' : 'text-gray-300'
                            }`}
                          />
                        ))}
                        <span className="ml-2 text-xs text-gray-600">
                          {averageRating.toFixed(1)} ({book.ratings?.length || 0})
                        </span>
                      </div>
                      <div className="mt-3 flex justify-between items-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          isPending
                            ? 'bg-yellow-100 text-yellow-800'
                            : bookStatus === 'lost'
                            ? 'bg-red-100 text-red-800'
                            : bookStatus === 'borrowed'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {isPending 
                            ? 'Onay Bekliyor' 
                            : bookStatus === 'lost' 
                            ? 'Kayıp' 
                            : bookStatus === 'borrowed' 
                            ? 'Ödünç Verildi' 
                            : 'Müsait'}
                        </span>
                        <button
                          onClick={() => handleRemoveFavorite(book.id)}
                          className="p-2 rounded-full text-red-500 hover:bg-red-100 transition-colors"
                        >
                          <Heart className="w-5 h-5 fill-current" />
                        </button>
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        Konum: {book.location}
                      </div>
                      {bookStatus === 'available' && !isPending && (
                        <div className="mt-3">
                          <button
                            onClick={() => handleBorrowRequest(book)}
                            className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                          >
                            Ödünç Al
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {totalPages > 1 && (
              <div className="mt-8 flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  Sayfa {currentPage} / {totalPages}
                </p>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    Önceki
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    Sonraki
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default FavoritesPage;

