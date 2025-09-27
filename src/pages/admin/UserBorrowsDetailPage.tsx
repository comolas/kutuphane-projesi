import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { User, Book, Calendar, AlertTriangle, ArrowLeft, History, CheckCircle } from 'lucide-react';

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
    if(window.confirm("Bu kitabı iade olarak işaretlemek istediğinizden emin misiniz?")){
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
    }
  };

  const handleExtendDueDate = async (borrowDocId: string, currentDueDate: { seconds: number }, alreadyExtended?: boolean) => {
    if (alreadyExtended) {
        alert("Bu kitabın süresi zaten bir kez uzatılmış.");
        return;
    }
    const newDueDate = new Date(currentDueDate.seconds * 1000);
    newDueDate.setDate(newDueDate.getDate() + 7);
    if(window.confirm(`İade tarihi 7 gün uzatılacak (${newDueDate.toLocaleDateString()}). Onaylıyor musunuz?`)){
        const borrowDocRef = doc(db, 'borrowedBooks', borrowDocId);
        await updateDoc(borrowDocRef, { dueDate: newDueDate, extended: true });
        setCurrentBorrows(prev => prev.map(item => 
            item.id === borrowDocId ? { ...item, dueDate: { seconds: newDueDate.getTime() / 1000 }, extended: true } : item
        ));
    }
  };

  const getRemainingDays = (dueDate: { seconds: number }) => {
    const diff = dueDate.seconds * 1000 - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

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
    <div className="bg-white rounded-lg shadow overflow-hidden">
        {currentBorrows.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {currentBorrows.map(item => {
              const remainingDays = getRemainingDays(item.dueDate);
              const isOverdue = remainingDays < 0;
              return (
                <li key={item.id} className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center flex-1">
                    <img src={item.book.coverImage || 'https://via.placeholder.com/80x120'} alt={item.book.title} className="w-16 h-24 object-cover rounded-md mr-4 shadow" />
                    <div>
                      <p className="font-bold text-lg text-gray-800">{item.book.title}</p>
                      <p className="text-sm text-gray-500">Kod: {item.book.id}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-center md:flex-row md:items-center gap-4">
                    <div className={`text-center px-3 py-1 rounded-full text-sm font-medium ${isOverdue ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                        {isOverdue ? `${Math.abs(remainingDays)} gün gecikti` : `Kalan ${remainingDays} gün`}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="w-4 h-4 mr-2" />
                        <span>İade: {new Date(item.dueDate.seconds * 1000).toLocaleDateString()}</span>
                    </div>
                    <div className="flex space-x-2">
                      <button onClick={() => handleReturnBook(item.id, item.bookId)} className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm">İade Al</button>
                      <button 
                        onClick={() => handleExtendDueDate(item.id, item.dueDate, item.extended)}
                        className="px-3 py-1 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 text-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
                        disabled={item.extended}
                      >
                        Süre Uzat
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-center p-8 text-gray-500">Bu kullanıcının ödünç aldığı kitap bulunmuyor.</p>
        )}
      </div>
  );

  const renderHistoricalBorrows = () => (
    <div className="bg-white rounded-lg shadow overflow-hidden">
        {historicalBorrows.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {historicalBorrows.map(item => {
                const wasReturnedLate = item.returnDate && item.dueDate && item.returnDate.seconds > item.dueDate.seconds;
                return (
                    <li key={item.id} className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center flex-1">
                            <img src={item.book.coverImage || 'https://via.placeholder.com/80x120'} alt={item.book.title} className="w-16 h-24 object-cover rounded-md mr-4 shadow" />
                            <div>
                                <p className="font-bold text-lg text-gray-800">{item.book.title}</p>
                                <p className="text-sm text-gray-500">Ödünç: {item.borrowDate ? new Date(item.borrowDate.seconds * 1000).toLocaleDateString() : '-'}</p>
                                <p className="text-sm text-gray-500">Teslim: {item.returnDate ? new Date(item.returnDate.seconds * 1000).toLocaleDateString() : '-'}</p>
                            </div>
                        </div>
                        <div className={`text-center px-3 py-1 rounded-full text-sm font-medium ${wasReturnedLate ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                            {wasReturnedLate ? 'Geç Teslim Edildi' : 'Zamanında Teslim Edildi'}
                        </div>
                    </li>
                );
            })}
          </ul>
        ) : (
          <p className="text-center p-8 text-gray-500">Kullanıcının okuma geçmişi bulunmuyor.</p>
        )}
    </div>
  );

  if (loading) {
    return <div className="flex justify-center items-center h-screen"><p>Yükleniyor...</p></div>;
  }

  if (!user) {
    return <div className="text-center mt-10">Kullanıcı bulunamadı.</div>;
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
        <button 
            onClick={() => navigate(-1)} 
            className="flex items-center mb-4 text-indigo-600 hover:text-indigo-800"
        >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Geri Dön
        </button>
      {/* User Info Header */}
      <div className="flex items-center mb-8 p-4 bg-white rounded-lg shadow">
        {user.photoURL ? (
          <img src={user.photoURL} alt={user.displayName} className="w-20 h-20 rounded-full object-cover mr-6" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src='https://via.placeholder.com/128'; }} />
        ) : (
          <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center mr-6">
            <User className="w-10 h-10 text-gray-400" />
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{user.displayName}</h1>
          <p className="text-md text-gray-600">{user.studentClass} - {user.studentNumber}</p>
        </div>
      </div>

      {renderTabs()}

      {activeTab === 'current' ? renderCurrentBorrows() : renderHistoricalBorrows()}

    </div>
  );
};

export default UserBorrowsDetailPage;
