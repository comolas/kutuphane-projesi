import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { User, Book, Calendar, AlertTriangle, ArrowLeft, History, CheckCircle } from 'lucide-react';
import Swal from 'sweetalert2';

// Interfaces
interface UserData {
  uid: string;
  displayName: string;
  studentClass: string;
  studentNumber: string;
  photoURL?: string;
}

interface BookData {
  id: string;
  title: string;
  coverImage?: string;
}

interface BorrowDoc {
  id: string;
  userId: string;
  bookId: string;
  book: BookData;
  borrowDate: { seconds: number };
  dueDate: { seconds: number };
  extended?: boolean;
  returnStatus: 'borrowed' | 'returned';
  returnDate?: { seconds: number };
}

const UserBorrowsDetailPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const [user, setUser] = useState<UserData | null>(null);
  const [currentBorrows, setCurrentBorrows] = useState<BorrowDoc[]>([]);
  const [historicalBorrows, setHistoricalBorrows] = useState<BorrowDoc[]>([]);
  const [stats, setStats] = useState<Stats>({ totalRead: 0, onTimeRate: 0, favoriteGenre: '-' });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('current');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('list');
  const [currentPage, setCurrentPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [itemsPerPage] = useState(9);
  const navigate = useNavigate();

  useEffect(() => {
    if (!userId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const userDocRef = doc(db, 'users', userId);
        const currentBorrowsQuery = query(collection(db, 'borrowedBooks'), where('userId', '==', userId), where('returnStatus', '==', 'borrowed'));
        const historicalBorrowsQuery = query(collection(db, 'borrowedBooks'), where('userId', '==', userId), where('returnStatus', '==', 'returned'));

        const [userDocSnap, currentSnapshot, historicalSnapshot] = await Promise.all([
            getDoc(userDocRef),
            getDocs(currentBorrowsQuery),
            getDocs(historicalBorrowsQuery)
        ]);

        if (userDocSnap.exists()) {
          setUser({ uid: userDocSnap.id, ...userDocSnap.data() } as UserData);
        }
        
        const currentItems = currentSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as BorrowDoc));
        const historicalItems = historicalSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as BorrowDoc))
            .sort((a, b) => (b.returnDate?.seconds || 0) - (a.returnDate?.seconds || 0));

        setCurrentBorrows(currentItems);
        setHistoricalBorrows(historicalItems);
        calculateStats(historicalItems);

      } catch (error) {
        console.error("Error fetching user borrow details:", error);
        Swal.fire('Hata!', 'Kullanıcı ödünç detayları getirilirken bir hata oluştu.', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  const calculateStats = (history: BorrowDoc[]) => {
    if (history.length === 0) {
        setStats({ totalRead: 0, onTimeRate: 0, favoriteGenre: '-' });
        return;
    }

    const totalRead = history.length;

    const onTimeReturns = history.filter(item => 
        item.returnDate && item.dueDate && item.returnDate.seconds <= item.dueDate.seconds
    ).length;
    const onTimeRate = Math.round((onTimeReturns / totalRead) * 100);

    const categoryCounts = history.reduce((acc, item) => {
        const category = item.book?.category || 'Bilinmiyor';
        acc[category] = (acc[category] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    let favoriteGenre = '-';
    if (Object.keys(categoryCounts).length > 0) {
        favoriteGenre = Object.keys(categoryCounts).reduce((a, b) => categoryCounts[a] > categoryCounts[b] ? a : b);
    }

    setStats({ totalRead, onTimeRate, favoriteGenre });
  };

  const handleReturnBook = async (borrowDocId: string, bookId: string) => {
    Swal.fire({
      title: 'Emin misiniz?',
      text: "Bu kitabı iade olarak işaretlemek istediğinizden emin misiniz?",
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Evet, iade al!',
      cancelButtonText: 'Vazgeç'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const borrowDocRef = doc(db, 'borrowedBooks', borrowDocId);
          await updateDoc(borrowDocRef, { 
              returnStatus: 'returned',
              returnDate: serverTimestamp()
          });
          const statusRef = doc(db, 'bookStatuses', bookId);
          await updateDoc(statusRef, { status: 'available' });
          
          // Move the book from current to history
          const returnedBook = currentBorrows.find(item => item.id === borrowDocId);
          if(returnedBook) {
              setHistoricalBorrows(prev => [{...returnedBook, returnStatus: 'returned', returnDate: {seconds: Date.now()/1000}}, ...prev]);
              setCurrentBorrows(prev => prev.filter(item => item.id !== borrowDocId));
          }
          Swal.fire('Başarılı!', 'Kitap başarıyla iade alındı.', 'success');
        } catch (error) {
          console.error('Error returning book:', error);
          Swal.fire('Hata!', 'Kitap iade alınırken bir hata oluştu.', 'error');
        }
      }
    });
  };

  const handleExtendDueDate = async (borrowDocId: string, currentDueDate: { seconds: number }, alreadyExtended?: boolean) => {
    if (alreadyExtended) {
        Swal.fire('Uyarı!', 'Bu kitabın süresi zaten bir kez uzatılmış.', 'warning');
        return;
    }
    const newDueDate = new Date(currentDueDate.seconds * 1000);
    newDueDate.setDate(newDueDate.getDate() + 7);

    Swal.fire({
      title: 'Emin misiniz?',
      text: `İade tarihi 7 gün uzatılacak (${newDueDate.toLocaleDateString()}). Onaylıyor musunuz?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Evet, uzat!',
      cancelButtonText: 'Vazgeç'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const borrowDocRef = doc(db, 'borrowedBooks', borrowDocId);
          await updateDoc(borrowDocRef, { dueDate: newDueDate, extended: true });
          setCurrentBorrows(prev => prev.map(item => 
              item.id === borrowDocId ? { ...item, dueDate: { seconds: newDueDate.getTime() / 1000 }, extended: true } : item
          ));
          Swal.fire('Başarılı!', 'Kitap süresi başarıyla uzatıldı.', 'success');
        } catch (error) {
          console.error('Error extending due date:', error);
          Swal.fire('Hata!', 'Süre uzatılırken bir hata oluştu.', 'error');
        }
      }
    });
  };

  const getRemainingDays = (dueDate: { seconds: number }) => {
    const diff = dueDate.seconds * 1000 - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const paginatedCurrentBorrows = currentBorrows.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const paginatedHistoricalBorrows = historicalBorrows.slice((historyPage - 1) * itemsPerPage, historyPage * itemsPerPage);
  const currentTotalPages = Math.ceil(currentBorrows.length / itemsPerPage);
  const historyTotalPages = Math.ceil(historicalBorrows.length / itemsPerPage);

  const renderTabs = () => (
    <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
            <button
                onClick={() => setActiveTab('current')}
                className={`${activeTab === 'current' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
                <Book className="w-5 h-5 mr-2" /> Mevcut Kitaplar ({currentBorrows.length})
            </button>
            <button
                onClick={() => setActiveTab('history')}
                className={`${activeTab === 'history' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
                <History className="w-5 h-5 mr-2" /> Okuma Geçmişi ({historicalBorrows.length})
            </button>
        </nav>
    </div>
  );

  const renderCurrentBorrows = () => (
    <div>
        <div className="flex justify-end mb-4">
            <div className="flex gap-2">
                <button
                    onClick={() => setViewMode('card')}
                    className={`p-2 rounded-lg transition-all duration-200 ${viewMode === 'card' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                </button>
                <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-lg transition-all duration-200 ${viewMode === 'list' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
            </div>
        </div>
        {currentBorrows.length > 0 ? (
            viewMode === 'card' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {paginatedCurrentBorrows.map(item => {
                        const remainingDays = getRemainingDays(item.dueDate);
                        const isOverdue = remainingDays < 0;
                        return (
                            <div key={item.id} className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
                                <div className="relative">
                                    <img src={item.book.coverImage || 'https://via.placeholder.com/300x400'} alt={item.book.title} className="w-full h-64 object-cover" />
                                    <div className={`absolute top-2 right-2 px-3 py-1 rounded-full text-xs font-bold text-white ${isOverdue ? 'bg-red-500' : 'bg-green-500'}`}>
                                        {isOverdue ? `${Math.abs(remainingDays)} gün gecikti` : `${remainingDays} gün kaldı`}
                                    </div>
                                </div>
                                <div className="p-4">
                                    <h3 className="font-bold text-lg text-gray-800 mb-2 line-clamp-2">{item.book.title}</h3>
                                    <div className="flex items-center text-sm text-gray-600 mb-4">
                                        <Calendar className="w-4 h-4 mr-2" />
                                        <span>İade: {new Date(item.dueDate.seconds * 1000).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <button onClick={() => handleReturnBook(item.id, item.bookId)} className="w-full px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm font-medium transition-colors">
                                            İade Al
                                        </button>
                                        <button 
                                            onClick={() => handleExtendDueDate(item.id, item.dueDate, item.extended)}
                                            className="w-full px-3 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 text-sm font-medium disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                                            disabled={item.extended}
                                        >
                                            {item.extended ? 'Süre Uzatıldı' : 'Süre Uzat'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <ul className="divide-y divide-gray-200">
                        {paginatedCurrentBorrows.map(item => {
                            const remainingDays = getRemainingDays(item.dueDate);
                            const isOverdue = remainingDays < 0;
                            return (
                                <li key={item.id} className="p-4 hover:bg-gray-50 transition-colors">
                                    <div className="flex flex-col sm:flex-row gap-4">
                                        <img src={item.book.coverImage || 'https://via.placeholder.com/80x120'} alt={item.book.title} className="w-20 h-28 object-cover rounded-md shadow flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-lg text-gray-800 mb-1">{item.book.title}</p>
                                            <p className="text-sm text-gray-500 mb-2">Kod: {item.book.id}</p>
                                            <div className="flex flex-wrap items-center gap-2 mb-3">
                                                <div className={`px-3 py-1 rounded-full text-xs font-medium ${isOverdue ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                                                    {isOverdue ? `${Math.abs(remainingDays)} gün gecikti` : `Kalan ${remainingDays} gün`}
                                                </div>
                                                <div className="flex items-center text-xs text-gray-600">
                                                    <Calendar className="w-3 h-3 mr-1" />
                                                    <span>{new Date(item.dueDate.seconds * 1000).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <button onClick={() => handleReturnBook(item.id, item.bookId)} className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm font-medium transition-colors">
                                                    İade Al
                                                </button>
                                                <button 
                                                    onClick={() => handleExtendDueDate(item.id, item.dueDate, item.extended)}
                                                    className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 text-sm font-medium disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                                                    disabled={item.extended}
                                                >
                                                    {item.extended ? 'Süre Uzatıldı' : 'Süre Uzat'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )
        ) : (
            <div className="bg-white rounded-lg shadow p-12 text-center">
                <Book className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">Bu kullanıcının ödünç aldığı kitap bulunmuyor.</p>
            </div>
        )}
        {currentBorrows.length > 0 && currentTotalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Önceki</button>
                <span className="text-sm text-gray-600 px-4">Sayfa {currentPage} / {currentTotalPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(currentTotalPages, p + 1))} disabled={currentPage === currentTotalPages} className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Sonraki</button>
            </div>
        )}
    </div>
  );

  const renderHistoricalBorrows = () => (
    <div>
        {historicalBorrows.length > 0 ? (
            viewMode === 'card' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {paginatedHistoricalBorrows.map(item => {
                        const wasReturnedLate = item.returnDate && item.dueDate && item.returnDate.seconds > item.dueDate.seconds;
                        return (
                            <div key={item.id} className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
                                <div className="relative">
                                    <img src={item.book.coverImage || 'https://via.placeholder.com/300x400'} alt={item.book.title} className="w-full h-64 object-cover" />
                                    <div className={`absolute top-2 right-2 px-3 py-1 rounded-full text-xs font-bold text-white ${wasReturnedLate ? 'bg-red-500' : 'bg-green-500'}`}>
                                        {wasReturnedLate ? 'Geç' : 'Zamanında'}
                                    </div>
                                </div>
                                <div className="p-4">
                                    <h3 className="font-bold text-lg text-gray-800 mb-3 line-clamp-2">{item.book.title}</h3>
                                    <div className="space-y-1 text-sm text-gray-600">
                                        <p>Ödünç: {item.borrowDate ? new Date(item.borrowDate.seconds * 1000).toLocaleDateString() : '-'}</p>
                                        <p>Teslim: {item.returnDate ? new Date(item.returnDate.seconds * 1000).toLocaleDateString() : '-'}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <ul className="divide-y divide-gray-200">
                        {paginatedHistoricalBorrows.map(item => {
                            const wasReturnedLate = item.returnDate && item.dueDate && item.returnDate.seconds > item.dueDate.seconds;
                            return (
                                <li key={item.id} className="p-4 hover:bg-gray-50 transition-colors">
                                    <div className="flex flex-col sm:flex-row gap-4">
                                        <img src={item.book.coverImage || 'https://via.placeholder.com/80x120'} alt={item.book.title} className="w-20 h-28 object-cover rounded-md shadow flex-shrink-0" />
                                        <div className="flex-1">
                                            <p className="font-bold text-lg text-gray-800 mb-2">{item.book.title}</p>
                                            <div className="space-y-1 text-sm text-gray-600 mb-2">
                                                <p>Ödünç: {item.borrowDate ? new Date(item.borrowDate.seconds * 1000).toLocaleDateString() : '-'}</p>
                                                <p>Teslim: {item.returnDate ? new Date(item.returnDate.seconds * 1000).toLocaleDateString() : '-'}</p>
                                            </div>
                                            <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${wasReturnedLate ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                                                {wasReturnedLate ? 'Geç Teslim Edildi' : 'Zamanında Teslim Edildi'}
                                            </div>
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )
        ) : (
            <div className="bg-white rounded-lg shadow p-12 text-center">
                <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">Kullanıcının okuma geçmişi bulunmuyor.</p>
            </div>
        )}
        {historicalBorrows.length > 0 && historyTotalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
                <button onClick={() => setHistoryPage(p => Math.max(1, p - 1))} disabled={historyPage === 1} className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Önceki</button>
                <span className="text-sm text-gray-600 px-4">Sayfa {historyPage} / {historyTotalPages}</span>
                <button onClick={() => setHistoryPage(p => Math.min(historyTotalPages, p + 1))} disabled={historyPage === historyTotalPages} className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Sonraki</button>
            </div>
        )}
    </div>
  );

  if (loading) {
    return (
      <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {/* Back button skeleton */}
          <div className="h-6 bg-gray-200 rounded w-24 mb-4 animate-pulse"></div>
          
          {/* User header skeleton */}
          <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-8">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gray-200 rounded-full animate-pulse"></div>
              <div className="flex-1 space-y-3 text-center sm:text-left">
                <div className="h-7 bg-gray-200 rounded w-48 mx-auto sm:mx-0 animate-pulse"></div>
                <div className="h-5 bg-gray-200 rounded w-32 mx-auto sm:mx-0 animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* Tabs skeleton */}
          <div className="mb-6 border-b border-gray-200">
            <div className="flex space-x-6">
              <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
              <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
            </div>
          </div>

          {/* View mode toggle skeleton */}
          <div className="flex justify-end mb-4">
            <div className="flex gap-2">
              <div className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
              <div className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
            </div>
          </div>

          {/* Cards skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="h-64 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse bg-[length:200%_100%]"></div>
                <div className="p-4 space-y-3">
                  <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                  <div className="space-y-2 mt-4">
                    <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <div className="text-center mt-10">Kullanıcı bulunamadı.</div>;
  }

  return (
    <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <button 
            onClick={() => navigate(-1)} 
            className="flex items-center mb-4 text-indigo-600 hover:text-indigo-800 transition-colors"
        >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Geri Dön
        </button>
        {/* User Info Header */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 mb-8 p-4 sm:p-6 bg-white rounded-lg shadow">
          {user.photoURL ? (
            <img src={user.photoURL} alt={user.displayName} className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src='https://via.placeholder.com/128'; }} />
          ) : (
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gray-200 flex items-center justify-center">
              <User className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400" />
            </div>
          )}
          <div className="text-center sm:text-left">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">{user.displayName}</h1>
            <p className="text-sm sm:text-base text-gray-600">{user.studentClass} - {user.studentNumber}</p>
          </div>
        </div>

        {renderTabs()}

        {activeTab === 'current' ? renderCurrentBorrows() : renderHistoricalBorrows()}
      </div>
    </div>
  );
};

export default UserBorrowsDetailPage;